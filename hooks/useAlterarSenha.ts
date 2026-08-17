"use client";

import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { AlterarSenhaValues } from "@/lib/validations/auth";

async function postAlterarSenha(values: AlterarSenhaValues): Promise<void> {
  const response = await fetch("/api/auth/alterar-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    let message = "Não foi possível alterar a senha.";
    try {
      const data = await response.json();
      if (typeof data.error === "string") message = data.error;
    } catch {
      // corpo não é JSON, mantém a mensagem padrão
    }
    throw new Error(message);
  }
}

export function useAlterarSenha() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: postAlterarSenha,
    onSuccess: () => {
      showToast("Senha alterada com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
