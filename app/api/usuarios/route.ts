import { NextResponse, type NextRequest } from "next/server";
import {
  usuarioFormSchema,
  usuarioListQuerySchema,
} from "@/lib/validations/auth";
import { listUsuarios, createUsuario } from "@/services/usuarios";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = usuarioListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de listagem inválidos" },
      { status: 400 }
    );
  }

  const resultado = await listUsuarios(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = usuarioFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const usuario = await createUsuario(parsed.data);
    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
