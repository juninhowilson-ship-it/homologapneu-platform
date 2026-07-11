"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { VeiculoListResponse } from "@/types/veiculo";
import type {
  FuelType,
  VehicleCategory,
  VehicleSegment,
} from "@/lib/constants/veiculo";

export type VeiculosQuery = {
  q: string;
  status: "all" | "active" | "inactive";
  manufacturerId?: number;
  fuel?: FuelType;
  category?: VehicleCategory;
  segment?: VehicleSegment;
  sortBy: "model" | "version" | "yearStart" | "createdAt" | "updatedAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

async function fetchVeiculos(
  query: VeiculosQuery
): Promise<VeiculoListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("status", query.status);
  if (query.manufacturerId) {
    params.set("manufacturerId", String(query.manufacturerId));
  }
  if (query.fuel) params.set("fuel", query.fuel);
  if (query.category) params.set("category", query.category);
  if (query.segment) params.set("segment", query.segment);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/veiculos?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os veículos.");
  }

  return response.json();
}

export function useVeiculos(query: VeiculosQuery) {
  return useQuery({
    queryKey: ["veiculos", query],
    queryFn: () => fetchVeiculos(query),
    placeholderData: keepPreviousData,
  });
}
