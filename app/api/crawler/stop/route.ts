import { NextResponse } from "next/server";
import { solicitarParada } from "@/services/crawlerControl";
import { errorResponse } from "@/lib/api-response";

/**
 * Sinaliza pedido de parada (cancelamento cooperativo — ver
 * services/crawlerControl.ts). A execução em andamento no momento em que
 * este endpoint foi criado ainda não checa este flag (checagem entrará
 * no próximo ciclo de integração); execuções futuras já vão respeitá-lo.
 */
export async function POST() {
  try {
    await solicitarParada();
    return NextResponse.json({ stopRequested: true });
  } catch (error) {
    return errorResponse(error);
  }
}
