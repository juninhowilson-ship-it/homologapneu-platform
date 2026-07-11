"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportacaoResultado } from "@/types/importacao";

async function importarCsv(file: File): Promise<ImportacaoResultado> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/veiculos/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Não foi possível importar o arquivo.");
  }

  return response.json();
}

export function useImportarVeiculosCsv() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: importarCsv,
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      showToast(
        `Importação concluída: ${resultado.sucesso} de ${resultado.total} veículo(s) importado(s)`,
        resultado.falhas > 0 ? "info" : "success"
      );
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
