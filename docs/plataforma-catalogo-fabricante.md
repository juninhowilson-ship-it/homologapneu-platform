# Plataforma de Catálogo de Fabricante de Pneu — Auditoria Técnica 1

Infraestrutura para importar planilhas oficiais de fabricante de pneu
(Pirelli, Michelin, Continental, Bridgestone, Goodyear, Yokohama, Hankook,
Kumho, Giti, Nexen, Toyo, Falken, BFGoodrich, Firestone, General Tire, e
qualquer marca futura). **Nenhum registro foi importado nesta fase** — 7
tabelas novas, todas vazias, verificado após a migration.

## 1. Por que estas 7 entidades, e não menos

Antes de criar qualquer tabela, mapeei cada uma das 10 entidades pedidas
contra o que já existe:

| Pedida | Decisão | Motivo |
|---|---|---|
| `ManufacturerCatalog` | 🆕 criada | Não existia nada representando "o catálogo de uma marca" |
| `ManufacturerCatalogImport` | 🆕 criada | Reaproveita `ImportBatch` via FK opcional em vez de duplicar status/contadores |
| `ManufacturerCatalogRow` | 🆕 criada | Staging de linha bruta — não existia (distinto de `ImportError`, que só guarda linhas com erro) |
| `ManufacturerProduct` | 🆕 criada | Distinto de `Tire` (catálogo curado/publicado) — este é o produto tal como o FABRICANTE declara, antes de curadoria |
| `ManufacturerApplication` | 🆕 criada | Aplicação veículo↔produto declarada pelo fabricante, texto livre (nem sempre bate com `VehicleModel` já normalizado) |
| `ManufacturerHomologation` | 🆕 criada | Status declarado pelo PRÓPRIO fabricante — distinto da `Homologation` curada/publicada do HomologaPneu |
| `ManufacturerEvidence` | 🆕 criada | Ponte para promover uma declaração a `HomologationEvidence` real (Motor de Validação já existente) — preenchida só numa fase futura |
| `ImportBatch` | ✅ já existia | Reaproveitado via `ManufacturerCatalogImport.importBatchId` (FK opcional) — **não recriado** |
| `ImportLog` | ✅ coberto | Campo `log: String?` em `ManufacturerCatalogImport`, mesmo padrão já usado em `CrawlerJob.log`/`ImportHistory.log` — uma tabela por linha de log duplicaria o que `ManufacturerCatalogRow` já cobre |
| `ImportStatus` | ✅ coberto | Enum `ManufacturerCatalogImportStatus`, mesmo padrão de `ImportBatchStatus`/`CrawlerRunStatus` já existentes |

**Zero duplicação confirmada**: `ImportBatch`, `ImportFileType` (já cobre
xlsx/xls/csv/ods — `xls` já mapeia para `XLSX` em
`lib/importer/parseFile.ts`) e `AxlePosition`
(DIANTEIRO/TRASEIRO/AMBOS/ESTEPE) foram **reaproveitados sem alteração**;
só um enum novo (`ImportEntity.CATALOGO_FABRICANTE_PNEU`) e dois enums
totalmente novos (`ManufacturerCatalogImportStatus`,
`ManufacturerProductStatus`) foram criados.

## 2. Diagrama

```
TireManufacturer (já existente)
  └─ ManufacturerCatalog (1 por marca)
       └─ ManufacturerCatalogImport (1 por execução de arquivo)
            │    ├──→ ImportBatch (já existente, FK opcional)
            │    └─ ManufacturerCatalogRow (1 por linha bruta do arquivo)
            └─ ManufacturerProduct (produto normalizado)
                 ├──→ Tire (já existente, FK opcional — só após curadoria humana)
                 ├──→ ManufacturerProduct (produtoSubstituto, auto-relação)
                 ├──→ ManufacturerProduct (produtoEquivalente, auto-relação)
                 └─ ManufacturerApplication (veículo↔produto declarado)
                      └─ ManufacturerHomologation (status declarado pelo fabricante)
                           └─ ManufacturerEvidence (ponte, vazia até promoção futura)
                                └──→ HomologationEvidence (já existente, sem FK formal)
```

## 3. Tabelas, índices e constraints criados

| Tabela | Índices | FKs |
|---|---|---|
| `manufacturer_catalogs` | 2 (`@@unique` tireManufacturerId+name, PK) | 1 |
| `manufacturer_catalog_imports` | 4 (catalogId, importBatchId, status, PK) | 2 |
| `manufacturer_catalog_rows` | 2 (importId, PK) | 1 |
| `manufacturer_products` | 6 (catalogId, rowId, tireId, produtoSubstitutoId, produtoEquivalenteId, PK) | 5 |
| `manufacturer_applications` | 2 (productId, PK) | 1 |
| `manufacturer_homologations` | 2 (applicationId, PK) | 1 |
| `manufacturer_evidences` | 3 (manufacturerHomologationId, homologationEvidenceId, PK) | 1 |

