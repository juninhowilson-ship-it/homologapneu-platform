"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { FabricanteFormValues } from "@/lib/validations/fabricante";
import type { Fabricante } from "@/types/fabricante";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function postFabricante(
  values: FabricanteFormValues
): Promise<Fabricante> {
  const response = await fetch("/api/fabricantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível criar o fabricante.")
    );
  }

  return response.json();
}

async function patchFabricante(
  id: number,
  values: FabricanteFormValues
): Promise<Fabricante> {
  const response = await fetch(`/api/fabricantes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível atualizar o fabricante."
      )
    );
  }

  return response.json();
}

async function removeFabricante(id: number): Promise<void> {
  const response = await fetch(`/api/fabricantes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível excluir o fabricante."
      )
    );
  }
}

export function useCriarFabricante() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postFabricante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
      showToast("Fabricante criado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useAtualizarFabricante() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: FabricanteFormValues;
    }) => patchFabricante(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
      queryClient.invalidateQueries({
        queryKey: ["fabricante", variables.id],
      });
      showToast("Fabricante atualizado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirFabricante() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removeFabricante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
      showToast("Fabricante excluído com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
