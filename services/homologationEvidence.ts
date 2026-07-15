import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { EvidenceSourceType, ApplicationStatus } from "@prisma/client";

/**
 * Motor de Validação de Aplicações: uma aplicação pneu↔veículo nunca é
 * tratada como homologação só por aparecer em uma fonte. Cada coleta vira
 * uma HomologationEvidence imutável (nunca editada/apagada); evidências da
 * MESMA aplicação (mesmo pneu + mesmo veículo/versão/anos, por chave
 * normalizada) se agrupam em um TireVehicleApplication, cuja pontuação e
 * status são SEMPRE recalculados a partir do conjunto de evidências:
 *
 * Pontos por tipo de fonte confirmando (uma vez por fonte DISTINTA — uma
 * mesma fonte reconfirmando não infla a pontuação, só corroboração
 * independente conta):
 *   MARKETPLACE = 20 · MANUAL = 30 · FABRICANTE_PNEU = 40 · MONTADORA = 40
 *   · CATALOGO_OE = 40
 *
 * Faixas de pontuação total:
 *   >= 80            -> Homologação Validada
 *   40 a 79          -> Alta Confiança
 *   20 a 39          -> Aplicação Comercial
 *   < 20             -> Evidência Isolada
 *
 * Confirmação simultânea por FABRICANTE_PNEU + MONTADORA força Homologação
 * Validada (na prática já é o que a pontuação dá: 40+40=80).
 *
 * Divergência: quando o MESMO veículo+versão+ano tem duas ou mais
 * aplicações de pneu DISTINTAS que cada uma, de forma independente, já
 * junta confiança relevante (>=40 pontos), isso é uma contradição real
 * entre fontes — todas ficam marcadas como Divergência em vez de o
 * sistema escolher uma sozinha. Nenhuma evidência é apagada nesse caso.
 */

export const SOURCE_TYPE_POINTS: Record<EvidenceSourceType, number> = {
  MARKETPLACE: 20,
  MANUAL: 30,
  FABRICANTE_PNEU: 40,
  MONTADORA: 40,
  CATALOGO_OE: 40,
};

/**
 * Rótulos para exibição. Só HOMOLOGACAO_VALIDADA deve ser apresentada como
 * homologação oficial — todo o resto é "aplicação compatível" (ainda em
 * consolidação), conforme exigido pela missão.
 */
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  EVIDENCIA_ISOLADA: "Evidência Isolada",
  APLICACAO_COMERCIAL: "Aplicação Comercial",
  ALTA_CONFIANCA: "Alta Confiança",
  HOMOLOGACAO_VALIDADA: "Homologação Validada",
  DIVERGENCIA: "Divergência",
};

export function isHomologacaoOficial(status: ApplicationStatus): boolean {
  return status === "HOMOLOGACAO_VALIDADA";
}

const LIMIAR_ALTA_CONFIANCA = 40;
const LIMIAR_HOMOLOGACAO = 80;
const LIMIAR_APLICACAO_COMERCIAL = 20;

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
 * Soma os pontos de cada FONTE DISTINTA (por nome) presente nas
 * evidências — uma mesma fonte reconfirmando a mesma aplicação não infla
 * a pontuação; só a corroboração de fontes independentes conta.
 */
function calcularPontuacao(
  evidencias: { sourceName: string; sourceType: EvidenceSourceType }[]
): number {
  const pontosPorFonte = new Map<string, number>();
  for (const e of evidencias) {
    const pontos = SOURCE_TYPE_POINTS[e.sourceType];
    pontosPorFonte.set(e.sourceName, Math.max(pontosPorFonte.get(e.sourceName) ?? 0, pontos));
  }
  const total = Array.from(pontosPorFonte.values()).reduce((soma, p) => soma + p, 0);
  return Math.min(100, total);
}

function statusPorPontuacao(
  pontuacao: number,
  tiposPresentes: Set<EvidenceSourceType>
): ApplicationStatus {
  if (tiposPresentes.has("FABRICANTE_PNEU") && tiposPresentes.has("MONTADORA")) {
    return "HOMOLOGACAO_VALIDADA";
  }
  if (pontuacao >= LIMIAR_HOMOLOGACAO) return "HOMOLOGACAO_VALIDADA";
  if (pontuacao >= LIMIAR_ALTA_CONFIANCA) return "ALTA_CONFIANCA";
  if (pontuacao >= LIMIAR_APLICACAO_COMERCIAL) return "APLICACAO_COMERCIAL";
  return "EVIDENCIA_ISOLADA";
}

