"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@/types/dashboard";

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");

  if (!response.ok) {
    throw new Error("Não foi possível carregar o dashboard.");
  }

  return response.json();
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
