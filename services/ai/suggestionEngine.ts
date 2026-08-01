import "server-only";
import { createAiSuggestions, type CreateAiSuggestionInput } from "@/repositories/ai/aiSuggestions";
import { createAiConflicts } from "@/repositories/ai/aiConflicts";
import { classifyConfidence } from "@/lib/ai/confidence/calculateConfidence";
import type { PipelineSuggestionDraft } from "@/pipelines/ai/documentAnalysisPipeline";
import type { DetectedConflict } from "@/lib/ai/conflicts/detectConflicts";
import type { AiSuggestionStatus } from "@prisma/client";

const DUPLICATE_TYPES = new Set(["DOCUMENTO_ANTIGO", "CODIGO_OE_DUPLICADO"]);

function statusFor(confidence: number, conflicts: DetectedConflict[]): AiSuggestionStatus {
  if (conflicts.length === 0) return classifyConfidence(confidence);
  return conflicts.some((c) => DUPLICATE_TYPES.has(c.type)) ? "DUPLICADO" : "CONFLITO";
}

/** Converte os rascunhos calculados pela pipeline (lib/ai + pipelines/ai)
 * em registros AiSuggestion/AiConflict persistidos — NUNCA grava em
 * Manufacturer/VehicleVersion/Tire/Homologation. `payload` de cada
 * sugestão é sempre o dado bruto reconhecido, para um humano revisar em
 * /administracao/ia e, se aprovar, cadastrar pelos fluxos normais. */
export async function persistSuggestionsAndConflicts(
  jobId: number,
  drafts: PipelineSuggestionDraft[],
  conflicts: DetectedConflict[]
) {
  const status = statusFor(0, conflicts); // status base por tipo de conflito (independe da confiança individual quando há conflito)

  const inputs: CreateAiSuggestionInput[] = drafts.map((draft) => ({
    jobId,
    type: draft.type,
    status: conflicts.length > 0 ? status : classifyConfidence(draft.confidence),
    payload: JSON.stringify(draft.payload),
    confidence: draft.confidence,
    rawSnippet: draft.rawSnippet,
  }));

  const suggestions = await createAiSuggestions(inputs);

  if (conflicts.length > 0 && suggestions.length > 0) {
    const suggestionIds = JSON.stringify(suggestions.map((s) => s.id));
    await createAiConflicts(
      conflicts.map((conflict) => ({
        jobId,
        type: conflict.type,
        severity: conflict.severity,
        description: conflict.description,
        suggestionIds,
      }))
    );
  }

  return suggestions;
}
