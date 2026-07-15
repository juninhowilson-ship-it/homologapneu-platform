import { NextResponse, type NextRequest } from "next/server";
import { obterComparacao } from "@/services/curadoria";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const comparacao = await obterComparacao(Number(id));
    return NextResponse.json(comparacao);
  } catch (error) {
    return errorResponse(error);
  }
}
