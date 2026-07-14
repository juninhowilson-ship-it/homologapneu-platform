import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { EvidenceSourceType, ApplicationStatus } from "@prisma/client";

/**
 * Coleta por evidências: cada fonte real (marketplace, fabricante,
 * montadora, manual, catálogo OE) contribui uma linha imutável em
 * HomologationEvidence — nunca é uma homologação por si só. Evidências da
 * MESMA aplicação (mesmo pneu + mesmo veículo/versão/anos, por chave
 * normalizada) se agrupam em um TireVehicleApplication, cujo status e
 * confiança agregada são recalculados a cada nova evidência, seguindo
 * exatamente as regras de promoção definidas para esta iniciativa:
 *
 * - Confirmada por FABRICANTE_PNEU + MONTADORA -> Homologação Validada.
 * - Só existe MARKETPLACE -> Aplicação Comercial.
 * - Qualquer outro caso -> Evidência (não promovida ainda).
 */

export const SOURCE_TYPE_CONFIDENCE: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 40,
  CATALOGO_OE: 75,
  MANUAL: 80,
  FABRICANTE_PNEU: 70,
  MONTADORA: 90,
};

export type EvidenciaInput = {
  tireManufacturerName: string;
  tireModel: string;
  tireSize: string;
  vehicleManufacturerName: string;
  vehicleModel: string;
  vehicleVersion?: string | null;
  yearStart?: number | null;
  yearEnd?: number | null;
  sourceUrl: string;
  sourceName: string;
  sourceType: EvidenceSourceType;
  collectedAt: Date;
};

export type RegistroEvidenciaResultado = {
  applicationId: number;
  evidenceId: number | null;
  duplicada: boolean;
  status: ApplicationStatus;
  confidence: number;
};

function normalizarTexto(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

function normalizarMedida(valor: string): string {
  return valor.trim().toUpperCase().replace(/\s+/g, "");
}

function computeEvidenceHash(input: EvidenciaInput): string {
  const conteudo = JSON.stringify({
    tireManufacturerName: input.tireManufacturerName,
    tireModel: input.tireModel,
    tireSize: input.tireSize,
    vehicleManufacturerName: input.vehicleManufacturerName,
    vehicleModel: input.vehicleModel,
    vehicleVersion: input.vehicleVersion ?? null,
    yearStart: input.yearStart ?? null,
    yearEnd: input.yearEnd ?? null,
    sourceUrl: input.sourceUrl,
    collectedAt: input.collectedAt.toISOString(),
  });
  return createHash("sha256").update(conteudo).digest("hex");
}

/**
 * Recalcula status/confiança agregados de uma aplicação a partir de TODAS
 * as evidências já registradas para ela. Nunca editado diretamente fora
 * desta função — é sempre uma função pura do conjunto de evidências.
 */
function calcularPromocao(
  tiposPresentes: Set<EvidenceSourceType>
): { status: ApplicationStatus; confidence: number } {
  const confiancaBase = Math.max(
    ...Array.from(tiposPresentes).map((tipo) => SOURCE_TYPE_CONFIDENCE[tipo])
  );
  const bonusPorCorroboracao = (tiposPresentes.size - 1) * 10;
  const confidence = Math.min(100, confiancaBase + bonusPorCorroboracao);

  if (tiposPresentes.has("FABRICANTE_PNEU") && tiposPresentes.has("MONTADORA")) {
    return { status: "HOMOLOGACAO_VALIDADA", confidence };
  }
  if (tiposPresentes.size === 1 && tiposPresentes.has("MARKETPLACE")) {
    return { status: "APLICACAO_COMERCIAL", confidence };
  }
  return { status: "EVIDENCIA", confidence };
}

/**
 * Registra uma evidência coletada. Sempre encontra-ou-cria a aplicação
 * (por chave exata normalizada), insere a evidência (a menos que seja uma
 * recoleta idêntica — mesmo hash — da mesma fonte, para não acumular
 * linhas redundantes sem perder nenhuma evidência real), e recalcula a
 * promoção da aplicação.
 */
export async function registrarEvidencia(
  input: EvidenciaInput
): Promise<RegistroEvidenciaResultado> {
  const chave = {
    tireManufacturerName: normalizarTexto(input.tireManufacturerName),
    tireModel: normalizarTexto(input.tireModel),
    tireSize: normalizarMedida(input.tireSize),
    vehicleManufacturerName: normalizarTexto(input.vehicleManufacturerName),
    vehicleModel: normalizarTexto(input.vehicleModel),
    // "" / 0 = nao informado pela fonte. Ver comentario no schema: campos
    // nulaveis nao funcionam de forma confiavel numa chave unica composta.
    vehicleVersion: input.vehicleVersion ? normalizarTexto(input.vehicleVersion) : "",
    yearStart: input.yearStart ?? 0,
    yearEnd: input.yearEnd ?? 0,
  };

  const application = await prisma.tireVehicleApplication.upsert({
    where: { chaveAplicacao: chave },
    create: chave,
    update: {},
  });

  const contentHash = computeEvidenceHash({ ...input, ...chave });

  const jaExiste = await prisma.homologationEvidence.findFirst({
    where: { applicationId: application.id, contentHash },
    select: { id: true },
  });

  let evidenceId: number | null = jaExiste?.id ?? null;
  const duplicada = Boolean(jaExiste);

  if (!jaExiste) {
    const criada = await prisma.homologationEvidence.create({
      data: {
        applicationId: application.id,
        ...chave,
        sourceUrl: input.sourceUrl,
        sourceName: input.sourceName,
        sourceType: input.sourceType,
        collectedAt: input.collectedAt,
        contentHash,
        sourceConfidence: SOURCE_TYPE_CONFIDENCE[input.sourceType],
      },
      select: { id: true },
    });
    evidenceId = criada.id;
  }

  const evidencias = await prisma.homologationEvidence.findMany({
    where: { applicationId: application.id },
    select: { sourceType: true },
  });
  const tiposPresentes = new Set(evidencias.map((e) => e.sourceType));
  const { status, confidence } = calcularPromocao(tiposPresentes);

  await prisma.tireVehicleApplication.update({
    where: { id: application.id },
    data: { status, confidence, evidenceCount: evidencias.length },
  });

  return { applicationId: application.id, evidenceId, duplicada, status, confidence };
}

export type RegistroLoteResultado = {
  total: number;
  evidenciasNovas: number;
  duplicadas: number;
  aplicacoesValidadas: number;
  aplicacoesComerciais: number;
  falhas: number;
};

export async function registrarLoteEvidencias(
  itens: EvidenciaInput[]
): Promise<RegistroLoteResultado> {
  let evidenciasNovas = 0;
  let duplicadas = 0;
  let aplicacoesValidadas = 0;
  let aplicacoesComerciais = 0;
  let falhas = 0;

  for (const item of itens) {
    try {
      const resultado = await registrarEvidencia(item);
      if (resultado.duplicada) duplicadas++;
      else evidenciasNovas++;
      if (resultado.status === "HOMOLOGACAO_VALIDADA") aplicacoesValidadas++;
      if (resultado.status === "APLICACAO_COMERCIAL") aplicacoesComerciais++;
    } catch {
      falhas++;
    }
  }

  return {
    total: itens.length,
    evidenciasNovas,
    duplicadas,
    aplicacoesValidadas,
    aplicacoesComerciais,
    falhas,
  };
}
