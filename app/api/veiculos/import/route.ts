import { NextResponse, type NextRequest } from "next/server";
import { importVeiculosCsv } from "@/services/veiculos";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo CSV não enviado" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const resultado = await importVeiculosCsv(text);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
