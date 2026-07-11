"use client";

import { useQuery } from "@tanstack/react-query";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { ResultadoPesquisa } from "@/types/homologation";

async function fetchResultados(
  filtros: PesquisaFiltros
): Promise<ResultadoPesquisa[]> {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });

  const response = await fetch(`/api/pesquisa?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível buscar as homologações.");
  }

  const data = await response.json();
  return data.resultados;
}

export function usePesquisa(filtros: PesquisaFiltros | null) {
  return useQuery({
    queryKey: ["pesquisa", filtros],
    queryFn: () => fetchResultados(filtros as PesquisaFiltros),
    enabled: filtros !== null,
  });
}
