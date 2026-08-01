import { NextResponse, type NextRequest } from "next/server";
import { importByFolder, isFolderKey } from "@/lib/importer/folderImport";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Entrada única do botão "IMPORTAR DADOS" — recebe linhas já parseadas
 * (o cliente chama /api/importer/parse primeiro, mesmo fluxo do
 * ImportWizard já existente) mais a pasta/entidade de destino, e roteia
 * via lib/importer/folderImport.ts para o importador real de cada
 * entidade — nenhuma lógica de import nova aqui, só despacho.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await request.json();
    const folder = typeof body?.folder === "string" ? body.folder : "";
    const rows = Array.isArray(body?.rows) ? body.rows : null;
    const fileName =
      typeof body?.fileName === "string" && body.fileName
        ? body.fileName
        : "importacao-dados.csv";

    if (!isFolderKey(folder)) {
      return NextResponse.json(
        { error: `Pasta inválida: "${folder}"` },
        { status: 400 }
      );
    }
    if (!rows) {
      return NextResponse.json(
        { error: "Nenhuma linha para importar" },
        { status: 400 }
      );
    }

    const resultado = await importByFolder(folder, rows, {
      fileName,
      fileType: "API",
      userId: user.id,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
