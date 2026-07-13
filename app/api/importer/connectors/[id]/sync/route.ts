import { NextResponse, type NextRequest } from "next/server";
import { getConnector } from "@/lib/importer/connectors/registry";
import { importerFor } from "@/lib/importer/connectors/dispatch";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const connector = getConnector(id);

  if (!connector) {
    return NextResponse.json(
      { error: "Conector não encontrado" },
      { status: 404 }
    );
  }

  if (!connector.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Conector ainda não configurado. Defina as credenciais/endpoint oficiais antes de sincronizar.",
      },
      { status: 400 }
    );
  }

  try {
    const user = await getCurrentUser();
    const { rows, sourceVersion, collectedAt } = await connector.fetchRows();
    const importer = importerFor(connector.entity);
    const resultado = await importer(rows, {
      fileName: `api:${connector.id}`,
      fileType: "API",
      userId: user?.id ?? null,
      sourceVersion,
      collectedAt,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
