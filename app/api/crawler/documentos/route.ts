import { NextResponse } from "next/server";
import { listarDocumentos } from "@/services/crawlerReanalise";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const manufacturerName = searchParams.get("manufacturerName");
    const status = searchParams.get("status");
    const documentos = await listarDocumentos({
      manufacturerName: manufacturerName ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json({ data: documentos });
  } catch (error) {
    return errorResponse(error);
  }
}
