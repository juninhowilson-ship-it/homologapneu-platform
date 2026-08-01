import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { EvidenceSourceType, ApplicationStatus } from "@prisma/client";
import { SOURCE_TYPE_POINTS, isHomologacaoOficial } from "@/lib/constants/evidence";
import { inferFileType } from "@/lib/importer/parseFile";
import type { ImportContexto } from "@/lib/importer/context";
import { computeImportHash } from "@/lib/importer/hash";
import { iniciarLote, finalizarLote } from "@/services/importBatches";
import type {
  ImportacaoResultado,
  ImportacaoLinhaResultado,
} from "@/types/importacao";
import { policyAllowsApplication } from "@/lib/constants/brandPolicy";
import { resolveManufacturerId } from "@/lib/masterData/resolveManufacturer";
import { normalizeLookupKey } from "@/lib/masterData/normalizeName";

export { SOURCE_TYPE_POINTS, isHomologacaoOficial };

/**
 * Motor de Validação de Aplicações: uma aplicação pneu↔veículo nunca é
 * tratada como homologação só por aparecer em uma fonte. Cada coleta vira
 * uma HomologationEvidence imutável (nunca editada/apagada); evidências da
 * MESMA aplicação (mesmo pneu + mesmo veículo/versão/anos, por chave
 * normalizada) se agrupam em um TireVehicleApplication, cujo status é
 * SEMPRE recalculado a partir do NÚMERO DE FONTES DISTINTAS que
 * confirmam a mesma aplicação (regra oficial da missão):
 *
 *   1 fonte (só marketplace)     -> Aplicação Comercial
 *   1 fonte (qualquer outro tipo) -> Evidência Isolada
 *   2 fontes distintas            -> Alta Confiança
 *   3+ fontes distintas           -> Homologação Validada
 *
 * `confidence` continua sendo a soma dos pontos por fonte distinta (ver
 * SOURCE_TYPE_POINTS em lib/constants/evidence.ts: Marketplace=20,
 * Distribuidor Oficial=30, Fabricante do Pneu=40, Montadora=40,
 * Manual=50, Catálogo OEM=60) — é uma métrica auxiliar de força da
 * evidência, mas quem decide o STATUS é a contagem de fontes, não mais a
 * pontuação.
 *
 * Divergência: quando o MESMO veículo+versão+ano tem duas ou mais
 * aplicações de pneu DISTINTAS que cada uma, de forma independente, já
 * tem 2+ fontes confirmando, isso é uma contradição real entre fontes —
 * todas ficam marcadas como Divergência em vez de o sistema escolher uma
 * sozinha. Nenhuma evidência é apagada nesse caso.
 */

const FONTES_ALTA_CONFIANCA = 2;
const FONTES_HOMOLOGACAO = 3;

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

/**
 * Status pela contagem de FONTES DISTINTAS (regra oficial): 1 fonte só de
 * marketplace vira Aplicação Comercial, 1 fonte de qualquer outro tipo
 * sozinha é Evidência Isolada, 2 fontes distintas viram Alta Confiança, 3
 * ou mais viram Homologação Validada.
 */
function statusPorFontes(
  quantidadeFontesDistintas: number,
  tiposPresentes: Set<EvidenceSourceType>
): ApplicationStatus {
  if (quantidadeFontesDistintas >= FONTES_HOMOLOGACAO) return "HOMOLOGACAO_VALIDADA";
  if (quantidadeFontesDistintas >= FONTES_ALTA_CONFIANCA) return "ALTA_CONFIANCA";
  if (quantidadeFontesDistintas === 1 && tiposPresentes.has("MARKETPLACE")) {
    return "APLICACAO_COMERCIAL";
  }
  return "EVIDENCIA_ISOLADA";
}

