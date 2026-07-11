"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { PneuFormValues } from "@/lib/validations/pneu";
import type { Pneu } from "@/types/pneu";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function postPneu(values: PneuFormValues): Promise<Pneu> {
  const response = await fetch("/api/pneus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível criar o pneu.")
    );
  }

  return response.json();
}

async function putPneu(id: number, values: PneuFormValues): Promise<Pneu> {
  const response = await fetch(`/api/pneus/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível atualizar o pneu.")
    );
  }

  return response.json();
}

async function removePneu(id: number): Promise<void> {
  const response = await fetch(`/api/pneus/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível excluir o pneu.")
    );
  }
}

export function useCriarPneu() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postPneu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus"] });
      showToast("Pneu criado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useAtualizarPneu() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: PneuFormValues }) =>
      putPneu(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pneus"] });
      queryClient.invalidateQueries({ queryKey: ["pneu", variables.id] });
      showToast("Pneu atualizado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirPneu() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removePneu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus"] });
      showToast("Pneu excluído com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
