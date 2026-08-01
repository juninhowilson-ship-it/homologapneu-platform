import type { PrismaClient, OfficialSource, OfficialSourceEventType } from "@prisma/client";

/**
 * Camada de Source Discovery: cadastro, validação, health score,
 * priorização automática, histórico e monitoramento de TODAS as fontes
 * oficiais possíveis de um fabricante (não só as raspáveis pelo
 * Intelligent Crawler). Convive com CrawlerSource sem alterá-lo — esta
 * camada só CATALOGA e ESCOLHE a melhor fonte; o mecanismo de fato de
 * baixar/parsear documentos continua em services/intelligentCrawler.ts,
 * inalterado.
 *
 * Sem "server-only" de propósito (mesmo padrão de scripts/lib/fipeCatalog.ts):
 * usado tanto por scripts/manufacturer-import.ts (standalone) quanto,
 * futuramente, por um service "server-only" que só repasse pra cá.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 HomologaPneu-IntelligentCrawler/1.0";
const VALIDATION_TIMEOUT_MS = 15_000;

/** As três fontes de dados públicos universais — mesma URL para toda
 * montadora, então cadastradas uma vez por fabricante (não uma URL nova
 * por fabricante) para permitir métricas por fabricante (ex.: quantos
 * modelos a FIPE lista para esta marca), mas validadas uma única vez
 * globalmente (não faz sentido bater na mesma URL 107 vezes). */
export const FONTES_UNIVERSAIS: {
  type: "DADOS_FIPE" | "DADOS_UNECE" | "DADOS_INMETRO" | "DADOS_SENATRAN";
  url: string;
  descricao: string;
}[] = [
  {
    type: "DADOS_FIPE",
    url: "https://parallelum.com.br/fipe/api/v1/carros",
    descricao: "Tabela FIPE (marcas/modelos/anos reais) — usada na normalização de catálogo.",
  },
  {
    type: "DADOS_UNECE",
    url: "https://unece.org/transport/vehicle-regulations",
    descricao: "Regulamentos veiculares da UNECE (WP.29) — referência técnica internacional.",
  },
  {
    type: "DADOS_INMETRO",
    url: "https://www.gov.br/inmetro/pt-br",
    descricao: "Portal do Inmetro — avaliação de conformidade de pneus/veículos no Brasil.",
  },
  {
    type: "DADOS_SENATRAN",
    url: "https://portalservicos.senatran.serpro.gov.br/",
    descricao:
      "Portal do SENATRAN (governo) — consulta de recall veicular por placa/chassi, válido para qualquer fabricante. Verificado em 2026-07-19: sem robots.txt, HTTP 200.",
  },
];

/** Categoria padronizada (OfficialSourceCategory) a partir do tipo técnico
 * (OfficialSourceType) — dimensão de relatório, nunca setada manualmente
 * fora daqui, pra garantir que toda fonte nova (universal ou espelhada do
 * CrawlerSource) já nasça classificada de forma consistente. */
const CATEGORIA_POR_TIPO: Record<string, string> = {
  SITE_INSTITUCIONAL: "SITE_INSTITUCIONAL",
  PORTAL_PROPRIETARIO: "SITE_INSTITUCIONAL",
  BIBLIOTECA_MANUAIS: "MANUAL_PROPRIETARIO",
  CATALOGO_TECNICO: "CATALOGO_TECNICO",
  PORTAL_SERVICOS: "PORTAL_POSVENDA",
  PORTAL_PECAS: "PORTAL_PECAS",
  PORTAL_RECALLS: "RECALL",
  PDF_PUBLICO: "BIBLIOTECA_PDF",
  DADOS_FIPE: "FONTE_UNIVERSAL",
  DADOS_UNECE: "FONTE_UNIVERSAL",
  DADOS_INMETRO: "FONTE_UNIVERSAL",
  DADOS_SENATRAN: "FONTE_UNIVERSAL",
  OUTRA: "SITE_INSTITUCIONAL",
};

export function inferirCategoriaDeTipo(type: string): string {
  return CATEGORIA_POR_TIPO[type] ?? "SITE_INSTITUCIONAL";
}

