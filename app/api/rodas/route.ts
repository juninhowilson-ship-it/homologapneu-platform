import { NextResponse, type NextRequest } from "next/server";
import { rodaFormSchema, rodaListQuerySchema } from "@/lib/validations/roda";
import { listRodas, createRoda } from "@/services/rodas";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = rodaListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros de listagem inválidos" }, { status: 400 });
  }

  const resultado = await listRodas(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = rodaFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const roda = await createRoda(parsed.data, user?.id ?? null);
    return NextResponse.json(roda, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
