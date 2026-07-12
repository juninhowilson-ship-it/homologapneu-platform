"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { HomologacaoFormValues } from "@/lib/validations/homologacao";
import type { Homologacao } from "@/types/homologacao";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function postHomologacao(
  values: HomologacaoFormValues
): Promise<Homologacao> {
  const response = await fetch("/api/homologacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível criar a homologação."
      )
    );
  }

  return response.json();
}

async function putHomologacao(
  id: number,
  values: HomologacaoFormValues
): Promise<Homologacao> {
  const response = await fetch(`/api/homologacoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível atualizar a homologação."
      )
    );
  }

  return response.json();
}

async function removeHomologacao(id: number): Promise<void> {
  const response = await fetch(`/api/homologacoes/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(
        response,
        "Não foi possível excluir a homologação."
      )
    );
  }
}

export function useCriarHomologacao() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postHomologacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homologacoes"] });
      showToast("Homologação criada com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useAtualizarHomologacao() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: HomologacaoFormValues;
    }) => putHomologacao(id, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["homologacoes"] });
      queryClient.invalidateQueries({
        queryKey: ["homologacao", variables.id],
      });
      showToast("Homologação atualizada com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirHomologacao() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removeHomologacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homologacoes"] });
      showToast("Homologação excluída com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