/** País/idioma inferidos do próprio domínio — nunca um valor assumido às
 * cegas: domínios .br (ou subdomínios .com.br/.gov.br/.org.br) são
 * conteúdo brasileiro real (pt-BR); o resto fica "Internacional"/"en" até
 * uma verificação de conteúdo dizer o contrário. */
export function inferirPaisEIdioma(url: string): { country: string; language: string } {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith(".br")) {
      return { country: "BR", language: "pt-BR" };
    }
    return { country: "Internacional", language: "en" };
  } catch {
    return { country: "Internacional", language: "en" };
  }
}

/** Peso de preferência por tipo de fonte (0-100) — usado na priorização
 * automática. Reflete quão diretamente o tipo costuma render documentos
 * reais de pneu/roda/pressão: uma biblioteca de manuais bate muito mais
 * que um portal institucional genérico. Ajustável sem migração (é só
 * lógica, não dado persistido). */
const PESO_POR_TIPO: Record<string, number> = {
  BIBLIOTECA_MANUAIS: 100,
  PDF_PUBLICO: 90,
  CATALOGO_TECNICO: 85,
  DADOS_FIPE: 70,
  DADOS_INMETRO: 65,
  DADOS_SENATRAN: 62,
  PORTAL_SERVICOS: 60,
  DADOS_UNECE: 55,
  PORTAL_PROPRIETARIO: 55,
  PORTAL_PECAS: 50,
  PORTAL_RECALLS: 40,
  SITE_INSTITUCIONAL: 30,
  OUTRA: 20,
};

/** CrawlerSourceStatus tem um 4º valor ("ERRO") que OfficialSourceStatus
 * não tem — aqui ERRO (falha técnica pontual, não necessariamente um
 * bloqueio real) mapeia pra PENDENTE (precisa nova validação), nunca pra
 * BLOQUEADA (que reservamos pra bloqueio confirmado). */
function mapearStatusCrawlerSource(status: string): "ATIVA" | "PENDENTE" | "BLOQUEADA" {
  if (status === "ATIVA") return "ATIVA";
  if (status === "BLOQUEADA") return "BLOQUEADA";
  return "PENDENTE";
}

/** Tipo de fonte inferido a partir da categoria já usada em CrawlerSource
 * — bridge não-destrutivo: nunca modifica CrawlerSource, só espelha. */
function inferirTipoDeCategoria(category: string, kind: string): string {
  if (category === "MANUAL_PROPRIETARIO" && kind === "HUB") return "BIBLIOTECA_MANUAIS";
  if (category === "MANUAL_PROPRIETARIO" && kind === "DIRECT") return "PDF_PUBLICO";
  if (category === "CATALOGO_TECNICO" || category === "CATALOGO_PNEUS") return "CATALOGO_TECNICO";
  if (category === "TABELA_HOMOLOGACAO") return "CATALOGO_TECNICO";
  if (category === "BOLETIM_TECNICO") return "PORTAL_RECALLS";
  return "OUTRA";
}

async function registrarEvento(
  prisma: PrismaClient,
  officialSourceId: number,
  dados: {
    type: OfficialSourceEventType;
    previousStatus?: OfficialSource["status"] | null;
    newStatus?: OfficialSource["status"] | null;
    documentsCount?: number | null;
    blockReason?: string | null;
    redirectedToUrl?: string | null;
    notes?: string | null;
  }
) {
  await prisma.officialSourceEvent.create({
    data: {
      officialSourceId,
      type: dados.type,
      previousStatus: dados.previousStatus ?? null,
      newStatus: dados.newStatus ?? null,
      documentsCount: dados.documentsCount ?? null,
      blockReason: dados.blockReason ?? null,
      redirectedToUrl: dados.redirectedToUrl ?? null,
      notes: dados.notes ?? null,
    },
  });
}

/**
 * Health Score (0-100) — combina 6 fatores, cada um 0-100, com pesos
 * fixos e documentados (nunca setado manualmente):
 *   25% disponibilidade      — status atual (ATIVA=100, PENDENTE=40, resto=0)
 *   15% tempo de resposta    — mais rápido = maior nota (sem dado = neutro 50)
 *   20% documentos úteis     — escala logarítmica sobre documentsCount
 *   20% taxa de sucesso      — activeChecks/totalChecks (sem checagem = neutro 50)
 *   12% estabilidade         — fração da vida da fonte sem mudar de status
 *    8% frequência de mudança — mais mudanças de status = nota menor
 */
