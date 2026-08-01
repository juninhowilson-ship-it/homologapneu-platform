"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvidenceSourceType, CandidateStatus } from "@prisma/client";

export type Candidato = {
  id: number;
  documentUploadId: number;
  tireManufacturerName: string | null;
  tireModel: string | null;
  tireSize: string | null;
  loadIndex: string | null;
  speedIndex: string | null;
  runFlat: boolean | null;
  xl: boolean | null;
  vehicleManufacturerName: string | null;
  vehicleModel: string | null;
  vehicleVersion: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  extractionConfidence: number;
  rawSnippet: string | null;
  status: CandidateStatus;
  reviewNotes: string | null;
  evidenceId: number | null;
  createdAt: string;
  documentUpload: {
    id: number;
    fileName: string;
    fileType: string;
    declaredSourceType: EvidenceSourceType;
    declaredSourceName: string;
    sourceUrl: string | null;
    manufacturerName: string | null;
    reliability: number;
    ocrPending: boolean;
    uploadedAt: string;
    uploadedBy: { name: string } | null;
  };
  reviewedBy: { name: string } | null;
};

async function fetchCandidatos(status?: string): Promise<Candidato[]> {
  const url = status ? `/api/curadoria/candidatos?status=${status}` : "/api/curadoria/candidatos";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar os candidatos.");
  const json = await response.json();
  return json.data;
}

export function useCandidatos(status?: string) {
  return useQuery({
    queryKey: ["curadoria-candidatos", status ?? "todos"],
    queryFn: () => fetchCandidatos(status),
    staleTime: 10_000,
  });
}

export type FiltrosCandidatos = {
  status?: string;
  manufacturerName?: string;
  vehicleModel?: string;
  vehicleVersion?: string;
  tireQuery?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  q?: string;
  page: number;
  pageSize: number;
};

export type CandidatosPaginado = {
  data: Candidato[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchCandidatosPaginado(filtros: FiltrosCandidatos): Promise<CandidatosPaginado> {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(chave, String(valor));
  }
  const response = await fetch(`/api/curadoria/candidatos?${params.toString()}`);
  if (!response.ok) throw new Error("Não foi possível carregar os candidatos.");
  return response.json();
}

export function useCandidatosPaginado(filtros: FiltrosCandidatos) {
  return useQuery({
    queryKey: ["curadoria-candidatos-paginado", filtros],
    queryFn: () => fetchCandidatosPaginado(filtros),
    staleTime: 5_000,
    placeholderData: (dadosAnteriores) => dadosAnteriores,
  });
}

export type EstatisticasCuradoria = {
  totais: Record<string, number>;
  confiancaMedia: number;
  revisadosUltimas24h: number;
  revisadosUltimaHora: number;
  porMontadora: { manufacturerName: string; pendentes: number; aprovados: number; rejeitados: number; total: number }[];
};

async function fetchEstatisticas(): Promise<EstatisticasCuradoria> {
  const response = await fetch("/api/curadoria/estatisticas");
  if (!response.ok) throw new Error("Não foi possível carregar as estatísticas.");
  return response.json();
}

export function useEstatisticasCuradoria() {
  return useQuery({
    queryKey: ["curadoria-estatisticas"],
    queryFn: fetchEstatisticas,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export type ResultadoLote = { id: number; sucesso: boolean; erro?: string };
export type RespostaLote = { resultados: ResultadoLote[]; sucesso: number; falhas: number };

function useAcaoEmLote(acao: "aprovar" | "rejeitar") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, notes }: { ids: number[]; notes?: string }): Promise<RespostaLote> => {
      const response = await fetch(`/api/curadoria/candidatos/lote/${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, notes: notes ?? null }),
      });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Ação em lote falhou.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos"] });
      queryClient.invalidateQueries({ queryKey: ["curadoria-estatisticas"] });
    },
  });
}

export function useAprovarEmLote() {
  return useAcaoEmLote("aprovar");
}
export function useRejeitarEmLote() {
  return useAcaoEmLote("rejeitar");
}

export function useDesfazerAprovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/curadoria/candidatos/${id}/desfazer`, { method: "POST" });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Não foi possível desfazer.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos-paginado"] });
      queryClient.invalidateQueries({ queryKey: ["curadoria-estatisticas"] });
    },
  });
}

export async function fetchDocumentoUrl(id: number): Promise<string | null> {
  const response = await fetch(`/api/curadoria/candidatos/${id}/documento`);
  if (!response.ok) return null;
  const json = await response.json();
  return json.url;
}

export function useUploadDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/curadoria/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Falha no upload.");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos"] }),
  });
}

export function useAtualizarCandidato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Candidato> }) => {
      const response = await fetch(`/api/curadoria/candidatos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Não foi possível salvar a edição.");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos"] }),
  });
}

function useAcaoCandidato(acao: "aprovar" | "rejeitar" | "solicitar-revisao") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const response = await fetch(`/api/curadoria/candidatos/${id}/${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes ?? null }),
      });
      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(erro.error ?? "Ação falhou.");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["curadoria-candidatos"] }),
  });
}

export function useAprovarCandidato() {
  return useAcaoCandidato("aprovar");
}
export function useRejeitarCandidato() {
  return useAcaoCandidato("rejeitar");
}
export function useSolicitarRevisao() {
  return useAcaoCandidato("solicitar-revisao");
}

export async function fetchComparacao(id: number) {
  const response = await fetch(`/api/curadoria/candidatos/${id}/comparar`);
  if (!response.ok) throw new Error("Não foi possível carregar a comparação.");
  return response.json();
}
