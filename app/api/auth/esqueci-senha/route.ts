import { NextResponse, type NextRequest } from "next/server";
import { esqueciSenhaSchema } from "@/lib/validations/auth";
import { solicitarRecuperacaoSenha } from "@/services/auth";
import { errorResponse } from "@/lib/api-response";
import { isRateLimited, getClientIp } from "@/lib/auth/rateLimit";

// Resposta idêntica para e-mail existente ou não — evita enumeração de contas.
const MENSAGEM_GENERICA =
  "Se o e-mail estiver cadastrado, a recuperação foi iniciada: você receberá " +
  "um e-mail com instruções ou o administrador definirá uma nova senha.";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`esqueci-senha:${ip}`)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = esqueciSenhaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    await solicitarRecuperacaoSenha(parsed.data.email, baseUrl);

    return NextResponse.json({ message: MENSAGEM_GENERICA });
  } catch (error) {
    return errorResponse(error);
  }
}
