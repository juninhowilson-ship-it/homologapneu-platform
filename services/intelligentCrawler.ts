import "server-only";
import { prisma } from "@/lib/prisma";
import { uploadDocumento } from "@/services/curadoria";
import { hashConteudo, marcarVisita, cadastrarFontes } from "@/services/crawlerSourceCatalog";
import { OFFICIAL_DOCUMENT_SOURCES } from "@/lib/curadoria/officialDocumentSources";
import { SOURCE_TYPE_POINTS } from "@/lib/constants/evidence";
import type { CrawlerRunTrigger, CrawlerSource, EvidenceSourceType } from "@prisma/client";

/**
 * HomologaPneu Intelligent Crawler: agente de descoberta/atualização
 * automática do banco mestre. Reutiliza integralmente o pipeline de
 * Curadoria Inteligente já existente (services/curadoria.ts ->
 * uploadDocumento -> extrairCandidatos) — este módulo só adiciona a
 * camada de DESCOBERTA (visitar fontes reais cadastradas em
 * CrawlerSource, achar/baixar PDFs novos) que faltava. Nenhuma
 * homologação é publicada aqui: uploadDocumento só cria
 * HomologationCandidate (status PENDENTE_REVISAO), igual a um upload
 * manual pelo painel.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 HomologaPneu-IntelligentCrawler/1.0";

/** Timeout por requisição — sem isto, uma única fonte que trava a
 * conexão (sem responder, sem erro) consome sozinha todo o orçamento de
 * tempo da execução (visto na prática: um fetch sem timeout ao RAM
 * ficou pendurado e a execução real passou de 6min mesmo com o teto de
 * TEMPO_MAXIMO_MS, porque a checagem de tempo só roda ENTRE fontes). */
const ROBOTS_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

/** Limite prático de tamanho de arquivo processado por execução —
 * ambiente com pouca memória disponível já demonstrou falhas reais ao
 * processar um PDF de ~93MB (ver notes da fonte legado-toyota-corolla).
 * Documentos maiores ficam descartados (não registrados) com o motivo
 * explícito, em vez de arriscar travar o processo. */
const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024;

/** Teto de downloads NOVOS por execução — cada fonte HUB reprocessa a
 * lista inteira de links a cada visita (sem cursor de retomada), então
 * sem um teto uma única execução poderia tentar centenas de PDFs
 * grandes em sequência num ambiente com pouca memória disponível. Fontes
 * não alcançadas nesta execução permanecem ATIVA/PENDENTE e são
 * retomadas na próxima (manual ou agendada) — processamento incremental
 * real ao longo de execuções, não uma trava definitiva. */
const MAX_NEW_DOWNLOADS_PER_RUN = 10;

/** Orçamento de tempo por execução: uma corrida real desta rotina levou
 * ~9-10 minutos processando só uma fonte HUB grande (Toyota, 233 links)
 * e a requisição nunca recebeu a resposta final no cliente (timeout do
 * lado de fora do processo) — o run correspondente ficou com o
 * resultado final não gravado, mesmo com os documentos já baixados
 * salvos individualmente. Cortar por tempo, não só por contagem, evita
 * repetir isso: encerra a execução de forma limpa (grava o resumo real)
 * bem antes de qualquer timeout de plataforma/proxy plausível. */
const TEMPO_MAXIMO_MS = 4 * 60 * 1000;

const CATEGORY_TO_EVIDENCE_TYPE: Record<string, EvidenceSourceType> = {
  MANUAL_PROPRIETARIO: "MANUAL",
  BOLETIM_TECNICO: "MONTADORA",
  CATALOGO_PNEUS: "CATALOGO_OE",
  TABELA_HOMOLOGACAO: "CATALOGO_OE",
  PRESSAO_PNEUS: "MANUAL",
  RODA_ARO: "MANUAL",
  CATALOGO_TECNICO: "CATALOGO_OE",
  OUTRO: "MONTADORA",
};

