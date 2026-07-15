"use client";

import { useQuery } from "@tanstack/react-query";
import type { HistoricoHomologacao } from "@/services/homologacaoHistorico";

async function fetchHistorico(id: number): Promise<HistoricoHomologacao> {
  const response = await fetch(`/api/homologacoes/${id}/historico`);
  if (!response.ok) throw new Error("Não foi possível carregar o histórico.");
  return response.json();
}

export function useHistoricoHomologacao(id: number) {
  return useQuery({
    queryKey: ["historico-homologacao", id],
    queryFn: () => fetchHistorico(id),
    staleTime: 30_000,
    enabled: Number.isFinite(id),
  });
}
