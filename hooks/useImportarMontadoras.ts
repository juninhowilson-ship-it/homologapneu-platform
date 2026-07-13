"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportacaoResultado } from "@/types/importacao";

export function useImportarMontadoras() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return async function importarMontadoras(
    rows: Record<string, string>[],
    fileName: string
  ): Promise<ImportacaoResultado> {
    const response = await fetch("/api/manufacturers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, fileName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Não foi possível importar as montadoras.");
    }

    const resultado: ImportacaoResultado = await response.json();
    queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    showToast(
      `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s) de ${resultado.total} linha(s)`,
      resultado.falhas > 0 ? "info" : "success"
    );
    return resultado;
  };
}
