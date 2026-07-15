import { NextResponse, type NextRequest } from "next/server";
import { atualizarCandidato } from "@/services/curadoria";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const atualizado = await atualizarCandidato(Number(id), patch);
    return NextResponse.json(atualizado);
  } catch (error) {
    return errorResponse(error);
  }
}
