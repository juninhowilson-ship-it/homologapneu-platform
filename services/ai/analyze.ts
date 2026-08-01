import "server-only";
import { analyzeDocumentFile } from "@/pipelines/ai/documentAnalysisPipeline";
import { persistSuggestionsAndConflicts } from "@/services/ai/suggestionEngine";
import type { AiJob } from "@prisma/client";

export type AnaliseResumo = {
  extractedText: string;
  result: string;
  averageConfidence: number | null;
  suggestionCount: number;
  conflictCount: number;
};

/** Roda a pipeline completa para um AiJob já carregado com fileContent, e
 * grava as sugestões/conflitos resultantes (services/ai/suggestionEngine.ts).
 * NÃO atualiza o status do próprio AiJob — isso é responsabilidade de
 * workers/ai/processor.ts (mecânica de fila: EXECUTANDO/CONCLUIDO/ERRO/
 * retry), assim como services/crawlerJobQueue.ts separa a mecânica de fila
 * do trabalho de domínio. */
export async function processarJobDeAnalise(job: AiJob): Promise<AnaliseResumo> {
  const resultado = await analyzeDocumentFile(
    job.id,
    // Buffer do Prisma (Bytes) já é um Node Buffer, que é um ArrayBufferView —
    // .buffer sozinho incluiria bytes de outros campos se houver slicing;
    // por isso recorta explicitamente pela janela do Buffer.
    job.fileContent.buffer.slice(
      job.fileContent.byteOffset,
      job.fileContent.byteOffset + job.fileContent.byteLength
    ),
    job.fileName,
    job.fileHash
  );

  const suggestions = await persistSuggestionsAndConflicts(job.id, resultado.suggestions, resultado.conflicts);

  const confidences = suggestions.map((s) => s.confidence);
  const averageConfidence =
    confidences.length > 0
      ? Math.round(confidences.reduce((soma, c) => soma + c, 0) / confidences.length)
      : null;

  const resumoResultado = {
    measures: resultado.measures,
    oeCodes: resultado.oeCodes,
    pressures: resultado.pressures,
    loadSpeedIndexes: resultado.loadSpeedIndexes,
    vehicles: resultado.vehicles,
    tires: resultado.tires,
    llmProviderUsed: resultado.llmProviderUsed,
    conflictCount: resultado.conflicts.length,
    suggestionCount: suggestions.length,
  };

  return {
    extractedText: resultado.extractedText,
    result: JSON.stringify(resumoResultado),
    averageConfidence,
    suggestionCount: suggestions.length,
    conflictCount: resultado.conflicts.length,
  };
}
