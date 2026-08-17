"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { VeiculoGaragem } from "@/services/garagem";

export type { VeiculoGaragem };

async function fetchGaragem(): Promise<VeiculoGaragem[]> {
  const response = await fetch("/api/garagem");
  if (!response.ok) throw new Error("Não foi possível carregar a garagem.");
  const data = await response.json();
  return data.veiculos;
}

async function fetchIdsGaragem(): Promise<number[]> {
  const response = await fetch("/api/garagem?somenteIds=1");
  if (!response.ok) throw new Error("Não foi possível carregar a garagem.");
  const data = await response.json();
  return data.ids;
}

export function useGaragem() {
  return useQuery({ queryKey: ["garagem"], queryFn: fetchGaragem });
}

export function useIdsGaragem() {
  return useQuery({ queryKey: ["garagem-ids"], queryFn: fetchIdsGaragem });
}

export function useToggleGaragem() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      vehicleVersionId,
      salvar,
    }: {
      vehicleVersionId: number;
      salvar: boolean;
    }) => {
      const response = salvar
        ? await fetch("/api/garagem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicleVersionId }),
          })
        : await fetch(`/api/garagem/${vehicleVersionId}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(
          salvar
            ? "Não foi possível salvar o veículo."
            : "Não foi possível remover o veículo."
        );
      }
      return salvar;
    },
    onSuccess: (salvou) => {
      queryClient.invalidateQueries({ queryKey: ["garagem"] });
      queryClient.invalidateQueries({ queryKey: ["garagem-ids"] });
      showToast(
        salvou ? "Veículo salvo na garagem" : "Veículo removido da garagem",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
