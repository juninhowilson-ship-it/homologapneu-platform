import { NextResponse, type NextRequest } from "next/server";
import { removerRoda } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string; wheelId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, wheelId } = await params;
  try {
    const user = await getCurrentUser();
    const homologacao = await removerRoda(Number(id), Number(wheelId), user?.id ?? null);
    return NextResponse.json(homologacao);
  } catch (error) {
    return errorResponse(error);
  }
}
