# Especificação de telas — Intelli Tire × protótipo DISEMP

> Para a sessão que abrir `Wilson-Software/intelli-tire-platform` e continuar a
> restauração visual. Mapeia **cada painel do protótipo → view que o alimenta →
> colunas exatas**, para implementar sem adivinhar nome de campo.
>
> Os nomes de painel abaixo foram extraídos do HTML do protótipo, não de
> memória. As colunas foram lidas do `pg_attribute` do banco real.
> Estado do banco: **30 views**, todas com `security_invoker` e `grant select`
> para `authenticated`.

## Regras que valem para os 18 módulos

1. **Nada de número inventado.** Painel sem view fica de fora até a view existir
   (tabela "Lacunas" no fim). Mesma disciplina do `ModulePlaceholder`.
2. **Fronteira RSC** — o bug que derrubou os dois módulos piloto: `page.tsx` é
   Server Component e **não pode passar função** para componente `"use client"`.
   - Gráficos: `formato="moeda" | "numero"`, nunca `formatarValor={fn}`.
   - `DataTable`: nunca definir `columns` (com `render`) inline no `page.tsx`.
     Criar um componente `"use client"` fino na feature que recebe só `linhas`.
   - Referência de componente (`icon={BarChart3}`) é segura; só função quebra.
3. **Agregação no SQL**, nunca em loop no frontend.
4. **Repository nunca filtra `tenant_id`** — o RLS já restringe.
5. `npm run build` não pega o erro da regra 2. Só `npm run dev` + browser.

---

## Vendas

Protótipo: 8 KPIs e 7 painéis. **Todos os 8 KPIs agora têm fonte** (antes eram 4).

| KPI | View | Coluna |
| --- | --- | --- |
| Valor Vendido | `v_vendas_resumo` | `valor_vendido` |
| Quantidade | `v_vendas_resumo` | `quantidade` |
| Lucro | `v_vendas_resumo` | `lucro` |
| Margem | `v_vendas_resumo` | `margem_percentual` |
| **Ticket Médio** | `v_vendas_resumo` | `ticket_medio` |
| **Nº Clientes** | `v_vendas_resumo` | `num_clientes` |
| **% Devolução** | `v_vendas_resumo` | `percentual_devolucao` |
| Nº Vendas | `v_vendas_resumo` | `num_vendas` |

| Painel | View | Colunas |
| --- | --- | --- |
| Evolução mensal — venda x lucro | `v_vendas_evolucao_mensal` | `mes, valor_venda, lucro_total` |
| Vendas por filial | `v_vendas_por_filial` | `filial, valor_venda, pedidos` |
| Lucro por filial | `v_vendas_por_filial` | `filial, lucro_total` |
| Detalhe por filial | `v_vendas_por_filial` | todas |
| **Top 8 marcas** | `v_vendas_por_marca` | `marca, valor_vendido, lucro, margem_percentual` |
| **Por família** | `v_vendas_por_familia` | `familia, valor_vendido, lucro` |
| **Por aro** | `v_vendas_por_aro` | `aro, valor_vendido, lucro` |

`v_vendas_resumo` devolve **uma linha só** — leia com `.single()`.

## Estoque

Protótipo: 5 KPIs. **Todos os 5 agora têm fonte.**

| KPI | View | Coluna |
| --- | --- | --- |
| Estoque Total | `v_estoque_resumo` | `estoque_total` |
| **Estoque Disponível** | `v_estoque_resumo` | `estoque_disponivel` |
| Valor em Estoque | `v_estoque_resumo` | `valor_estoque` |
| **Combinações sem estoque** | `v_estoque_resumo` | `combinacoes_sem_estoque` |
| **Combinações c/ alto saldo (>50un)** | `v_estoque_resumo` | `combinacoes_alto_saldo` |

| Painel | View | Colunas |
| --- | --- | --- |
| Estoque por filial | `v_estoque_saldos_por_filial` | `filial, disponivel, total, reservado, valor_estoque` |
| Estoque por marca | `v_estoque_por_marca` | `marca, quantidade_total, valor_total` |
| Estoque por aro | `v_estoque_por_aro` | `aro, quantidade_total, valor_total` |
| Estoque por família | `v_estoque_por_familia` | `familia, quantidade_total, valor_total` |
| Maior saldo disponível | `v_estoque_detalhe` | ordenar por `quantidade` desc |
| Sem estoque disponível (ruptura) | `v_estoque_detalhe` | filtrar `quantidade <= 0` |

