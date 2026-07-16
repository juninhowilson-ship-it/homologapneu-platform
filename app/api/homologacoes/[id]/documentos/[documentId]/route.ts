import { NextResponse, type NextRequest } from "next/server";
import { removerDocumento } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string; documentId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id, documentId } = await params;
  try {
    const user = await getCurrentUser();
    const homologacao = await removerDocumento(Number(id), Number(documentId), user?.id ?? null);
    return NextResponse.json(homologacao);
  } catch (error) {
    return errorResponse(error);
  }
}
