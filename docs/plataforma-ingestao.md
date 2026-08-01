# Plataforma de Ingestão de Homologações — Fase 7

Esta fase entregou **só infraestrutura**: interfaces (`lib/ingestion/`) que
formalizam como uma futura fonte de homologações se conecta ao sistema, sem
conectar nenhuma fonte real. Nenhum crawler foi executado, nenhum fabricante
foi importado, nenhuma homologação foi alterada, nenhuma API pública ou
tela de frontend foi tocada.

## 1. Por que uma camada nova, e não reaproveitar o que já existe

O projeto já tem duas camadas de conector parecidas:

- **`ImportConnector`** (`lib/importer/connectors/`) — genérico, baseado em
  linhas CSV, para UMA tabela por vez (montadoras, modelos, fabricantes de
  pneu). Não carrega o conceito de "uma homologação completa".
- **`EvidenceConnector`** (`lib/importer/connectors/evidenceSources.ts`) —
  específico para uma aplicação pneu↔veículo isolada, alimenta direto o
  Motor de Validação (`HomologationEvidence`/`TireVehicleApplication`).

Nenhum dos dois carrega o conjunto completo de campos que uma homologação
real tem (medida + índices + pressão + roda + OE + fonte + página +
confiança + data). A Plataforma de Ingestão preenche essa lacuna: um
formato único e completo, e um contrato de adapter por TIPO de fonte
(oficial, fabricante de pneu, revenda, catálogo técnico, revisão humana),
em vez de um conector por marca.

## 2. Arquitetura

```
lib/ingestion/
  types.ts                          HomologationIngestionRecord (formato comum)
  adapter.ts                        HomologationSourceAdapter (contrato base)
  registry.ts                       INGESTION_ADAPTERS (vazio nesta fase)
  toEvidenciaInput.ts                ponte de FORMATO até o pipeline já existente
  adapters/
    officialManualAdapter.ts        manual do proprietário / doc. oficial
    tireManufacturerAdapter.ts      site do próprio fabricante de pneu
    dealerCatalogAdapter.ts         revenda (DPaschoal, Campneus, PneuStore...)
    technicalCatalogAdapter.ts      ficha técnica / catálogo fora do manual
    humanReviewAdapter.ts           registro digitado por um revisor humano
    _example.ts                    implementação de referência, NÃO registrada
```

```
Fonte real (futuro)
     │
     ▼
HomologationSourceAdapter.fetchRecords()
     │
     ▼
HomologationIngestionRecord[]   ← formato comum, esta fase
     │
     ▼
toEvidenciaInput()               ← ponte de formato, esta fase (função pura)
     │
     ▼
EvidenciaInput                   ← já existente
     │
     ▼
registrarEvidencia() / registrarLoteEvidencias()   ← já existente, em produção
     │
     ▼
HomologationEvidence + TireVehicleApplication (status por nº de fontes distintas)
```

**Nada abaixo de `toEvidenciaInput()` foi tocado.** A ponte existe como
função pura testável, mas nenhum código chama `registrarEvidencia` a
partir de um adapter ainda — isso é a próxima fase, quando uma fonte real
for conectada.

## 3. O formato comum (`HomologationIngestionRecord`)

| Campo pedido | Campo no tipo | Observação |
|---|---|---|
| fabricante | `fabricante` | obrigatório |
| modelo | `modelo` | obrigatório |
| versão | `versao` | `null` = não informado pela fonte |
| ano | `anoInicial` / `anoFinal` | faixa, mesmo padrão de `VehicleVersion` |
| medida homologada | `medida` | texto livre |
| índice de carga | `indiceCarga` | texto livre |
| índice de velocidade | `indiceVelocidade` | texto livre |
| pressão | `pressaoDianteira` / `pressaoTraseira` | texto livre, unidade original nunca convertida |
| roda | `roda` | texto livre |
| OE | `oe` | código OE declarado pela fonte |
| marca do pneu | `marcaPneu` | |
| modelo do pneu | `modeloPneu` | |
| documento de origem | `documentoOrigem` | obrigatório — nenhum registro sem proveniência |
| página | `pagina` | |
| nível de confiança | `nivelConfianca` | 0-100, atribuído pelo próprio adapter |
| data da captura | `dataCaptura` | |

