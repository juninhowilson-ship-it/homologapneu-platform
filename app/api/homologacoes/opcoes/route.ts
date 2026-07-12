import { NextResponse } from "next/server";
import { listOpcoes } from "@/services/homologacoes";

export async function GET() {
  const opcoes = await listOpcoes();
  return NextResponse.json(opcoes);
}
