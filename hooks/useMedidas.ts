"use client";

import { useQuery } from "@tanstack/react-query";
import type { BuscaPorMedida, MedidaResumo } from "@/types/medida";

async function fetchMedidas(): Promise<MedidaResumo[]> {
  const response = await fetch("/api/medidas");
  if (!response.ok) throw new Error("Não foi possível carregar as medidas.");
  const json = await response.json();
  return json.data;
}

export function useMedidas() {
  return useQuery({
    queryKey: ["medidas"],
    queryFn: fetchMedidas,
    staleTime: 30_000,
  });
}

async function fetchMedida(medida: string): Promise<BuscaPorMedida> {
  const response = await fetch(`/api/medidas/${encodeURIComponent(medida)}`);
  if (!response.ok) throw new Error("Não foi possível carregar a medida.");
  return response.json();
}

export function useMedida(medida: string) {
  return useQuery({
    queryKey: ["medida", medida],
    queryFn: () => fetchMedida(medida),
    staleTime: 30_000,
    enabled: Boolean(medida),
  });
}
