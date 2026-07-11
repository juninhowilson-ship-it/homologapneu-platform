"use client";

import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";

async function uploadLogotipo(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/fabricantes/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Não foi possível enviar o logotipo.");
  }

  return response.json();
}

export function useUploadLogotipo() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: uploadLogotipo,
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
