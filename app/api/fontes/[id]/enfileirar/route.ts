import { NextResponse, type NextRequest } from "next/server";
import { enfileirarSincronizacao } from "@/services/sourceManager";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const item = await enfileirarSincronizacao(Number(id));
    return NextResponse.json(item);
  } catch (error) {
    return errorResponse(error);
  }
}
