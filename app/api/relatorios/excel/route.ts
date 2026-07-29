import { NextResponse, type NextRequest } from "next/server";
import { pesquisaFiltrosSchema } from "@/lib/validations/pesquisa";
import { gerarPlanilhaHomologacoes } from "@/services/relatorios";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = pesquisaFiltrosSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de relatório inválidos" },
      { status: 400 }
    );
  }

  const planilha = await gerarPlanilhaHomologacoes(parsed.data);
  const dataAtual = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(planilha), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-homologacoes-${dataAtual}.xlsx"`,
    },
  });
}
