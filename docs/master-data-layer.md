# Master Data Layer — Manufacturer, VehicleModel, VehicleGeneration

Documenta a camada de deduplicação/normalização construída em duas etapas
sequenciais (Etapa 1 — Master Vehicle Database; Etapa 2 — Master
Generation Database), sobre entidades que já existiam no schema
(`Manufacturer`, `VehicleModel`, `VehicleGeneration`) — nenhuma tabela
nova foi criada em nenhuma das duas etapas.

## 1. O problema que motivou esta camada

`SearchAlias` (Fase Enterprise) foi criada para resolver apelidos de
entidade → registro canônico, mas nunca foi referenciada em nenhum
arquivo de código até a Etapa 1. `findOrCreateVehicleModel` fazia match
exato por `name` (case/acento-sensível), e o pipeline real de importação
(`scripts/lib/fipeCatalog.ts`) tinha uma segunda tentativa de mitigação
(case-insensitive) inconsistente com a primeira. Resultado real,
encontrado por auditoria antes de qualquer alteração: 4 pares de
`VehicleModel` duplicados na base — Honda "Zr-v"/"ZR-V", "CITY"/"City",
"WR-V"/"Wr-v", Renault "Mégane"/"Megane" — mesclados na Etapa 1.

## 2. Arquitetura

```
Manufacturer (normalizedName @unique)
  └─ VehicleModel (normalizedName @unique por manufacturerId)
       └─ VehicleGeneration (normalizedName @unique por vehicleModelId)   [Etapa 2]
            └─ VehicleVersion (name, yearStart/yearEnd, engineId, ...)
```

Cada nível guarda dois campos:
- `name` — texto exibido, exatamente como a fonte informou. Nunca alterado
  pela normalização.
- `normalizedName` — chave de deduplicação, calculada por
  `normalizeLookupKey()` (`lib/masterData/normalizeName.ts`). Nunca exibida.

## 3. `normalizeLookupKey()` — estratégia única e reutilizável

```ts
export function normalizeLookupKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")   // acentos
    .toLowerCase()                    // caixa
    .replace(HYPHEN_UNDERSCORE_REGEX, "") // hífen/underscore — removidos, não substituídos
    .trim()
    .replace(/\s+/g, " ");            // espaços duplicados
}
```

Usada hoje por `Manufacturer`, `VehicleModel` e `VehicleGeneration`.
Pronta para `Engine`/`Platform` nas próximas etapas — nenhuma lógica de
normalização deve ser duplicada fora desta função.

### Por que hífen/underscore são removidos, e não outros caracteres especiais

Testado contra os ~7.600 registros reais desta base (script de
verificação, não suposição) antes de decidir:

| Regra testada | Resultado contra dados reais |
|---|---|
| Remover hífen/underscore (adotada) | 0 colisões novas em Manufacturer/VehicleModel |
| Remover toda pontuação (`+`, `/`, `.`, `'`, `(`, `)`) | **2 colisões falsas**: "Ranger Limited" × "Ranger Limited+" (Ford) e "Jimny Sierra 4YOU" × "Jimny Sierra 4YOU+" (Suzuki) — trims genuinamente distintos, não duplicatas |

Por isso `normalizeLookupKey()` remove só hífen/underscore (unifica
"E-170"/"E170") e preserva `+`/`/`/outros — evita fundir entidades
diferentes por engano. Hífen e espaço **não são equivalentes**: "E170-X"
vira "e170x" (hífen removido), mas "E170 X" vira "e170 x" (espaço
preservado como separador) — comportamento verificado e intencional, não
um defeito.

## 4. Fluxo de resolução (idêntico para os 3 níveis)

```
entrada (nome bruto da fonte)
  ↓
normalizeLookupKey()
  ↓
busca por normalizedName (índice único, rápido)          → encontrado? retorna id
  ↓ (não encontrado)
busca em SearchAlias (entityType correspondente)          → encontrado? valida escopo (manufacturerId/vehicleModelId) e retorna id
  ↓ (não encontrado)
cria novo registro (name = bruto, normalizedName = calculado)
```

