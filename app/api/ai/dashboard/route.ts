import { NextResponse } from "next/server";
import { obterEstatisticas } from "@/services/ai/dashboard";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

/// GET /api/ai/dashboard — KPIs do Dashboard IA.
export async function GET() {
  try {
    await requireAdmin();

    const estatisticas = await obterEstatisticas();
    return NextResponse.json(estatisticas);
  } catch (error) {
    return errorResponse(error);
  }
}
