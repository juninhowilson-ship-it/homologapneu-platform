import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeManufacturerFipeCatalog } from "./lib/fipeCatalog";
import { sincronizarFontesOficiais, validarFontesPendentes, escolherMelhorFonte } from "./lib/sourceDiscovery";

/**
 * npm run manufacturer:import <nome-da-montadora>
 *
 * Pipeline completo de uma montadora:
 *   1. Crawler (descoberta + download real, filtrado por montadora — ver
 *      services/intelligentCrawler.ts) via a mesma API do painel
 *      (POST /api/crawler/run), em loop até esgotar a fila real ou não
 *      haver mais novidade — nunca reprocessa um documento já conhecido
 *      (dedupe por SHA-256, garantido por índice único parcial no banco).
 *   2. Storage + parser + curadoria já acontecem DENTRO do crawler (ver
 *      services/curadoria.ts: uploadDocumento -> Supabase Storage ->
 *      parseImportFile -> extrairCandidatos) — nenhum passo extra aqui.
 *   3. Normalização de catálogo (FIPE): VehicleModel/VehicleVersion reais,
 *      idempotente — só toca modelos ainda não estruturados desta
 *      montadora, nunca mexe em outra já concluída.
 *
 * Retomada automática: se a execução anterior desta montadora ficou
 * EXECUTANDO (processo interrompido no meio), esta chamada REUTILIZA a
 * mesma linha ImportHistory em vez de criar uma nova — e como cada etapa
 * (crawler, normalização) já é idempotente por desenho (nunca reprocessa o
 * que já está pronto), rodar de novo "continua exatamente de onde parou"
 * sem nenhum contador de progresso especial: o que já foi feito não é
 * refeito, o que falta é detectado pelo próprio estado do banco.
 *
 * NUNCA aprova HomologationCandidate nem publica Homologation — isso
 * continua exigindo revisão humana no painel de Curadoria.
 *
 * Requer o servidor rodando (`npm run dev` ou `next start` em outro
 * terminal) — o crawler vive em services/intelligentCrawler.ts, que usa
 * "server-only" e não pode ser importado direto de um script standalone.
 */

const SERVER_URL = process.env.MANUFACTURER_IMPORT_SERVER_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@homologapneu.com.br";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Homologa@2026";
const MAX_CRAWLER_ROUNDS = 40;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const logLines: string[] = [];
function log(line: string) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(line);
  logLines.push(stamped);
}

async function checkServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/status`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function login(): Promise<string> {
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login falhou: HTTP ${res.status}`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("Login não retornou cookie de sessão");
  return cookie.split(";")[0];
}

