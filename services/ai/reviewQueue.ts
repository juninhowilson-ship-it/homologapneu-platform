import "server-only";
import {
  listAiSuggestions,
  findAiSuggestionById,
  reviewAiSuggestion,
  type AiSuggestionFilter,
} from "@/repositories/ai/aiSuggestions";
import { NotFoundError } from "@/lib/errors";
import type { AiSuggestionStatus } from "@prisma/client";

/// Fila de revisão da IA Engine — só categoriza/lista o que já foi
/// calculado por services/ai/analyze.ts. Nenhuma função aqui grava em
/// Homologation/VehicleVersion/Tire: "revisar" muda apenas o status da
/// AiSuggestion dentro do domínio da IA (o cadastro real, quando aprovado
/// por um humano, segue pelos fluxos normais do painel — Cadastros/
/// Curadoria — não por aqui).

export async function listarPorFila(status: AiSuggestionStatus, page = 1, pageSize = 50) {
  return listAiSuggestions({ status }, page, pageSize);
}

export async function listarSugestoes(filtro: AiSuggestionFilter, page = 1, pageSize = 50) {
  return listAiSuggestions(filtro, page, pageSize);
}

export async function marcarRevisada(
  id: number,
  data: { status: AiSuggestionStatus; userId: number | null; notes: string | null }
) {
  const existente = await findAiSuggestionById(id);
  if (!existente) throw new NotFoundError("Sugestão não encontrada.");

  return reviewAiSuggestion(id, {
    status: data.status,
    reviewedByIdRaw: data.userId,
    reviewNotes: data.notes,
  });
}
