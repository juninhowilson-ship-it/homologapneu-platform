import { NextResponse, type NextRequest } from "next/server";
import { obterLote } from "@/services/importBatches";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const lote = await obterLote(id);
    return NextResponse.json(lote);
  } catch (error) {
    return errorResponse(error);
  }
}