async function runCrawlerRound(cookie: string, manufacturerName: string) {
  const res = await fetch(`${SERVER_URL}/api/crawler/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ manufacturerName }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`POST /api/crawler/run: HTTP ${res.status}`);
  return res.json();
}

async function countHomologationsAndTires(manufacturerName: string) {
  const homologations = await prisma.homologation.count({
    where: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } },
  });
  const tires = await prisma.tire.count({
    where: {
      homologationTires: {
        some: { homologation: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } } },
      },
    },
  });
  return { homologations, tires };
}

async function main() {
  const manufacturerName = process.argv[2];
  if (!manufacturerName) {
    console.error("Uso: npm run manufacturer:import <nome-da-montadora>  (ex.: npm run manufacturer:import honda)");
    process.exit(1);
  }

  const startedAtRun = Date.now();
  log(`=== manufacturer:import ${manufacturerName} ===`);

  // Retomada automática: reaproveita uma execução EXECUTANDO anterior
  // (interrompida) desta montadora em vez de criar uma linha nova.
  let historico = await prisma.importHistory.findFirst({
    where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" }, status: "EXECUTANDO" },
    orderBy: { startedAt: "desc" },
  });
  if (historico) {
    log(`Retomando execução interrompida (ImportHistory #${historico.id}, iniciada em ${historico.startedAt.toISOString()}).`);
  } else {
    historico = await prisma.importHistory.create({ data: { manufacturerName, status: "EXECUTANDO", lastStage: "INICIO" } });
    log(`Nova execução (ImportHistory #${historico.id}).`);
  }

  try {
    log("[1/3] Verificando servidor...");
    const serverUp = await checkServerUp();
    if (!serverUp) {
      throw new Error(
        `Servidor não respondeu em ${SERVER_URL}. Rode "npm run dev" (ou "next start") em outro terminal antes de usar este comando.`
      );
    }
    log("Servidor OK.");
    await prisma.importHistory.update({ where: { id: historico.id }, data: { lastStage: "CRAWLER" } });

    // Camada de Source Discovery (scripts/lib/sourceDiscovery.ts): mantém o
    // cadastro de fontes oficiais desta montadora em dia e registra qual
    // seria a melhor fonte disponível — só informativo/observabilidade
    // nesta etapa. O crawler real abaixo continua operando sobre
    // CrawlerSource exatamente como antes, sem nenhuma mudança de
    // mecânica — nunca para a importação por causa de uma fonte bloqueada.
    try {
      await sincronizarFontesOficiais(prisma, manufacturerName);
      await validarFontesPendentes(prisma, { manufacturerName });
      const melhorFonte = await escolherMelhorFonte(prisma, manufacturerName);
      log(
        melhorFonte
          ? `Source Discovery: melhor fonte ativa = ${melhorFonte.type} (${melhorFonte.url})`
          : "Source Discovery: nenhuma fonte ATIVA encontrada no cadastro ainda (não interrompe a importação)."
      );
    } catch (e) {
      log(`Source Discovery: falhou ao sincronizar (não bloqueia a importação): ${e instanceof Error ? e.message : e}`);
    }

    log("[2/3] Rodando o crawler (filtrado para esta montadora)...");
    const cookie = await login();
    let round = 0;
    let consecutiveEmpty = 0;
    let totalDownloaded = 0;
    let totalCandidates = 0;
    let totalFound = 0;
    let totalErrors = 0;
    while (round < MAX_CRAWLER_ROUNDS && consecutiveEmpty < 3) {
      round++;
      let resumo;
      try {
        resumo = await runCrawlerRound(cookie, manufacturerName);
      } catch (e) {
        // Uma rodada isolada pode estourar o timeout do cliente (fonte HUB
        // com muitos PDFs grandes, upload resumable lento) sem que o
        // trabalho no servidor tenha falhado de verdade — derrubar a
        // montadora inteira por causa de UMA rodada lenta contradiz
        // "continuar automaticamente até concluir". Trata como rodada
        // vazia e segue: o crawler é idempotente, a próxima rodada não
        // reprocessa o que já foi salvo.
        const motivo = e instanceof Error ? e.message : String(e);
        log(`  rodada ${round}: falhou (${motivo}) — tratando como rodada vazia e continuando.`);
        totalErrors++;
        consecutiveEmpty++;
        continue;
      }
      totalDownloaded += resumo.documentsDownloaded ?? 0;
      totalCandidates += resumo.candidatesCreated ?? 0;
      totalFound += resumo.documentsFound ?? 0;
      totalErrors += resumo.errorCount ?? 0;
      log(
        `  rodada ${round}: fontes=${resumo.sourcesChecked} encontrados=${resumo.documentsFound} baixados=${resumo.documentsDownloaded} candidatos=${resumo.candidatesCreated} erros=${resumo.errorCount}`
      );
      await prisma.importHistory.update({
        where: { id: historico.id },
        data: {
          documentsFound: { increment: resumo.documentsFound ?? 0 },
          documentsDownloaded: { increment: resumo.documentsDownloaded ?? 0 },
          errors: { increment: resumo.errorCount ?? 0 },
          log: logLines.join("\n"),
        },
      });
      if ((resumo.documentsDownloaded ?? 0) === 0 && (resumo.candidatesCreated ?? 0) === 0) {
        consecutiveEmpty++;
      } else {
        consecutiveEmpty = 0;
      }
    }
    log(
      `Crawler concluído: ${totalFound} documentos encontrados, ${totalDownloaded} novos, ${totalCandidates} candidatos novos (${round} rodadas).`
    );

    const documentsProcessed = await prisma.documentUpload.count({
      where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" }, status: "PROCESSADO" },
    });

    log("[3/3] Normalizando catálogo (VehicleModel/VehicleVersion reais via FIPE)...");
    await prisma.importHistory.update({ where: { id: historico.id }, data: { lastStage: "CATALOG" } });
    let catalogResult;
    try {
      catalogResult = await normalizeManufacturerFipeCatalog(prisma, manufacturerName);
      log(JSON.stringify(catalogResult, null, 2));
    } catch (e) {
      log(`Normalização de catálogo falhou: ${e instanceof Error ? e.message : e}`);
      totalErrors++;
    }

    const { homologations, tires } = await countHomologationsAndTires(manufacturerName);

    await prisma.importHistory.update({
      where: { id: historico.id },
      data: {
        status: "CONCLUIDO",
        finishedAt: new Date(),
        totalDurationMs: Date.now() - startedAtRun,
        documentsProcessed,
        homologationsCreated: homologations,
        tiresCreated: tires,
        errors: totalErrors,
        lastStage: "CONCLUIDO",
        log: logLines.join("\n"),
      },
    });

    log(
      `=== ${manufacturerName}: pipeline concluído. Candidatos aguardam revisão humana no painel de Curadoria — nenhuma Homologation foi publicada automaticamente. ===`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`FALHA: ${message}`);
    await prisma.importHistory.update({
      where: { id: historico.id },
      data: { status: "FALHOU", finishedAt: new Date(), totalDurationMs: Date.now() - startedAtRun, log: logLines.join("\n") },
    });
    throw e;
  }
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
