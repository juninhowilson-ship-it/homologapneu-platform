import "dotenv/config";
import { PrismaClient, type EvidenceSourceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";

/**
 * Mesma lacuna encontrada e fechada para a Pirelli
 * (promote-pirelli-homologacoes-confirmadas.ts), agora para Giti e Nexen:
 * scripts/import-giti-oem-catalog.ts e scripts/import-nexen-oem-catalog.ts
 * já criam Tire + ManufacturerApplication + ManufacturerHomologation
 * (homologado=true, 100% dos casos — catálogos inteiros são de
 * equipamento original) mas nunca promovem para
 * TireVehicleApplication/HomologationEvidence, que é a camada que a
 * pesquisa/ficha técnica do app de fato consulta.
 *
 * Versão/ano continuam fora do escopo pelo mesmo motivo da Pirelli
 * (catálogo fonte não informa, Homologation real exige vehicleVersionId).
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SOURCE_TYPE_POINTS: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 20,
  DISTRIBUIDOR_OFICIAL: 30,
  FABRICANTE_PNEU: 40,
  MONTADORA: 40,
  MANUAL: 50,
  CATALOGO_OE: 60,
};

const BRANDS: { tireManufacturerName: string; catalogId: number; fonteNome: string; fonteUrl: string }[] = [
  {
    tireManufacturerName: "Giti",
    catalogId: 4,
    fonteNome: "Giti — Pneus Originais de Fábrica (catálogo OEM)",
    fonteUrl: "arquivo-local:GITI-OEM.pdf",
  },
  {
    tireManufacturerName: "Nexen",
    catalogId: 6,
    fonteNome: "Nexen — Equipamento Original (nexentire.com/br)",
    fonteUrl: "https://www.nexentire.com/br/product/original_equipment/",
  },
  {
    tireManufacturerName: "Continental",
    catalogId: 9,
    fonteNome: "Continental — Equipamento Original (CONTI 2025.xlsx)",
    fonteUrl: "arquivo-local:CONTI-2025.xlsx",
  },
  {
    tireManufacturerName: "Bridgestone",
    catalogId: 10,
    fonteNome: "Bridgestone/Firestone — Portfólio OE (BRIDGESTONE FEV 22.xlsx)",
    fonteUrl: "arquivo-local:BRIDGESTONE-FEV-22.xlsx",
  },
  {
    tireManufacturerName: "Firestone",
    catalogId: 11,
    fonteNome: "Bridgestone/Firestone — Portfólio OE (BRIDGESTONE FEV 22.xlsx)",
    fonteUrl: "arquivo-local:BRIDGESTONE-FEV-22.xlsx",
  },
  {
    tireManufacturerName: "Dunlop",
    catalogId: 12,
    fonteNome: "Dunlop/Falken/Sumitomo — Catálogo Técnico (DUNLOP 19-08-2025.xlsb)",
    fonteUrl: "arquivo-local:DUNLOP-19-08-2025.xlsb",
  },
  {
    tireManufacturerName: "Falken",
    catalogId: 13,
    fonteNome: "Dunlop/Falken/Sumitomo — Catálogo Técnico (DUNLOP 19-08-2025.xlsb)",
    fonteUrl: "arquivo-local:DUNLOP-19-08-2025.xlsb",
  },
  {
    tireManufacturerName: "Sumitomo",
    catalogId: 14,
    fonteNome: "Dunlop/Falken/Sumitomo — Catálogo Técnico (DUNLOP 19-08-2025.xlsb)",
    fonteUrl: "arquivo-local:DUNLOP-19-08-2025.xlsb",
  },
];

function computeEvidenceHash(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  sourceUrl: string;
  collectedAt: Date;
}): string {
  const conteudo = JSON.stringify({
    tireManufacturerName: input.tireManufacturerName,
    tireModel: input.tireModel,
    tireSize: input.tireSize,
    vehicleManufacturerName: input.vehicleManufacturerName,
    vehicleModel: input.vehicleModel,
    vehicleVersion: null,
    yearStart: null,
    yearEnd: null,
    sourceUrl: input.sourceUrl,
    collectedAt: input.collectedAt.toISOString(),
  });
  return createHash("sha256").update(conteudo).digest("hex");
}

async function registrarEvidencia(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  descricaoBruta: string;
  fonteNome: string;
  fonteUrl: string;
  collectedAt: Date;
}): Promise<{ duplicada: boolean }> {
  const chave = {
    tireManufacturerName: input.tireManufacturerName.trim().replace(/\s+/g, " "),
    tireModel: input.tireModel.trim().replace(/\s+/g, " "),
    tireSize: input.tireSize.trim().toUpperCase().replace(/\s+/g, ""),
    vehicleManufacturerName: input.vehicleManufacturerName.trim().replace(/\s+/g, " "),
    vehicleModel: input.vehicleModel.trim().replace(/\s+/g, " "),
    vehicleVersion: "",
    yearStart: 0,
    yearEnd: 0,
  };

  const application = await prisma.tireVehicleApplication.upsert({
    where: { chaveAplicacao: chave },
    create: chave,
    update: {},
  });

  const contentHash = computeEvidenceHash({
    ...input,
    ...chave,
    sourceUrl: input.fonteUrl,
    collectedAt: input.collectedAt,
  });

  const jaExiste = await prisma.homologationEvidence.findFirst({
    where: { applicationId: application.id, contentHash },
    select: { id: true },
  });

  if (!jaExiste) {
    await prisma.homologationEvidence.create({
      data: {
        applicationId: application.id,
        ...chave,
        sourceUrl: input.fonteUrl,
        sourceName: input.fonteNome,
        sourceType: "FABRICANTE_PNEU",
        collectedAt: input.collectedAt,
        contentHash,
        sourceConfidence: SOURCE_TYPE_POINTS.FABRICANTE_PNEU,
        excerpt: `Equipamento original confirmado pelo fabricante do pneu. Descrição original: "${input.descricaoBruta}".`,
      },
    });
  }

  const evidencias = await prisma.homologationEvidence.findMany({
    where: { applicationId: application.id },
    select: { sourceType: true, sourceName: true },
  });
  const fontesDistintas = new Set(evidencias.map((e) => e.sourceName));
  const pontosPorFonte = new Map<string, number>();
  for (const e of evidencias) {
    pontosPorFonte.set(e.sourceName, Math.max(pontosPorFonte.get(e.sourceName) ?? 0, SOURCE_TYPE_POINTS[e.sourceType]));
  }
  const confidence = Math.min(100, Array.from(pontosPorFonte.values()).reduce((s, p) => s + p, 0));
  const tiposPresentes = new Set(evidencias.map((e) => e.sourceType));
  const status =
    fontesDistintas.size >= 3
      ? "HOMOLOGACAO_VALIDADA"
      : fontesDistintas.size >= 2
        ? "ALTA_CONFIANCA"
        : fontesDistintas.size === 1 && tiposPresentes.has("MARKETPLACE")
          ? "APLICACAO_COMERCIAL"
          : "EVIDENCIA_ISOLADA";

  await prisma.tireVehicleApplication.update({
    where: { id: application.id },
    data: { status, confidence, evidenceCount: evidencias.length },
  });

  return { duplicada: Boolean(jaExiste) };
}

async function main() {
  const resumoGeral: Record<string, unknown> = {};

  for (const brand of BRANDS) {
    const produtos = await prisma.manufacturerProduct.findMany({
      where: { catalogId: brand.catalogId, tireId: { not: null } },
      include: { tire: { select: { model: true } }, applications: { include: { homologations: true } } },
    });

    let aplicacoesProcessadas = 0;
    let evidenciasCriadas = 0;
    let evidenciasDuplicadas = 0;
    const catalogImport = await prisma.manufacturerCatalogImport.findFirst({
      where: { catalogId: brand.catalogId },
      orderBy: { id: "desc" },
      select: { startedAt: true },
    });
    const collectedAt = catalogImport?.startedAt ?? new Date();

    for (const produto of produtos) {
      if (!produto.tire || !produto.descricao) continue;
      for (const aplicacao of produto.applications) {
        const homologado = aplicacao.homologations.some((h) => h.homologado === true);
        if (!homologado) continue;
        aplicacoesProcessadas++;

        const resultado = await registrarEvidencia({
          tireManufacturerName: brand.tireManufacturerName,
          tireModel: produto.tire.model,
          tireSize: produto.medida,
          vehicleManufacturerName: aplicacao.vehicleBrand,
          vehicleModel: aplicacao.vehicleModel,
          descricaoBruta: produto.descricao,
          fonteNome: brand.fonteNome,
          fonteUrl: brand.fonteUrl,
          collectedAt,
        });

        if (resultado.duplicada) evidenciasDuplicadas++;
        else evidenciasCriadas++;
      }
    }

    resumoGeral[brand.tireManufacturerName] = {
      produtosResolvidos: produtos.length,
      aplicacoesProcessadas,
      evidenciasCriadas,
      evidenciasDuplicadas,
    };
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify(resumoGeral, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
