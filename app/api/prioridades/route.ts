import { NextResponse, type NextRequest } from "next/server";
import {
  listarAnosPrioritarios,
  listarMarcasPendentes,
  listarHomologacoesDefasadas,
} from "@/services/prioridadeAnual";
import { ANO_MINIMO_PADRAO } from "@/lib/medida";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/dal";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const anos = await listarAnosPrioritarios(ANO_MINIMO_PADRAO);

    // Sem ano pedido, abre no mais recente — é a prioridade do momento.
    const pedido = request.nextUrl.searchParams.get("ano");
    const ano = pedido ? Number(pedido) : anos[0]?.ano;

    if (!ano || !Number.isInteger(ano)) {
      return NextResponse.json({ anos, ano: null, marcas: [], defasadas: [] });
    }

    const [marcas, defasadas] = await Promise.all([
      listarMarcasPendentes(ano),
      listarHomologacoesDefasadas(ano),
    ]);

    return NextResponse.json({ anos, ano, marcas, defasadas });
  } catch (error) {
    return errorResponse(error);
  }
}
