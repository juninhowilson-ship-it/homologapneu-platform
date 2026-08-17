import { NextResponse, type NextRequest } from "next/server";
import { removerDaGaragem } from "@/services/garagem";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ vehicleVersionId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { vehicleVersionId: raw } = await params;
    const vehicleVersionId = Number(raw);

    if (!Number.isInteger(vehicleVersionId) || vehicleVersionId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await removerDaGaragem(user.id, vehicleVersionId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
