import { NextResponse, type NextRequest } from "next/server";
import { listarVersoesPendentes } from "@/services/prioridadeAnual";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

type RouteParams = {
  params: Promise<{ ano: string; manufacturerId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { ano: anoRaw, manufacturerId: marcaRaw } = await params;
    const ano = Number(anoRaw);
    const manufacturerId = Number(marcaRaw);

    if (!Number.isInteger(ano) || !Number.isInteger(manufacturerId)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    return NextResponse.json(await listarVersoesPendentes(ano, manufacturerId));
  } catch (error) {
    return errorResponse(error);
  }
}
