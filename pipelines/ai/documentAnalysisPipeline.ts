import "server-only";
import crypto from "node:crypto";
import { extractDocumentText } from "@/lib/ai/document/extractText";
import { extractMeasures, type ExtractedMeasure } from "@/lib/ai/document/extractMeasures";
import { extractOeCodes } from "@/lib/ai/document/extractOeCodes";
import { extractPressures, type ExtractedPressure } from "@/lib/ai/document/extractPressure";
import {
  extractLoadSpeedIndexes,
  type RecognizedLoadSpeedIndex,
} from "@/lib/ai/document/extractLoadSpeedIndex";
import { extractTables, type ExtractedTable } from "@/lib/ai/document/extractTables";
import { recognizeVehicles, type RecognizedVehicle } from "@/lib/ai/vehicle/recognize";
import { recognizeTires, type RecognizedTire } from "@/lib/ai/tire/recognize";
import { detectConflicts, type DetectedConflict } from "@/lib/ai/conflicts/detectConflicts";
import { calculateConfidence } from "@/lib/ai/confidence/calculateConfidence";
import { getActiveProvider } from "@/lib/ai/providers/registry";
import {
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
  buildDocumentAnalysisPrompt,
  parseLlmDocumentAnalysis,
  type LlmDocumentAnalysis,
} from "@/prompts/ai/documentAnalysis";
import type { AiSuggestionType } from "@prisma/client";

export type PipelineSuggestionDraft = {
  type: AiSuggestionType;
  payload: Record<string, unknown>;
  confidence: number;
  rawSnippet: string | null;
};

export type PipelineResult = {
  extractedText: string;
  tables: ExtractedTable;
  measures: ExtractedMeasure[];
  oeCodes: string[];
  pressures: ExtractedPressure[];
  loadSpeedIndexes: RecognizedLoadSpeedIndex[];
  vehicles: RecognizedVehicle[];
  tires: RecognizedTire[];
  llmProviderUsed: string | null;
  llmAnalysis: LlmDocumentAnalysis | null;
  conflicts: DetectedConflict[];
  suggestions: PipelineSuggestionDraft[];
};

/** Chama o provider de LLM ativo (se algum estiver configurado) só para
 * REFORÇAR a extração determinística — nunca substitui measures/oeCodes/
 * vehicles já calculados por regex/cruzamento com o banco. Qualquer falha
 * de rede/parsing é engolida aqui: a pipeline sempre tem um resultado
 * válido só com a extração local. */
async function runLlmAugmentation(
  text: string
): Promise<{ provider: string | null; analysis: LlmDocumentAnalysis | null }> {
  const provider = getActiveProvider();
  if (!provider) return { provider: null, analysis: null };

  try {
    const raw = await provider.complete({
      system: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
      prompt: buildDocumentAnalysisPrompt(text),
      maxTokens: 1500,
    });
    return { provider: provider.id, analysis: parseLlmDocumentAnalysis(raw) };
  } catch {
    return { provider: provider.id, analysis: null };
  }
}

function measureAgreesWithLlm(measure: ExtractedMeasure, llm: LlmDocumentAnalysis | null): boolean | null {
  if (!llm) return null;
  return llm.measures.some(
    (m) => m.width === measure.width && m.profile === measure.profile && m.rim === measure.rim
  );
}

/** Núcleo da pipeline: extrai → reconhece veículo/pneu → (opcional) reforça
 * com LLM → detecta conflitos → monta rascunhos de sugestão com confiança.
 * NÃO grava nada no banco — quem chama decide se persiste (services/ai/
 * analyze.ts, modo job) ou só devolve o resultado (rota /api/ai/analyze,
 * modo preview). `jobId` pode ser um sentinel negativo no modo preview
 * (nenhum AiJob real ainda existe para comparar). */
export async function analyzeExtractedText(
  jobId: number,
  fileHash: string,
  text: string,
  tables: ExtractedTable
): Promise<PipelineResult> {
  const measures = extractMeasures(text);
  const oeCodes = extractOeCodes(text);
  const pressures = extractPressures(text);
  const [loadSpeedIndexes, vehicles] = await Promise.all([
    extractLoadSpeedIndexes(text),
    recognizeVehicles(text),
  ]);
  const tires = await recognizeTires(text, measures);

  const { provider: llmProviderUsed, analysis: llmAnalysis } = await runLlmAugmentation(text);

  const conflicts = await detectConflicts({
    jobId,
    fileHash,
    text,
    measures,
    pressures,
    oeCodes,
    vehicles,
    tires,
  });
  const consistent = conflicts.length === 0;

  const suggestions: PipelineSuggestionDraft[] = [];

  for (const vehicle of vehicles) {
    suggestions.push({
      type: "VEHICLE",
      payload: { ...vehicle },
      rawSnippet: null,
      confidence: calculateConfidence({
        evidenceCount: 1,
        matchedInDatabase: vehicle.versionId !== null,
        llmAgreement: llmAnalysis ? llmAnalysis.vehicle !== null : null,
        consistent,
      }),
    });
  }

  for (const tire of tires) {
    suggestions.push({
      type: "TIRE",
      payload: { ...tire },
      rawSnippet: tire.measure.raw,
      confidence: calculateConfidence({
        evidenceCount: 1,
        matchedInDatabase: tire.matchedInDatabase,
        llmAgreement: measureAgreesWithLlm(tire.measure, llmAnalysis),
        consistent,
      }),
    });
  }

  if (oeCodes.length > 0) {
    suggestions.push({
      type: "DOCUMENT",
      payload: { oeCodes, pressures, loadSpeedIndexes },
      rawSnippet: null,
      confidence: calculateConfidence({
        evidenceCount: oeCodes.length,
        matchedInDatabase: false,
        llmAgreement: llmAnalysis ? oeCodes.some((c) => llmAnalysis.oeCodes.includes(c)) : null,
        consistent,
      }),
    });
  }

  const veiculosReconhecidos = vehicles.filter((v) => v.versionId !== null);
  if (veiculosReconhecidos.length > 0 && tires.length > 0) {
    suggestions.push({
      type: "HOMOLOGATION",
      payload: { vehicles: veiculosReconhecidos, tires },
      rawSnippet: null,
      confidence: calculateConfidence({
        evidenceCount: Math.min(veiculosReconhecidos.length, tires.length),
        matchedInDatabase: tires.some((t) => t.matchedInDatabase),
        llmAgreement: llmAnalysis ? llmAnalysis.vehicle !== null && llmAnalysis.measures.length > 0 : null,
        consistent,
      }),
    });
  }

  return {
    extractedText: text,
    tables,
    measures,
    oeCodes,
    pressures,
    loadSpeedIndexes,
    vehicles,
    tires,
    llmProviderUsed,
    llmAnalysis,
    conflicts,
    suggestions,
  };
}

export async function analyzeDocumentFile(
  jobId: number,
  buffer: ArrayBuffer,
  fileName: string,
  fileHash: string
): Promise<PipelineResult> {
  const { text, headers, rows } = await extractDocumentText(buffer, fileName);
  const tables = extractTables(headers, rows);
  return analyzeExtractedText(jobId, fileHash, text, tables);
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