export function calcularHealthScore(fonte: {
  status: string;
  avgResponseTimeMs: number | null;
  documentsCount: number;
  totalChecks: number;
  activeChecks: number;
  lastStatusChangeAt: Date | null;
  createdAt: Date;
  mudancasDeStatus: number;
}): number {
  const disponibilidadeScore = fonte.status === "ATIVA" ? 100 : fonte.status === "PENDENTE" ? 40 : 0;

  const tempoRespostaScore =
    fonte.avgResponseTimeMs == null ? 50 : Math.max(0, Math.min(100, 100 - fonte.avgResponseTimeMs / 50));

  const documentosScore = Math.max(0, Math.min(100, Math.round(Math.log2(fonte.documentsCount + 1) * 20)));

  const taxaSucessoScore =
    fonte.totalChecks === 0 ? 50 : Math.round((fonte.activeChecks / fonte.totalChecks) * 100);

  const umDiaMs = 24 * 60 * 60 * 1000;
  const diasDesdeDescoberta = Math.max(1, (Date.now() - fonte.createdAt.getTime()) / umDiaMs);
  const estabilidadeScore = fonte.lastStatusChangeAt
    ? Math.max(0, Math.min(100, Math.round(((Date.now() - fonte.lastStatusChangeAt.getTime()) / umDiaMs / diasDesdeDescoberta) * 100)))
    : 100;

  const frequenciaMudancaScore = Math.max(0, 100 - fonte.mudancasDeStatus * 25);

  const score =
    0.25 * disponibilidadeScore +
    0.15 * tempoRespostaScore +
    0.2 * documentosScore +
    0.2 * taxaSucessoScore +
    0.12 * estabilidadeScore +
    0.08 * frequenciaMudancaScore;

  return Math.round(score);
}

/** Recalcula e grava o healthScore de uma fonte a partir do estado atual
 * + contagem real de eventos MUDANCA_STATUS já registrados. */
async function atualizarHealthScore(prisma: PrismaClient, officialSourceId: number) {
  const fonte = await prisma.officialSource.findUniqueOrThrow({ where: { id: officialSourceId } });
  const mudancasDeStatus = await prisma.officialSourceEvent.count({
    where: { officialSourceId, type: "MUDANCA_STATUS" },
  });
  const healthScore = calcularHealthScore({ ...fonte, mudancasDeStatus });
  await prisma.officialSource.update({ where: { id: officialSourceId }, data: { healthScore } });
  return healthScore;
}

/**
 * Sincroniza o cadastro de OfficialSource:
 * 1. Garante as 3 fontes universais para cada fabricante ativo.
 * 2. Espelha cada CrawlerSource já conhecido (bridge, nunca duplicado —
 *    upsert por manufacturerName+type+url).
 * Idempotente: rodar de novo nunca duplica nem apaga. Toda criação real
 * (nunca uma atualização) gera um evento DESCOBERTA no histórico.
 */
