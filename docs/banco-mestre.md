# Banco Mestre de Homologações — Documentação Técnica

Este documento descreve a estrutura definitiva do banco de homologações
oficiais do HomologaPneu: tabelas, relacionamentos, índices e como
consultar/alimentar os dados. Reflete o estado do schema em
`prisma/schema.prisma` após a migration `banco_mestre_rodas_pressoes`.

## 1. Visão geral

O banco mestre é uma cadeia de entidades normalizadas, todas já
existentes antes desta consolidação, mais duas adições (`Wheel` e
`VehiclePressureSpec`) e um enriquecimento (`HomologationDocument`):

```
Manufacturer (fabricante/marca)
  └─ VehicleModel (modelo)
       └─ VehicleGeneration (geração)          [opcional]
       └─ VehicleVersion (versão + ano + motor + câmbio + tração)
            └─ Homologation (a homologação em si: código + ano)
                 ├─ HomologationTire ──→ Tire (medida, índices, runflat, XL)
                 ├─ HomologationWheel ──→ Wheel (largura, diâmetro, offset, furação, cubo)
                 ├─ VehiclePressureSpec (vazio/parcial/total × dianteira/traseira)
                 └─ HomologationDocument (documento oficial, página, URL, data, SHA-256, fabricante)
```

Nenhuma tabela nova duplica uma já existente. `Wheel` segue exatamente o
padrão de `Tire` (catálogo reutilizável + tabela de vínculo com `role`
ORIGINAL/OPCIONAL); `VehiclePressureSpec` segue o padrão de campos
`source`/`sourceUrl`/`validationStatus`/`confidence` já usado em toda a
base. O histórico de alterações usa a tabela `AuditLog` já existente
(nenhuma tabela de histórico nova foi criada).

## 2. Campos por entidade (mapeamento para o pedido original)

| Pedido | Onde vive |
|---|---|
| fabricante, marca | `Manufacturer.name` |
| modelo | `VehicleModel.name` |
| geração | `VehicleGeneration.name` (+ `yearStart`/`yearEnd`) |
| ano inicial/final | `VehicleVersion.yearStart` / `yearEnd` |
| versão | `VehicleVersion.name` |
| motorização | `Engine.name` (+ `power`, `torque`, `turbo`) |
| combustível | `Engine.fuel` (enum `FuelType`) |
| tração | `VehicleVersion.drivetrain` (enum `DrivetrainType`) |
| câmbio | `Transmission.type` + `gears` |
| medida do pneu | `Tire.size` (+ `width`/`profile`/`rim` normalizados) |
| índice de carga/velocidade | `Tire.loadIndex` / `speedIndex` (+ `LoadIndex`/`SpeedIndex` de referência) |
| tipo | `Tire.type` (RADIAL/DIAGONAL) |
| runflat | `Tire.runFlat` |
| reforçado | `Tire.xl` |
| homologação OE | `HomologationTire.role === "ORIGINAL"` (exposto como `isOE` no DTO) |
| largura/diâmetro/offset/furação/cubo da roda | `Wheel.width` / `diameter` / `offset` / `boltPattern` / `hubBore` |
| pressão vazio/parcial/total × dianteira/traseira | `VehiclePressureSpec.emptyFront/emptyRear/partialLoadFront/partialLoadRear/fullLoadFront/fullLoadRear` |
| documento oficial, página, URL, data, SHA-256, fabricante | `HomologationDocument.name/page/url/publishedAt/sha256/manufacturerName` |
| versões do documento (histórico) | `CrawlerAlert` (hash anterior → hash novo, por `sourceUrl`) quando o documento vem do Intelligent Crawler |
| alterações, data da alteração | `AuditLog` (`entity`, `entityId`, `action`, `changes`, `createdAt`) — consultável via `GET /api/homologacoes/:id/historico` |

Todos os campos numéricos/texto que a fonte pode não informar são
`nullable` — nunca preenchidos com um valor inventado. Todas as
entidades novas seguem o padrão `validationStatus` (`NECESSITA_VALIDACAO`
por padrão) + `source`/`confidence`, igual ao resto da base.

## 3. Índices para pesquisa rápida

| Tabela | Índices |
|---|---|
| `wheels` | `@@unique([width, diameter, offset, boltPattern])`, `@@index([diameter])`, `@@index([boltPattern])`, `@@index([validationStatus])` |
| `homologation_wheels` | `@@unique([homologationId, wheelId])`, `@@index([wheelId])` |
| `vehicle_pressure_specs` | `@@index([homologationId])` |
| `homologation_documents` | `@@index([homologationId])`, `@@index([sha256])` (novo — busca/dedupe rápida por hash) |
| `homologations` (já existia) | `@@unique([vehicleVersionId, code])`, `@@index([vehicleVersionId])`, `@@index([validationStatus])` |
| `tires` (já existia) | `@@index([tireManufacturerId])`, `@@index([size])`, `@@index([category])`, `@@index([validationStatus])`, `@@index([loadIndexId])`, `@@index([speedIndexId])` |
| `vehicle_versions` (já existia) | `@@index([vehicleModelId])`, `@@index([category])`, `@@index([yearStart, yearEnd])`, `@@index([validationStatus])`, `@@index([platformId])` |

## 4. API de consulta

Toda a API já existente de homologações (`services/homologacoes.ts`,
`app/api/homologacoes/*`) passa a retornar o registro completo — nenhuma
rota nova foi necessária para leitura:

- `GET /api/homologacoes/:id` — homologação completa: veículo (com
  geração/câmbio/tração), pneus (com `isOE`), **rodas** (com `isOE`),
  **pressões** e **documentos** (com página/SHA-256/data/fabricante).
