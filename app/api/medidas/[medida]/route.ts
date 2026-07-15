import { NextResponse, type NextRequest } from "next/server";
import { buscarPorMedida } from "@/services/medidas";

type RouteParams = { params: Promise<{ medida: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { medida } = await params;
  const resultado = await buscarPorMedida(decodeURIComponent(medida));
  return NextResponse.json(resultado);
}
