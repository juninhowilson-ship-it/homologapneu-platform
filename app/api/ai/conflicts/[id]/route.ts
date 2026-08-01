import { NextResponse, type NextRequest } from "next/server";
import { aiConflictResolveSchema } from "@/validators/ai/schemas";
import { findAiConflictById, resolveAiConflict } from "@/repositories/ai/aiConflicts";
import { requireAdmin } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/// PATCH /api/ai/conflicts/[id] — marca um AiConflict como RESOLVIDO ou
/// IGNORADO. Não altera as AiSuggestion relacionadas (revisão delas é
/// separada, via /api/ai/review/[id]).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = aiConflictResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const existente = await findAiConflictById(id);
    if (!existente) throw new NotFoundError("Conflito não encontrado.");

    const conflito = await resolveAiConflict(id, {
      status: parsed.data.status,
      resolvedByIdRaw: user.id,
    });
    return NextResponse.json(conflito);
  } catch (error) {
    return errorResponse(error);
  }
}