export async function sincronizarFontesOficiais(
  prisma: PrismaClient,
  manufacturerName?: string
): Promise<{ universaisCriadas: number; crawlerSourcesEspelhadas: number }> {
  const manufacturers = manufacturerName
    ? [{ name: manufacturerName }]
    : await prisma.manufacturer.findMany({ where: { deletedAt: null }, select: { name: true } });

  let universaisCriadas = 0;
  for (const m of manufacturers) {
    for (const fonte of FONTES_UNIVERSAIS) {
      const antes = await prisma.officialSource.findUnique({
        where: { manufacturerName_type_url: { manufacturerName: m.name, type: fonte.type, url: fonte.url } },
      });
      const { country, language } = inferirPaisEIdioma(fonte.url);
      const resultado = await prisma.officialSource.upsert({
        where: { manufacturerName_type_url: { manufacturerName: m.name, type: fonte.type, url: fonte.url } },
        create: {
          manufacturerName: m.name,
          type: fonte.type,
          url: fonte.url,
          notes: fonte.descricao,
          priority: 50,
          category: inferirCategoriaDeTipo(fonte.type) as never,
          country,
          language,
        },
        update: {},
      });
      if (!antes) {
        universaisCriadas++;
        await registrarEvento(prisma, resultado.id, { type: "DESCOBERTA", newStatus: resultado.status, notes: fonte.descricao });
      }
    }
  }

  const crawlerSources = await prisma.crawlerSource.findMany({
    where: manufacturerName ? { manufacturerName: { equals: manufacturerName, mode: "insensitive" } } : undefined,
  });

  let crawlerSourcesEspelhadas = 0;
  for (const cs of crawlerSources) {
    const tipo = inferirTipoDeCategoria(cs.category, cs.kind);
    const statusMapeado = mapearStatusCrawlerSource(cs.status);
    const { country, language } = inferirPaisEIdioma(cs.url);
    const antes = await prisma.officialSource.findUnique({
      where: { manufacturerName_type_url: { manufacturerName: cs.manufacturerName, type: tipo as never, url: cs.url } },
    });
    const resultado = await prisma.officialSource.upsert({
      where: { manufacturerName_type_url: { manufacturerName: cs.manufacturerName, type: tipo as never, url: cs.url } },
      create: {
        manufacturerName: cs.manufacturerName,
        type: tipo as never,
        url: cs.url,
        status: statusMapeado,
        available: statusMapeado !== "BLOQUEADA",
        blockReason: statusMapeado === "BLOQUEADA" ? cs.notes : null,
        documentsCount: cs.documentsFound,
        confidence: statusMapeado === "ATIVA" ? 80 : statusMapeado === "PENDENTE" ? 40 : 10,
        priority: 10,
        notes: cs.notes,
        crawlerSourceId: cs.id,
        lastValidatedAt: cs.lastVisitedAt,
        category: inferirCategoriaDeTipo(tipo) as never,
        country,
        language,
      },
      update: {
        status: statusMapeado,
        available: statusMapeado !== "BLOQUEADA",
        blockReason: statusMapeado === "BLOQUEADA" ? cs.notes : null,
        documentsCount: cs.documentsFound,
        notes: cs.notes,
        lastValidatedAt: cs.lastVisitedAt,
      },
    });

    if (!antes) {
      crawlerSourcesEspelhadas++;
      await registrarEvento(prisma, resultado.id, { type: "DESCOBERTA", newStatus: resultado.status, documentsCount: cs.documentsFound });
    } else if (antes.status !== statusMapeado) {
      await registrarEvento(prisma, resultado.id, {
        type: "MUDANCA_STATUS",
        previousStatus: antes.status,
        newStatus: statusMapeado,
        blockReason: statusMapeado === "BLOQUEADA" ? cs.notes : null,
      });
      await prisma.officialSource.update({ where: { id: resultado.id }, data: { lastStatusChangeAt: new Date() } });
    }
    if (!antes || antes.documentsCount !== cs.documentsFound) {
      if (antes && cs.documentsFound > antes.documentsCount) {
        await registrarEvento(prisma, resultado.id, { type: "NOVOS_DOCUMENTOS", documentsCount: cs.documentsFound });
      }
    }
    await atualizarHealthScore(prisma, resultado.id);
  }

  return { universaisCriadas, crawlerSourcesEspelhadas };
}

export type ResultadoValidacao = {
  status: "ATIVA" | "PENDENTE" | "BLOQUEADA" | "REMOVIDA";
  available: boolean;
  blockReason: string | null;
  confidence: number;
  responseTimeMs: number | null;
  redirected: boolean;
  finalUrl: string | null;
};

/**
 * Validação/monitoramento real (só leitura de rede, nunca baixa o corpo
 * do documento — usa HEAD, com fallback pra GET só se o servidor não
 * suportar HEAD) de uma URL: respeita robots.txt, nunca tenta contornar
 * bloqueio algum. Timeout curto para não travar a sincronização inteira
 * numa fonte lenta/quebrada. Mede tempo de resposta e detecta redirect.
 */
