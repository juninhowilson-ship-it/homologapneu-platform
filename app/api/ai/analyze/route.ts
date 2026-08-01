import { NextResponse, type NextRequest } from "next/server";
import { aiAnalyzePreviewSchema } from "@/validators/ai/schemas";
import { analyzeExtractedText, hashText } from "@/pipelines/ai/documentAnalysisPipeline";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";
import { isRateLimited } from "@/lib/auth/rateLimit";

/// POST /api/ai/analyze — roda a pipeline em modo preview a partir de texto
/// colado (sem upload de arquivo, sem AiJob, sem gravar nada no banco).
/// Útil para testar a extração rapidamente. jobId=0 é um sentinel que nunca
/// corresponde a um AiJob real (autoincrement começa em 1), então as
/// checagens de conflito que comparam com outros jobs (lib/ai/conflicts/
/// detectConflicts.ts) simplesmente não encontram nada — comportamento
/// correto para um preview que não existe como job.
///
/// Rate limitado por usuário (não só por sessão admin) porque, quando um
/// provider de LLM está configurado, cada chamada pode custar dinheiro em
/// tokens — ver lib/ai/config.ts.
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    if (isRateLimited(`ai-analyze:${user.id}`)) {
      return NextResponse.json(
        { error: "Muitas análises em sequência. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = aiAnalyzePreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { text } = parsed.data;
    const resultado = await analyzeExtractedText(0, hashText(text), text, { headers: [], rows: [] });

    return NextResponse.json({
      measures: resultado.measures,
      oeCodes: resultado.oeCodes,
      pressures: resultado.pressures,
      loadSpeedIndexes: resultado.loadSpeedIndexes,
      vehicles: resultado.vehicles,
      tires: resultado.tires,
      llmProviderUsed: resultado.llmProviderUsed,
      conflicts: resultado.conflicts,
      suggestions: resultado.suggestions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
