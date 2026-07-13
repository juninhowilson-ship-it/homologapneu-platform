"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportacaoResultado } from "@/types/importacao";

export function useImportarVeiculos() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return async function importarVeiculos(
    rows: Record<string, string>[],
    fileName: string
  ): Promise<ImportacaoResultado> {
    const response = await fetch("/api/veiculos/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, fileName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Não foi possível importar os veículos.");
    }

    const resultado: ImportacaoResultado = await response.json();
    queryClient.invalidateQueries({ queryKey: ["veiculos"] });
    showToast(
      `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s) de ${resultado.total} linha(s)`,
      resultado.falhas > 0 ? "info" : "success"
    );
    return resultado;
  };
}
