import { NextResponse } from "next/server";
import { processarProximoDaFila } from "@/services/sourceManager";
import { errorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    const resultado = await processarProximoDaFila();
    if (!resultado) {
      return NextResponse.json({ mensagem: "Fila vazia." });
    }
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
