import "dotenv/config";
import { PrismaClient, type EvidenceSourceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { resolveManufacturerId } from "../lib/masterData/resolveManufacturer";
import { findOrCreateVehicleModelId } from "../lib/masterData/resolveVehicleModel";
import { normalizeLookupKey } from "../lib/masterData/normalizeName";

/**
 * Continuação de scripts/promote-pirelli-catalog.ts: aquele script
 * deliberadamente pulava toda aplicação com `homologado === true`
 * ("pendente de pesquisa de motor/ano/versão — nunca vira Homologation
 * aqui"), porque criar um Homologation real exige vehicleVersionId (FK
 * obrigatória no schema) que a planilha da Pirelli não fornece (só marca
 * e modelo, sem versão/ano).
 *
 * Isso deixava 1059 aplicações realmente confirmadas pela própria Pirelli
 * (coluna HOMOLOGADO=SIM da "Tabela de Aplicação e Homologação Abril
 * 2026") sem nenhum registro de evidência — mesmo já tendo passado pela
 * mesma verificação de fonte oficial que as aplicações não-homologadas
 * (que viram TireVehicleApplication/HomologationEvidence normalmente).
 *
 * Este script fecha essa lacuna usando o MESMO mecanismo já existente
 * (TireVehicleApplication/HomologationEvidence, versão/ano em branco via
 * sentinela ""/0 — sem inventar nenhum valor), só que agora também para as
 * aplicações homologado=true, preservando o texto bruto da coluna
 * DESCRIÇÃO (que às vezes contém o código de homologação OE entre
 * parênteses, ex. "(MOE)", "(K1)", "(RO1)") como excerpt literal — nunca
 * interpretado/mapeado para um fabricante específico sem fonte.
 *
 * Não mexe nos 213 produtos ainda pendentes de resolução de modelo/pneu
 * (ficam como estão, por decisão já registrada em pirelliTireModels.ts).
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

function computeEvidenceHash(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  sourceUrl: string;
  collectedAt: Date;
  homologado: true;
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
    homologado: input.homologado,
  });
  return createHash("sha256").update(conteudo).digest("hex");
}

/** Extrai o trecho entre parenteses no final da descricao bruta (onde a
 * Pirelli marca o codigo de homologacao/fitment OE, ex.: "(MOE)", "(K1)",
 * "(AO)") — texto literal, nunca interpretado como significando um
 * fabricante especifico sem fonte que confirme o dicionario OE->marca. */
function extrairMarcadorOeLiteral(descricao: string): string | null {
  const matches = [...descricao.matchAll(/\(([^)]+)\)/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].trim() || null;
}

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

async function registrarEvidenciaHomologada(input: {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  descricaoBruta: string;
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
    sourceUrl: FONTE_URL,
    collectedAt: FONTE_DATA,
    homologado: true,
  });

  const jaExiste = await prisma.homologationEvidence.findFirst({
    where: { applicationId: application.id, contentHash },
    select: { id: true },
  });

  const marcadorOe = extrairMarcadorOeLiteral(input.descricaoBruta);
  const excerpt =
    `HOMOLOGADO=SIM (coluna "Homologado" da tabela oficial Pirelli). Descrição original: "${input.descricaoBruta}".` +
    (marcadorOe ? ` Marcador de fitment/OE literal encontrado entre parênteses: "${marcadorOe}" (não interpretado — sem dicionário OE->fabricante confirmado por fonte).` : "");

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
        excerpt,
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

  const produtosResolvidos = await prisma.manufacturerProduct.findMany({
    where: { catalog: { tireManufacturerId: fabricante.id }, tireId: { not: null } },
    include: {
      tire: { select: { model: true } },
      applications: { include: { homologations: true } },
    },
  });

  const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
  const produtos = limite ? produtosResolvidos.slice(0, limite) : produtosResolvidos;

  console.log(
    `Produtos já resolvidos (com pneu real vinculado): ${produtosResolvidos.length}` +
      (limite ? ` (rodando só os primeiros ${produtos.length}, teste)` : "")
  );

  let aplicacoesHomologadasEncontradas = 0;
  let veiculosResolvidos = 0;
  let evidenciasCriadas = 0;
  let evidenciasDuplicadas = 0;
  let processados = 0;

  for (const produto of produtos) {
    processados++;
    if (processados % 300 === 0) console.log(`... ${processados}/${produtos.length} produtos`);
    if (!produto.tire || !produto.descricao) continue;

    for (const aplicacao of produto.applications) {
      const homologado = aplicacao.homologations.some((h) => h.homologado === true);
      if (!homologado) continue;
      aplicacoesHomologadasEncontradas++;

      if (!aplicacao.vehicleModelId) {
        const manufacturerId = await findOrCreateManufacturerByName(aplicacao.vehicleBrand);
        const vehicleModelId = await findOrCreateVehicleModelId(prisma, manufacturerId, aplicacao.vehicleModel);
        await prisma.manufacturerApplication.update({ where: { id: aplicacao.id }, data: { vehicleModelId } });
        veiculosResolvidos++;
      }

      const resultado = await registrarEvidenciaHomologada({
        tireManufacturerName: "Pirelli",
        tireModel: produto.tire.model,
        tireSize: produto.medida,
        vehicleManufacturerName: aplicacao.vehicleBrand,
        vehicleModel: aplicacao.vehicleModel,
        descricaoBruta: produto.descricao,
      });

      if (resultado.duplicada) evidenciasDuplicadas++;
      else evidenciasCriadas++;
    }
  }

  const resumo = {
    produtosProcessados: produtos.length,
    aplicacoesHomologadasEncontradas,
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
