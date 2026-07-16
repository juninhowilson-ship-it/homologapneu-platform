import { NextResponse, type NextRequest } from "next/server";
import { deveExecutarAgendado, executarCrawler } from "@/services/intelligentCrawler";
import { errorResponse } from "@/lib/api-response";

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
    if (!secret || auth !== `Bearer ${secret}`) {
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
