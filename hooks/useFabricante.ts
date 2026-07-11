"use client";

import { useQuery } from "@tanstack/react-query";
import type { Fabricante } from "@/types/fabricante";

async function fetchFabricante(id: number): Promise<Fabricante> {
  const response = await fetch(`/api/fabricantes/${id}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o fabricante.");
  }

  return response.json();
}

export function useFabricante(id: number | null) {
  return useQuery({
    queryKey: ["fabricante", id],
    queryFn: () => fetchFabricante(id as number),
    enabled: id !== null,
  });
}
