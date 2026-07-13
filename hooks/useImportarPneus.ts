"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportacaoResultado } from "@/types/importacao";

export function useImportarPneus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return async function importarPneus(
    rows: Record<string, string>[],
    fileName: string
  ): Promise<ImportacaoResultado> {
    const response = await fetch("/api/pneus/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, fileName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Não foi possível importar os pneus.");
    }

    const resultado: ImportacaoResultado = await response.json();
    queryClient.invalidateQueries({ queryKey: ["pneus"] });
    showToast(
      `Importação concluída: ${resultado.sucesso} de ${resultado.total} pneu(s) importado(s)`,
      resultado.falhas > 0 ? "info" : "success"
    );
    return resultado;
  };
}
