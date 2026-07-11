import { NextResponse, type NextRequest } from "next/server";
import {
  veiculoFormSchema,
  veiculoListQuerySchema,
} from "@/lib/validations/veiculo";
import { listVeiculos, createVeiculo } from "@/services/veiculos";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = veiculoListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de listagem inválidos" },
      { status: 400 }
    );
  }

  const resultado = await listVeiculos(parsed.data);
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = veiculoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const veiculo = await createVeiculo(parsed.data);
    return NextResponse.json(veiculo, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
