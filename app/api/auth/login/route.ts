import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { login } from "@/services/auth";
import { errorResponse } from "@/lib/api-response";
import { isRateLimited, getClientIp } from "@/lib/auth/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(`login:${ip}`)) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const user = await login(parsed.data);
    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
