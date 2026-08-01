import "dotenv/config";
import { PrismaClient, type EvidenceSourceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";

/**
 * Mesma lacuna já fechada para Pirelli/Giti/Nexen/Continental/Bridgestone/
 * Dunlop, agora para o panfleto Goodyear/Cooper — mas com sourceType
 * DISTRIBUIDOR_OFICIAL (30 pontos), não FABRICANTE_PNEU (40), porque a
 * fonte é um panfleto de revenda (Sópneus), não a Goodyear/Cooper direto.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Goodyear/Cooper — Panfleto Revendedor Sópneus (GOODYER 2026.jpeg)";
const FONTE_URL = "arquivo-local:GOODYER-2026.jpeg";
const CATALOG_IDS = [15, 16];

const SOURCE_TYPE_POINTS: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 20,
  DISTRIBUIDOR_OFICIAL: 30,
  FABRICANTE_PNEU: 40,
  MONTADORA: 40,
  MANUAL: 50,
  CATALOGO_OE: 60,
};

function computeEvidenceHash(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  collectedAt: Date;
}): string {
  const conteudo = JSON.stringify({
    ...input,
    vehicleVersion: null,
    yearStart: null,
    yearEnd: null,
    sourceUrl: FONTE_URL,
    collectedAt: input.collectedAt.toISOString(),
  });
  return createHash("sha256").update(conteudo).digest("hex");
}

async function main() {
  const produtos = await prisma.manufacturerProduct.findMany({
    where: { catalogId: { in: CATALOG_IDS }, tireId: { not: null } },
    include: { tire: { select: { model: true, brand: true } }, applications: true },
  });

  const collectedAt = new Date();
  let evidenciasCriadas = 0;
  let evidenciasDuplicadas = 0;

  for (const produto of produtos) {
    if (!produto.tire) continue;
    for (const aplicacao of produto.applications) {
      const chave = {
        tireManufacturerName: produto.tire.brand,
        tireModel: produto.tire.model,
        tireSize: produto.medida.trim().toUpperCase().replace(/\s+/g, ""),
        vehicleManufacturerName: aplicacao.vehicleBrand.trim().replace(/\s+/g, " "),
        vehicleModel: aplicacao.vehicleModel.trim().replace(/\s+/g, " "),
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
        tireManufacturerName: chave.tireManufacturerName,
        tireModel: chave.tireModel,
        tireSize: chave.tireSize,
        vehicleManufacturerName: chave.vehicleManufacturerName,
        vehicleModel: chave.vehicleModel,
        collectedAt,
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
            sourceUrl: FONTE_URL,
            sourceName: FONTE_NOME,
            sourceType: "DISTRIBUIDOR_OFICIAL",
            collectedAt,
            contentHash,
            sourceConfidence: SOURCE_TYPE_POINTS.DISTRIBUIDOR_OFICIAL,
            excerpt: `Panfleto de revenda oficial Goodyear (Sópneus): "${produto.descricao}".`,
          },
        });
        evidenciasCriadas++;
      } else {
        evidenciasDuplicadas++;
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
    }
  }

  console.log("=== RESUMO ===");
  console.log(JSON.stringify({ produtosProcessados: produtos.length, evidenciasCriadas, evidenciasDuplicadas }, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
