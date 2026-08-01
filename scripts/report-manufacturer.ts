import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * npm run report:manufacturer <nome-da-montadora>
 *
 * Relatório padrão de fechamento de uma montadora na Fase 3 (importação
 * em massa) — genérico, reaproveitado para todas. Combina o registro de
 * execução (ImportHistory) com o estado real atual do banco (contagens),
 * já que o catálogo/candidatos podem ter sido complementados por
 * execuções anteriores (retomada) ou por revisão humana no painel.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const manufacturerName = process.argv[2];
  if (!manufacturerName) {
    console.error("Uso: npm run report:manufacturer <nome-da-montadora>");
    process.exit(1);
  }

  const historico = await prisma.importHistory.findFirst({
    where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" } },
    orderBy: { id: "desc" },
  });

  const fontes = await prisma.crawlerSource.findMany({
    where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" } },
    select: { status: true, kind: true, url: true, documentsFound: true, notes: true },
  });

  const modelos = await prisma.vehicleModel.count({
    where: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } }, deletedAt: null },
  });
  const modelosEstruturados = await prisma.vehicleModel.count({
    where: {
      manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } },
      deletedAt: null,
      versions: { some: {} },
    },
  });
  const versoes = await prisma.vehicleVersion.count({
    where: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } },
  });

  const homologacoesPublicadas = await prisma.homologation.count({
    where: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } },
  });
  const pneus = await prisma.tire.count({
    where: {
      homologationTires: {
        some: { homologation: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } } },
      },
    },
  });
  const rodas = await prisma.wheel.count({
    where: {
      homologationWheels: {
        some: { homologation: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } } },
      },
    },
  });
  const pressoes = await prisma.vehiclePressureSpec.count({
    where: { homologation: { vehicleVersion: { vehicleModel: { manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } } } } } },
  });

  // Via DocumentUpload.manufacturerName (sempre preenchido pelo crawler),
  // não via HomologationCandidate.vehicleManufacturerName — esse campo vem
  // de extração de texto e fica null sempre que o PDF não menciona a
  // montadora explicitamente perto da especificação (comum, e correto: o
  // extrator não inventa). Contar só pelo campo extraído subestima
  // candidatos reais na maioria dos manuais.
  const candidatosPorStatus = await prisma.homologationCandidate.groupBy({
    by: ["status"],
    where: { documentUpload: { manufacturerName: { equals: manufacturerName, mode: "insensitive" } } },
    _count: true,
  });

  const documentos = await prisma.documentUpload.count({
    where: { manufacturerName: { equals: manufacturerName, mode: "insensitive" }, deletedAt: null },
  });

  // Resumo Executivo (Pipeline de Produção Contínua): confiança e
  // qualidade vêm do extractionConfidence real de cada candidato — nunca
  // um número inventado. "Qualidade média" é a fração de candidatos
  // usáveis sem reconstrução manual pesada (confiança >= 50), distinta da
  // média bruta de confiança.
  const candidatosDaMontadora = await prisma.homologationCandidate.findMany({
    where: { documentUpload: { manufacturerName: { equals: manufacturerName, mode: "insensitive" } } },
    select: { extractionConfidence: true },
  });
  const totalCandidatos = candidatosDaMontadora.length;
  const percentualConfianca =
    totalCandidatos > 0
      ? Math.round(candidatosDaMontadora.reduce((soma, c) => soma + c.extractionConfidence, 0) / totalCandidatos)
      : null;
  const qualidadeMedia =
    totalCandidatos > 0
      ? Math.round((candidatosDaMontadora.filter((c) => c.extractionConfidence >= 50).length / totalCandidatos) * 100)
      : null;
  const percentualCobertura = modelos > 0 ? Math.round((modelosEstruturados / modelos) * 100) : null;
  const candidatosPendentesTotal = candidatosPorStatus.find((c) => c.status === "PENDENTE_REVISAO")?._count ?? 0;

  console.log(`\n=== Relatório: ${manufacturerName} ===`);
  console.log("\n-- Fontes cadastradas (CrawlerSource) --");
  for (const f of fontes) {
    console.log(`  [${f.status}] ${f.kind} found=${f.documentsFound} ${f.url}`);
  }

  console.log("\n-- Execução (ImportHistory) --");
  if (historico) {
    console.log(`  status: ${historico.status}`);
    console.log(`  documentos encontrados (crawler): ${historico.documentsFound}`);
    console.log(`  documentos baixados (novos nesta execução): ${historico.documentsDownloaded}`);
    console.log(`  erros: ${historico.errors}`);
    console.log(`  tempo de execução: ${historico.totalDurationMs ? (historico.totalDurationMs / 1000).toFixed(1) + "s" : "N/A"}`);
  } else {
    console.log("  (nenhum ImportHistory encontrado para esta montadora)");
  }

  console.log("\n-- Estado atual do banco --");
  console.log(`  documentos processados (DocumentUpload ativos): ${documentos}`);
  console.log(`  modelos: ${modelos} (${modelosEstruturados} já estruturados com pelo menos 1 versão)`);
  console.log(`  versões criadas: ${versoes}`);
  console.log(`  homologações publicadas: ${homologacoesPublicadas}`);
  console.log(`  pneus (via homologações publicadas): ${pneus}`);
  console.log(`  rodas (via homologações publicadas): ${rodas}`);
  console.log(`  pressões: ${pressoes}`);
  console.log("  candidatos por status:");
  for (const c of candidatosPorStatus) {
    console.log(`    ${c.status}: ${c._count}`);
  }

  console.log("\n-- Resumo Executivo --");
  console.log(`  Percentual de cobertura (modelos estruturados/total): ${percentualCobertura ?? "N/A"}%`);
  console.log(`  Percentual de confiança médio dos candidatos: ${percentualConfianca ?? "N/A"}%`);
  console.log(`  Qualidade média da extração (candidatos usáveis, confiança >=50): ${qualidadeMedia ?? "N/A"}%`);
  console.log(`  Documentos encontrados: ${historico?.documentsFound ?? 0}`);
  console.log(`  Documentos processados: ${documentos}`);
  console.log(`  Homologações publicadas: ${homologacoesPublicadas}`);
  console.log(`  Candidatos pendentes: ${candidatosPendentesTotal}`);
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
