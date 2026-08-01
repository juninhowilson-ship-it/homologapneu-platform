import { NextResponse, type NextRequest } from "next/server";
import { importarMarcasPorNome } from "@/services/fabricantes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Distinto de /api/fabricantes/import (CSV com colunas já preenchidas):
 * recebe só uma lista de nomes de marca e deriva slug/brandPolicy/
 * researchStatus pelas regras de negócio em importarMarcasPorNome.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nomes = Array.isArray(body?.nomes) ? body.nomes : null;
    const fileName =
      typeof body?.fileName === "string" && body.fileName
        ? body.fileName
        : "importacao-marcas";

    if (!nomes || nomes.some((n: unknown) => typeof n !== "string")) {
      return NextResponse.json(
        { error: "Envie { nomes: string[] } com a lista de marcas" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const resultado = await importarMarcasPorNome(nomes, {
      fileName,
      fileType: "API",
      userId: user?.id ?? null,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
