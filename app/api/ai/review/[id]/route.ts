import { NextResponse, type NextRequest } from "next/server";
import { aiReviewActionSchema } from "@/validators/ai/schemas";
import { marcarRevisada } from "@/services/ai/reviewQueue";
import { requireAdmin } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/// PATCH /api/ai/review/[id] — marca uma AiSuggestion como REVISADA ou
/// DESCARTADA. Só atualiza o status dentro do domínio da IA; o cadastro
/// real (se aprovado) segue pelos fluxos normais do painel.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = aiReviewActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const sugestao = await marcarRevisada(id, {
      status: parsed.data.status,
      userId: user.id,
      notes: parsed.data.notes || null,
    });
    return NextResponse.json(sugestao);
  } catch (error) {
    return errorResponse(error);
  }
}