Implementado em `lib/masterData/resolveManufacturer.ts`,
`resolveVehicleModel.ts`, `resolveVehicleGeneration.ts` — mesma forma,
parametrizados por um subconjunto de `PrismaClient` (`PrismaLike`) para
funcionar tanto sob o guard `server-only` (repositories/*) quanto em
scripts standalone (`scripts/lib/fipeCatalog.ts`, `prisma/seed.ts`), sem
duplicar a lógica em cada consumidor.

## 5. `SearchAlias` — regras por entidade

`SearchAliasEntityType`: `MANUFACTURER`, `VEHICLE_MODEL`,
`VEHICLE_GENERATION` (Etapa 2), `TIRE_MANUFACTURER`, `TIRE_MODEL`.

- `entityId` aponta para o registro canônico já resolvido (nunca para
  outro alias — sem cadeias).
- `VEHICLE_MODEL`/`VEHICLE_GENERATION` são escopados na leitura pelo pai
  (`manufacturerId`/`vehicleModelId`) — o mesmo texto de alias pode
  legitimamente apontar para entidades diferentes sob pais diferentes.
- Esta camada **nunca cria um alias sozinha** — só consulta. Registro de
  alias é uma ação curada (manual ou de uma fase futura dedicada),
  intencionalmente fora do escopo do find-or-create automático.

## 6. `VehicleGeneration` — campos e uso

| Campo | Papel |
|---|---|
| `name` | Texto exibido (ex.: "E170", "Mk7", ou o próprio ano/faixa quando a fonte não informa um código real — nunca inventado) |
| `normalizedName` | Chave de deduplicação por `vehicleModelId` |
| `code` | Código declarado pelo fabricante, quando distinto de `name` |
| `yearStart`/`yearEnd` | Só usados na criação — uma geração já existente nunca tem suas datas sobrescritas por uma importação posterior |
| `platformId` | Opcional, FK para `Platform` (já existente) |

### Integração ao pipeline

`generationName` (opcional, mesmo padrão de `platformName`) foi
adicionado de ponta a ponta: `lib/validations/veiculo.ts` →
`types/veiculo.ts` → `services/veiculos.ts` (DTO, `normalizeInput`, diff
de auditoria, importação CSV em lote — coluna `geracao`) →
`repositories/veiculos.ts` (`createVeiculo`/`updateVeiculo` resolvem
`generationId` via `findOrCreateVehicleGeneration` quando informado).
Campo opcional: nenhum veículo/importação existente que não informe
geração muda de comportamento.

Não há campo de geração no formulário manual de cadastro (UI) — mesmo
estado hoje de `platformName`, que também só é alimentado via importação
em lote/API, nunca pelo formulário. Consistente, não uma lacuna desta
etapa.

## 7. Índices e constraints

| Tabela | Antes | Depois |
|---|---|---|
| `manufacturers` | `name @unique` | `normalizedName @unique`, `name` indexado (busca) |
| `vehicle_models` | `@@unique([manufacturerId, name])` | `@@unique([manufacturerId, normalizedName])`, `name` indexado |
| `vehicle_generations` | `@@unique([vehicleModelId, name])` | `@@unique([vehicleModelId, normalizedName])`, `name` indexado |

## 8. Migrations

- `20260720040000_master_data_normalized_names` (Etapa 1) — `Manufacturer`/`VehicleModel`.
- `20260721000000_master_generation_database` (Etapa 2) — `VehicleGeneration` + `SearchAliasEntityType.VEHICLE_GENERATION`.

Ambas aplicadas via `prisma migrate diff` (com a remoção manual, de praxe
neste projeto, do `DROP TABLE audit_logs_legacy` espúrio que o diff
sempre inclui) e registradas em `_prisma_migrations` — `prisma migrate
status` confirma zero drift após cada uma.

## 9. Validações realizadas

- `prisma validate` / `prisma migrate status` (zero drift) / `prisma generate`.
- `npm run lint` — 0 erros.
- `npx next build` — falha apenas no erro pré-existente e fora de escopo
  já conhecido (`repositories/ai/aiJobs.ts:46:7`, domínio IA Engine
  isolado/não commitado).
- Idempotência testada diretamente contra o banco real: criar → resolver
  pelo mesmo nome → resolver por variante de caixa/hífen → resolver via
  `SearchAlias` → nenhuma linha duplicada criada em nenhum passo; dados de
  teste removidos ao final.
- `predev` real (`prisma generate && migrate deploy && seed`) executado
  de ponta a ponta contra o banco de produção sem erro.