const CATEGORY_LABEL: Record<string, string> = {
  MANUAL_PROPRIETARIO: "Manual do Proprietário",
  BOLETIM_TECNICO: "Boletim Técnico",
  CATALOGO_PNEUS: "Catálogo de Pneus",
  TABELA_HOMOLOGACAO: "Tabela de Homologação",
  PRESSAO_PNEUS: "Pressão dos Pneus",
  RODA_ARO: "Roda e Aro",
  CATALOGO_TECNICO: "Catálogo Técnico",
  OUTRO: "Outro",
};

/**
 * Checagem real (porém simplificada) de robots.txt: respeita apenas
 * `Disallow` sob `User-agent: *`, comparando prefixo de caminho — não
 * interpreta wildcards (`*`, `$`) dentro do padrão. Suficiente para os
 * casos reais já encontrados nesta base (bloqueios por prefixo de
 * caminho); um caso com wildcard exigiria checagem manual antes de
 * marcar a fonte como ATIVA.
 */
async function robotsPermite(url: string): Promise<boolean> {
  try {
    const alvo = new URL(url);
    const robotsUrl = `${alvo.protocol}//${alvo.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
    });
    if (!res.ok) return true;
    const texto = await res.text();

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
    return !disallows.some((caminho) => alvo.pathname.startsWith(caminho));
  } catch {
    return true;
  }
}

function extrairLinksPdf(html: string, baseUrl: string): string[] {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+\.pdf)["']/gi)].map((m) => m[1]);
  const absolutas = new Set<string>();
  for (const href of hrefs) {
    try {
      absolutas.add(new URL(href, baseUrl).toString());
    } catch {
      // href relativo malformado — ignora, não inventa URL.
    }
  }
  return [...absolutas];
}

type ResultadoDocumento =
  | { status: "baixado"; candidatosCriados: number }
  | { status: "duplicado" }
  | { status: "descartado"; motivo: string }
  | { status: "erro"; motivo: string };

async function processarDocumento(
  url: string,
  fonte: Pick<CrawlerSource, "manufacturerName" | "category">,
  userId: number | null
): Promise<ResultadoDocumento> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    return { status: "erro", motivo: error instanceof Error ? error.message : "Falha de rede/timeout" };
  }
  if (!response.ok) {
    return { status: "erro", motivo: `HTTP ${response.status}` };
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      status: "descartado",
      motivo: `Arquivo de ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB excede o limite prático de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB deste ambiente.`,
    };
  }
  if (buffer.byteLength === 0) {
    return { status: "erro", motivo: "Resposta vazia (0 bytes)" };
  }

  const fileName = decodeURIComponent(url.split("/").pop() || "documento.pdf").split("?")[0];
  const evidenceType = CATEGORY_TO_EVIDENCE_TYPE[fonte.category] ?? "MANUAL";

  const resultado = await uploadDocumento({
    buffer,
    fileName,
    declaredSourceType: evidenceType,
    declaredSourceName: `${fonte.manufacturerName} — ${CATEGORY_LABEL[fonte.category] ?? fonte.category} (${new URL(url).hostname})`,
    userId,
    sourceUrl: url,
    manufacturerName: fonte.manufacturerName,
    reliability: SOURCE_TYPE_POINTS[evidenceType],
  });

  if (resultado.duplicado) return { status: "duplicado" };
  if (resultado.erro) return { status: "erro", motivo: resultado.erro };
  return { status: "baixado", candidatosCriados: resultado.candidatos.length };
}

export type CrawlerRunResumo = {
  runId: number;
  sourcesChecked: number;
  documentsFound: number;
  documentsDownloaded: number;
  documentsSkipped: number;
  candidatesCreated: number;
  errorCount: number;
};

/**
 * Executa uma passada completa do crawler sobre todas as fontes
 * cadastradas com status ATIVA ou PENDENTE (uma fonte BLOQUEADA/ERRO só
 * volta a ser tentada se reclassificada manualmente). Cada fonte HUB é
 * revisitada (a lista de PDFs pode crescer/mudar); cada PDF já conhecido
 * (mesmo SHA-256) é pulado por uploadDocumento — nunca reprocessado.
 */
export async function executarCrawler(
  trigger: CrawlerRunTrigger,
  userId: number | null
): Promise<CrawlerRunResumo> {
  // Garante que o catálogo semente (achados reais desta sessão) está
  // presente antes de cada execução — igual ao padrão já usado por
  // sincronizarCatalogoFontes() para DataSource. Nunca sobrescreve o
  // status de uma fonte já visitada (cadastrarFonte só atualiza campos
  // descritivos em cima de uma linha existente).
  await cadastrarFontes(OFFICIAL_DOCUMENT_SOURCES);

  const run = await prisma.crawlerRun.create({ data: { trigger, status: "EXECUTANDO" } });

  let sourcesChecked = 0;
  let documentsFound = 0;
  let documentsDownloaded = 0;
  let documentsSkipped = 0;
  let candidatesCreated = 0;
  let errorCount = 0;
  const erros: string[] = [];

  const fontes = await prisma.crawlerSource.findMany({
    where: { status: { in: ["ATIVA", "PENDENTE"] } },
  });

  let novosDownloads = 0;
  const inicio = Date.now();
  let paradaSolicitada = false;

  for (const fonte of fontes) {
    if (novosDownloads >= MAX_NEW_DOWNLOADS_PER_RUN) break;
    if (Date.now() - inicio >= TEMPO_MAXIMO_MS) break;
    // Cancelamento cooperativo (services/crawlerControl.ts, POST
    // /api/crawler/stop) — checado uma vez por fonte, não a cada
    // documento, para manter o custo de consulta baixo.
    const config = await prisma.crawlerConfig.findUnique({ where: { id: 1 } });
    if (config?.stopRequested) {
      paradaSolicitada = true;
      break;
    }
    sourcesChecked++;
    try {
      const permitido = await robotsPermite(fonte.url);
      if (!permitido) {
        await marcarVisita(fonte.id, {
          status: "BLOQUEADA",
          robotsAllowed: false,
          contentHash: fonte.contentHash ?? "",
          notes: "robots.txt do domínio proíbe este caminho — respeitado, nenhuma coleta tentada.",
        });
        documentsSkipped++;
        continue;
      }

      if (fonte.kind === "HUB") {
        const res = await fetch(fonte.url, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
        });
        if (!res.ok) {
          await marcarVisita(fonte.id, {
            status: "ERRO",
            robotsAllowed: true,
            contentHash: fonte.contentHash ?? "",
            notes: `HTTP ${res.status} ao visitar a página índice.`,
          });
          errorCount++;
          continue;
        }
        const html = await res.text();
        const contentHash = hashConteudo(html);
        const links = extrairLinksPdf(html, fonte.url);
        documentsFound += links.length;

        for (const link of links) {
          if (novosDownloads >= MAX_NEW_DOWNLOADS_PER_RUN) break;
          const resultado = await processarDocumento(link, fonte, userId);
          if (resultado.status === "baixado") {
            documentsDownloaded++;
            novosDownloads++;
            candidatesCreated += resultado.candidatosCriados;
          } else if (resultado.status === "erro") {
            errorCount++;
            erros.push(`${link}: ${resultado.motivo}`);
          } else {
            documentsSkipped++;
          }
        }

        await marcarVisita(fonte.id, {
          status: "ATIVA",
          robotsAllowed: true,
          contentHash,
          documentsFoundDelta: links.length,
        });
      } else {
        documentsFound++;
        const resultado = await processarDocumento(fonte.url, fonte, userId);
        if (resultado.status === "baixado") {
          documentsDownloaded++;
          novosDownloads++;
          candidatesCreated += resultado.candidatosCriados;
        } else if (resultado.status === "erro") {
          errorCount++;
          erros.push(`${fonte.url}: ${resultado.motivo}`);
        } else {
          documentsSkipped++;
        }

        await marcarVisita(fonte.id, {
          status: resultado.status === "erro" ? "ERRO" : "ATIVA",
          robotsAllowed: true,
          contentHash: hashConteudo(fonte.url),
          notes: resultado.status === "erro" ? resultado.motivo : undefined,
          documentsFoundDelta: resultado.status === "baixado" ? 1 : 0,
        });
      }
    } catch (error) {
      errorCount++;
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
      erros.push(`${fonte.url}: ${mensagem}`);
      await marcarVisita(fonte.id, {
        status: "ERRO",
        robotsAllowed: fonte.robotsAllowed ?? true,
        contentHash: fonte.contentHash ?? "",
        notes: mensagem,
      }).catch(() => undefined);
    }
  }

  if (paradaSolicitada) {
    await prisma.crawlerConfig.upsert({
      where: { id: 1 },
      create: { id: 1, stopRequested: false },
      update: { stopRequested: false },
    });
    erros.push("Execução interrompida por pedido de parada (POST /api/crawler/stop).");
  }

  await prisma.crawlerRun.update({
    where: { id: run.id },
    data: {
      status: "CONCLUIDO",
      finishedAt: new Date(),
      sourcesChecked,
      documentsFound,
      documentsDownloaded,
      documentsSkipped,
      candidatesCreated,
      errorCount,
      errorMessage: erros.length > 0 ? erros.join(" | ").slice(0, 4000) : null,
    },
  });

  return {
    runId: run.id,
    sourcesChecked,
    documentsFound,
    documentsDownloaded,
    documentsSkipped,
    candidatesCreated,
    errorCount,
  };
}

/**
 * Decide se uma execução agendada (cron) deve rodar de fato agora, com
 * base na frequência configurada (CrawlerConfig) e no último run
 * SCHEDULED concluído — o cron do Vercel só pode ser configurado no
 * mínimo diário, então frequências maiores (semanal) são aplicadas aqui.
 */
export async function deveExecutarAgendado(): Promise<boolean> {
  const config = await prisma.crawlerConfig.findUnique({ where: { id: 1 } });
  const frequencia = config?.frequency ?? "MANUAL";
  if (frequencia === "MANUAL") return false;

  const ultimoRun = await prisma.crawlerRun.findFirst({
    where: { trigger: "SCHEDULED", status: "CONCLUIDO" },
    orderBy: { startedAt: "desc" },
  });
  if (!ultimoRun) return true;

  const horasDesdeUltimoRun = (Date.now() - ultimoRun.startedAt.getTime()) / (1000 * 60 * 60);
  if (frequencia === "DAILY") return horasDesdeUltimoRun >= 23;
  if (frequencia === "WEEKLY") return horasDesdeUltimoRun >= 24 * 7 - 1;
  return false;
}

export async function obterConfig() {
  const config = await prisma.crawlerConfig.findUnique({ where: { id: 1 } });
  return config ?? { id: 1, frequency: "MANUAL", updatedAt: null };
}

export async function definirFrequencia(frequency: "DAILY" | "WEEKLY" | "MANUAL") {
  return prisma.crawlerConfig.upsert({
    where: { id: 1 },
    create: { id: 1, frequency },
    update: { frequency },
  });
}

export async function obterHistoricoRuns(limit = 20) {
  return prisma.crawlerRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}

export async function obterEstatisticasDashboard() {
  const runs = await prisma.crawlerRun.findMany({
    where: { status: "CONCLUIDO", finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  const duracoesMs = runs
    .filter((r) => r.finishedAt)
    .map((r) => r.finishedAt!.getTime() - r.startedAt.getTime());
  const tempoMedioMs =
    duracoesMs.length > 0 ? Math.round(duracoesMs.reduce((a, b) => a + b, 0) / duracoesMs.length) : null;

  const documentosProcessados = await prisma.documentUpload.count({ where: { sourceUrl: { not: null } } });
  const pendenciasOcr = await prisma.documentUpload.count({ where: { ocrPending: true } });
  const falhas = await prisma.documentUpload.count({ where: { status: "ERRO" } });
  const pendenciasRevisao = await prisma.homologationCandidate.count({ where: { status: "PENDENTE_REVISAO" } });
  const ultimaExecucao = await prisma.crawlerRun.findFirst({ orderBy: { startedAt: "desc" } });
  const novosPdfs = runs[0]?.documentsDownloaded ?? 0;
  const alertasNaoReconhecidos = await prisma.crawlerAlert.count({ where: { acknowledged: false } });

  return {
    tempoMedioMs,
    documentosProcessados,
    pendenciasOcr,
    pendenciasRevisao,
    falhas,
    novosPdfs,
    ultimaExecucao,
    alertasNaoReconhecidos,
    ultimosRuns: runs,
  };
}
