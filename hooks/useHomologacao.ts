"use client";

import { useQuery } from "@tanstack/react-query";
import type { Homologacao } from "@/types/homologacao";

async function fetchHomologacao(id: number): Promise<Homologacao> {
  const response = await fetch(`/api/homologacoes/${id}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar a homologação.");
  }

  return response.json();
}

export function useHomologacao(id: number | null) {
  return useQuery({
    queryKey: ["homologacao", id],
    queryFn: () => fetchHomologacao(id as number),
    enabled: id !== null,
  });
}
