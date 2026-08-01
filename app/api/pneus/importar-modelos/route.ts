import { NextResponse, type NextRequest } from "next/server";
import { importarModelosPorNome, type ModeloParaImportar } from "@/services/pneus";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Distinto de /api/pneus/import (CSV completo, com medida/índices/
 * categoria já preenchidos): recebe só nome do modelo + nome do
 * fabricante, mesmo padrão de /api/fabricantes/importar-marcas.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const modelos: ModeloParaImportar[] | null = Array.isArray(body?.modelos)
      ? body.modelos
      : null;
    const fileName =
      typeof body?.fileName === "string" && body.fileName
        ? body.fileName
        : "importacao-modelos";

    if (
      !modelos ||
      modelos.some(
        (m) => typeof m?.nome !== "string" || typeof m?.fabricante !== "string"
      )
    ) {
      return NextResponse.json(
        { error: "Envie { modelos: { nome: string, fabricante: string }[] }" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const resultado = await importarModelosPorNome(modelos, {
      fileName,
      fileType: "API",
      userId: user?.id ?? null,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
