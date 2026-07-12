"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/types/user";

async function fetchCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me");

  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Não foi possível carregar o usuário.");

  return response.json();
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}