Regra que vale para todo campo opcional: `null` significa **"esta fonte não
informou"**, nunca é preenchido com um valor assumido/inferido — mesma
disciplina já aplicada em `HomologationCandidate` e `HomologationEvidence`.

## 4. Os 5 adapters

Todos estendem `HomologationSourceAdapter` (`id`, `label`, `kind`,
`isConfigured()`, `fetchRecords()`):

| Adapter | `kind` | Mapeia para `EvidenceSourceType` |
|---|---|---|
| `OfficialManualAdapter` | `MANUAL_OFICIAL` | `MANUAL` |
| `TireManufacturerAdapter` | `FABRICANTE_PNEU` | `FABRICANTE_PNEU` |
| `DealerCatalogAdapter` | `CATALOGO_REVENDA` | `DISTRIBUIDOR_OFICIAL` |
| `TechnicalCatalogAdapter` | `CATALOGO_TECNICO` | `CATALOGO_OE` |
| `HumanReviewAdapter` | `REVISAO_HUMANA` | `MANUAL` |

`HumanReviewAdapter` é o único que também expõe `submitRecord()` — os
outros 4 buscam de uma fonte externa; este recebe o que um humano digitou.

## 5. Como adicionar uma fonte real no futuro (sem alterar nada existente)

1. Escolha o adapter mais próximo do tipo de fonte (ou implemente
   `HomologationSourceAdapter` direto, se nenhum dos 5 encaixar).
2. Crie um arquivo novo em `lib/ingestion/adapters/` implementando a
   interface — use `adapters/_example.ts` como modelo de estrutura (ele
   não é funcional de propósito).
3. Implemente `isConfigured()` de verdade (nunca retorne `true` sem checar
   de fato — variável de ambiente, endpoint alcançável etc.) e
   `fetchRecords()` retornando `HomologationIngestionRecord[]` reais.
4. Importe a instância em `lib/ingestion/registry.ts` e adicione à lista
   `INGESTION_ADAPTERS`.
5. **Nenhuma outra mudança é necessária.** `getIngestionAdapter`/
   `listIngestionAdapters` já descobrem o adapter novo automaticamente,
   e `toEvidenciaInput()` já sabe converter qualquer `kind` existente.

Achados reais já documentados que valem a pena reler antes de conectar uma
fonte específica:
- `lib/importer/connectors/evidenceSources.ts` — TireShop/Campneus/
  DPaschoal (robots.txt bloqueia busca-por-veículo) e PneuStore (anti-bot
  bloqueia até o robots.txt).
- Michelin tem uma ferramenta pública real de consulta por veículo
  (confirmado manualmente nesta sessão, ex.:
  `michelin.com.br/auto/fabricantes/jeep/compass-iii/...`) — nunca
  conectada programaticamente; seria o candidato mais forte para o
  primeiro `TireManufacturerAdapter` real.
- Manuais oficiais (Fiat, Hyundai, Nissan etc.) já são baixados pelo
  crawler existente (`services/intelligentCrawler.ts`) — um
  `OfficialManualAdapter` real reaproveitaria esse mecanismo em vez de
  reimplementar download/OCR do zero.

## 6. O que esta fase explicitamente NÃO fez

- Não conectou nenhuma fonte externa real (todos os 5 adapters são
  contratos; a única implementação concreta é `_example.ts`, não
  registrada).
- Não criou nenhuma tabela nem migration — o formato comum é só TypeScript;
  a persistência continua sendo `HomologationEvidence`/
  `TireVehicleApplication`, já existentes.
- Não alterou `services/homologationEvidence.ts`, nenhuma rota de API, nem
  nenhuma tela.
- Não publicou nem criou nenhuma `Homologation`.