**Total**: 7 tabelas novas, 21 índices, 12 foreign keys. Banco físico foi
de 80 → 87 tabelas. Todas as FKs usam `ON DELETE SET NULL` para
referências opcionais (`tireId`, `rowId`, `produtoSubstitutoId`,
`produtoEquivalenteId`, `importBatchId`) e `ON DELETE RESTRICT`/`CASCADE`
só onde a linha filha realmente não existe sem a mãe (`rows` sob
`ManufacturerCatalogImport` é `CASCADE`, mesmo padrão de
`OfficialSourceEvent`/`DocumentPage`).

## 4. Enums criados

- `ManufacturerCatalogImportStatus`: PENDENTE, EXECUTANDO, CONCLUIDO, CONCLUIDO_COM_ERROS, FALHOU
- `ManufacturerProductStatus`: HOMOLOGADO, APLICACAO, PHASE_OUT, SUBSTITUTO, SEM_STATUS
- `ImportEntity` ganhou +1 valor: `CATALOGO_FABRICANTE_PNEU`

`AxlePosition` (eixo) **não ganhou nenhum valor novo** — "TODOS OS EIXOS"
pedido nesta fase mapeia para `AMBOS` na camada de normalização
(`normalizarEixo()`), não no schema.

## 5. O parser genérico

```
lib/importer/manufacturerCatalog/
  columnMapping.ts     tipos: NormalizedField, ColumnMapping, ManufacturerColumnConfig
  parser.ts            parseManufacturerCatalogRow/File — 100% genérico, sem nenhuma marca hardcoded
  normalize.ts         normalizarEixo, normalizarBooleano, derivarStatus
  mappings/
    registry.ts         as 15 marcas pedidas, mapping: {} (aguardando planilha real de cada uma)
    exampleMapping.ts   modelo de referência completo, não registrado
```

O parser (`parseManufacturerCatalogRow`) recebe uma linha já lida por
`lib/importer/parseFile.ts` (`parseImportFile`, **reaproveitado sem
alteração** — já lê xlsx/xls/csv/ods/json/xml/pdf) + um `ColumnMapping`
(dado, não código) e devolve um `NormalizedCatalogRow`. **Nenhuma lógica
do parser depende do nome de nenhuma coluna de nenhuma marca específica**
— essa é a regra explícita desta fase ("o parser não pode depender da
Pirelli"), verificada: `parser.ts` não importa nada de `mappings/`.

### Por que as 15 marcas estão com `mapping: {}`

Não inventei nomes de coluna para nenhuma marca real — isso seria
inventar estrutura sem ver um arquivo real, violando a regra desta
sessão. Cada entrada em `registry.ts` tem `confirmed: false` e fica
pronta para receber o mapeamento real assim que a primeira planilha de
cada marca chegar. `exampleMapping.ts` prova que o parser funciona de
ponta a ponta com os 14 nomes de coluna exatamente como pedidos nesta
fase (Marca do Veículo, Modelo, Medida, ..., Produto Equivalente).

## 6. Como conectar uma marca real no futuro

1. Receba um arquivo real (xlsx/xls/csv/ods) da marca.
2. Rode `parseImportFile(buffer, filename)` (já existente) para obter
   `{ headers, rows }`.
3. Compare `headers` com os 14 `NormalizedField` e monte o
   `ColumnMapping` real da marca.
4. Atualize a entrada correspondente em
   `lib/importer/manufacturerCatalog/mappings/registry.ts`
   (`mapping: {...}`, `confirmed: true`).
5. Rode `parseManufacturerCatalogFile(parsedFile, mapping)` para obter
   `NormalizedCatalogRow[]`.
6. (Fase futura, fora do escopo desta) grave `ManufacturerCatalogRow` →
   `ManufacturerProduct`/`ManufacturerApplication`/
   `ManufacturerHomologation` a partir de cada linha normalizada, usando
   `normalizarEixo`/`normalizarBooleano`/`derivarStatus`.

Nenhum passo altera `parser.ts`, o schema, ou qualquer outra marca já
configurada.

## 7. O que esta fase explicitamente NÃO fez

- Não importou nenhum registro real (7 tabelas novas, confirmadas vazias
  após a migration).
- Não conectou nenhuma marca real (as 15 entradas ficam `confirmed: false`).
- Não alterou nenhuma `Homologation` existente.
- Não fez commit.
