import { NextResponse, type NextRequest } from "next/server";
import { aiSuggestionFilterSchema } from "@/validators/ai/schemas";
import { listAiSuggestions } from "@/repositories/ai/aiSuggestions";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

/// GET /api/ai/suggestions — listagem bruta e paginada de AiSuggestion
/// (distinta de /api/ai/review, que é a visão categorizada da fila).
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const query = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = aiSuggestionFilterSchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Filtros inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, pageSize, ...filtro } = parsed.data;
    const resultado = await listAiSuggestions(filtro, page, pageSize);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
