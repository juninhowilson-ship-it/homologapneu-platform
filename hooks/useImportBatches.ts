"use client";

import { useQuery } from "@tanstack/react-query";
import type { ImportBatchDetalhe, ImportBatchResumo } from "@/types/importBatch";

async function fetchImportBatches(): Promise<ImportBatchResumo[]> {
  const response = await fetch("/api/import-batches");

  if (!response.ok) {
    throw new Error("Não foi possível carregar os lotes de importação.");
  }

  const data = await response.json();
  return data.data;
}

export function useImportBatches() {
  return useQuery({
    queryKey: ["import-batches"],
    queryFn: fetchImportBatches,
    refetchInterval: 15000,
  });
}

async function fetchImportBatch(id: number): Promise<ImportBatchDetalhe> {
  const response = await fetch(`/api/import-batches/${id}`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o lote de importação.");
  }

  return response.json();
}

export function useImportBatch(id: number | null) {
  return useQuery({
    queryKey: ["import-batches", id],
    queryFn: () => fetchImportBatch(id as number),
    enabled: id !== null,
  });
}
