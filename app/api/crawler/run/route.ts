import { NextResponse } from "next/server";
import { executarCrawler } from "@/services/intelligentCrawler";
import { getCurrentUser } from "@/lib/auth/dal";
import { errorResponse } from "@/lib/api-response";

/** Disparo manual do crawler (botão "Executar agora" no dashboard) —
 * admin-only, ver ALWAYS_ADMIN_API_PREFIXES em proxy.ts. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    const resumo = await executarCrawler("MANUAL", user?.id ?? null);
    return NextResponse.json(resumo);
  } catch (error) {
    return errorResponse(error);
  }
}
