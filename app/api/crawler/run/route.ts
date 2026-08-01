import { NextResponse, type NextRequest } from "next/server";
import { executarCrawler } from "@/services/intelligentCrawler";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

/** Disparo manual do crawler (botão "Executar agora" no dashboard, ou
 * scripts/manufacturer-import.ts com `{ "manufacturerName": "Toyota" }` no
 * corpo) — admin-only, ver ALWAYS_ADMIN_API_PREFIXES em proxy.ts. Corpo
 * vazio/sem manufacturerName reproduz o comportamento já existente (todas
 * as fontes). */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json().catch(() => ({}));
    const manufacturerName =
      typeof body?.manufacturerName === "string" ? body.manufacturerName : undefined;
    const resumo = await executarCrawler("MANUAL", user?.id ?? null, { manufacturerName });
    return NextResponse.json(resumo);
  } catch (error) {
    return errorResponse(error);
  }
}
