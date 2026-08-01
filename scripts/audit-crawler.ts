import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** npm run audit:crawler — saúde do Intelligent Crawler. */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

async function main() {
  console.log("=== Auditoria do Crawler ===\n");

  const stuck = await prisma.crawlerRun.findMany({ where: { status: "EXECUTANDO" }, orderBy: { startedAt: "asc" } });
  console.log(`[${stuck.length > 0 ? "PROBLEMA" : "OK"}] CrawlerRun travado em EXECUTANDO: ${stuck.length}`);
  if (stuck.length) console.log("  amostra:", JSON.stringify(stuck.map((r) => ({ id: r.id, startedAt: r.startedAt }))));

  const porStatusFonte = await prisma.crawlerSource.groupBy({ by: ["status"], _count: true });
  console.log("\nFontes por status:", JSON.stringify(porStatusFonte));

  const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
  const fontesAntigas = await prisma.crawlerSource.findMany({
    where: {
      status: { in: ["ATIVA", "PENDENTE"] },
      OR: [{ lastVisitedAt: null }, { lastVisitedAt: { lt: new Date(Date.now() - TRINTA_DIAS_MS) } }],
    },
    select: { id: true, manufacturerName: true, url: true, lastVisitedAt: true },
  });
  console.log(`\n[${fontesAntigas.length > 0 ? "ATENÇÃO" : "OK"}] Fontes ativas/pendentes não visitadas há 30+ dias (ou nunca): ${fontesAntigas.length}`);
  if (fontesAntigas.length) console.log("  amostra:", JSON.stringify(fontesAntigas.slice(0, 10)));

  const jobsPendentes = await prisma.crawlerJob.groupBy({ by: ["queue", "status"], _count: true });
  console.log("\nFila de jobs (por fila+status):", JSON.stringify(jobsPendentes));

  const jobsComFalhaMaxima = await prisma.crawlerJob.count({ where: { status: "ERRO" } });

  const ultimosRuns = await prisma.crawlerRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 });
  const taxaErro =
    ultimosRuns.length > 0
      ? Math.round((ultimosRuns.filter((r) => r.errorCount > 0).length / ultimosRuns.length) * 100)
      : 0;
  console.log(`\nTaxa de execuções recentes com algum erro (últimas ${ultimosRuns.length}): ${taxaErro}%`);
  console.log(`Jobs em status ERRO: ${jobsComFalhaMaxima}`);

  const alertasNaoReconhecidos = await prisma.crawlerAlert.count({ where: { acknowledged: false } });
  console.log(`\n[${alertasNaoReconhecidos > 0 ? "ATENÇÃO" : "OK"}] Alertas de documento revogado/atualizado não reconhecidos: ${alertasNaoReconhecidos}`);

  const hasProblems = stuck.length > 0;
  console.log(hasProblems ? "\nAuditoria do crawler encontrou problemas bloqueantes." : "\nAuditoria do crawler sem bloqueios (avisos acima são informativos).");
  process.exitCode = hasProblems ? 1 : 0;
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
