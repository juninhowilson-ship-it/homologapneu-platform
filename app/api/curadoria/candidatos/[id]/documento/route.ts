import { NextResponse, type NextRequest } from "next/server";
import { obterUrlDocumento } from "@/services/curadoria";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

/** Signed URL de curta duração pro PDF/arquivo original no Storage —
 * usada pela comparação lado a lado. Nunca persistida (bucket privado). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const url = await obterUrlDocumento(Number(id));
    return NextResponse.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
