import { NextResponse, type NextRequest } from "next/server";
import {
  fabricanteFormSchema,
  fabricanteListQuerySchema,
} from "@/lib/validations/fabricante";
import { listFabricantes, createFabricante } from "@/services/fabricantes";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = fabricanteListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de listagem inválidos" },
      { status: 400 }
    );
  }

  const resultado = await listFabricantes(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = fabricanteFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const fabricante = await createFabricante(parsed.data);
    return NextResponse.json(fabricante, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
