"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { HomologacaoListResponse } from "@/types/homologacao";

export type HomologacoesQuery = {
  q: string;
  vehicleId?: number;
  tireId?: number;
  code?: string;
  runFlat?: "true" | "false";
  xl?: "true" | "false";
  sortBy: "code" | "year" | "createdAt" | "updatedAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

async function fetchHomologacoes(
  query: HomologacoesQuery
): Promise<HomologacaoListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.vehicleId) params.set("vehicleId", String(query.vehicleId));
  if (query.tireId) params.set("tireId", String(query.tireId));
  if (query.code) params.set("code", query.code);
  if (query.runFlat) params.set("runFlat", query.runFlat);
  if (query.xl) params.set("xl", query.xl);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/homologacoes?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar as homologações.");
  }

  return response.json();
}

export function useHomologacoes(query: HomologacoesQuery) {
  return useQuery({
    queryKey: ["homologacoes", query],
    queryFn: () => fetchHomologacoes(query),
    placeholderData: keepPreviousData,
  });
}
