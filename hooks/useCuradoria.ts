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
