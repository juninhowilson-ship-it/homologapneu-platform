import { NextResponse, type NextRequest } from "next/server";
import { getEvidenceConnector } from "@/lib/importer/connectors/evidenceSources";
import { registrarLoteEvidencias } from "@/services/homologationEvidence";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const connector = getEvidenceConnector(id);

  if (!connector) {
    return NextResponse.json({ error: "Fonte de evidência não encontrada" }, { status: 404 });
  }

  if (!connector.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Fonte ainda não configurada. Defina as credenciais/endpoint reais antes de coletar.",
      },
      { status: 400 }
    );
  }

  try {
    const itens = await connector.fetchEvidencias();
    const resultado = await registrarLoteEvidencias(itens);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
