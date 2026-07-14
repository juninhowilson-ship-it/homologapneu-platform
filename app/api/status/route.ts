import { NextResponse } from "next/server";
import { obterStatusAplicacao } from "@/lib/status/appStatus";

export async function GET() {
  const status = await obterStatusAplicacao();

  return NextResponse.json(status);
}
