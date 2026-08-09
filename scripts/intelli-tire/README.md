# Carga do dataset real do Painel Executivo → Intelli Tire

> **Este diretório não pertence ao domínio do HomologaPneu.** Ele está neste
> repositório apenas como veículo de handoff, porque foi o único repositório
> acessível na sessão em que o trabalho foi feito. O alvo é o projeto Supabase
> **Intelli Tire** (`lfnsmldkkoykwkdoulrf`), schema `app`.
>
> **O script se recusa a rodar contra o banco do HomologaPneus.** A função
> `verificarBancoAlvo()` aborta antes de qualquer escrita se o banco não tiver a
> assinatura de schema do Intelli Tire, ou se encontrar as tabelas
> `Homologation` / `Tire` / `VehicleModel` do HomologaPneu.

## O que é

`carga-painel-executivo.ts` lê o HTML do protótipo
(`Painel_Executivo_Compras_Estoque_Vendas_8_2.html`, ~23 MB) — que carrega o
dataset real da distribuidora embutido em `<script id="dashboard-data">` — e o
carrega no schema transacional `app` do Intelli Tire.

O carregamento é **aditivo**: nenhum `DELETE`, nenhum `UPDATE` em linha
existente. Roda dentro de uma única transação (`begin` / `commit`), então falha
no meio não deixa carga parcial.

## Como rodar

```bash
npm i pg @types/pg tsx

export INTELLI_TIRE_DATABASE_URL="postgresql://postgres:<senha>@<host>:5432/postgres"

# 1) Ensaio: exercita toda a transformação em memória, sem banco, e imprime
#    quantas linhas seriam gravadas por tabela.
npx tsx scripts/intelli-tire/carga-painel-executivo.ts \
  --html ./Painel_Executivo_Compras_Estoque_Vendas_8_2.html \
  --tenant 11111111000101 \
  --dry-run

# 2) Carga real.
npx tsx scripts/intelli-tire/carga-painel-executivo.ts \
  --html ./Painel_Executivo_Compras_Estoque_Vendas_8_2.html \
  --tenant 11111111000101
```

`--tenant` aceita o CNPJ (só dígitos) ou o UUID da empresa.
`11111111000101` = *Distribuidora Alfa Pneus LTDA*, o tenant do login
`wilsonjunior0493@gmail.com`.

## Volume verificado (dry-run executado sobre o dataset real)

| Tabela             |   Linhas |
| ------------------ | -------: |
| `app.itens_venda`  |  131.344 |
| `app.vendas`       |  116.321 |
| `app.clientes`     |   31.916 |
| `app.produtos`     |    4.920 |
| `app.itens_compra` |    3.905 |
| `app.estoque_saldo`|    3.406 |
| `app.compras`      |    2.171 |
| `app.medidas`      |      624 |
| `app.modelos`      |      209 |
| `app.marcas`       |      205 |
| `app.fornecedores` |      165 |
| `app.vendedores`   |       66 |
| `app.segmentos`    |       22 |
| `app.filiais`      |       11 |
| `app.familias`     |        3 |
| **Total**          | **295.288** |

Período coberto: **2025-01-02 a 2026-07-31**.

## Migrations pré-requisito (já aplicadas no Intelli Tire)

| Migration | O que faz |
| --- | --- |
| `prepara_carga_dataset_real_afrouxa_not_nulls` | Torna nuláveis colunas que a fonte não alimenta (`filiais.codigo_interno/uf/municipio/area_m2`, `clientes.documento/uf`, `fornecedores.documento`, `vendedores.filial_id/matricula`, `modelos.segmento_id`); adiciona `vendas.segmento_id`; cria índices para o volume real. |
| `carga_dataset_real_compras_sem_filial` | Torna `compras.filial_id` nulável — o extrato de compras não informa a filial de entrada. |
| `carga_dataset_real_modelo_sem_classificacao` | Torna `modelos.marca_id` e `modelos.familia_id` nuláveis — há item sem classificação na fonte. |

Todas são **aditivas ou de afrouxamento**: nenhuma coluna removida, nenhum dado
existente alterado. Se a carga não for executada, elas são inertes — mas o
afrouxamento dos `NOT NULL` fica de pé, então re-aperte se decidir não carregar.

## Fidelidade do dado

Princípio: **nada é inventado**. Onde a fonte não informa, a coluna fica `NULL`.

- `clientes.documento`, `clientes.uf` → `NULL` (a fonte só traz razão social e cidade).
- `vendedores.matricula`, `vendedores.filial_id` → `NULL` (a filial do vendedor varia mês a mês; não é atributo fixo).
- `compras.filial_id` → `NULL`.
- `filiais.uf/municipio/area_m2/codigo_interno` → `NULL`.
- `clientes.municipio` → cidade **mais frequente** nas transações do próprio cliente (derivado do dado, não inventado).
- `clientes.tipo` (PF/PJ) → **única heurística** da carga: inferida do sufixo empresarial da razão social (`LTDA`, `S.A.`, `EIRELI`, `ME`…). Marcada com `origem_dado = 'importacao'`.

### Decisões de modelagem

- **Segmento é atributo da venda, não do produto.** No ERP de origem os 22
  segmentos (`ATACADO`, `LOJA`, `FROTA`, `LOCALIZA`…) são canal comercial da
  transação. Por isso `vendas.segmento_id` foi criada e `modelos.segmento_id`
  ficou nulável — em vez de fabricar um segmento por produto.
- **Uma venda por (NF, filial)**; cada linha transacional vira um `itens_venda`.
  131.344 linhas colapsam em 116.321 notas.
- **Compras vêm de `ultimo_custo`**, único bloco do dataset no grão de transação
  (NF + fornecedor + produto + data). `compras_agg` é pré-agregado por mês/marca
  e não permite reconstruir o item.
- **Catálogo = `produto_agg` ∪ `estoque_produto_agg`.** O primeiro só cobre
  produtos com movimento; sem a união, 363 posições de estoque ficariam órfãs.
- **Devoluções preservadas** como quantidades/valores negativos, como na fonte.

### Descarte conhecido

62 linhas de `ultimo_custo` referenciam produtos que não aparecem em nenhum dos
dois blocos de catálogo — sem descrição, marca, família ou medida, não há como
cadastrá-los sem inventar. São ignoradas. Todo o resto do dataset é carregado.

## Estado pendente no tenant de destino

O tenant *Distribuidora Alfa Pneus LTDA* já contém **dados de seed sintéticos**
anteriores (28 vendas, 36 produtos, 16 clientes). A carga é aditiva e **não os
remove** — remover exige `DELETE`, que não foi executado sem confirmação
explícita. Depois da carga eles ficam misturados ao dado real (≈0,02% do
volume). Para limpá-los, o critério seguro é `criado_em` anterior à data da
carga, revisado antes de rodar.
