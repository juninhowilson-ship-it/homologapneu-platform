import { NextResponse } from "next/server";
import { obterCoberturaNacional } from "@/services/cobertura";

export async function GET() {
  const cobertura = await obterCoberturaNacional();

  return NextResponse.json(cobertura);
}
