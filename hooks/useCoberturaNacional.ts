"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoberturaNacional } from "@/types/cobertura";

async function fetchCoberturaNacional(): Promise<CoberturaNacional> {
  const response = await fetch("/api/cobertura");

  if (!response.ok) {
    throw new Error("Não foi possível carregar a cobertura nacional.");
  }

  return response.json();
}

export function useCoberturaNacional() {
  return useQuery({
    queryKey: ["cobertura-nacional"],
    queryFn: fetchCoberturaNacional,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
