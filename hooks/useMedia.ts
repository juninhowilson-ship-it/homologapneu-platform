"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { MediaListResponse } from "@/lib/media/types";

export type MediaQuery = {
  type?: string;
  status?: string;
  q?: string;
  onlyDuplicates?: boolean;
  page: number;
  pageSize: number;
};

async function fetchMedia(query: MediaQuery): Promise<MediaListResponse> {
  const params = new URLSearchParams();
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.onlyDuplicates) params.set("onlyDuplicates", "true");
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));

  const response = await fetch(`/api/media/list?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a biblioteca de imagens.");
  }
  return response.json();
}

export function useMedia(query: MediaQuery) {
  return useQuery({
    queryKey: ["media", query],
    queryFn: () => fetchMedia(query),
    placeholderData: keepPreviousData,
  });
}
