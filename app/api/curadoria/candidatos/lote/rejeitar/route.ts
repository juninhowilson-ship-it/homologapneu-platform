import { NextResponse, type NextRequest } from "next/server";
import { rejeitarCandidatosEmLote } from "@/services/curadoria";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];
    if (ids.length === 0) throw new ValidationError("Informe ao menos um id de candidato.");
    if (ids.length > 500) throw new ValidationError("Máximo de 500 candidatos por lote.");

    const user = await getCurrentUser();
    const resultados = await rejeitarCandidatosEmLote(ids, user?.id ?? null, body.notes ?? null);
    return NextResponse.json({
      resultados,
      sucesso: resultados.filter((r) => r.sucesso).length,
      falhas: resultados.filter((r) => !r.sucesso).length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
