import { NextResponse, type NextRequest } from "next/server";
import { importHomologacoes } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;
    const fileName =
      typeof body?.fileName === "string" && body.fileName
        ? body.fileName
        : "importacao-homologacoes";

    if (!rows) {
      return NextResponse.json(
        { error: "Nenhuma linha para importar" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const resultado = await importHomologacoes(rows, {
      fileName,
      userId: user?.id ?? null,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
