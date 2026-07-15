import { NextResponse, type NextRequest } from "next/server";
import { listarCandidatos } from "@/services/curadoria";
import type { CandidateStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as CandidateStatus | null;
  const candidatos = await listarCandidatos(status ?? undefined);
  return NextResponse.json({ data: candidatos });
}