/**
 * Verifica se o veículo+versão+ano desta aplicação tem outra aplicação de
 * pneu DISTINTA que também já reúne confiança relevante — nesse caso, é
 * uma divergência real entre fontes, e todas as aplicações envolvidas são
 * marcadas como DIVERGENCIA em vez de o sistema escolher uma sozinha.
 * Retorna o status final desta aplicação após a checagem.
 */
async function verificarDivergencia(applicationId: number): Promise<ApplicationStatus> {
  const atual = await prisma.tireVehicleApplication.findUniqueOrThrow({
    where: { id: applicationId },
  });

  const mesmoVeiculo = await prisma.tireVehicleApplication.findMany({
    where: {
      vehicleManufacturerName: atual.vehicleManufacturerName,
      vehicleModel: atual.vehicleModel,
      vehicleVersion: atual.vehicleVersion,
      yearStart: atual.yearStart,
      yearEnd: atual.yearEnd,
    },
  });

  const fortes = mesmoVeiculo.filter((a) => a.confidence >= LIMIAR_ALTA_CONFIANCA);
  const pneusDistintos = new Set(
    fortes.map((a) => `${a.tireManufacturerName}|${a.tireModel}|${a.tireSize}`)
  );

  if (pneusDistintos.size < 2) {
    return atual.status;
  }

  await prisma.tireVehicleApplication.updateMany({
    where: { id: { in: fortes.map((a) => a.id) } },
    data: { status: "DIVERGENCIA" },
  });

  return "DIVERGENCIA";
}

/**
 * Registra uma evidência coletada. Sempre encontra-ou-cria a aplicação
 * (por chave exata normalizada), insere a evidência (a menos que seja uma
 * recoleta idêntica — mesmo hash — da mesma fonte, para não acumular
 * linhas redundantes sem perder nenhuma evidência real), recalcula a
 * pontuação/status da aplicação, e checa divergência com aplicações
 * concorrentes do mesmo veículo.
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
        sourceConfidence: SOURCE_TYPE_POINTS[input.sourceType],
      },
      select: { id: true },
    });
    evidenceId = criada.id;
  }

  const evidencias = await prisma.homologationEvidence.findMany({
    where: { applicationId: application.id },
    select: { sourceType: true, sourceName: true },
  });
  const tiposPresentes = new Set(evidencias.map((e) => e.sourceType));
  const confidence = calcularPontuacao(evidencias);
  const status = statusPorPontuacao(confidence, tiposPresentes);

  await prisma.tireVehicleApplication.update({
    where: { id: application.id },
    data: { status, confidence, evidenceCount: evidencias.length },
  });

  const statusFinal = await verificarDivergencia(application.id);

  return { applicationId: application.id, evidenceId, duplicada, status: statusFinal, confidence };
}

export type RegistroLoteResultado = {
  total: number;
  evidenciasNovas: number;
  duplicadas: number;
  aplicacoesValidadas: number;
  aplicacoesAltaConfianca: number;
  aplicacoesComerciais: number;
  divergencias: number;
  falhas: number;
};

export async function registrarLoteEvidencias(
  itens: EvidenciaInput[]
): Promise<RegistroLoteResultado> {
  let evidenciasNovas = 0;
  let duplicadas = 0;
  let aplicacoesValidadas = 0;
  let aplicacoesAltaConfianca = 0;
  let aplicacoesComerciais = 0;
  let divergencias = 0;
  let falhas = 0;

  for (const item of itens) {
    try {
      const resultado = await registrarEvidencia(item);
      if (resultado.duplicada) duplicadas++;
      else evidenciasNovas++;
      if (resultado.status === "HOMOLOGACAO_VALIDADA") aplicacoesValidadas++;
      if (resultado.status === "ALTA_CONFIANCA") aplicacoesAltaConfianca++;
      if (resultado.status === "APLICACAO_COMERCIAL") aplicacoesComerciais++;
      if (resultado.status === "DIVERGENCIA") divergencias++;
    } catch {
      falhas++;
    }
  }

  return {
    total: itens.length,
    evidenciasNovas,
    duplicadas,
    aplicacoesValidadas,
    aplicacoesAltaConfianca,
    aplicacoesComerciais,
    divergencias,
    falhas,
  };
}