**Mostrar disponível e total lado a lado** — é o que diferencia os dois KPIs.
`v_estoque_resumo` e `v_estoque_saldos_por_filial` já trazem `reservado` pronto.

**Ligar o `DrillModal`** nas duas últimas tabelas: no protótipo real, Estoque tem
29 linhas clicáveis (Vendas tem 0 — não implementar drill em Vendas).

## Compras

| Painel | View | Status |
| --- | --- | --- |
| Evolução mensal — valor comprado | `v_compras_evolucao_mensal` (`mes, pedidos, valor_total`) | pronto |
| Compras por família | `v_compras_por_familia` | pronto |
| Top 8 fornecedores | `v_compras_por_fornecedor` (`fornecedor, valor_total, pedidos, lead_time_medio_dias`) | pronto |
| Lead time médio — evolução | — | **lacuna** |
| Custo médio por marca | — | **lacuna** |

## Visão Geral (`/overview`)

Hoje cai no placeholder genérico `[modulo]`. **Precisa de `page.tsx` real.**

| Painel | View |
| --- | --- |
| Vendas vs. Compras — evolução mensal | `v_vendas_evolucao_mensal` + `v_compras_evolucao_mensal` (compor na página) |
| Vendas por segmento | `v_vendas_por_segmento` |
| Top 8 fornecedores | `v_compras_por_fornecedor` |
| Insights automáticos | template determinístico sobre as views acima — **não é IA** |

Compor dois domínios **na página**, chamando dois repositories. Feature nunca
importa feature.

## Lucratividade

| Painel | View | Status |
| --- | --- | --- |
| Evolução do lucro | `v_vendas_evolucao_mensal.lucro_total` | pronto |
| Lucro por filial | `v_lucro_filial_mensal` | pronto |
| Lucro por marca (top 8) | `v_vendas_por_marca.lucro` | pronto |
| Lucro por segmento | `v_vendas_por_segmento.lucro` | pronto |
| Lucro por aro | `v_vendas_por_aro.lucro` | pronto |
| Top 8 cidades | `v_vendas_por_municipio.lucro_total` | pronto |
| Top 8 medidas | — | **lacuna** |
| Top 8 vendedores (lucro) | — | **lacuna** (`v_vendas_por_vendedor` não tem lucro) |

## Vendedores

| Painel | View |
| --- | --- |
| Top 10 vendedores por valor vendido | `v_vendas_por_vendedor` (`vendedor, valor_venda, pedidos`) |
| Evolução mensal — comparação | `v_vendas_vendedor_mensal` (`vendedor, mes, valor_venda`) |

## Produtos

| Painel | View |
| --- | --- |
| Top 10 produtos por faturamento | `v_vendas_por_produto` |
| Desempenho e giro | `v_produtos_desempenho` (`quantidade_vendida_90d, margem_pct, saldo_atual, giro`) |

## Geografia

| Painel | View | Status |
| --- | --- | --- |
| Top 20 cidades | `v_vendas_por_municipio` | pronto |
| Ranking completo de cidades | `v_vendas_por_municipio` | pronto |
| Mapa de calor por cidade | — | **fora de escopo**: schema sem lat/lng |

## Central de Alertas

O protótipo tem **7 categorias** (o HANDOFF dizia 6). Composição de views na
página, sem tabela própria.

| Categoria | View | Status |
| --- | --- | --- |
| 🔴 Risco de ruptura | `v_reposicao_sugerida` (`saldo_atual <= 0` c/ demanda) | pronto |
| 🟡 Atenção (abaixo do mínimo) | `v_reposicao_sugerida` (`saldo_atual < estoque_minimo_sugerido`) | pronto |
| ⚠️ Compras atípicas | `v_compras_atipicas` | **pronto, não está na tela** |
| 📦 Excesso de estoque | `v_reposicao_sugerida` + `v_estoque_detalhe` | pronto |
| 🧊 Produtos sem venda | `v_produtos_desempenho` (`quantidade_vendida_90d = 0` e `saldo_atual > 0`) | pronto |
| 🐌 Fornecedor lead time alto | `v_compras_por_fornecedor` (`lead_time_medio_dias > 30`) | pronto |
| 💰 Oportunidades de compra | `v_oportunidades_precificacao` | pronto |

