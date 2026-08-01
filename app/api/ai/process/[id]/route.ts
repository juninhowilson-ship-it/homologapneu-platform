import { NextResponse, type NextRequest } from "next/server";
import { findAiJobById } from "@/repositories/ai/aiJobs";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/// GET /api/ai/process/[id] — status/resultado de um AiJob (sem o
/// fileContent bruto, que fica só no banco para auditoria).
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const job = await findAiJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    return errorResponse(error);
  }
}
