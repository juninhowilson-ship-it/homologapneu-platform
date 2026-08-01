import { NextResponse, type NextRequest } from "next/server";
import { buscarCandidatos } from "@/services/curadoria";
import { errorResponse } from "@/lib/api-response";
import type { CandidateStatus } from "@prisma/client";

function numeroOuUndefined(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const resultado = await buscarCandidatos({
      status: (sp.get("status") as CandidateStatus | null) ?? undefined,
      manufacturerName: sp.get("manufacturerName") ?? undefined,
      vehicleModel: sp.get("vehicleModel") ?? undefined,
      vehicleVersion: sp.get("vehicleVersion") ?? undefined,
      tireQuery: sp.get("tireQuery") ?? undefined,
      documentUploadId: numeroOuUndefined(sp.get("documentUploadId")),
      confidenceMin: numeroOuUndefined(sp.get("confidenceMin")),
      confidenceMax: numeroOuUndefined(sp.get("confidenceMax")),
      q: sp.get("q") ?? undefined,
      page: numeroOuUndefined(sp.get("page")),
      pageSize: numeroOuUndefined(sp.get("pageSize")),
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
