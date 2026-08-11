/**
 * Carga do dataset real do Painel Executivo (protótipo DISEMP) no banco do
 * INTELLI TIRE.
 *
 * ATENCAO — ESTE SCRIPT NAO PERTENCE AO DOMINIO DO HOMOLOGAPNEU.
 * Ele existe neste repositorio apenas como veiculo de handoff. O alvo e o
 * projeto Supabase "Intelli Tire" (ref lfnsmldkkoykwkdoulrf), schema `app`.
 * Ha uma trava explicita em `verificarBancoAlvo()` que aborta a execucao se a
 * connection string apontar para o banco do HomologaPneus (ou qualquer banco
 * que nao tenha a assinatura de schema do Intelli Tire).
 *
 * Uso:
 *   export INTELLI_TIRE_DATABASE_URL="postgresql://postgres:<senha>@<host>:5432/postgres"
 *   npx tsx scripts/intelli-tire/carga-painel-executivo.ts \
 *     --html ./Painel_Executivo_Compras_Estoque_Vendas_8_2.html \
 *     --tenant 11111111000101
 *
 *   Flags:
 *     --html <caminho>   HTML do prototipo (contem o dataset embutido). Obrigatorio.
 *     --tenant <cnpj>    CNPJ (so digitos) ou UUID do tenant de destino. Obrigatorio.
 *     --dry-run          Extrai, valida e imprime o plano de carga sem escrever nada.
 *
 * Dependencia: `pg`.  (npm i pg @types/pg)
 *
 * Pre-requisito de schema: as migrations
 *   - prepara_carga_dataset_real_afrouxa_not_nulls
 *   - carga_dataset_real_compras_sem_filial
 * ja devem estar aplicadas (ambas ja foram aplicadas no projeto Intelli Tire).
 *
 * Principio de fidelidade: nenhum valor e inventado. Onde a fonte nao informa
 * (CNPJ de cliente, UF, matricula de vendedor, filial da compra, area da
 * filial), a coluna fica NULL. A unica derivacao heuristica e `clientes.tipo`
 * (PF/PJ), inferida do sufixo empresarial da razao social e marcada como tal
 * via `origem_dado = 'importacao'`.
 */

import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Client } from "pg";

/* ------------------------------------------------------------------ *
 * Tipos do dataset embutido no HTML
 * ------------------------------------------------------------------ */

interface ProdutoAgg {
  ProdCode: number;
  Descricao: string;
  MARCA: string;
  FAMILIA: string;
  ARO: string;
  Medida: string;
}

interface EstoqueFilialProduto {
  FILIAL: string;
  ProdCode: number;
  saldo_disponivel: number;
}

interface EstoqueProdutoAgg {
  ProdCode: number;
  saldo_disponivel: number;
  saldo_total: number;
  valor_estoque: number;
}

interface FornecedorAgg {
  Fornecedor: string;
}

interface UltimoCusto {
  ProdCode: number;
  Data: string;
  NF: number;
  Fornecedor: string;
  ValorUnitario: number;
  Quantidade: number;
  ValorFinal: number;
}

interface TxDims {
  clientes: string[];
  cidades: string[];
  vendedores: string[];
  filiais: string[];
  segmentos: string[];
}

/**
 * Layout documentado no proprio prototipo:
 * [0]ProdCode [1]data [2]nf [3]cliente_idx [4]cidade_idx [5]vendedor_idx
 * [6]filial_idx [7]segmento_idx [8]qty [9]valor [10]lucro
 */
type TxRow = [
  number,
  string,
  number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number,
  number,
  number,
];

interface Dataset {
  produto_agg: ProdutoAgg[];
  estoque_filial_produto: EstoqueFilialProduto[];
  estoque_produto_agg: EstoqueProdutoAgg[];
  fornecedor_agg: FornecedorAgg[];
  ultimo_custo: UltimoCusto[];
  tx_dims: TxDims;
  tx_rows: TxRow[];
}

/* ------------------------------------------------------------------ *
 * Utilitarios
 * ------------------------------------------------------------------ */

const LOTE = 1000;

/**
 * Sentinelas para os campos obrigatorios que a fonte pode nao informar.
 *
 * Ha itens no extrato (hoje 5) que chegam com MARCA, FAMILIA, Medida, ARO e
 * Descricao TODOS nulos — produto que existe no saldo de estoque mas perdeu o
 * cadastro no ERP. Como `medidas.descricao` e `produtos.descricao` sao NOT
 * NULL, inserir o nulo derruba a carga inteira no meio.
 *
 * O sentinela e explicito e reconhecivel: nao finge classificacao, deixa claro
 * na propria string que o dado nao veio. Mesmo espirito do modelo
 * "NAO INFORMADO" em `nomeModelo()`.
 *
 * Marca e familia NAO usam sentinela: `modelos.marca_id`/`familia_id` sao
 * nulaveis (migration `carga_dataset_real_modelo_sem_classificacao`), e NULL
 * diz "nao classificado" com mais honestidade do que uma marca falsa que
 * apareceria nos rankings do painel. Sentinela so onde o NOT NULL obriga.
 */
