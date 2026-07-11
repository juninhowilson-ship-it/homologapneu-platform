"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { VeiculoFormValues } from "@/lib/validations/veiculo";
import type { Veiculo } from "@/types/veiculo";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function postVeiculo(values: VeiculoFormValues): Promise<Veiculo> {
  const response = await fetch("/api/veiculos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível criar o veículo.")
    );
  }

  return response.json();
}

async function putVeiculo(
  id: number,
  values: VeiculoFormValues
): Promise<Veiculo> {
  const response = await fetch(`/api/veiculos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível atualizar o veículo."
      )
    );
  }

  return response.json();
}

async function removeVeiculo(id: number): Promise<void> {
  const response = await fetch(`/api/veiculos/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível excluir o veículo.")
    );
  }
}

export function useCriarVeiculo() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      showToast("Veículo criado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useAtualizarVeiculo() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: VeiculoFormValues }) =>
      putVeiculo(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      queryClient.invalidateQueries({ queryKey: ["veiculo", variables.id] });
      showToast("Veículo atualizado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirVeiculo() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removeVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      showToast("Veículo excluído com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
