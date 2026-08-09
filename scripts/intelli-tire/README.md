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
| `estoque_saldo_disponivel_e_total` | Adiciona `estoque_saldo.quantidade_total`; `quantidade` passa a ser explicitamente o saldo disponível. |

| `views_kpis_faltantes_do_prototipo` | Cria 7 views novas com os KPIs que o protótipo mostra e nenhuma view calculava. Nenhuma view existente foi alterada. |
| `segmento_das_vendas_com_fallback_no_modelo` | Corrige regressão: `v_vendas_segmento_mensal` e `v_vendas_segmento_marca_filial_mensal` derivavam segmento do produto com `INNER JOIN` e voltariam vazias após a carga. Passam a usar `coalesce(vendas.segmento_id, modelos.segmento_id)`. |

Todas são **aditivas ou de afrouxamento**: nenhuma coluna removida, nenhum dado
existente alterado. Se a carga não for executada, elas são inertes — mas o
afrouxamento dos `NOT NULL` fica de pé, então re-aperte se decidir não carregar.

As migrations foram aplicadas direto no projeto. Para trazer os arquivos `.sql`
para `supabase/migrations/` do repositório do Intelli Tire:

```bash
supabase link --project-ref lfnsmldkkoykwkdoulrf
supabase db pull
```

Para a especificação de tela por módulo (painel → view → colunas), ver
[`ESPECIFICACAO-TELAS.md`](./ESPECIFICACAO-TELAS.md).

## Views novas (KPIs do protótipo que faltavam)

Todas com `security_invoker = true` e `grant select ... to authenticated` na
mesma migration; nenhuma filtra `tenant_id` explicitamente (o RLS já restringe).
Auditadas depois de criadas: `anon` não recebeu grant em nenhuma.

| View | Resolve |
| --- | --- |
| `v_estoque_resumo` | Os 5 KPIs de estoque: total, **disponível**, reservado, valor, **combinações sem estoque** e **com saldo > 50 un**. "Combinação" = filial × marca × família × aro, o grão do protótipo. |
| `v_estoque_saldos_por_filial` | Disponível × total × reservado por filial, lado a lado. |
| `v_vendas_resumo` | Os 3 KPIs de vendas ausentes: **ticket médio**, **nº de clientes** e **% de devolução** (item com quantidade negativa, como vem do ERP), além de valor/quantidade/lucro/margem. |
| `v_vendas_por_marca` | Top marcas — painel ausente. |
| `v_vendas_por_familia` | Vendas por família — painel ausente. |
| `v_vendas_por_aro` | Vendas por aro — painel ausente. |
| `v_vendas_por_segmento` | Vendas por canal comercial. Depende de `vendas.segmento_id`; fica vazia até a carga rodar. |

`estoque_total` usa `quantidade_total` com fallback para `quantidade` quando a
fonte não informou o saldo total — assim linhas antigas não viram zero.

Ainda **sem view**, porque dependem de dado que o schema não tem: mapa de calor
geográfico (falta lat/lng) e comparação com preço de mercado/concorrência
(não há fonte).

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
- **Estoque disponível e total lado a lado.** `estoque_saldo.quantidade` é o
  saldo disponível (livre para venda) e `quantidade_total` inclui o
  reservado/em trânsito — os dois KPIs que o protótipo mostra separados.

### Rateio do saldo total (única derivação com estimativa)

A fonte informa o disponível por *(filial, produto)*, mas o total apenas **por
produto**. A diferença é o reservado, que o extrato não quebra por filial:

| Caso | Regra | Produtos |
| --- | --- | --- |
| Sem reservado (`total == disponível`) | `total_i = disponível_i` | 1.713 |
| Produto numa única filial | `total_i = total` | 1.726 |
| Multi-filial **com** reservado | rateio proporcional ao disponível, resto na maior | 340 |

Os dois primeiros casos são **exatos** e cobrem 85,7% dos produtos. Só o
terceiro é estimado — 976 das 3.406 posições. O rateio preserva os agregados
que o painel exibe: soma do disponível = **36.412** e soma do total =
**43.033**, ambas idênticas à fonte (verificado no dry-run). O que ele estima é
apenas *como* o reservado se reparte entre filiais.

### Descarte conhecido

62 linhas de `ultimo_custo` referenciam produtos que não aparecem em nenhum dos
dois blocos de catálogo — sem descrição, marca, família ou medida, não há como
cadastrá-los sem inventar. São ignoradas. Todo o resto do dataset é carregado.

## Estado do tenant de destino

O seed sintético do tenant *Distribuidora Alfa Pneus LTDA* foi **removido**
(28 vendas, 43 itens, 22 compras, 36 produtos, 36 posições de estoque, 8
clientes e as dimensões associadas). A empresa, os 2 usuários e os papéis foram
preservados — o login segue funcionando. O tenant está vazio e pronto para
receber a carga sem mistura com fixture.

O tenant *Rede Beta Auto Center SA* **ainda tem o seed** (33 vendas, 36
produtos etc.). Não foi tocado.
