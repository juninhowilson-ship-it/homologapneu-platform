import { NextResponse, type NextRequest } from "next/server";
import { aiSuggestionFilterSchema } from "@/validators/ai/schemas";
import { listarSugestoes } from "@/services/ai/reviewQueue";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

/// GET /api/ai/review — fila de revisão da IA, filtrável por status/type/
/// minConfidence/jobId (validators/ai/schemas.ts). Categorias (Pendente,
/// Alta confiança, Baixa confiança, Conflitos, Duplicados) são só valores
/// diferentes de `status` em AiSuggestion.
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
    const resultado = await listarSugestoes(filtro, page, pageSize);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
