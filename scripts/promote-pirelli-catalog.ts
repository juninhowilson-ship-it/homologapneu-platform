import "dotenv/config";
import { PrismaClient, type EvidenceSourceType, type TireCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";
import { resolvePirelliTireModel } from "../lib/importer/manufacturerCatalog/mappings/pirelliTireModels";
import { parseTireSize, parseTireIndex } from "../lib/importer/manufacturerCatalog/tireSpec";

/**
 * Roda a mesma lógica de services/manufacturerCatalogPromotion.ts (que
 * fica como a versão "de verdade" reutilizável por uma rota futura), mas
 * fora do pipeline do Next — services/repositories têm `server-only` e
 * não podem ser importados de um script standalone (mesmo motivo de
 * scripts/import-pirelli-catalog.ts). A lógica de evidência (registrar
 * TireVehicleApplication/HomologationEvidence) é reimplementada aqui a
 * partir de services/homologationEvidence.ts, sem alteração de regra.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FONTE_NOME = "Pirelli — Tabela de Aplicação e Homologação (Abril 2026)";
const FONTE_URL = "arquivo-local:Pirelli-Tabela-Aplicacao-Homologacao-Abril-2026";
const FONTE_DATA = new Date("2026-04-01T00:00:00.000Z");

const SOURCE_TYPE_POINTS: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 20,
  DISTRIBUIDOR_OFICIAL: 30,
  FABRICANTE_PNEU: 40,
  MONTADORA: 40,
  MANUAL: 50,
  CATALOGO_OE: 60,
};

async function findOrCreateManufacturerByName(name: string): Promise<number> {
  const existente = await resolveManufacturerId(prisma, name);
  if (existente) return existente.id;

  const criado = await prisma.manufacturer.create({
    data: {
      name,
      normalizedName: normalizeLookupKey(name),
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireModelId(
  tireManufacturerId: number,
  name: string,
  category: TireCategory
): Promise<number> {
  const existente = await prisma.tireModel.findUnique({
    where: { tireManufacturerId_name: { tireManufacturerId, name } },
    select: { id: true },
  });
  if (existente) return existente.id;

  const criado = await prisma.tireModel.create({
    data: { tireManufacturerId, name, category },
    select: { id: true },
  });
  return criado.id;
}

async function findOrCreateTireId(params: {
  tireManufacturerId: number;
  tireModelId: number;
  tireModelName: string;
  size: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
  xl: boolean;
  runFlat: boolean;
  seal: boolean;
  category: TireCategory;
}): Promise<number> {
  // @@unique([tireManufacturerId, model, size]) — só existe um Tire por
  // combinação de fabricante+modelo+medida; variações de índice/XL do
  // mesmo modelo+medida reaproveitam o mesmo registro (o primeiro
  // catálogo a resolver essa combinação define os índices gravados).
  const existente = await prisma.tire.findUnique({
    where: {
      tireManufacturerId_model_size: {
        tireManufacturerId: params.tireManufacturerId,
        model: params.tireModelName,
        size: params.size,
      },
    },
    select: { id: true },
  });
  if (existente) return existente.id;

  const criado = await prisma.tire.create({
    data: {
      tireManufacturerId: params.tireManufacturerId,
      tireModelId: params.tireModelId,
      brand: "Pirelli",
      model: params.tireModelName,
      size: params.size,
      width: params.width,
      profile: params.profile,
      rim: params.rim,
      loadIndex: params.loadIndex,
      speedIndex: params.speedIndex,
      xl: params.xl,
      runFlat: params.runFlat,
      seal: params.seal,
      category: params.category,
      validationStatus: "NECESSITA_VALIDACAO",
      source: FONTE_NOME,
    },
    select: { id: true },
  });
  return criado.id;
}

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

/** Reimplementação de services/homologationEvidence.ts#registrarEvidencia
 * — mesma regra (chave exata normalizada, dedupe por hash, status por
 * contagem de fontes distintas), sem alteração. */
async function registrarEvidencia(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
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

  const contentHash = computeEvidenceHash({ ...input, ...chave, sourceUrl: FONTE_URL, collectedAt: FONTE_DATA });

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
        sourceType: "FABRICANTE_PNEU",
        collectedAt: FONTE_DATA,
        contentHash,
        sourceConfidence: SOURCE_TYPE_POINTS.FABRICANTE_PNEU,
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
    pontosPorFonte.set(
      e.sourceName,
      Math.max(pontosPorFonte.get(e.sourceName) ?? 0, SOURCE_TYPE_POINTS[e.sourceType])
    );
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
  const fabricante = await prisma.tireManufacturer.findFirst({ where: { name: "Pirelli" } });
  if (!fabricante) throw new Error('TireManufacturer "Pirelli" não encontrado');

  const catalogos = await prisma.manufacturerCatalog.findMany({
    where: { tireManufacturerId: fabricante.id },
    select: { id: true },
  });

  const todosOsProdutos = await prisma.manufacturerProduct.findMany({
    where: { catalogId: { in: catalogos.map((c) => c.id) }, tireId: null },
    include: { applications: { include: { homologations: true } } },
  });
  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const produtos = limite ? todosOsProdutos.slice(0, limite) : todosOsProdutos;

  console.log(
    `Produtos pendentes de resolução: ${todosOsProdutos.length}` +
      (limite ? ` (rodando só os primeiros ${produtos.length}, teste)` : "")
  );

  let pneusResolvidos = 0;
  let pneusPendentes = 0;
  let veiculosResolvidos = 0;
  let aplicacoesProcessadas = 0;
  let evidenciasCriadas = 0;
  let evidenciasDuplicadas = 0;
  let processados = 0;

  for (const produto of produtos) {
    processados++;
    if ((processados % 300) === 0) console.log(`... ${processados}/${produtos.length} produtos`);

    if (!produto.descricao || !produto.medida) {
      pneusPendentes++;
      continue;
    }

    const modeloInfo = resolvePirelliTireModel(produto.descricao);
    const tamanho = parseTireSize(produto.medida);
    const indice = parseTireIndex(produto.descricao);

    if (!modeloInfo || !tamanho || !indice) {
      pneusPendentes++;
      continue;
    }

    const tireModelId = await findOrCreateTireModelId(fabricante.id, modeloInfo.tireModelName, modeloInfo.category);
    const tireId = await findOrCreateTireId({
      tireManufacturerId: fabricante.id,
      tireModelId,
      tireModelName: modeloInfo.tireModelName,
      size: produto.medida,
      ...tamanho,
      ...indice,
      category: modeloInfo.category,
    });

    await prisma.manufacturerProduct.update({ where: { id: produto.id }, data: { tireId } });
    pneusResolvidos++;

    for (const aplicacao of produto.applications) {
      aplicacoesProcessadas++;

      if (!aplicacao.vehicleModelId) {
        const manufacturerId = await findOrCreateManufacturerByName(aplicacao.vehicleBrand);
        const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, aplicacao.vehicleModel);
        await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
        veiculosResolvidos++;
      }

      const homologado = aplicacao.homologations.some((h) => h.homologado === true);
      if (homologado) continue; // pendente de pesquisa de motor/ano/versão — nunca vira Homologation aqui

      const resultado = await registrarEvidencia({
        tireManufacturerName: "Pirelli",
        tireModel: modeloInfo.tireModelName,
        tireSize: produto.medida,
        vehicleManufacturerName: aplicacao.vehicleBrand,
        vehicleModel: aplicacao.vehicleModel,
      });

      if (resultado.duplicada) evidenciasDuplicadas++;
      else evidenciasCriadas++;
    }
  }

  const resumo = {
    produtosProcessados: produtos.length,
    pneusResolvidos,
    pneusPendentes,
    aplicacoesProcessadas,
    veiculosResolvidos,
    evidenciasCriadas,
    evidenciasDuplicadas,
  };
  console.log("=== RESUMO ===");
  console.log(JSON.stringify(resumo, null, 2));
}

main()
  .catch((e) => {
    console.error("Falha geral:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
