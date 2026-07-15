import { NextResponse, type NextRequest } from "next/server";
import { buscarHistoricoHomologacao } from "@/services/homologacaoHistorico";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const historico = await buscarHistoricoHomologacao(Number(id));
    return NextResponse.json(historico);
  } catch (error) {
    return errorResponse(error);
  }
}
