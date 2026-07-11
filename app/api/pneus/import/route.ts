import { NextResponse, type NextRequest } from "next/server";
import { importPneus } from "@/services/pneus";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rows) {
      return NextResponse.json(
        { error: "Nenhuma linha para importar" },
        { status: 400 }
      );
    }

    const resultado = await importPneus(rows);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
