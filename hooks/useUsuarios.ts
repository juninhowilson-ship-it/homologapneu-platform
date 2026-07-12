"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { UsuarioListResponse } from "@/types/user";

export type UsuariosQuery = {
  q: string;
  role?: "ADMIN" | "USUARIO";
  status?: "active" | "inactive";
  sortBy: "name" | "email" | "role" | "createdAt";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
};

async function fetchUsuarios(query: UsuariosQuery): Promise<UsuarioListResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  params.set("sortBy", query.sortBy);
  params.set("sortDir", query.sortDir);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/usuarios?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os usuários.");
  }

  return response.json();
}

export function useUsuarios(query: UsuariosQuery) {
  return useQuery({
    queryKey: ["usuarios", query],
    queryFn: () => fetchUsuarios(query),
    placeholderData: keepPreviousData,
  });
}
