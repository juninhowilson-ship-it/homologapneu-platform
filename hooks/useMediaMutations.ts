"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import type { MediaDTO } from "@/lib/media/types";

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

async function uploadMedia(formData: FormData): Promise<MediaDTO> {
  const response = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Não foi possível enviar a imagem."));
  }

  return response.json();
}

async function removeMedia(id: number): Promise<void> {
  const response = await fetch(`/api/media/delete?id=${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Não foi possível excluir a mídia."));
  }
}

async function regenerateThumbnail(id: number): Promise<MediaDTO> {
  const response = await fetch("/api/media/regenerate-thumbnail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Não foi possível regenerar a miniatura."));
  }
  return response.json();
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: uploadMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      showToast("Imagem enviada com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useExcluirMedia() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: removeMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      showToast("Mídia excluída com sucesso", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}

export function useRegenerarThumbnail() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: regenerateThumbnail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      showToast("Miniatura regenerada", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });
}
