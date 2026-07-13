"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { RollbackResultado } from "@/types/importBatch";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function rollbackImportBatch(id: number): Promise<RollbackResultado> {
  const response = await fetch(`/api/import-batches/${id}/rollback`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível reverter o lote.")
    );
  }

  return response.json();
}

export function useReverterLote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: rollbackImportBatch,
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      showToast(
        `Lote revertido: ${resultado.removidos} registro(s) removido(s)${
          resultado.falhas > 0 ? `, ${resultado.falhas} falha(s)` : ""
        }`,
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
