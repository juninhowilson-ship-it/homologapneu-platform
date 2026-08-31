"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type {
  ResumoAno,
  MarcaPendente,
  VersaoPendente,
  HomologacaoDefasada,
} from "@/services/prioridadeAnual";

export type { ResumoAno, MarcaPendente, VersaoPendente, HomologacaoDefasada };

export type PrioridadesResposta = {
  anos: ResumoAno[];
  ano: number | null;
  marcas: MarcaPendente[];
  defasadas: HomologacaoDefasada[];
};

export function usePrioridades(ano: number | null) {
  return useQuery({
    queryKey: ["prioridades", ano],
    queryFn: async (): Promise<PrioridadesResposta> => {
      const query = ano ? `?ano=${ano}` : "";
      const response = await fetch(`/api/prioridades${query}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar a fila de prioridades.");
      }
      return response.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useVersoesPendentes(ano: number | null, manufacturerId: number | null) {
  return useQuery({
    queryKey: ["prioridades", "versoes", ano, manufacturerId],
    enabled: Boolean(ano && manufacturerId),
    queryFn: async (): Promise<VersaoPendente[]> => {
      const response = await fetch(`/api/prioridades/${ano}/${manufacturerId}`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar as versões pendentes.");
      }
      return response.json();
    },
  });
}
