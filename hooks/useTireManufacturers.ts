"use client";

import { useQuery } from "@tanstack/react-query";

export type TireManufacturerOption = {
  id: number;
  name: string;
};

async function fetchTireManufacturers(): Promise<TireManufacturerOption[]> {
  const response = await fetch("/api/tire-manufacturers");

  if (!response.ok) {
    throw new Error("Não foi possível carregar os fabricantes.");
  }

  return response.json();
}

export function useTireManufacturers() {
  return useQuery({
    queryKey: ["tire-manufacturers"],
    queryFn: fetchTireManufacturers,
    staleTime: 60_000,
  });
}
