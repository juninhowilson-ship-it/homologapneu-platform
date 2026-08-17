"use client";

import { useQuery } from "@tanstack/react-query";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { ResultadoPesquisa } from "@/types/homologation";

async function fetchResultados(
  filtros: PesquisaFiltros,
  incluirAntigos: boolean
): Promise<ResultadoPesquisa[]> {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  if (incluirAntigos) params.set("incluirAntigos", "true");

  const response = await fetch(`/api/pesquisa?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível buscar as homologações.");
  }

  const data = await response.json();
  return data.resultados;
}

export function usePesquisa(
  filtros: PesquisaFiltros | null,
  incluirAntigos = false
) {
  return useQuery({
    queryKey: ["pesquisa", filtros, incluirAntigos],
    queryFn: () => fetchResultados(filtros as PesquisaFiltros, incluirAntigos),
    enabled: filtros !== null,
  });
}
