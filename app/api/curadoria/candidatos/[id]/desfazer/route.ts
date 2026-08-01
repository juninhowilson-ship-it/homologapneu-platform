import { NextResponse, type NextRequest } from "next/server";
import { desfazerAprovacao } from "@/services/curadoria";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const resultado = await desfazerAprovacao(Number(id), user?.id ?? null);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
