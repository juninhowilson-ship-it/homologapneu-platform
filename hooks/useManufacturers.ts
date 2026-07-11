"use client";

import { useQuery } from "@tanstack/react-query";

export type Manufacturer = {
  id: number;
  name: string;
};

async function fetchManufacturers(): Promise<Manufacturer[]> {
  const response = await fetch("/api/manufacturers");

  if (!response.ok) {
    throw new Error("Não foi possível carregar as marcas.");
  }

  return response.json();
}

export function useManufacturers() {
  return useQuery({
    queryKey: ["manufacturers"],
    queryFn: fetchManufacturers,
    staleTime: 60_000,
  });
}
