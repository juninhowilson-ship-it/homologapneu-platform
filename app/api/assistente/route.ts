import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { responderAssistente } from "@/services/ai/assistente";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRateLimited } from "@/lib/auth/rateLimit";

const perguntaSchema = z.object({
  pergunta: z.string().trim().min(2, "Pergunta muito curta").max(500),
  contexto: z.string().trim().max(200).optional(),
  historico: z
    .array(
      z.object({
        autor: z.enum(["usuario", "assistente"]),
        texto: z.string().max(2000),
      })
    )
    .max(20)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Controle de custo: limite de perguntas por usuário na janela do
    // rate limiter (mesmo mecanismo do login).
    if (isRateLimited(`assistente:${user.id}`)) {
      return NextResponse.json(
        { error: "Muitas perguntas seguidas. Aguarde alguns minutos." },
        { status: 429 }
      );
    }

    const parsed = perguntaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const resultado = await responderAssistente(parsed.data);
    return NextResponse.json(resultado);
  } catch (error) {
    return errorResponse(error);
  }
}
