import { NextResponse } from "next/server";
import { obterResumoPainel } from "@/services/sourceManager";

export async function GET() {
  const resumo = await obterResumoPainel();
  return NextResponse.json(resumo);
}
