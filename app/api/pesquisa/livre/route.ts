import { NextResponse, type NextRequest } from "next/server";
import { buscarLivre } from "@/services/pesquisa";

export async function GET(request: NextRequest) {
  const texto = request.nextUrl.searchParams.get("q") ?? "";
  const incluirAntigos =
    request.nextUrl.searchParams.get("incluirAntigos") === "true";

  if (!texto.trim()) {
    return NextResponse.json({ resultados: [] });
  }

  const resultados = await buscarLivre(texto, { incluirAntigos });

  return NextResponse.json({ resultados });
}