/**
 * Verifica se o veículo+versão+ano desta aplicação tem outra aplicação de
 * pneu DISTINTA que também já tem 2+ fontes confirmando (Alta Confiança
 * ou Homologação Validada) — nesse caso, é uma divergência real entre
 * fontes, e todas as aplicações envolvidas são marcadas como DIVERGENCIA
 * em vez de o sistema escolher uma sozinha. Retorna o status final desta
 * aplicação após a checagem.
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

  const fortes = mesmoVeiculo.filter(
    (a) => a.status === "ALTA_CONFIANCA" || a.status === "HOMOLOGACAO_VALIDADA"
  );
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
  const fontesDistintas = new Set(evidencias.map((e) => e.sourceName));
  const confidence = calcularPontuacao(evidencias);
  const status = statusPorFontes(fontesDistintas.size, tiposPresentes);

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

const EVIDENCE_SOURCE_TYPES: EvidenceSourceType[] = [
  "MARKETPLACE",
  "DISTRIBUIDOR_OFICIAL",
  "FABRICANTE_PNEU",
  "MONTADORA",
  "MANUAL",
  "CATALOGO_OE",
];

/**
 * Wrapper de database/import/applications/ sobre registrarEvidencia —
 * adiciona ImportBatch/relatório de erro por linha (ausentes em
 * registrarLoteEvidencias, que não é voltado a upload de arquivo). Nunca
 * cria Homologation/ManufacturerHomologation — só TireVehicleApplication/
 * HomologationEvidence, a mesma garantia estrutural de sempre. Colunas:
 * fabricantePneu, modeloPneu, medida, montadora, modeloVeiculo,
 * versaoVeiculo, anoInicial, anoFinal, fonteUrl, fonteNome, tipoFonte
 * (MARKETPLACE/DISTRIBUIDOR_OFICIAL/FABRICANTE_PNEU/MONTADORA/MANUAL/
 * CATALOGO_OE), dataColeta (AAAA-MM-DD).
 */
