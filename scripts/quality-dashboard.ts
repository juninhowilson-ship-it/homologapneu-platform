import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * npm run quality:dashboard
 *
 * Fase de Qualidade — só leitura, nada é alterado. Mede cobertura real do
 * Banco Mestre (montadora/modelo/versão/homologação), identifica lacunas
 * (modelos sem homologação, versões sem pneu, pneus sem pressão,
 * homologações incompletas) e consolida os HomologationCandidate
 * PENDENTE_REVISAO por montadora/confiança — insumo para o painel de
 * Curadoria decidir por onde revisar primeiro. Nenhuma escrita no banco.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// As 7 montadoras que já passaram pelo pipeline universal até agora —
// mesma lista do checkpoint de consolidação anterior. Fora deste
// conjunto, os modelos ainda não foram nem visitados pelo pipeline, então
// uma lacuna ali reflete "ainda não processado", não um defeito.
const MONTADORAS_PROCESSADAS = ["Toyota", "Honda", "Renault", "Nissan", "Hyundai", "Kia Motors", "Volkswagen"];

function pct(num: number, den: number): string {
  if (den === 0) return "N/A";
  return `${((num / den) * 100).toFixed(1)}%`;
}

async function main() {
  console.log("=== Dashboard de Qualidade do Banco Mestre ===");
  console.log(`Gerado em: ${new Date().toISOString()}\n`);

  // ---------- Global ----------
  const modelosTotalGlobal = await prisma.vehicleModel.count({ where: { deletedAt: null } });
  const modelosComVersaoGlobal = await prisma.vehicleModel.count({
    where: { deletedAt: null, versions: { some: {} } },
  });
  const versoesTotalGlobal = await prisma.vehicleVersion.count();
  const versoesComHomologacaoGlobal = await prisma.vehicleVersion.count({
    where: { homologations: { some: { deletedAt: null } } },
  });

  const homologacoesTotal = await prisma.homologation.count({ where: { deletedAt: null } });
  const homologacoes = await prisma.homologation.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      validationStatus: true,
      vehicleVersion: { select: { vehicleModel: { select: { manufacturer: { select: { name: true } } } } } },
      _count: { select: { tires: true, pressureSpecs: true, wheels: true } },
    },
  });
  const homologacoesCompletas = homologacoes.filter(
    (h) => h._count.tires > 0 && h._count.pressureSpecs > 0 && h.validationStatus === "VALIDADO"
  );
  const homologacoesIncompletas = homologacoes.filter((h) => !homologacoesCompletas.includes(h));

  const candidatosPorStatus = await prisma.homologationCandidate.groupBy({
    by: ["status"],
    _count: true,
  });
  const candidatosPendentesTotal =
    candidatosPorStatus.find((c) => c.status === "PENDENTE_REVISAO")?._count ?? 0;

  const documentosPendentes = await prisma.documentUpload.count({
    where: { status: "PENDENTE", deletedAt: null },
  });
  const documentosErro = await prisma.documentUpload.count({ where: { status: "ERRO", deletedAt: null } });
  const pdfsPendentesOcr = await prisma.documentUpload.count({
    where: { ocrPending: true, deletedAt: null },
  });

  const tiresSemPressaoGlobal = await prisma.tire.count({
    where: {
      homologationTires: {
        some: { homologation: { deletedAt: null, pressureSpecs: { none: {} } } },
      },
    },
  });

  console.log("--- GLOBAL (107 fabricantes cadastrados) ---");
  console.log(`Modelos: ${modelosTotalGlobal} | com versão estruturada: ${modelosComVersaoGlobal} (${pct(modelosComVersaoGlobal, modelosTotalGlobal)})`);
  console.log(`Versões: ${versoesTotalGlobal} | com homologação: ${versoesComHomologacaoGlobal} (${pct(versoesComHomologacaoGlobal, versoesTotalGlobal)})`);
  console.log(`Homologações: ${homologacoesTotal} | completas: ${homologacoesCompletas.length} (${pct(homologacoesCompletas.length, homologacoesTotal)}) | incompletas: ${homologacoesIncompletas.length}`);
  console.log(`Candidatos pendentes de revisão: ${candidatosPendentesTotal}`);
  console.log(`Documentos pendentes (não processados): ${documentosPendentes} | com erro: ${documentosErro}`);
  console.log(`PDFs pendentes de OCR: ${pdfsPendentesOcr}`);
  console.log(`Pneus (em homologações) sem nenhuma pressão registrada: ${tiresSemPressaoGlobal}`);

  // ---------- Por montadora (só as já processadas pelo pipeline) ----------
  console.log("\n--- POR MONTADORA (processadas pelo pipeline) ---");
  const porMontadora: Record<string, unknown>[] = [];
  for (const nome of MONTADORAS_PROCESSADAS) {
    const manufacturer = await prisma.manufacturer.findFirst({ where: { name: { equals: nome, mode: "insensitive" } } });
    if (!manufacturer) {
      console.log(`\n[${nome}] Manufacturer não encontrado.`);
      continue;
    }
    const modelosTotal = await prisma.vehicleModel.count({ where: { manufacturerId: manufacturer.id, deletedAt: null } });
    const modelosComVersao = await prisma.vehicleModel.count({
      where: { manufacturerId: manufacturer.id, deletedAt: null, versions: { some: {} } },
    });
    const modelosSemHomologacao = await prisma.vehicleModel.count({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
        versions: { some: {} },
        AND: { versions: { none: { homologations: { some: { deletedAt: null } } } } },
      },
    });
    const versoesTotal = await prisma.vehicleVersion.count({
      where: { vehicleModel: { manufacturerId: manufacturer.id } },
    });
    const versoesComHomologacao = await prisma.vehicleVersion.count({
      where: { vehicleModel: { manufacturerId: manufacturer.id }, homologations: { some: { deletedAt: null } } },
    });
    const versoesSemPneu = versoesTotal - versoesComHomologacao;

    const homologacoesDaMontadora = homologacoes.filter(
      (h) => h.vehicleVersion.vehicleModel.manufacturer.name.toLowerCase() === nome.toLowerCase()
    );
    const completasMontadora = homologacoesDaMontadora.filter((h) => homologacoesCompletas.includes(h));

    const candidatosPendentesMontadora = await prisma.homologationCandidate.count({
      where: { status: "PENDENTE_REVISAO", documentUpload: { manufacturerName: { equals: nome, mode: "insensitive" } } },
    });

    const tiresSemPressaoMontadora = await prisma.tire.count({
      where: {
        homologationTires: {
          some: {
            homologation: {
              deletedAt: null,
              pressureSpecs: { none: {} },
              vehicleVersion: { vehicleModel: { manufacturerId: manufacturer.id } },
            },
          },
        },
      },
    });

    const linha = {
      montadora: nome,
      modelosTotal,
      modelosComVersao,
      coberturaModelo: pct(modelosComVersao, modelosTotal),
      modelosSemHomologacao,
      versoesTotal,
      versoesComHomologacao,
      coberturaVersao: pct(versoesComHomologacao, versoesTotal),
      versoesSemPneu,
      homologacoesTotal: homologacoesDaMontadora.length,
      homologacoesCompletas: completasMontadora.length,
      homologacoesIncompletas: homologacoesDaMontadora.length - completasMontadora.length,
      candidatosPendentes: candidatosPendentesMontadora,
      pneusSemPressao: tiresSemPressaoMontadora,
    };
    porMontadora.push(linha);
    console.log(`\n[${nome}]`);
    console.log(`  Modelos: ${modelosTotal} | estruturados: ${modelosComVersao} (${linha.coberturaModelo}) | sem homologação: ${modelosSemHomologacao}`);
    console.log(`  Versões: ${versoesTotal} | com homologação: ${versoesComHomologacao} (${linha.coberturaVersao}) | sem pneu: ${versoesSemPneu}`);
    console.log(`  Homologações: ${linha.homologacoesTotal} | completas: ${linha.homologacoesCompletas} | incompletas: ${linha.homologacoesIncompletas}`);
    console.log(`  Candidatos pendentes: ${candidatosPendentesMontadora} | pneus sem pressão: ${tiresSemPressaoMontadora}`);
  }

  // ---------- Consolidação de candidatos pendentes por confiança ----------
  const candidatosPendentesDetalhe = await prisma.homologationCandidate.findMany({
    where: { status: "PENDENTE_REVISAO" },
    select: { extractionConfidence: true, documentUpload: { select: { manufacturerName: true } } },
  });
  const confiancaAlta = candidatosPendentesDetalhe.filter((c) => c.extractionConfidence >= 80).length;
  const confiancaMedia = candidatosPendentesDetalhe.filter(
    (c) => c.extractionConfidence >= 50 && c.extractionConfidence < 80
  ).length;
  const confiancaBaixa = candidatosPendentesDetalhe.filter((c) => c.extractionConfidence < 50).length;

  console.log("\n--- CANDIDATOS PENDENTES (340) POR CONFIANÇA DE EXTRAÇÃO ---");
  console.log(`Alta (>=80): ${confiancaAlta} | Média (50-79): ${confiancaMedia} | Baixa (<50): ${confiancaBaixa}`);

  const output = {
    geradoEm: new Date().toISOString(),
    global: {
      modelosTotal: modelosTotalGlobal,
      modelosComVersao: modelosComVersaoGlobal,
      coberturaModelo: pct(modelosComVersaoGlobal, modelosTotalGlobal),
      versoesTotal: versoesTotalGlobal,
      versoesComHomologacao: versoesComHomologacaoGlobal,
      coberturaVersao: pct(versoesComHomologacaoGlobal, versoesTotalGlobal),
      homologacoesTotal,
      homologacoesCompletas: homologacoesCompletas.length,
      homologacoesIncompletas: homologacoesIncompletas.length,
      percentualCompletude: pct(homologacoesCompletas.length, homologacoesTotal),
      candidatosPendentesTotal,
      documentosPendentes,
      documentosErro,
      pdfsPendentesOcr,
      tiresSemPressaoGlobal,
      candidatosPorConfianca: { alta: confiancaAlta, media: confiancaMedia, baixa: confiancaBaixa },
    },
    porMontadora,
  };

  console.log("\n=== JSON ===");
  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