const MEDIDA_SENTINELA = "SEM MEDIDA INFORMADA";

function log(msg: string): void {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

/** ProdCode e float no JSON (ex. 8.0001). Serializa de forma estavel. */
function codigoProduto(v: number): string {
  return String(v);
}

/** Divide preservando o sinal; devolve null quando o denominador e zero. */
function dividir(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

/**
 * Heuristica PF/PJ a partir do sufixo empresarial da razao social.
 * E a unica inferencia do carregamento — documentada e reversivel.
 */
const SUFIXOS_PJ =
  /\b(LTDA|S\.?A\.?|EIRELI|ME|EPP|MEI|CIA|COMPANHIA|COMERCIO|COMERCIAL|INDUSTRIA|DISTRIBUIDORA|TRANSPORTES?|SERVICOS?|ASSOCIACAO|COOPERATIVA|CONDOMINIO|PNEUS?|AUTO|POSTO|SUPERMERCADO)\b/i;

function inferirTipoPessoa(razaoSocial: string): "PF" | "PJ" {
  return SUFIXOS_PJ.test(razaoSocial) ? "PJ" : "PF";
}

/** Extrai largura/perfil da medida quando o formato permite (195/65R15). */
function parsearMedida(medida: string): { largura: number | null; perfil: number | null } {
  const m = /^(\d{2,3})\s*\/\s*(\d{2,3})/.exec(medida);
  if (m) return { largura: Number(m[1]), perfil: Number(m[2]) };
  return { largura: null, perfil: null };
}

/**
 * Atribui o saldo TOTAL do produto as suas filiais.
 *
 * A fonte informa o disponivel por (filial, produto), mas o total apenas por
 * produto. A diferenca (total - disponivel) e o reservado/em transito, que o
 * extrato nao quebra por filial. Casos:
 *
 *  - Sem reservado (total == disponivel): total_i = disponivel_i. EXATO.
 *  - Produto numa unica filial:           total_i = total.          EXATO.
 *  - Multi-filial COM reservado:          rateio proporcional ao disponivel
 *    de cada filial, com o resto indo para a maior — unico caso derivado.
 *
 * O rateio preserva os dois agregados que o painel mostra: a soma do
 * disponivel e a soma do total continuam batendo com a fonte. Ele so estima
 * COMO o reservado se reparte entre filiais. Nos dados atuais isso alcanca
 * 340 dos 2.375 produtos (976 das 3.406 posicoes).
 */
function distribuirTotal(
  disponiveis: number[],
  total: number | null,
  dispProduto: number | null,
): { valores: (number | null)[]; rateado: boolean } {
  if (total == null || dispProduto == null) {
    return { valores: disponiveis.map(() => null), rateado: false };
  }

  const reservado = total - dispProduto;
  if (reservado <= 0.01) return { valores: [...disponiveis], rateado: false };
  if (disponiveis.length === 1) return { valores: [total], rateado: false };

  const soma = disponiveis.reduce((a, b) => a + b, 0);
  const pesos =
    soma > 0 ? disponiveis.map((d) => d / soma) : disponiveis.map(() => 1 / disponiveis.length);

  const extras = pesos.map((p) => Math.round(reservado * p));
  // Corrige o arredondamento na maior posicao para a soma fechar exata.
  const diferenca = reservado - extras.reduce((a, b) => a + b, 0);
  if (diferenca !== 0) {
    let maior = 0;
    for (let i = 1; i < disponiveis.length; i++) if (disponiveis[i] > disponiveis[maior]) maior = i;
    extras[maior] += diferenca;
  }

  return { valores: disponiveis.map((d, i) => d + extras[i]), rateado: true };
}

/**
 * Nome do modelo = MARCA + FAMILIA. Ha item sem classificacao na fonte;
 * nesse caso o modelo vira "NAO INFORMADO" com marca/familia nulas, em vez de
 * gerar um nome "null null" ou quebrar a FK.
 */
function nomeModelo(p: Pick<ProdutoAgg, "MARCA" | "FAMILIA">): string {
  const partes = [p.MARCA, p.FAMILIA].filter((x): x is string => Boolean(x));
  return partes.length > 0 ? partes.join(" ") : "NAO INFORMADO";
}

/** Medida do produto, com sentinela quando a fonte nao informa. */
function medidaDe(p: Pick<ProdutoAgg, "Medida">): string {
  return p.Medida || MEDIDA_SENTINELA;
}

/** Descricao do produto, com o proprio codigo como fallback legivel. */
function descricaoDe(p: Pick<ProdutoAgg, "Descricao">, codigo: string): string {
  return p.Descricao || `PRODUTO ${codigo} (sem descricao na fonte)`;
}

function parsearAro(aro: string): number | null {
  const n = Number.parseFloat(String(aro).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* ------------------------------------------------------------------ *
 * Extracao do dataset a partir do HTML
 * ------------------------------------------------------------------ */

/**
 * O HTML tem ~23MB numa unica linha de dados. Le linha a linha para nao
 * carregar o arquivo inteiro (incluindo o Chart.js embutido) na memoria.
 */
async function extrairDataset(caminhoHtml: string): Promise<Dataset> {
  const marcador = '<script id="dashboard-data" type="application/json">';
  const rl = createInterface({
    input: createReadStream(caminhoHtml, { encoding: "utf8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const linha of rl) {
    const inicio = linha.indexOf(marcador);
    if (inicio === -1) continue;
    const fim = linha.lastIndexOf("</script>");
    if (fim === -1) throw new Error("Bloco dashboard-data sem fechamento </script>.");
    rl.close();
    return JSON.parse(linha.slice(inicio + marcador.length, fim)) as Dataset;
  }

  throw new Error(
    `Nao encontrei <script id="dashboard-data"> em ${caminhoHtml}. ` +
      "O arquivo e o HTML do painel executivo?",
  );
}

/* ------------------------------------------------------------------ *
 * Executor: o cliente real do Postgres ou o stub de --dry-run
 * ------------------------------------------------------------------ */

/**
 * Minimo de que a carga precisa de um cliente Postgres. Permite exercitar
 * toda a transformacao em --dry-run, sem banco, com o mesmo caminho de codigo
 * que roda em producao.
 */
interface Executor {
  query<T = Record<string, string>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

/** Stub de --dry-run: nunca escreve; apenas contabiliza o que seria gravado. */
class ExecutorSimulado implements Executor {
  readonly inseridos = new Map<string, number>();

  async query<T = Record<string, string>>(
    text: string,
    values: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    const insert = /^insert into (\S+) \(([^)]*)\)/i.exec(text);
    if (insert) {
      const tabela = insert[1];
      const nCols = insert[2].split(",").length;
      const linhas = values.length / nCols;
      this.inseridos.set(tabela, (this.inseridos.get(tabela) ?? 0) + linhas);
    }
    // Banco vazio do ponto de vista da carga: nenhuma linha preexistente.
    return { rows: [] };
  }
}

/* ------------------------------------------------------------------ *
 * Trava de banco alvo
 * ------------------------------------------------------------------ */

/**
 * Aborta se a connection string nao apontar para um banco com a assinatura do
 * Intelli Tire. Protege contra o erro de apontar para o HomologaPneus, cujo
 * schema (Prisma, tabelas Homologation/Tire/VehicleModel em `public`) nao tem
 * nada a ver com este dataset.
 */
async function verificarBancoAlvo(client: Executor): Promise<void> {
  const { rows } = await client.query<{ tabela: string }>(
    `select table_name as tabela
       from information_schema.tables
      where table_schema = 'app'
        and table_name in ('empresas','vendas','itens_venda','produtos','estoque_saldo')`,
  );
  const encontradas = new Set(rows.map((r) => r.tabela));
  const faltando = ["empresas", "vendas", "itens_venda", "produtos", "estoque_saldo"].filter(
    (t) => !encontradas.has(t),
  );
  if (faltando.length > 0) {
    throw new Error(
      "BANCO ALVO INCORRETO — abortado antes de qualquer escrita.\n" +
        `Faltam as tabelas do Intelli Tire no schema 'app': ${faltando.join(", ")}.\n` +
        "Confira INTELLI_TIRE_DATABASE_URL. Este script NUNCA deve rodar contra o banco do HomologaPneus.",
    );
  }

  const { rows: homologa } = await client.query<{ n: string }>(
    `select count(*)::text as n
       from information_schema.tables
      where table_schema = 'public' and table_name in ('Homologation','Tire','VehicleModel')`,
  );
  if (Number(homologa[0].n) > 0) {
    throw new Error(
      "BANCO ALVO INCORRETO — abortado antes de qualquer escrita.\n" +
        "Encontrei tabelas do HomologaPneu (Homologation/Tire/VehicleModel) neste banco.",
    );
  }
}

/** Todas as tabelas que a carga escreve, na ordem de dependencia. */
const TABELAS_ALVO = [
  "filiais",
  "segmentos",
  "marcas",
  "familias",
  "medidas",
  "modelos",
  "produtos",
  "vendedores",
  "fornecedores",
  "clientes",
  "estoque_saldo",
  "compras",
  "itens_compra",
  "vendas",
  "itens_venda",
] as const;

/**
 * Guarda de idempotencia. A carga e aditiva: rodar duas vezes duplicaria
 * ~295 mil linhas, e as tabelas de fato (vendas, itens) nao tem chave natural
 * que o banco possa usar para rejeitar a repetida. Entao a protecao e antes:
 * se QUALQUER tabela alvo ja tem linha deste tenant, aborta sem escrever nada.
 *
 * Vale para todas as 15 tabelas, nao so vendas — dimensao repetida tambem suja
 * o painel (marca duplicada vira duas fatias no mesmo grafico).
 */
async function verificarTenantVazio(client: Executor, tenantId: string): Promise<void> {
  const consulta = TABELAS_ALVO.map(
    (t) => `select '${t}' as tabela, count(*)::text as linhas from app.${t} where tenant_id = $1`,
  ).join(" union all ");

  const { rows } = await client.query<{ tabela: string; linhas: string }>(consulta, [tenantId]);
  const ocupadas = rows.filter((r) => Number(r.linhas) > 0);
  if (ocupadas.length === 0) return;

  const detalhe = ocupadas
    .sort((a, b) => Number(b.linhas) - Number(a.linhas))
    .map((r) => `  app.${r.tabela.padEnd(16)} ${Number(r.linhas).toLocaleString("pt-BR")}`)
    .join("\n");

  throw new Error(
    "TENANT NAO ESTA VAZIO — abortado antes de qualquer escrita.\n\n" +
      "A carga e aditiva e nao tem como detectar linha repetida depois de gravada.\n" +
      "Rodar por cima duplicaria o dataset. Tabelas ja populadas neste tenant:\n\n" +
      `${detalhe}\n\n` +
      "Se a intencao e recarregar, esvazie o tenant primeiro (na ordem inversa das\n" +
      "FKs: itens_venda, vendas, itens_compra, compras, estoque_saldo, produtos,\n" +
      "modelos, medidas, marcas, familias, segmentos, clientes, fornecedores,\n" +
      "vendedores, filiais) e rode de novo.",
  );
}

async function resolverTenant(client: Executor, ref: string): Promise<{ id: string; nome: string }> {
  const porUuid = /^[0-9a-f-]{36}$/i.test(ref);
  const { rows } = await client.query<{ id: string; razao_social: string }>(
    porUuid
      ? `select id, razao_social from app.empresas where id = $1`
      : `select id, razao_social from app.empresas where cnpj = $1`,
    [ref],
  );
  if (rows.length === 0) throw new Error(`Tenant nao encontrado para "${ref}".`);
  return { id: rows[0].id, nome: rows[0].razao_social };
}

/* ------------------------------------------------------------------ *
 * Insercao em lote
 * ------------------------------------------------------------------ */

/** INSERT multi-linha parametrizado, em lotes, dentro da transacao corrente. */
async function inserirLotes(
  client: Executor,
  tabela: string,
  colunas: string[],
  linhas: unknown[][],
  rotulo: string,
): Promise<void> {
  if (linhas.length === 0) {
    log(`  ${rotulo}: nada a inserir`);
    return;
  }
  const nCols = colunas.length;
  let gravadas = 0;

  for (let i = 0; i < linhas.length; i += LOTE) {
    const fatia = linhas.slice(i, i + LOTE);
    const placeholders = fatia
      .map((_, r) => `(${colunas.map((_, c) => `$${r * nCols + c + 1}`).join(",")})`)
      .join(",");
    await client.query(
      `insert into ${tabela} (${colunas.join(",")}) values ${placeholders}`,
      fatia.flat(),
    );
    gravadas += fatia.length;
    if (gravadas % 20000 === 0 || gravadas === linhas.length) {
      log(`  ${rotulo}: ${gravadas.toLocaleString("pt-BR")}/${linhas.length.toLocaleString("pt-BR")}`);
    }
  }
}

/**
 * Insere os nomes ainda inexistentes numa tabela de dimensao simples
 * (id, tenant_id, nome) e devolve o mapa nome -> id ja com o que existia.
 */
async function carregarDimensao(
  client: Executor,
  tabela: string,
  tenantId: string,
  nomes: string[],
  colunaNome = "nome",
): Promise<Map<string, string>> {
  const { rows: existentes } = await client.query<{ id: string; nome: string }>(
    `select id, ${colunaNome} as nome from ${tabela} where tenant_id = $1`,
    [tenantId],
  );
  const mapa = new Map(existentes.map((r) => [r.nome, r.id]));

  const novos = nomes
    .filter((n) => n != null && n !== "" && !mapa.has(n))
    .map((n) => {
      const id = randomUUID();
      mapa.set(n, id);
      return [id, tenantId, n];
    });

  await inserirLotes(client, tabela, ["id", "tenant_id", colunaNome], novos, tabela);
  return mapa;
}

/* ------------------------------------------------------------------ *
 * Carga principal
 * ------------------------------------------------------------------ */

interface Opcoes {
  html: string;
  tenant: string;
  dryRun: boolean;
}

function lerArgs(): Opcoes {
  const argv = process.argv.slice(2);
  const pegar = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const html = pegar("--html");
  const tenant = pegar("--tenant");
  if (!html || !tenant) {
    throw new Error(
      "Uso: tsx carga-painel-executivo.ts --html <arquivo.html> --tenant <cnpj|uuid> [--dry-run]",
    );
  }
  return { html, tenant, dryRun: argv.includes("--dry-run") };
}

async function main(): Promise<void> {
  const opcoes = lerArgs();
  const connectionString = process.env.INTELLI_TIRE_DATABASE_URL;
  if (!connectionString && !opcoes.dryRun) {
    throw new Error("Defina INTELLI_TIRE_DATABASE_URL com a connection string do banco Intelli Tire.");
  }

  log(`Extraindo dataset de ${opcoes.html} ...`);
  const d = await extrairDataset(opcoes.html);
  log(
    `Dataset: ${d.tx_rows.length.toLocaleString("pt-BR")} transacoes, ` +
      `${d.produto_agg.length.toLocaleString("pt-BR")} produtos, ` +
      `${d.tx_dims.clientes.length.toLocaleString("pt-BR")} clientes, ` +
      `${d.tx_dims.filiais.length} filiais, ${d.fornecedor_agg.length} fornecedores.`,
  );

  const clienteReal = opcoes.dryRun ? null : new Client({ connectionString });
  if (clienteReal) await clienteReal.connect();

  const simulado = opcoes.dryRun ? new ExecutorSimulado() : null;
  const client: Executor = clienteReal ?? simulado!;

  try {
    let tenant: { id: string; nome: string };
    if (clienteReal) {
      await verificarBancoAlvo(client);
      tenant = await resolverTenant(client, opcoes.tenant);
      log(`Banco alvo validado. Tenant: ${tenant.nome} (${tenant.id})`);
      await verificarTenantVazio(client, tenant.id);
      log("Tenant vazio confirmado nas 15 tabelas alvo.");
    } else {
      tenant = { id: randomUUID(), nome: "(simulado)" };
      log("--dry-run: sem banco. Exercitando a transformacao completa em memoria.");
    }

    await client.query("begin");

    /* ---------------- Catalogo de produtos ---------------- */

    // `produto_agg` cobre apenas produtos com movimento (venda/compra). Ha
    // itens que so aparecem no estoque — sem uni-los, 363 posicoes de estoque
    // ficariam orfas e seriam descartadas. `estoque_produto_agg` traz os
    // mesmos campos descritivos, entao serve de complemento.
    const catalogo: ProdutoAgg[] = [...d.produto_agg];
    const vistos = new Set(catalogo.map((p) => codigoProduto(p.ProdCode)));
    for (const e of d.estoque_produto_agg as unknown as ProdutoAgg[]) {
      const codigo = codigoProduto(e.ProdCode);
      if (vistos.has(codigo)) continue;
      vistos.add(codigo);
      catalogo.push(e);
    }
    log(
      `Catalogo: ${catalogo.length.toLocaleString("pt-BR")} produtos ` +
        `(${d.produto_agg.length.toLocaleString("pt-BR")} com movimento + ` +
        `${(catalogo.length - d.produto_agg.length).toLocaleString("pt-BR")} apenas em estoque).`,
    );

    /* ---------------- Dimensoes simples ---------------- */

    const marcas = await carregarDimensao(
      client,
      "app.marcas",
      tenant.id,
      [...new Set(catalogo.map((p) => p.MARCA))],
    );
    const familias = await carregarDimensao(
      client,
      "app.familias",
      tenant.id,
      [...new Set(catalogo.map((p) => p.FAMILIA))],
    );
    const segmentos = await carregarDimensao(client, "app.segmentos", tenant.id, d.tx_dims.segmentos);
    const filiais = await carregarDimensao(client, "app.filiais", tenant.id, d.tx_dims.filiais);

    /* ---------------- Medidas ---------------- */

    // Conta quantas vezes cada sentinela foi necessario, para o log avisar.
    const semMedida = catalogo.filter((p) => !p.Medida).length;
    const semMarca = catalogo.filter((p) => !p.MARCA).length;
    const semDescricao = catalogo.filter((p) => !p.Descricao).length;
    if (semMedida || semMarca || semDescricao) {
      log(
        `  AVISO: fonte incompleta — ${semMedida} produto(s) sem medida, ` +
          `${semMarca} sem marca, ${semDescricao} sem descricao. ` +
          `Usando sentinela explicito em vez de NULL (violaria NOT NULL).`,
      );
    }

    const medidasFonte = new Map<string, ProdutoAgg>();
    for (const p of catalogo) if (!medidasFonte.has(medidaDe(p))) medidasFonte.set(medidaDe(p), p);

    const { rows: medidasExistentes } = await client.query<{ id: string; descricao: string }>(
      `select id, descricao from app.medidas where tenant_id = $1`,
      [tenant.id],
    );
    const medidas = new Map(medidasExistentes.map((r) => [r.descricao, r.id]));
    const novasMedidas: unknown[][] = [];
    for (const [descricao, p] of medidasFonte) {
      if (medidas.has(descricao)) continue;
      const id = randomUUID();
      medidas.set(descricao, id);
      const { largura, perfil } = parsearMedida(descricao);
      novasMedidas.push([id, tenant.id, descricao, largura, perfil, parsearAro(p.ARO)]);
    }
    await inserirLotes(
      client,
      "app.medidas",
      ["id", "tenant_id", "descricao", "largura", "perfil", "aro"],
      novasMedidas,
      "app.medidas",
    );

    /* ---------------- Modelos (marca x familia) ---------------- */

    const { rows: modelosExistentes } = await client.query<{ id: string; nome: string }>(
      `select id, nome from app.modelos where tenant_id = $1`,
      [tenant.id],
    );
    const modelos = new Map(modelosExistentes.map((r) => [r.nome, r.id]));
    const novosModelos: unknown[][] = [];
    for (const p of catalogo) {
      const nome = nomeModelo(p);
      if (modelos.has(nome)) continue;
      const id = randomUUID();
      modelos.set(nome, id);
      // segmento_id fica NULL: no ERP de origem o segmento e atributo da venda.
      // marca/familia tambem podem ser NULL — ha item sem classificacao na fonte.
      novosModelos.push([
        id,
        tenant.id,
        p.MARCA ? (marcas.get(p.MARCA) ?? null) : null,
        p.FAMILIA ? (familias.get(p.FAMILIA) ?? null) : null,
        nome,
      ]);
    }
    await inserirLotes(
      client,
      "app.modelos",
      ["id", "tenant_id", "marca_id", "familia_id", "nome"],
      novosModelos,
      "app.modelos",
    );

    /* ---------------- Produtos ---------------- */

    const { rows: produtosExistentes } = await client.query<{ id: string; codigo_interno: string }>(
      `select id, codigo_interno from app.produtos where tenant_id = $1`,
      [tenant.id],
    );
    const produtos = new Map(produtosExistentes.map((r) => [r.codigo_interno, r.id]));
    const novosProdutos: unknown[][] = [];
    for (const p of catalogo) {
      const codigo = codigoProduto(p.ProdCode);
      if (produtos.has(codigo)) continue;
      const id = randomUUID();
      produtos.set(codigo, id);
      novosProdutos.push([
        id,
        tenant.id,
        modelos.get(nomeModelo(p)),
        medidas.get(medidaDe(p)),
        codigo,
        descricaoDe(p, codigo),
        "importacao",
      ]);
    }
    await inserirLotes(
      client,
      "app.produtos",
      ["id", "tenant_id", "modelo_id", "medida_id", "codigo_interno", "descricao", "origem_dado"],
      novosProdutos,
      "app.produtos",
    );

    /* ---------------- Vendedores ---------------- */

    // filial_id e matricula ficam NULL: a fonte so informa o nome, e a filial
    // do vendedor varia mes a mes (nao e atributo fixo do cadastro).
    const vendedores = await carregarDimensao(
      client,
      "app.vendedores",
      tenant.id,
      d.tx_dims.vendedores,
    );

    /* ---------------- Fornecedores ---------------- */

    const fornecedores = await carregarDimensao(
      client,
      "app.fornecedores",
      tenant.id,
      d.fornecedor_agg.map((f) => f.Fornecedor),
      "razao_social",
    );

    /* ---------------- Clientes ---------------- */

    // Municipio: cidade mais frequente nas transacoes do proprio cliente.
    const cidadePorCliente = new Map<number, Map<string, number>>();
    for (const r of d.tx_rows) {
      const ci = r[3];
      const cid = r[4];
      if (ci == null || cid == null) continue;
      let contagem = cidadePorCliente.get(ci);
      if (!contagem) cidadePorCliente.set(ci, (contagem = new Map()));
      const nome = d.tx_dims.cidades[cid];
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    const municipioDe = (idx: number): string | null => {
      const contagem = cidadePorCliente.get(idx);
      if (!contagem) return null;
      let melhor: string | null = null;
      let max = -1;
      for (const [cidade, n] of contagem) if (n > max) ((max = n), (melhor = cidade));
      return melhor;
    };

    const { rows: clientesExistentes } = await client.query<{ id: string; razao_social: string }>(
      `select id, razao_social from app.clientes where tenant_id = $1`,
      [tenant.id],
    );
    const clientes = new Map(clientesExistentes.map((r) => [r.razao_social, r.id]));
    const novosClientes: unknown[][] = [];
    d.tx_dims.clientes.forEach((razaoSocial, idx) => {
      if (clientes.has(razaoSocial)) return;
      const id = randomUUID();
      clientes.set(razaoSocial, id);
      // documento e uf ficam NULL: a fonte nao informa.
      novosClientes.push([
        id,
        tenant.id,
        razaoSocial,
        inferirTipoPessoa(razaoSocial),
        municipioDe(idx),
        "ativo",
        "importacao",
      ]);
    });
    await inserirLotes(
      client,
      "app.clientes",
      ["id", "tenant_id", "razao_social", "tipo", "municipio", "classificacao", "origem_dado"],
      novosClientes,
      "app.clientes",
    );

    /* ---------------- Estoque ---------------- */

    const custoMedio = new Map<string, number | null>();
    const totalProduto = new Map<string, number>();
    const dispProduto = new Map<string, number>();
    for (const e of d.estoque_produto_agg) {
      const codigo = codigoProduto(e.ProdCode);
      custoMedio.set(codigo, dividir(e.valor_estoque, e.saldo_total));
      totalProduto.set(codigo, e.saldo_total);
      dispProduto.set(codigo, e.saldo_disponivel);
    }

    // A fonte da o saldo DISPONIVEL por (filial, produto), mas o saldo TOTAL
    // so por produto. Ver `distribuirTotal()` para a regra de atribuicao.
    const porProduto = new Map<string, EstoqueFilialProduto[]>();
    for (const e of d.estoque_filial_produto) {
      const codigo = codigoProduto(e.ProdCode);
      let lista = porProduto.get(codigo);
      if (!lista) porProduto.set(codigo, (lista = []));
      lista.push(e);
    }

    const linhasEstoque: unknown[][] = [];
    let rateados = 0;
    for (const [codigo, linhas] of porProduto) {
      const produtoId = produtos.get(codigo);
      if (!produtoId) continue;

      const totais = distribuirTotal(
        linhas.map((l) => l.saldo_disponivel),
        totalProduto.get(codigo) ?? null,
        dispProduto.get(codigo) ?? null,
      );
      if (totais.rateado) rateados += linhas.length;

      linhas.forEach((e, i) => {
        const filialId = filiais.get(e.FILIAL);
        if (!filialId) return;
        linhasEstoque.push([
          randomUUID(),
          tenant.id,
          filialId,
          produtoId,
          e.saldo_disponivel,
          totais.valores[i],
          custoMedio.get(codigo) ?? 0,
        ]);
      });
    }
    const somaDisp = linhasEstoque.reduce((a, l) => a + (l[4] as number), 0);
    const somaTotal = linhasEstoque.reduce((a, l) => a + ((l[5] as number | null) ?? 0), 0);
    log(
      `  estoque: ${linhasEstoque.length.toLocaleString("pt-BR")} posicoes, ` +
        `${rateados.toLocaleString("pt-BR")} com total rateado. ` +
        `Disponivel=${somaDisp.toLocaleString("pt-BR")} Total=${somaTotal.toLocaleString("pt-BR")} ` +
        `(devem bater com a fonte: 36.412 e 43.033).`,
    );
    await inserirLotes(
      client,
      "app.estoque_saldo",
      [
        "id",
        "tenant_id",
        "filial_id",
        "produto_id",
        "quantidade",
        "quantidade_total",
        "valor_medio_unitario",
      ],
      linhasEstoque,
      "app.estoque_saldo",
    );

    /* ---------------- Vendas + itens ---------------- */

    // Uma venda por (NF, filial); cada tx_row vira um item.
    interface VendaAgrupada {
      id: string;
      filialIdx: number | null;
      clienteIdx: number | null;
      vendedorIdx: number | null;
      segmentoIdx: number | null;
      data: string;
      nf: number;
      total: number;
    }
    const vendasPorChave = new Map<string, VendaAgrupada>();
    const linhasItens: unknown[][] = [];

    for (const r of d.tx_rows) {
      const chave = `${r[2]}|${r[6]}`;
      let venda = vendasPorChave.get(chave);
      if (!venda) {
        venda = {
          id: randomUUID(),
          filialIdx: r[6],
          clienteIdx: r[3],
          vendedorIdx: r[5],
          segmentoIdx: r[7],
          data: r[1],
          nf: r[2],
          total: 0,
        };
        vendasPorChave.set(chave, venda);
      }
      venda.total += r[9];
      if (r[1] < venda.data) venda.data = r[1];

      const produtoId = produtos.get(codigoProduto(r[0]));
      if (!produtoId) continue;

      const qty = r[8];
      const valor = r[9];
      const lucro = r[10];
      const custoTotal = valor - lucro;
      linhasItens.push([
        randomUUID(),
        tenant.id,
        venda.id,
        produtoId,
        qty,
        dividir(valor, qty) ?? 0,
        dividir(custoTotal, qty) ?? 0,
        valor,
        lucro,
        dividir(lucro * 100, valor) ?? 0,
      ]);
    }

    const linhasVendas: unknown[][] = [];
    for (const v of vendasPorChave.values()) {
      const filialId = v.filialIdx == null ? null : filiais.get(d.tx_dims.filiais[v.filialIdx]);
      const clienteId = v.clienteIdx == null ? null : clientes.get(d.tx_dims.clientes[v.clienteIdx]);
      const vendedorId =
        v.vendedorIdx == null ? null : vendedores.get(d.tx_dims.vendedores[v.vendedorIdx]);
      const segmentoId =
        v.segmentoIdx == null ? null : segmentos.get(d.tx_dims.segmentos[v.segmentoIdx]);
      if (!filialId || !clienteId || !vendedorId) continue;
      linhasVendas.push([
        v.id,
        tenant.id,
        filialId,
        clienteId,
        vendedorId,
        segmentoId,
        String(v.nf),
        v.data,
        "confirmada",
        "erp",
        v.total,
      ]);
    }

    await inserirLotes(
      client,
      "app.vendas",
      [
        "id",
        "tenant_id",
        "filial_id",
        "cliente_id",
        "vendedor_id",
        "segmento_id",
        "numero_pedido",
        "data_venda",
        "status",
        "origem",
        "valor_total",
      ],
      linhasVendas,
      "app.vendas",
    );

    const vendasGravadas = new Set(linhasVendas.map((l) => l[0] as string));
    await inserirLotes(
      client,
      "app.itens_venda",
      [
        "id",
        "tenant_id",
        "venda_id",
        "produto_id",
        "quantidade",
        "preco_unitario",
        "custo_unitario_momento",
        "valor_total_item",
        "margem_valor",
        "margem_percentual",
      ],
      linhasItens.filter((l) => vendasGravadas.has(l[2] as string)),
      "app.itens_venda",
    );

    /* ---------------- Compras + itens ---------------- */

    // Fonte: `ultimo_custo` — o unico bloco do dataset com compra no grao de
    // transacao (NF + fornecedor + produto + data). `compras_agg` e apenas
    // pre-agregado por mes/marca e nao permite reconstruir o item.
    interface CompraAgrupada {
      id: string;
      fornecedor: string;
      data: string;
      nf: number;
      total: number;
    }
    const comprasPorChave = new Map<string, CompraAgrupada>();
    const linhasItensCompra: unknown[][] = [];

    for (const c of d.ultimo_custo) {
      const chave = `${c.NF}|${c.Fornecedor}`;
      let compra = comprasPorChave.get(chave);
      if (!compra) {
        compra = { id: randomUUID(), fornecedor: c.Fornecedor, data: c.Data, nf: c.NF, total: 0 };
        comprasPorChave.set(chave, compra);
      }
      compra.total += c.ValorFinal;

      const produtoId = produtos.get(codigoProduto(c.ProdCode));
      if (!produtoId) continue;
      linhasItensCompra.push([
        randomUUID(),
        tenant.id,
        compra.id,
        produtoId,
        c.Quantidade,
        c.ValorUnitario,
        c.ValorFinal,
      ]);
    }

    const linhasCompras: unknown[][] = [];
    for (const c of comprasPorChave.values()) {
      const fornecedorId = fornecedores.get(c.fornecedor);
      if (!fornecedorId) continue;
      // filial_id NULL: a fonte nao informa a filial de entrada da mercadoria.
      linhasCompras.push([
        c.id,
        tenant.id,
        fornecedorId,
        String(c.nf),
        c.data,
        "recebido",
        "erp",
        c.total,
      ]);
    }

    await inserirLotes(
      client,
      "app.compras",
      [
        "id",
        "tenant_id",
        "fornecedor_id",
        "numero_pedido",
        "data_pedido",
        "status",
        "origem",
        "valor_total",
      ],
      linhasCompras,
      "app.compras",
    );

    const comprasGravadas = new Set(linhasCompras.map((l) => l[0] as string));
    await inserirLotes(
      client,
      "app.itens_compra",
      [
        "id",
        "tenant_id",
        "compra_id",
        "produto_id",
        "quantidade",
        "custo_unitario",
        "valor_total_item",
      ],
      linhasItensCompra.filter((l) => comprasGravadas.has(l[2] as string)),
      "app.itens_compra",
    );

    if (simulado) {
      await client.query("rollback");
      log("--dry-run concluido. Linhas que SERIAM gravadas:");
      let total = 0;
      for (const [tabela, n] of [...simulado.inseridos].sort((a, b) => b[1] - a[1])) {
        total += n;
        log(`  ${tabela.padEnd(22)} ${n.toLocaleString("pt-BR").padStart(9)}`);
      }
      log(`  ${"TOTAL".padEnd(22)} ${total.toLocaleString("pt-BR").padStart(9)}`);
      return;
    }

    await client.query("commit");
    log("Carga concluida e commitada.");

    const { rows: resumo } = await client.query(
      `select
         (select count(*) from app.produtos      where tenant_id = $1) as produtos,
         (select count(*) from app.clientes      where tenant_id = $1) as clientes,
         (select count(*) from app.vendas        where tenant_id = $1) as vendas,
         (select count(*) from app.itens_venda   where tenant_id = $1) as itens_venda,
         (select count(*) from app.compras       where tenant_id = $1) as compras,
         (select count(*) from app.itens_compra  where tenant_id = $1) as itens_compra,
         (select count(*) from app.estoque_saldo where tenant_id = $1) as estoque`,
      [tenant.id],
    );
    log(`Totais no tenant: ${JSON.stringify(resumo[0])}`);
  } catch (erro) {
    await client.query("rollback").catch(() => undefined);
    throw erro;
  } finally {
    if (clienteReal) await clienteReal.end();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
