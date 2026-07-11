"use client";

import { useQuery } from "@tanstack/react-query";
import type { Veiculo } from "@/types/veiculo";

async function fetchVeiculo(id: number): Promise<Veiculo> {
  const response = await fetch(`/api/veiculos/${id}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o veículo.");
  }

  return response.json();
}

export function useVeiculo(id: number | null) {
  return useQuery({
    queryKey: ["veiculo", id],
    queryFn: () => fetchVeiculo(id as number),
    enabled: id !== null,
  });
}
