"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppStatus } from "@/lib/status/appStatus";

async function fetchAppStatus(): Promise<AppStatus> {
  const response = await fetch("/api/status");

  if (!response.ok) {
    throw new Error("Não foi possível carregar o status da aplicação.");
  }

  return response.json();
}

export function useAppStatus() {
  return useQuery({
    queryKey: ["app-status"],
    queryFn: fetchAppStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
