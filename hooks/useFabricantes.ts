"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { FabricanteListResponse } from "@/types/fabricante";

export type FabricantesQuery = {
  q: string;
  status: "all" | "active" | "inactive";
  sortBy: "name" | "country" | "createdAt" | "updatedAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

async function fetchFabricantes(
  query: FabricantesQuery
): Promise<FabricanteListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/fabricantes?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os fabricantes.");
  }

  return response.json();
}

export function useFabricantes(query: FabricantesQuery) {
  return useQuery({
    queryKey: ["fabricantes", query],
    queryFn: () => fetchFabricantes(query),
    placeholderData: keepPreviousData,
  });
}
