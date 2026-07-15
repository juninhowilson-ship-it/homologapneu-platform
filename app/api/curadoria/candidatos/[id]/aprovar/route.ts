import { NextResponse, type NextRequest } from "next/server";
import { aprovarCandidato } from "@/services/curadoria";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const user = await getCurrentUser();
    const resultado = await aprovarCandidato(Number(id), user?.id ?? null, body.notes ?? null);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
