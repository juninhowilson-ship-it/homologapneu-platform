import "server-only";
import { countAiJobs, averageAiJobDurationMs } from "@/repositories/ai/aiJobs";
import {
  countAiSuggestions,
  countAiSuggestionsByStatus,
  countAiSuggestionsByType,
  averageConfidence,
} from "@/repositories/ai/aiSuggestions";
import { countOpenAiConflicts } from "@/repositories/ai/aiConflicts";

export type AiDashboardStats = {
  documentosProcessados: number;
  homologacoesSugeridas: number;
  pendentes: number;
  conflitos: number;
  tempoMedioMs: number | null;
  confiancaMedia: number | null;
  totalSugestoes: number;
};

/** KPIs mostrados no Dashboard IA (/administracao/ia) — todos calculados a
 * partir das tabelas ai_jobs/ai_suggestions/ai_conflicts, nunca do Banco
 * Mestre (a IA Engine não sabe quantas homologações reais existem, só
 * quantas ela sugeriu). */
export async function obterEstatisticas(): Promise<AiDashboardStats> {
  const [documentosProcessados, porStatus, porTipo, conflitos, tempoMedioMs, confiancaMedia, totalSugestoes] =
    await Promise.all([
      countAiJobs({ status: "CONCLUIDO" }),
      countAiSuggestionsByStatus(),
      countAiSuggestionsByType(),
      countOpenAiConflicts(),
      averageAiJobDurationMs(),
      averageConfidence(),
      countAiSuggestions(),
    ]);

  const pendentes = porStatus.find((s) => s.status === "PENDENTE")?.total ?? 0;
  const homologacoesSugeridas = porTipo.find((t) => t.type === "HOMOLOGATION")?.total ?? 0;

  return {
    documentosProcessados,
    homologacoesSugeridas,
    pendentes,
    conflitos,
    tempoMedioMs,
    confiancaMedia,
    totalSugestoes,
  };
}
