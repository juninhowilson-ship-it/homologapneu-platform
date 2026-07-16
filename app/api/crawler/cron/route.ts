import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deveExecutarAgendado, executarCrawler } from "@/services/intelligentCrawler";
import { errorResponse } from "@/lib/api-response";

function isValidCronSecret(authHeader: string | null, secret: string): boolean {
  const provided = Buffer.from(authHeader ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Comparação em tempo constante — evita vazar o segredo por diferença de
  // tempo de resposta byte-a-byte; comprimentos diferentes já falham direto.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Endpoint chamado pelo Vercel Cron (vercel.json) — sem sessão de login,
 * autenticado por CRON_SECRET (mesmo padrão documentado pelo Vercel:
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * proxy.ts libera este caminho especificamente (PUBLIC_API_PREFIXES) —
 * a autenticação real acontece aqui dentro.
 *
 * A execução em si só roda se deveExecutarAgendado() confirmar que a
 * frequência configurada (CrawlerConfig) já venceu — o cron do Vercel só
 * aceita o mínimo de uma vez por dia, então "semanal" é decidido aqui.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    if (!secret || !isValidCronSecret(auth, secret)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const deveExecutar = await deveExecutarAgendado();
    if (!deveExecutar) {
      return NextResponse.json({ executado: false, motivo: "Frequência configurada ainda não venceu." });
    }

    const resumo = await executarCrawler("SCHEDULED", null);
    return NextResponse.json({ executado: true, ...resumo });
  } catch (error) {
    return errorResponse(error);
  }
}
