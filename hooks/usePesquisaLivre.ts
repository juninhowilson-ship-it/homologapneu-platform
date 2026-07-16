"use client";

import { useQuery } from "@tanstack/react-query";
import type { ResultadoPesquisa } from "@/types/homologation";

async function fetchResultadosLivre(texto: string): Promise<ResultadoPesquisa[]> {
  const response = await fetch(`/api/pesquisa/livre?q=${encodeURIComponent(texto)}`);

  if (!response.ok) {
    throw new Error("Não foi possível buscar as homologações.");
  }

  const data = await response.json();
  return data.resultados;
}

export function usePesquisaLivre(texto: string | null) {
  return useQuery({
    queryKey: ["pesquisa-livre", texto],
    queryFn: () => fetchResultadosLivre(texto as string),
    enabled: Boolean(texto && texto.trim()),
  });
}
