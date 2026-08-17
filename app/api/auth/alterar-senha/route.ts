import { NextResponse, type NextRequest } from "next/server";
import { alterarSenhaSchema } from "@/lib/validations/auth";
import { alterarSenha } from "@/services/auth";
import { errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/dal";
import { isRateLimited, getClientIp } from "@/lib/auth/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // A senha atual é verificada aqui, então este endpoint permite testar
    // senhas de uma conta logada — mesma proteção de força bruta do login.
    if (isRateLimited(`alterar-senha:${user.id}:${getClientIp(request)}`)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = alterarSenhaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await alterarSenha(user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
