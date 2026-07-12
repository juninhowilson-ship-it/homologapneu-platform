"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { UsuarioFormValues } from "@/lib/validations/auth";
import type { Usuario } from "@/types/user";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function postUsuario(values: UsuarioFormValues): Promise<Usuario> {
  const response = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível criar o usuário.")
    );
  }

  return response.json();
}

async function putUsuario(
  id: number,
  values: UsuarioFormValues
): Promise<Usuario> {
  const response = await fetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível atualizar o usuário.")
    );
  }

  return response.json();
}

async function removeUsuario(id: number): Promise<void> {
  const response = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, "Não foi possível excluir o usuário.")
    );
  }
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      showToast("Usuário criado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: UsuarioFormValues }) =>
      putUsuario(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      showToast("Usuário atualizado com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirUsuario() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removeUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      showToast("Usuário excluído com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