export async function importarAplicacoesCsv(
  rows: Record<string, string>[],
  contexto?: ImportContexto
): Promise<ImportacaoResultado> {
  const inicio = Date.now();

  const lote = contexto
    ? await iniciarLote({
        fileName: contexto.fileName,
        fileType: contexto.fileType ?? inferFileType(contexto.fileName),
        entity: "APLICACOES",
        userId: contexto.userId,
        sourceVersion: contexto.sourceVersion,
        collectedAt: contexto.collectedAt,
        sourceUrl: contexto.sourceUrl,
        importHash: computeImportHash(rows),
      })
    : null;

  let criados = 0;
  let duplicados = 0;
  const detalhes: ImportacaoLinhaResultado[] = [];

  for (const [index, record] of rows.entries()) {
    const linha = index + 2;
    const label = `${record.fabricantePneu ?? ""} ${record.modeloPneu ?? ""} ${record.medida ?? ""} → ${record.montadora ?? ""} ${record.modeloVeiculo ?? ""}`.trim();

    try {
      const tireManufacturerName = (record.fabricantePneu ?? "").trim();
      const tireModel = (record.modeloPneu ?? "").trim();
      const tireSize = (record.medida ?? "").trim();
      const vehicleManufacturerName = (record.montadora ?? "").trim();
      const vehicleModel = (record.modeloVeiculo ?? "").trim();
      const sourceUrl = (record.fonteUrl ?? "").trim();
      const sourceName = (record.fonteNome ?? "").trim();
      const sourceTypeRaw = (record.tipoFonte ?? "").trim().toUpperCase();
      const collectedAtRaw = (record.dataColeta ?? "").trim();

      if (
        !tireManufacturerName ||
        !tireModel ||
        !tireSize ||
        !vehicleManufacturerName ||
        !vehicleModel ||
        !sourceUrl ||
        !sourceName
      ) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro:
            "fabricantePneu, modeloPneu, medida, montadora, modeloVeiculo, fonteUrl e fonteNome são obrigatórios",
          rotulo: label,
        });
        continue;
      }

      if (!EVIDENCE_SOURCE_TYPES.includes(sourceTypeRaw as EvidenceSourceType)) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `tipoFonte "${record.tipoFonte ?? ""}" inválido — use um de: ${EVIDENCE_SOURCE_TYPES.join(", ")}`,
          rotulo: label,
        });
        continue;
      }

      const collectedAt = collectedAtRaw ? new Date(collectedAtRaw) : new Date();
      if (Number.isNaN(collectedAt.getTime())) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `dataColeta "${collectedAtRaw}" inválida — use AAAA-MM-DD`,
          rotulo: label,
        });
        continue;
      }

      // Validações de existência (regra explícita: fabricante/modelo/
      // medida/veículo precisam já existir antes de criar o
      // relacionamento — nunca criar a partir de uma aplicação isolada).
      const tireManufacturer = await prisma.tireManufacturer.findUnique({
        where: { name: tireManufacturerName },
        select: { id: true, brandPolicy: true },
      });
      if (!tireManufacturer) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Fabricante de pneu "${tireManufacturerName}" não encontrado — importe em brands/ antes`,
          rotulo: label,
        });
        continue;
      }

      if (!policyAllowsApplication(tireManufacturer.brandPolicy)) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Política "${tireManufacturer.brandPolicy}" de "${tireManufacturerName}" não permite aplicações`,
          rotulo: label,
        });
        continue;
      }

      const tireModelExists = await prisma.tireModel.findUnique({
        where: { tireManufacturerId_name: { tireManufacturerId: tireManufacturer.id, name: tireModel } },
        select: { id: true },
      });
      if (!tireModelExists) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Modelo "${tireModel}" não encontrado para "${tireManufacturerName}" — importe em tire_models/ antes`,
          rotulo: label,
        });
        continue;
      }

      const tireSizeExists = await prisma.tire.findFirst({
        where: { tireManufacturerId: tireManufacturer.id, model: tireModel, size: tireSize },
        select: { id: true },
      });
      if (!tireSizeExists) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Medida "${tireSize}" não encontrada para "${tireManufacturerName} ${tireModel}" — importe em tire_sizes/ antes`,
          rotulo: label,
        });
        continue;
      }

      const vehicleManufacturerExists = await resolveManufacturerId(prisma, vehicleManufacturerName);
      if (!vehicleManufacturerExists) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Montadora "${vehicleManufacturerName}" não encontrada — importe em vehicles/ antes`,
          rotulo: label,
        });
        continue;
      }

      const vehicleModelExists = await prisma.vehicleModel.findFirst({
        where: { manufacturerId: vehicleManufacturerExists.id, normalizedName: normalizeLookupKey(vehicleModel) },
        select: { id: true },
      });
      if (!vehicleModelExists) {
        detalhes.push({
          linha,
          status: "erro",
          sucesso: false,
          erro: `Veículo "${vehicleManufacturerName} ${vehicleModel}" não encontrado — importe em vehicles/ antes`,
          rotulo: label,
        });
        continue;
      }

      const resultado = await registrarEvidencia({
        tireManufacturerName,
        tireModel,
        tireSize,
        vehicleManufacturerName,
        vehicleModel,
        vehicleVersion: (record.versaoVeiculo ?? "").trim() || null,
        yearStart: record.anoInicial ? Number(record.anoInicial) : null,
        yearEnd: record.anoFinal ? Number(record.anoFinal) : null,
        sourceUrl,
        sourceName,
        sourceType: sourceTypeRaw as EvidenceSourceType,
        collectedAt,
      });

      if (resultado.duplicada) {
        duplicados++;
        detalhes.push({ linha, status: "duplicado", sucesso: true, rotulo: label });
      } else {
        criados++;
        detalhes.push({ linha, status: "criado", sucesso: true, rotulo: label });
      }
    } catch (error) {
      detalhes.push({
        linha,
        status: "erro",
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        rotulo: label,
      });
    }
  }

  const falhas = detalhes.filter((d) => d.status === "erro").length;

  if (lote) {
    await finalizarLote(lote.id, {
      totalRows: rows.length,
      importedCount: criados,
      updatedCount: 0,
      duplicateCount: duplicados,
      errorCount: falhas,
      durationMs: Date.now() - inicio,
      erros: detalhes
        .filter((d) => d.status === "erro")
        .map((d) => ({
          rowNumber: d.linha,
          message: d.erro ?? "Erro desconhecido",
          rawData: d.rotulo ? JSON.stringify({ rotulo: d.rotulo }) : null,
        })),
    });
  }

  return {
    total: rows.length,
    sucesso: criados,
    criados,
    atualizados: 0,
    duplicados,
    falhas,
    detalhes,
  };
}
