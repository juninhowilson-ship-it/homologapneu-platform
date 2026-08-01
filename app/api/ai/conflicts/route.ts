import { NextResponse, type NextRequest } from "next/server";
import { aiConflictFilterSchema } from "@/validators/ai/schemas";
import { listAiConflicts } from "@/repositories/ai/aiConflicts";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

/// GET /api/ai/conflicts — lista AiConflict, filtrável por status/jobId.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const query = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = aiConflictFilterSchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Filtros inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, pageSize, ...filtro } = parsed.data;
    const resultado = await listAiConflicts(filtro, page, pageSize);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