Havia também `v_reajustes_custo` pronta e fora da tela — cabe como 8ª categoria.

## Demais módulos

| Módulo | View / natureza |
| --- | --- |
| Reposição | `v_reposicao_sugerida` — fórmula v1, ver README |
| Oportunidades | `v_oportunidades_precificacao` (`diferenca_pct`; destaque ≥5 p.p. na UI) |
| Forecast | `v_forecast_produto` (`media_3m, media_6m, projecao_proximo_mes, historico_mensal`) |
| Inteligência Comercial | `v_vendas_segmento_mensal` + `v_vendas_segmento_marca_filial_mensal`; resumo é **template determinístico**, não IA |
| Simulador de Compras | calculadora client-side sobre `v_reposicao_sugerida` + produtos |
| Promoções / Preços de Mercado | **escrita**, `app.eventos_mercado`, append-only |
| Metas | **escrita**, CRUD, `app.metas`, optimistic locking via `versao` |
| Financeiro | composição de `v_compras_evolucao_mensal` + `v_compras_por_fornecedor` + `v_compras_por_familia` |

---

## Filtro global — o que mudou

O filtro (Ano/Mês/Segmento/Filial/Marca/Família/Aro) era **só visual** porque as
views vinham pré-agregadas num grão único. Isso mudou parcialmente:

- **Segmento** agora é real: `vendas.segmento_id` foi criada e `v_vendas_por_segmento`
  expõe o recorte. Antes o segmento vinha do produto, o que era errado — no ERP
  de origem ele é canal comercial da transação.
- **Marca, Família e Aro** têm recorte em Vendas (`v_vendas_por_marca/_familia/_aro`)
  e em Estoque.
- **Ano/Mês** continuam só nas views `_mensal`.
- Cruzar duas dimensões ao mesmo tempo ainda exige view nova ou função RPC
  parametrizada.

> ⚠️ `v_vendas_segmento_mensal` e `v_vendas_segmento_marca_filial_mensal` foram
> corrigidas na migration `segmento_das_vendas_com_fallback_no_modelo`. Elas
> derivavam segmento do produto com `INNER JOIN`; depois da carga isso devolveria
> **zero linhas sem erro nenhum**. Agora usam
> `coalesce(v.segmento_id, mo.segmento_id)`.

## Lacunas — o que cada uma exigiria

| Lacuna | View nova necessária |
| --- | --- |
| Lead time médio — evolução | agregado mensal de `compras`/`itens_compra` por fornecedor com média de lead time — exige `data_entrega_realizada` populada (a carga **não** preenche: a fonte não informa) |
| Custo médio por marca | `avg(itens_compra.custo_unitario)` por marca e mês |
| Compra por marca | `sum(itens_compra.valor_total_item)` por marca |
| Top 8 medidas (lucro) | `v_vendas_por_medida` — join em `medidas`, mesmo shape de `v_vendas_por_marca` |
| Lucro por vendedor | adicionar `sum(margem_valor)` a `v_vendas_por_vendedor` |
| Mapa de calor | **bloqueado**: sem lat/lng no schema. O protótipo traz `geo_coords` com 521 municípios — daria para popular, mas exige coluna nova em `clientes`/`filiais`. |
| Preço de mercado / concorrência | **bloqueado**: sem fonte. Resolvido como cadastro manual em `eventos_mercado`. |

## Ordem sugerida

1. `page.tsx` real para **Visão Geral** (hoje é placeholder).
2. **Estoque** — os 3 KPIs novos + disponível/total lado a lado + `DrillModal`.
3. **Vendas** — os 4 KPIs novos + os 3 painéis novos.
4. **Alertas** — 3 → 7 categorias (todas as views já existem).
5. **Lucratividade** e **Compras**.
6. Os demais, em lote.
7. Limpar componentes antigos (`TabelaDimensao`, `TabelaFiliais`, `TabelaVendedores`,
   `BarraEvolucao`, `ListaItens`) **só depois** da última página que os usa —
   conferir com grep exato antes de apagar.
