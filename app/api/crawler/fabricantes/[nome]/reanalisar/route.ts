import { NextResponse } from "next/server";
import { reanalisarFabricante } from "@/services/crawlerReanalise";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ nome: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { nome } = await params;
    const resultado = await reanalisarFabricante(decodeURIComponent(nome));
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
