import { NextResponse, type NextRequest } from "next/server";
import {
  pneuFormSchema,
  pneuListQuerySchema,
} from "@/lib/validations/pneu";
import { listPneus, createPneu } from "@/services/pneus";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = pneuListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de listagem inválidos" },
      { status: 400 }
    );
  }

  const resultado = await listPneus(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = pneuFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await getCurrentUser();
    const pneu = await createPneu(parsed.data, user?.name ?? null, user?.id ?? null);
    return NextResponse.json(pneu, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
