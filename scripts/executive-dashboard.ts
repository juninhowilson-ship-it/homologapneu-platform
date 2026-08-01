import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * npm run report:executive
 *
 * Dashboard Executivo do Pipeline de Produção Contínua — só leitura,
 * agrega dados já existentes (DocumentUpload, HomologationCandidate,
 * Homologation, ImportHistory, VehicleModel/Version). Nenhuma tabela
 * nova: reaproveita 100% da arquitetura já consolidada nas fases
 * anteriores (Banco Mestre, Curadoria, Source Discovery).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function chaveDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function chaveSemana(d: Date): string {
  const inicio = new Date(d);
  const diaSemana = inicio.getUTCDay();
  inicio.setUTCDate(inicio.getUTCDate() - diaSemana);
  return chaveDia(inicio);
}
function chaveMes(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function agrupar(datas: Date[], chaveFn: (d: Date) => string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const d of datas) {
    const chave = chaveFn(d);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return mapa;
}

function imprimirSerie(titulo: string, mapa: Map<string, number>, ultimosN: number) {
  const chaves = [...mapa.keys()].sort().slice(-ultimosN);
  console.log(`\n-- ${titulo} --`);
  if (chaves.length === 0) {
    console.log("  (sem dados no período)");
    return;
  }
  for (const chave of chaves) {
    console.log(`  ${chave}: ${mapa.get(chave)}`);
  }
}

async function main() {
  console.log("=== Dashboard Executivo — HomologaPneu ===");
  console.log(`Gerado em: ${new Date().toISOString()}\n`);

  const [documentos, candidatos, homologacoes] = await Promise.all([
    prisma.documentUpload.findMany({ where: { deletedAt: null }, select: { uploadedAt: true } }),
    prisma.homologationCandidate.findMany({ select: { createdAt: true } }),
    prisma.homologation.findMany({ where: { deletedAt: null }, select: { createdAt: true } }),
  ]);

  const docDatas = documentos.map((d) => d.uploadedAt);
  const candDatas = candidatos.map((c) => c.createdAt);
  const homDatas = homologacoes.map((h) => h.createdAt);

  console.log("=== Evolução — Documentos processados ===");
  imprimirSerie("Diária (últimos 14 dias)", agrupar(docDatas, chaveDia), 14);
  imprimirSerie("Semanal (últimas 8 semanas)", agrupar(docDatas, chaveSemana), 8);
  imprimirSerie("Mensal (últimos 6 meses)", agrupar(docDatas, chaveMes), 6);

  console.log("\n=== Evolução — Candidatos gerados ===");
  imprimirSerie("Diária (últimos 14 dias)", agrupar(candDatas, chaveDia), 14);

  console.log("\n=== Evolução — Homologações publicadas ===");
  imprimirSerie("Diária (últimos 14 dias)", agrupar(homDatas, chaveDia), 14);
  imprimirSerie("Mensal (últimos 6 meses)", agrupar(homDatas, chaveMes), 6);

  // Documentos novos (janelas curtas, sinal de atividade recente real).
  const agora = Date.now();
  const novos24h = docDatas.filter((d) => agora - d.getTime() <= 24 * 60 * 60 * 1000).length;
  const novos7d = docDatas.filter((d) => agora - d.getTime() <= 7 * 24 * 60 * 60 * 1000).length;

  // Fabricantes completos vs pendentes — "completo" = já tem pelo menos
  // uma execução CONCLUIDO no pipeline universal (independente de ter
  // sido bloqueada ou não: significa que já foi tentada e registrada).
  const manufacturers = await prisma.manufacturer.findMany({ where: { deletedAt: null }, select: { name: true } });
  const historicos = await prisma.importHistory.findMany({
    where: { status: "CONCLUIDO" },
    select: { manufacturerName: true },
    distinct: ["manufacturerName"],
  });
  const nomesConcluidos = new Set(historicos.map((h) => h.manufacturerName.toLowerCase()));
  const fabricantesCompletos = manufacturers.filter((m) => nomesConcluidos.has(m.name.toLowerCase()));
  const fabricantesPendentes = manufacturers.filter((m) => !nomesConcluidos.has(m.name.toLowerCase()));

  // Cobertura geral do banco (mesma definição do quality-dashboard).
  const modelosTotal = await prisma.vehicleModel.count({ where: { deletedAt: null } });
  const modelosComVersao = await prisma.vehicleModel.count({ where: { deletedAt: null, versions: { some: {} } } });
  const versoesTotal = await prisma.vehicleVersion.count();
  const versoesComHomologacao = await prisma.vehicleVersion.count({ where: { homologations: { some: { deletedAt: null } } } });
  const homologacoesTotal = await prisma.homologation.count({ where: { deletedAt: null } });
  const candidatosPendentes = await prisma.homologationCandidate.count({ where: { status: "PENDENTE_REVISAO" } });

  console.log("\n=== Cobertura Geral do Banco ===");
  console.log(`Fabricantes: ${manufacturers.length} total | ${fabricantesCompletos.length} já processados (completos) | ${fabricantesPendentes.length} pendentes`);
  console.log(`Modelos: ${modelosTotal} | com versão estruturada: ${modelosComVersao} (${modelosTotal ? ((modelosComVersao / modelosTotal) * 100).toFixed(1) : "0.0"}%)`);
  console.log(`Versões: ${versoesTotal} | com homologação: ${versoesComHomologacao} (${versoesTotal ? ((versoesComHomologacao / versoesTotal) * 100).toFixed(1) : "0.0"}%)`);
  console.log(`Homologações publicadas: ${homologacoesTotal}`);
  console.log(`Candidatos pendentes de revisão: ${candidatosPendentes}`);
  console.log(`Documentos novos (24h): ${novos24h} | (7 dias): ${novos7d}`);

  console.log("\n-- Fabricantes pendentes (nunca tiveram o pipeline executado) --");
  console.log(
    fabricantesPendentes.length <= 40
      ? `  ${fabricantesPendentes.map((m) => m.name).join(", ")}`
      : `  ${fabricantesPendentes.length} fabricantes — muitos para listar (ver banco)`
  );

  console.log("\n-- Fabricantes completos --");
  console.log(`  ${fabricantesCompletos.map((m) => m.name).join(", ") || "(nenhum ainda)"}`);
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
