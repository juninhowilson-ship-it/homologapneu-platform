import { NextResponse, type NextRequest } from "next/server";
import { redefinirSenhaSchema } from "@/lib/validations/auth";
import { redefinirSenhaComToken } from "@/services/auth";
import { errorResponse } from "@/lib/api-response";
import { isRateLimited, getClientIp } from "@/lib/auth/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`redefinir-senha:${ip}`)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = redefinirSenhaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    await redefinirSenhaComToken(parsed.data.token, parsed.data.novaSenha);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
