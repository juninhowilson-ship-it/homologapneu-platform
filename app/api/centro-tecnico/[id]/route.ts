import { NextResponse, type NextRequest } from "next/server";
import { obterFichaTecnica } from "@/services/centroTecnico";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const ficha = await obterFichaTecnica(id);
    if (!ficha) {
      return NextResponse.json(
        { error: "Veículo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(ficha);
  } catch (error) {
    return errorResponse(error);
  }
}
