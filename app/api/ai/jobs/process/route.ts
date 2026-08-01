import { NextResponse } from "next/server";
import { processarProximoJobDeIA } from "@/workers/ai/processor";
import { requireAdmin } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

/// POST /api/ai/jobs/process — processa o próximo AiJob elegível da fila
/// (botão "Processar próximo" no Dashboard IA). Mesmo padrão de
/// app/api/crawler/jobs/process/route.ts: cada chamada processa no máximo
/// um job, nunca bloqueia a aplicação com um loop.
export async function POST() {
  try {
    const user = await requireAdmin();
    const resultado = await processarProximoJobDeIA({
      idRaw: user.id,
      label: user.name,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
