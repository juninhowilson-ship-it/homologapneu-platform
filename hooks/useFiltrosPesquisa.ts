"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpcoesFiltroPesquisa } from "@/types/homologation";

async function fetchOpcoesFiltro(): Promise<OpcoesFiltroPesquisa> {
  const response = await fetch("/api/pesquisa/filtros");

  if (!response.ok) {
    throw new Error("Não foi possível carregar as opções de pesquisa.");
  }

  return response.json();
}

export function useFiltrosPesquisa() {
  return useQuery({
    queryKey: ["pesquisa-filtros"],
    queryFn: fetchOpcoesFiltro,
    staleTime: 60_000,
  });
}
