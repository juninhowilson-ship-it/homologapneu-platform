import { NextResponse, type NextRequest } from "next/server";
import { importVeiculosCsv } from "@/services/veiculos";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

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

    const user = await getCurrentUser();
    const text = await file.text();
    const resultado = await importVeiculosCsv(text, {
      fileName: file.name,
      userId: user?.id ?? null,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
