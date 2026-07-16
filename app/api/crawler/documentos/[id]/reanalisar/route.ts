import { NextResponse } from "next/server";
import { reanalisarDocumento } from "@/services/crawlerReanalise";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const resultado = await reanalisarDocumento(Number(id));
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
