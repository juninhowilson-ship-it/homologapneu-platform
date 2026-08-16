"use client";

import { useQuery } from "@tanstack/react-query";
import type { FichaTecnica } from "@/services/centroTecnico";

export type { FichaTecnica };

async function fetchFicha(id: number): Promise<FichaTecnica> {
  const response = await fetch(`/api/centro-tecnico/${id}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a ficha técnica.");
  }
  return response.json();
}

export function useFichaTecnica(id: number | null) {
  return useQuery({
    queryKey: ["ficha-tecnica", id],
    queryFn: () => fetchFicha(id as number),
    enabled: Boolean(id),
  });
}
