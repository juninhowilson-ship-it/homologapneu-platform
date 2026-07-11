"use client";

import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";

async function uploadImagem(
  endpoint: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Não foi possível enviar a imagem.");
  }

  return response.json();
}

export function useUploadImagem(endpoint: string) {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (file: File) => uploadImagem(endpoint, file),
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
