"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { PneuListResponse } from "@/types/pneu";
import type { TireCategory, TireSegment } from "@/lib/constants/pneu";

export type PneusQuery = {
  q: string;
  status: "all" | "active" | "inactive";
  tireManufacturerId?: number;
  category?: TireCategory;
  segment?: TireSegment;
  runFlat?: "true" | "false";
  xl?: "true" | "false";
  sortBy: "model" | "brand" | "size" | "createdAt" | "updatedAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

async function fetchPneus(query: PneusQuery): Promise<PneuListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("status", query.status);
  if (query.tireManufacturerId) {
    params.set("tireManufacturerId", String(query.tireManufacturerId));
  }
  if (query.category) params.set("category", query.category);
  if (query.segment) params.set("segment", query.segment);
  if (query.runFlat) params.set("runFlat", query.runFlat);
  if (query.xl) params.set("xl", query.xl);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/pneus?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os pneus.");
  }

  return response.json();
}

export function usePneus(query: PneusQuery) {
  return useQuery({
    queryKey: ["pneus", query],
    queryFn: () => fetchPneus(query),
    placeholderData: keepPreviousData,
  });
}
