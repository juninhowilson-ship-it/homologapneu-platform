"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type FonteDados = {
  id: number;
  connectorId: string;
  mechanism: string;
  name: string;
  category: string;
  manufacturerName: string | null;
  type: string;
  baseUrl: string | null;
  status: string;
  reliability: number;
  lastSyncAt: string | null;
  updateFrequency: string | null;
  importedRecordsCount: number;
  confirmedHomologationsCount: number;
  lastError: string | null;
  queueItems: { id: number; status: string; createdAt: string }[];
};

export type ResumoFontes = {
  fontesCadastradas: number;
  fontesAtivas: number;
  fontesBloqueadas: number;
  fontesPendentes: number;
  ultimaSincronizacao: string | null;
  totalRegistrosImportados: number;
  totalHomologacoesPorFonte: number;
  itensPendentesNaFila: number;
  fontesComErro: number;
  fontes: FonteDados[];
};

async function fetchFontes(): Promise<ResumoFontes> {
  const response = await fetch("/api/fontes");
  if (!response.ok) throw new Error("Não foi possível carregar as fontes de dados.");
  return response.json();
}

export function useFontesDados() {
  return useQuery({
    queryKey: ["fontes-dados"],
    queryFn: fetchFontes,
    staleTime: 15_000,
  });
}

export function useEnfileirarFonte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: number) => {
      const response = await fetch(`/api/fontes/${sourceId}/enfileirar`, { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível enfileirar a fonte.");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fontes-dados"] }),
  });
}

export function useProcessarFila() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/fontes/processar-fila", { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível processar a fila.");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fontes-dados"] }),
  });
}
