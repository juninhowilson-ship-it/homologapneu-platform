"use client";

import { useQuery } from "@tanstack/react-query";
import type { Pneu } from "@/types/pneu";

async function fetchPneu(id: number): Promise<Pneu> {
  const response = await fetch(`/api/pneus/${id}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o pneu.");
  }

  return response.json();
}

export function usePneu(id: number | null) {
  return useQuery({
    queryKey: ["pneu", id],
    queryFn: () => fetchPneu(id as number),
    enabled: id !== null,
  });
}
