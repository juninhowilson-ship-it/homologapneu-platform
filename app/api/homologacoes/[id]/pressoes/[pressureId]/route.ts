import { NextResponse, type NextRequest } from "next/server";
import { removerPressao } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string; pressureId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, pressureId } = await params;
  try {
    const user = await getCurrentUser();
    const homologacao = await removerPressao(Number(id), Number(pressureId), user?.id ?? null);
    return NextResponse.json(homologacao);
  } catch (error) {
    return errorResponse(error);
  }
}
