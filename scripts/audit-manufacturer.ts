import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/** npm run audit:manufacturer <nome> — relatório de completude de uma montadora. */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error("Uso: npm run audit:manufacturer <nome-da-montadora>");
    process.exit(1);
  }

  const manufacturer = await prisma.manufacturer.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (!manufacturer) {
    console.error(`Manufacturer "${name}" não encontrado.`);
    process.exit(1);
  }

  console.log(`=== Auditoria: ${manufacturer.name} ===\n`);

  const [
    totalModelos,
    modelosEstruturados,
    modelosSoftDeleted,
    modelosPendentesNormalizar,
    versoes,
    versoesNaoConfirmadas,
    homologacoes,
    homologacoesSemDocumento,
    homologacoesSemPressao,
    tiresLinkados,
    documentos,
    documentosMigrados,
    candidatosPendentes,
    candidatosAprovados,
    candidatosRejeitados,
    ultimoImportHistory,
    crawlerSources,
  ] = await Promise.all([
    prisma.vehicleModel.count({ where: { manufacturerId: manufacturer.id, deletedAt: null } }),
    prisma.vehicleModel.count({ where: { manufacturerId: manufacturer.id, deletedAt: null, versions: { some: {} } } }),
    prisma.vehicleModel.count({ where: { manufacturerId: manufacturer.id, deletedAt: { not: null } } }),
    prisma.vehicleModel.count({ where: { manufacturerId: manufacturer.id, deletedAt: null, versions: { none: {} } } }),
    prisma.vehicleVersion.count({ where: { vehicleModel: { manufacturerId: manufacturer.id } } }),
    prisma.vehicleVersion.count({ where: { vehicleModel: { manufacturerId: manufacturer.id }, category: "NAO_CONFIRMADO" } }),
    prisma.homologation.count({ where: { vehicleVersion: { vehicleModel: { manufacturerId: manufacturer.id } } } }),
    prisma.homologation.count({
      where: { vehicleVersion: { vehicleModel: { manufacturerId: manufacturer.id } }, documents: { none: {} } },
    }),
    prisma.homologation.count({
      where: { vehicleVersion: { vehicleModel: { manufacturerId: manufacturer.id } }, pressureSpecs: { none: {} } },
    }),
    prisma.tire.count({
      where: { homologationTires: { some: { homologation: { vehicleVersion: { vehicleModel: { manufacturerId: manufacturer.id } } } } } },
    }),
    prisma.documentUpload.count({ where: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } } }),
    prisma.documentUpload.count({ where: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" }, storagePath: { not: null } } }),
    prisma.homologationCandidate.count({
      where: { status: "PENDENTE_REVISAO", documentUpload: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } } },
    }),
    prisma.homologationCandidate.count({
      where: { status: "APROVADA", documentUpload: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } } },
    }),
    prisma.homologationCandidate.count({
      where: { status: "REJEITADA", documentUpload: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } } },
    }),
    prisma.importHistory.findFirst({
      where: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.crawlerSource.findMany({ where: { manufacturerName: { equals: manufacturer.name, mode: "insensitive" } } }),
  ]);

  const relatorio = {
    catalogo: {
      totalModelos,
      modelosEstruturados,
      modelosSoftDeletedHistorico: modelosSoftDeleted,
      modelosPendentesNormalizar,
      percentualCatalogoNormalizado: totalModelos > 0 ? Math.round((modelosEstruturados / totalModelos) * 100) : 0,
      versoes,
      versoesComCarroceriaNaoConfirmada: versoesNaoConfirmadas,
    },
    homologacao: {
      homologacoes,
      homologacoesSemDocumentoOficial: homologacoesSemDocumento,
      homologacoesSemPressaoRecomendada: homologacoesSemPressao,
      pneusDistintosHomologados: tiresLinkados,
    },
    documentos: {
      total: documentos,
      migradosParaStorage: documentosMigrados,
      pendentesMigrar: documentos - documentosMigrados,
    },
    curadoria: {
      candidatosPendentesRevisao: candidatosPendentes,
      candidatosAprovados,
      candidatosRejeitados,
    },
    crawler: {
      fontesRegistradas: crawlerSources.length,
      fontes: crawlerSources.map((f) => ({ url: f.url, status: f.status, documentosEncontrados: f.documentsFound })),
    },
    ultimaExecucaoPipeline: ultimoImportHistory
      ? { status: ultimoImportHistory.status, iniciadaEm: ultimoImportHistory.startedAt, atualizadaEm: ultimoImportHistory.updatedAt }
      : null,
  };

  console.log(JSON.stringify(relatorio, null, 2));
}

main()
  .catch((e) => { console.error("Falha:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
