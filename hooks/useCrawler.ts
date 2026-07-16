"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type CrawlerSourceRow = {
  id: number;
  manufacturerName: string;
  category: string;
  kind: "HUB" | "DIRECT";
  url: string;
  robotsAllowed: boolean | null;
  status: "ATIVA" | "BLOQUEADA" | "PENDENTE" | "ERRO";
  lastVisitedAt: string | null;
  lastUpdatedAt: string | null;
  notes: string | null;
  documentsFound: number;
};

export type CrawlerRunRow = {
  id: number;
  trigger: "MANUAL" | "SCHEDULED";
  status: "EXECUTANDO" | "CONCLUIDO" | "FALHOU";
  startedAt: string;
  finishedAt: string | null;
  sourcesChecked: number;
  documentsFound: number;
  documentsDownloaded: number;
  documentsSkipped: number;
  candidatesCreated: number;
  errorCount: number;
  errorMessage: string | null;
};

export type CrawlerAlertRow = {
  id: number;
  sourceUrl: string;
  manufacturerName: string | null;
  previousHash: string | null;
  newHash: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

export type CrawlerDashboard = {
  estatisticas: {
    tempoMedioMs: number | null;
    documentosProcessados: number;
    pendenciasOcr: number;
    pendenciasRevisao: number;
    falhas: number;
    novosPdfs: number;
    ultimaExecucao: CrawlerRunRow | null;
    alertasNaoReconhecidos: number;
    ultimosRuns: CrawlerRunRow[];
  };
  historico: CrawlerRunRow[];
  fontes: {
    fabricantesMonitorados: number;
    totalFontes: number;
    fontesAtivas: number;
    fontesBloqueadas: number;
    fontesPendentes: number;
    fontesComErro: number;
    ultimaAtualizacao: string | null;
    fontes: CrawlerSourceRow[];
  };
  alertas: CrawlerAlertRow[];
  filas: { queue: string; status: string; total: number }[];
};

async function fetchDashboard(): Promise<CrawlerDashboard> {
  const response = await fetch("/api/crawler/dashboard");
  if (!response.ok) throw new Error("Não foi possível carregar o dashboard do crawler.");
  return response.json();
}

export function useCrawlerDashboard() {
  return useQuery({
    queryKey: ["crawler-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 10_000,
  });
}

export function useExecutarCrawler() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/crawler/run", { method: "POST" });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Falha ao executar o crawler.");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crawler-dashboard"] }),
  });
}

export function useSolicitarParada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/crawler/stop", { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível solicitar a parada.");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crawler-dashboard"] }),
  });
}

export function useReanalisarFabricante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (manufacturerName: string) => {
      const response = await fetch(`/api/crawler/fabricantes/${encodeURIComponent(manufacturerName)}/reanalisar`, {
        method: "POST",
      });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Falha ao reanalisar fabricante.");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crawler-dashboard"] }),
  });
}

export function useDefinirFrequencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (frequency: "DAILY" | "WEEKLY" | "MANUAL") => {
      const response = await fetch("/api/crawler/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency }),
      });
      if (!response.ok) throw new Error("Não foi possível salvar a frequência.");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crawler-config"] }),
  });
}

async function fetchConfig() {
  const response = await fetch("/api/crawler/config");
  if (!response.ok) throw new Error("Não foi possível carregar a configuração.");
  return response.json() as Promise<{ frequency: "DAILY" | "WEEKLY" | "MANUAL" }>;
}

export function useCrawlerConfig() {
  return useQuery({
    queryKey: ["crawler-config"],
    queryFn: fetchConfig,
    staleTime: 10_000,
  });
}
