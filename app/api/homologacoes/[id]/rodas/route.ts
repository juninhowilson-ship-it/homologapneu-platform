import { NextResponse, type NextRequest } from "next/server";
import { adicionarRoda } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const wheelId = Number(body?.wheelId);
  const role = body?.role === "OPCIONAL" ? "OPCIONAL" : "ORIGINAL";

  if (!Number.isInteger(wheelId) || wheelId <= 0) {
    return NextResponse.json({ error: "wheelId inválido" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const homologacao = await adicionarRoda(Number(id), wheelId, role, user?.id ?? null);
    return NextResponse.json(homologacao, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
