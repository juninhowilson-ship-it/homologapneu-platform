"use client";

import { useQuery } from "@tanstack/react-query";
import type { ResultadoPesquisa } from "@/types/homologation";

async function fetchResultadosLivre(
  texto: string,
  incluirAntigos: boolean
): Promise<ResultadoPesquisa[]> {
  const params = new URLSearchParams({ q: texto });
  if (incluirAntigos) params.set("incluirAntigos", "true");

  const response = await fetch(`/api/pesquisa/livre?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível buscar as homologações.");
  }

  const data = await response.json();
  return data.resultados;
}

export function usePesquisaLivre(
  texto: string | null,
  incluirAntigos = false
) {
  return useQuery({
    queryKey: ["pesquisa-livre", texto, incluirAntigos],
    queryFn: () => fetchResultadosLivre(texto as string, incluirAntigos),
    enabled: Boolean(texto && texto.trim()),
  });
}
