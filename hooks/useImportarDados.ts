"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportacaoResultado } from "@/types/importacao";
import type { FolderKey } from "@/lib/constants/databaseImport";

/**
 * Botão "IMPORTAR DADOS" — um hook por pasta de database/import/, todos
 * batendo em /api/database-import (dispatcher único). Invalida
 * ["import-batches"] para o lote novo aparecer imediatamente no painel de
 * histórico já existente (LotesImportacaoPanel).
 */
export function useImportarDados(folder: FolderKey) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return async function importar(
    rows: Record<string, string>[],
    fileName: string
  ): Promise<ImportacaoResultado> {
    const response = await fetch("/api/database-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, rows, fileName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Não foi possível importar os dados.");
    }

    const resultado: ImportacaoResultado = await response.json();
    queryClient.invalidateQueries({ queryKey: ["import-batches"] });
    showToast(
      `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s), ${resultado.duplicados} sem alteração de ${resultado.total} linha(s)`,
      resultado.falhas > 0 ? "info" : "success"
    );
    return resultado;
  };
}
