import { NextResponse } from "next/server";
import { obterEstatisticasCuradoria } from "@/services/curadoria";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const estatisticas = await obterEstatisticasCuradoria();
    return NextResponse.json(estatisticas);
  } catch (error) {
    return errorResponse(error);
  }
}
