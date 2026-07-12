import { NextResponse, type NextRequest } from "next/server";
import {
  homologacaoFormSchema,
  homologacaoListQuerySchema,
} from "@/lib/validations/homologacao";
import { listHomologacoes, createHomologacao } from "@/services/homologacoes";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = homologacaoListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de listagem inválidos" },
      { status: 400 }
    );
  }

  const resultado = await listHomologacoes(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = homologacaoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const homologacao = await createHomologacao(parsed.data);
    return NextResponse.json(homologacao, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
