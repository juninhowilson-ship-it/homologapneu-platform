import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * npm run report:dashboard
 *
 * Substitui o "Dashboard Administrativo" (fabricantes, progresso, documentos,
 * homologações, candidatos, erros, auditoria, consumo de banco/Storage,
 * estatísticas gerais) por um relatório de terminal — sem código de
 * Interface nova, por decisão registrada nesta sessão.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

async function main() {
  const [
    fabricantes,
    fabricantesComPipeline,
    documentosTotal,
    documentosNoStorage,
    documentosPendentesMigrar,
    homologacoes,
    candidatosPendentes,
    candidatosAprovados,
    candidatosRejeitados,
    errosRecentesImportHistory,
    ultimasAuditorias,
    dbSize,
    historicoImportacoes,
  ] = await Promise.all([
    prisma.manufacturer.count({ where: { deletedAt: null } }),
    prisma.importHistory.findMany({ distinct: ["manufacturerName"], select: { manufacturerName: true } }),
    prisma.documentUpload.count(),
    prisma.documentUpload.count({ where: { storagePath: { not: null } } }),
    prisma.documentUpload.count({ where: { storagePath: null, fileContent: { not: null } } }),
    prisma.homologation.count({ where: { deletedAt: null } }),
    prisma.homologationCandidate.count({ where: { status: "PENDENTE_REVISAO" } }),
    prisma.homologationCandidate.count({ where: { status: "APROVADA" } }),
    prisma.homologationCandidate.count({ where: { status: "REJEITADA" } }),
    prisma.importHistory.count({ where: { errors: { gt: 0 } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { entity: true, action: true, createdAt: true } }),
    prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
    prisma.importHistory.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
  ]);

  const storageBytes = await prisma.documentUpload.aggregate({
    where: { storagePath: { not: null } },
    _sum: { fileSize: true },
  });

  const relatorio = {
    geradoEm: new Date().toISOString(),
    fabricantes: {
      total: fabricantes,
      comPipelineExecutado: fabricantesComPipeline.length,
      lista: fabricantesComPipeline.map((f) => f.manufacturerName),
    },
    progressoImportacao: historicoImportacoes.map((h) => ({
      fabricante: h.manufacturerName,
      status: h.status,
      documentosProcessados: h.documentsProcessed,
      homologacoesCriadas: h.homologationsCreated,
      erros: h.errors,
      ultimaAtualizacao: h.updatedAt,
    })),
    documentos: {
      total: documentosTotal,
      noStorage: documentosNoStorage,
      pendentesMigrar: documentosPendentesMigrar,
    },
    homologacoes: { total: homologacoes },
    candidatos: {
      pendentesRevisao: candidatosPendentes,
      aprovados: candidatosAprovados,
      rejeitados: candidatosRejeitados,
    },
    erros: { execucoesComErro: errosRecentesImportHistory },
    auditoriaRecente: ultimasAuditorias,
    consumo: {
      postgres: dbSize[0]?.size,
      storage: `${((storageBytes._sum.fileSize ?? 0) / 1024 / 1024).toFixed(1)} MB`,
    },
  };

  console.log(JSON.stringify(relatorio, null, 2));
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