export async function validarFonteWeb(url: string): Promise<ResultadoValidacao> {
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return { status: "REMOVIDA", available: false, blockReason: "URL malformada", confidence: 0, responseTimeMs: null, redirected: false, finalUrl: null };
  }

  try {
    const robotsRes = await fetch(`${alvo.protocol}//${alvo.host}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    });
    if (robotsRes.ok) {
      const texto = await robotsRes.text();
      let aplicaGeral = false;
      const disallows: string[] = [];
      for (const linhaBruta of texto.split("\n")) {
        const linha = linhaBruta.trim();
        if (/^user-agent:\s*\*/i.test(linha)) aplicaGeral = true;
        else if (/^user-agent:/i.test(linha)) aplicaGeral = false;
        else if (aplicaGeral && /^disallow:/i.test(linha)) {
          const caminho = linha.split(":").slice(1).join(":").trim();
          if (caminho) disallows.push(caminho);
        }
      }
      if (disallows.some((c) => alvo.pathname.startsWith(c))) {
        return {
          status: "BLOQUEADA",
          available: true,
          blockReason: "robots.txt desautoriza este caminho — respeitado, não contornado.",
          confidence: 20,
          responseTimeMs: null,
          redirected: false,
          finalUrl: null,
        };
      }
    }
  } catch {
    // robots.txt inacessível não é motivo de bloqueio — segue pra checagem do conteúdo.
  }

  const inicio = Date.now();
  try {
    let res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
      method: "HEAD",
    });
    // Nem todo servidor trata HEAD como GET — confirmado na prática:
    // gov.br/inmetro responde 403 a HEAD mas 200 a GET com o mesmo
    // User-Agent (não é 405/501, então um fallback restrito a esses dois
    // não pegava o caso). Qualquer HEAD que não vier OK cai pra GET como
    // fonte da verdade, para nunca classificar "bloqueado" por causa do
    // método em vez do conteúdo real.
    if (!res.ok) {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
        method: "GET",
      });
      // O status já foi lido — cancela o stream do corpo sem consumi-lo,
      // pra nunca baixar o PDF/página inteira só por causa do fallback de
      // método (mantém a garantia de "nunca baixa documento" também aqui).
      await res.body?.cancel().catch(() => undefined);
    }
    const responseTimeMs = Date.now() - inicio;
    const redirected = res.redirected && res.url !== url;
    const finalUrl = redirected ? res.url : null;

    if (res.status === 403 || res.status === 401) {
      return {
        status: "BLOQUEADA",
        available: true,
        blockReason: `HTTP ${res.status} com o User-Agent do crawler — bloqueio de WAF/CDN provável, não contornado.`,
        confidence: 15,
        responseTimeMs,
        redirected,
        finalUrl,
      };
    }
    if (res.status === 404 || res.status === 410) {
      return { status: "REMOVIDA", available: false, blockReason: `HTTP ${res.status} — recurso não existe mais.`, confidence: 0, responseTimeMs, redirected, finalUrl };
    }
    if (!res.ok) {
      return { status: "PENDENTE", available: false, blockReason: `HTTP ${res.status}`, confidence: 10, responseTimeMs, redirected, finalUrl };
    }
    return { status: "ATIVA", available: true, blockReason: null, confidence: 80, responseTimeMs, redirected, finalUrl };
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "Falha de rede/timeout";
    return {
      status: "BLOQUEADA",
      available: false,
      blockReason: `Conexão falhou/resetou (${motivo}) — possível bloqueio de WAF, não contornado.`,
      confidence: 10,
      responseTimeMs: Date.now() - inicio,
      redirected: false,
      finalUrl: null,
    };
  }
}

function novaMediaMovel(atual: number | null, novo: number, totalChecksAntes: number): number {
  if (atual == null || totalChecksAntes === 0) return novo;
  // Média móvel simples ponderada pelo número de checagens já feitas.
  return Math.round((atual * totalChecksAntes + novo) / (totalChecksAntes + 1));
}

/**
 * Valida (rede real) as fontes web ainda PENDENTE. Fontes DADOS_*
 * (universais) são validadas só UMA VEZ por URL distinta (não uma vez
 * por fabricante — seria 107 chamadas idênticas à mesma API). Fontes já
 * espelhadas de um CrawlerSource não são revalidadas aqui (o Intelligent
 * Crawler já faz isso na hora do crawl real) — só preenche o que ainda
 * está PENDENTE sem crawlerSourceId. Atualiza health score e histórico.
 */
export async function validarFontesPendentes(
  prisma: PrismaClient,
  opcoes?: { manufacturerName?: string; limite?: number }
): Promise<{ validadas: number }> {
  const urlsUniversaisJaValidadas = new Map<string, ResultadoValidacao>();
  let validadas = 0;

  const pendentes = await prisma.officialSource.findMany({
    where: {
      status: "PENDENTE",
      crawlerSourceId: null,
      ...(opcoes?.manufacturerName ? { manufacturerName: { equals: opcoes.manufacturerName, mode: "insensitive" } } : {}),
    },
    take: opcoes?.limite ?? 400,
    orderBy: { id: "asc" },
  });

  for (const fonte of pendentes) {
    const isUniversal = fonte.type === "DADOS_FIPE" || fonte.type === "DADOS_UNECE" || fonte.type === "DADOS_INMETRO" || fonte.type === "DADOS_SENATRAN";
    const resultado = isUniversal && urlsUniversaisJaValidadas.has(fonte.url)
      ? urlsUniversaisJaValidadas.get(fonte.url)!
      : await validarFonteWeb(fonte.url);
    if (isUniversal) urlsUniversaisJaValidadas.set(fonte.url, resultado);

    await aplicarResultadoValidacao(prisma, fonte, resultado);
    validadas++;
  }

  return { validadas };
}

/** Aplica um ResultadoValidacao já obtido a uma fonte: atualiza campos,
 * grava evento VALIDACAO sempre, MUDANCA_STATUS se mudou, REDIRECIONAMENTO
 * se detectado, e recalcula o health score. Compartilhado por validação
 * e monitoramento. */
async function aplicarResultadoValidacao(
  prisma: PrismaClient,
  fonte: OfficialSource,
  resultado: ResultadoValidacao
) {
  const mudouStatus = fonte.status !== resultado.status;

  await prisma.officialSource.update({
    where: { id: fonte.id },
    data: {
      status: resultado.status,
      available: resultado.available,
      blockReason: resultado.blockReason,
      confidence: resultado.confidence,
      lastValidatedAt: new Date(),
      totalChecks: { increment: 1 },
      activeChecks: resultado.status === "ATIVA" ? { increment: 1 } : undefined,
      avgResponseTimeMs: novaMediaMovel(fonte.avgResponseTimeMs, resultado.responseTimeMs ?? 0, fonte.totalChecks),
      ...(mudouStatus ? { lastStatusChangeAt: new Date() } : {}),
    },
  });

  await registrarEvento(prisma, fonte.id, {
    type: "VALIDACAO",
    newStatus: resultado.status,
    blockReason: resultado.blockReason,
    notes: `Tempo de resposta: ${resultado.responseTimeMs ?? "N/A"}ms`,
  });

  if (mudouStatus) {
    await registrarEvento(prisma, fonte.id, {
      type: "MUDANCA_STATUS",
      previousStatus: fonte.status,
      newStatus: resultado.status,
      blockReason: resultado.blockReason,
    });
  }

  if (resultado.redirected && resultado.finalUrl) {
    await registrarEvento(prisma, fonte.id, {
      type: "REDIRECIONAMENTO",
      redirectedToUrl: resultado.finalUrl,
      notes: `Redirecionado de ${fonte.url} para ${resultado.finalUrl} — url original preservada, não atualizada automaticamente.`,
    });
  }

  await atualizarHealthScore(prisma, fonte.id);
}

export type ResultadoMonitoramento = {
  verificadas: number;
  mudancasAtivaParaBloqueada: number;
  mudancasBloqueadaParaAtiva: number;
  removidas: number;
  redirecionadas: number;
  novosDocumentos: number;
};

/**
 * Monitoramento: rotina leve que SÓ verifica status (HEAD, nunca baixa
 * documentos) das fontes já classificadas ATIVA ou BLOQUEADA, comparando
 * com o estado anterior e registrando as transições nomeadas no
 * histórico. Fontes universais (DADOS_*) são checadas uma vez por URL
 * distinta e o resultado propagado — nunca uma chamada por fabricante.
 * Nunca baixa nem processa documento algum.
 */
export async function monitorarFontes(
  prisma: PrismaClient,
  opcoes?: { manufacturerName?: string; limite?: number }
): Promise<ResultadoMonitoramento> {
  const urlsUniversaisJaChecadas = new Map<string, ResultadoValidacao>();
  const resumo: ResultadoMonitoramento = {
    verificadas: 0,
    mudancasAtivaParaBloqueada: 0,
    mudancasBloqueadaParaAtiva: 0,
    removidas: 0,
    redirecionadas: 0,
    novosDocumentos: 0,
  };

  const fontes = await prisma.officialSource.findMany({
    where: {
      status: { in: ["ATIVA", "BLOQUEADA"] },
      ...(opcoes?.manufacturerName ? { manufacturerName: { equals: opcoes.manufacturerName, mode: "insensitive" } } : {}),
    },
    take: opcoes?.limite ?? 400,
    orderBy: { id: "asc" },
  });

  for (const fonte of fontes) {
    const isUniversal = fonte.type === "DADOS_FIPE" || fonte.type === "DADOS_UNECE" || fonte.type === "DADOS_INMETRO" || fonte.type === "DADOS_SENATRAN";
    const resultado = isUniversal && urlsUniversaisJaChecadas.has(fonte.url)
      ? urlsUniversaisJaChecadas.get(fonte.url)!
      : await validarFonteWeb(fonte.url);
    if (isUniversal) urlsUniversaisJaChecadas.set(fonte.url, resultado);

    const statusAnterior = fonte.status;
    await aplicarResultadoValidacao(prisma, fonte, resultado);
    resumo.verificadas++;

    if (statusAnterior === "ATIVA" && resultado.status === "BLOQUEADA") resumo.mudancasAtivaParaBloqueada++;
    if (statusAnterior === "BLOQUEADA" && resultado.status === "ATIVA") resumo.mudancasBloqueadaParaAtiva++;
    if (resultado.status === "REMOVIDA") resumo.removidas++;
    if (resultado.redirected) resumo.redirecionadas++;

    // Novos documentos: só detectável de verdade pra fontes espelhadas de
    // um CrawlerSource (cujo documentsFound é atualizado pelo crawler
    // real) — comparar aqui exigiria enumerar links, o que violaria "sem
    // baixar documentos" desta rotina. A sincronização (chamada antes do
    // monitoramento) já traz o documentsCount atualizado; aqui só
    // conferimos se mudou desde a última passada de monitoramento.
    if (fonte.crawlerSourceId) {
      const atual = await prisma.officialSource.findUniqueOrThrow({ where: { id: fonte.id } });
      if (atual.documentsCount > fonte.documentsCount) {
        await registrarEvento(prisma, fonte.id, { type: "NOVOS_DOCUMENTOS", documentsCount: atual.documentsCount });
        resumo.novosDocumentos++;
      }
    }
  }

  return resumo;
}

/** Prioridade automática (0-100, maior = melhor) combinando health
 * score (60%), peso do tipo de fonte (25%), recência da última
 * validação (10%) e volume de documentos (5%) — usada por
 * escolherMelhorFonte(). O campo `priority` manual da fonte só desempata
 * quando esta pontuação fica exatamente igual. */
function calcularPrioridadeAutomatica(fonte: {
  healthScore: number;
  type: string;
  lastValidatedAt: Date | null;
  documentsCount: number;
}): number {
  const pesoTipo = PESO_POR_TIPO[fonte.type] ?? 20;
  const diasDesdeValidacao = fonte.lastValidatedAt ? (Date.now() - fonte.lastValidatedAt.getTime()) / (24 * 60 * 60 * 1000) : 999;
  const recenciaScore = Math.max(0, 100 - diasDesdeValidacao * 10);
  const documentosScore = Math.max(0, Math.min(100, Math.round(Math.log2(fonte.documentsCount + 1) * 20)));

  return 0.6 * fonte.healthScore + 0.25 * pesoTipo + 0.1 * recenciaScore + 0.05 * documentosScore;
}

/** Melhor fonte ATIVA de um fabricante, pela prioridade automática
 * (health score + tipo + recência + documentos). Retorna null se
 * nenhuma estiver ATIVA — quem chama decide o que fazer (nunca
 * interrompe a importação por causa disso, ver
 * scripts/manufacturer-import.ts). */
export async function escolherMelhorFonte(prisma: PrismaClient, manufacturerName: string) {
  const candidatas = await prisma.officialSource.findMany({
    where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" }, status: "ATIVA" },
  });
  if (candidatas.length === 0) return null;

  return candidatas
    .map((f) => ({ fonte: f, score: calcularPrioridadeAutomatica(f) }))
    .sort((a, b) => b.score - a.score || a.fonte.priority - b.fonte.priority)[0].fonte;
}

export type EstatisticasFontes = {
  fabricantesAnalisados: number;
  fontesCadastradas: number;
  fontesAtivas: number;
  fontesBloqueadas: number;
  fontesPendentes: number;
  fontesRemovidas: number;
  fabricantesSemFonteUtil: string[];
  rankingMelhoresFontes: { manufacturerName: string; type: string; url: string; healthScore: number; documentsCount: number }[];
  evolucao24h: { novasFontes: number; mudancasParaAtiva: number; mudancasParaBloqueada: number; novosDocumentos: number };
  porFabricante: {
    manufacturerName: string;
    total: number;
    ativas: number;
    bloqueadas: number;
    pendentes: number;
    melhorFonte: string | null;
    coberturaPotencial: string;
  }[];
};

/** Dashboard técnico: estatísticas globais + por fabricante + ranking +
 * fabricantes descobertos e evolução recente. Só leitura. */
export async function obterEstatisticasFontes(prisma: PrismaClient): Promise<EstatisticasFontes> {
  const todas = await prisma.officialSource.findMany({
    select: { manufacturerName: true, status: true, priority: true, confidence: true, url: true, healthScore: true, type: true, documentsCount: true },
  });

  const porFabricanteMap = new Map<string, typeof todas>();
  for (const f of todas) {
    if (!porFabricanteMap.has(f.manufacturerName)) porFabricanteMap.set(f.manufacturerName, []);
    porFabricanteMap.get(f.manufacturerName)!.push(f);
  }

  const porFabricante = [...porFabricanteMap.entries()]
    .map(([manufacturerName, fontes]) => {
      const ativas = fontes.filter((f) => f.status === "ATIVA");
      const bloqueadas = fontes.filter((f) => f.status === "BLOQUEADA").length;
      const pendentes = fontes.filter((f) => f.status === "PENDENTE").length;
      const melhor = ativas.sort((a, b) => b.healthScore - a.healthScore || a.priority - b.priority)[0];
      return {
        manufacturerName,
        total: fontes.length,
        ativas: ativas.length,
        bloqueadas,
        pendentes,
        melhorFonte: melhor?.url ?? null,
        coberturaPotencial: ativas.length > 0 ? "possui fonte ativa" : bloqueadas === fontes.length ? "sem cobertura (tudo bloqueado)" : "sem fonte validada ainda",
      };
    })
    .sort((a, b) => b.ativas - a.ativas || a.manufacturerName.localeCompare(b.manufacturerName));

  const fabricantesSemFonteUtil = porFabricante.filter((f) => f.ativas === 0).map((f) => f.manufacturerName);

  const rankingMelhoresFontes = todas
    .filter((f) => f.status === "ATIVA")
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 15)
    .map((f) => ({ manufacturerName: f.manufacturerName, type: f.type, url: f.url, healthScore: f.healthScore, documentsCount: f.documentsCount }));

  const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [novasFontes, mudancasParaAtiva, mudancasParaBloqueada, novosDocumentos] = await Promise.all([
    prisma.officialSourceEvent.count({ where: { type: "DESCOBERTA", createdAt: { gte: desde24h } } }),
    prisma.officialSourceEvent.count({ where: { type: "MUDANCA_STATUS", newStatus: "ATIVA", createdAt: { gte: desde24h } } }),
    prisma.officialSourceEvent.count({ where: { type: "MUDANCA_STATUS", newStatus: "BLOQUEADA", createdAt: { gte: desde24h } } }),
    prisma.officialSourceEvent.count({ where: { type: "NOVOS_DOCUMENTOS", createdAt: { gte: desde24h } } }),
  ]);

  return {
    fabricantesAnalisados: porFabricanteMap.size,
    fontesCadastradas: todas.length,
    fontesAtivas: todas.filter((f) => f.status === "ATIVA").length,
    fontesBloqueadas: todas.filter((f) => f.status === "BLOQUEADA").length,
    fontesPendentes: todas.filter((f) => f.status === "PENDENTE").length,
    fontesRemovidas: todas.filter((f) => f.status === "REMOVIDA").length,
    fabricantesSemFonteUtil,
    rankingMelhoresFontes,
    evolucao24h: { novasFontes, mudancasParaAtiva, mudancasParaBloqueada, novosDocumentos },
    porFabricante,
  };
}