- `GET /api/homologacoes?...` — listagem/busca (já existente).
- `GET /api/homologacoes/:id/historico` — eventos de auditoria
  (quem/quando/o quê) + evidências relacionadas (já existente,
  automaticamente cobre as mudanças em rodas/pressões/documentos porque
  elas geram `AuditLog` com `entity: "Homologation"`).

Sub-recursos novos (rodas/pressões/documentos são "quando existir" —
não fazem parte do formulário obrigatório de criação da homologação):

- `POST /api/homologacoes/:id/rodas` `{ wheelId, role }` — vincula uma roda.
- `DELETE /api/homologacoes/:id/rodas/:wheelId` — desvincula.
- `POST /api/homologacoes/:id/pressoes` `{ emptyFront, emptyRear, partialLoadFront, partialLoadRear, fullLoadFront, fullLoadRear, source, sourceUrl }` — adiciona uma leitura de pressão (múltiplas por fonte são permitidas, nunca sobrescritas).
- `DELETE /api/homologacoes/:id/pressoes/:pressureId`
- `POST /api/homologacoes/:id/documentos` `{ name, url, type, page, sha256, manufacturerName, publishedAt }`
- `DELETE /api/homologacoes/:id/documentos/:documentId`

Catálogo de rodas (mesmo formato do catálogo de pneus já existente):

- `GET /api/rodas` — lista/busca (`q`, `diameter`, `boltPattern`, paginação).
- `POST /api/rodas` — cria (admin).
- `GET /api/rodas/:id` — detalhe (aberto ao Centro Técnico, igual a pneus/veículos).
- `PUT /api/rodas/:id` / `DELETE /api/rodas/:id` — admin.
- `POST /api/rodas/import` — importação incremental (ver §5).
- `GET /api/rodas/import/template` — modelo CSV.

## 5. Importação incremental

Reaproveita 100% o pipeline de importação já existente
(`lib/importer/parseFile.ts` → `ImportContexto` → `iniciarLote`/
`finalizarLote`/`registrarCriacao`/`registrarAtualizacao` →
`ImportBatch`/`ImportError`/`AuditLog`) — só foi adicionada uma nova
entidade (`RODAS`) ao enum `ImportEntity` e ao dispatcher
(`lib/importer/connectors/dispatch.ts`).

- CSV/XLSX/ODS/JSON/XML de rodas: colunas `largura,diametro,offset,furacao,cubo,status`.
- Cada linha é dedupada pela chave de negócio (`width+diameter+offset+boltPattern`,
  igual ao padrão `@@unique` da tabela) — reimportar o mesmo arquivo
  gera `duplicado`, nunca uma linha nova.
- Toda importação gera um `ImportBatch` rastreável (reversível, nunca
  apagado) e um `AuditLog` por linha criada/atualizada — mesmo
  mecanismo usado por Montadoras/Fabricantes/Veículos/Pneus/Homologações.
- Homologações, pressões e documentos continuam entrando pelos canais já
  existentes: upload manual (Curadoria Inteligente), Intelligent
  Crawler (`services/intelligentCrawler.ts` → `uploadDocumento` →
  `HomologationCandidate` → aprovação humana → `registrarEvidencia`), ou
  cadastro manual via API/painel — nunca por uma homologação inventada.

## 6. Histórico e rastreabilidade de fontes

Três mecanismos já existentes, todos reaproveitados sem alteração de
arquitetura:

1. **`AuditLog`** — toda `CREATE`/`UPDATE`/`DELETE` em `Homologation`
   (incluindo vínculos de roda/pressão/documento, que são modelados como
   `UPDATE` da homologação-pai) fica registrada com `changes` (JSON
   antes/depois), `userId` e `createdAt`. Consulta:
   `GET /api/homologacoes/:id/historico`.
2. **`HomologationDocument.sha256`** — cada documento oficial vinculado
   carrega o hash do arquivo, igual a `DocumentUpload.fileHash` e
   `HomologationEvidence.contentHash` — permite verificar integridade e
   detectar duplicidade.
3. **`CrawlerAlert`** (Intelligent Crawler) — quando um documento já
   conhecido (mesma `sourceUrl`) volta com um SHA-256 diferente, um
   alerta é criado com `previousHash`/`newHash` — é o histórico de
   "versões do documento" para tudo que entra pelo crawler automático.

## 7. Garantias de integridade ("nunca inventar")

- Todo campo numérico/texto de `Wheel`/`VehiclePressureSpec` é opcional
  exceto o mínimo estrutural (`width`, `diameter`, `boltPattern` da
  roda) — nunca preenchido com um valor calculado ou assumido.
  `VehiclePressureSpec` mantém a unidade original da fonte (texto livre:
  "2.1 bar", "30 psi") — nunca convertida.
  `HomologationTire`/`HomologationWheel.role = ORIGINAL` só é marcado
  quando a fonte declara explicitamente que é o equipamento de fábrica.
- `Wheel` e `VehiclePressureSpec` nascem com
  `validationStatus = NECESSITA_VALIDACAO` — mesmo fluxo de validação
  humana de Montadora/Veículo/Pneu/Homologação (painel
  `/administracao`, contagem de pendências).
- Nenhuma homologação, roda ou pressão foi criada por esta consolidação
  — apenas a estrutura (tabelas, relacionamentos, índices, serviços,
  rotas). A população de dados reais continua vindo exclusivamente dos
  pipelines de evidência/curadoria/crawler já auditados nesta base.
