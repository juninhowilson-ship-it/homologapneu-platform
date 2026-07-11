import { NextResponse } from "next/server";
import { listarOpcoesFiltro } from "@/services/filtros";

export async function GET() {
  const opcoes = await listarOpcoesFiltro();

  return NextResponse.json(opcoes);
}
