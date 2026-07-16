import { NextResponse } from "next/server";
import { obterEstatisticasDashboard, obterHistoricoRuns } from "@/services/intelligentCrawler";
import { obterResumoPainel } from "@/services/crawlerSourceCatalog";
import { listarAlertas } from "@/services/crawlerAlerts";
import { resumoFilas } from "@/services/crawlerJobQueue";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const [estatisticas, historico, fontes, alertas, filas] = await Promise.all([
      obterEstatisticasDashboard(),
      obterHistoricoRuns(),
      obterResumoPainel(),
      listarAlertas({ acknowledged: false }),
      resumoFilas(),
    ]);
    return NextResponse.json({ estatisticas, historico, fontes, alertas, filas });
  } catch (error) {
    return errorResponse(error);
  }
}
