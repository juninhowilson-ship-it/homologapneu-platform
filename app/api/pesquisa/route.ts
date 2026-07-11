import { NextResponse, type NextRequest } from "next/server";
import { pesquisaFiltrosSchema } from "@/lib/validations/pesquisa";
import { buscarHomologacoes } from "@/services/pesquisa";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = pesquisaFiltrosSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros de pesquisa inválidos" },
      { status: 400 }
    );
  }

  const resultados = buscarHomologacoes(parsed.data);

  return NextResponse.json({ resultados });
}
