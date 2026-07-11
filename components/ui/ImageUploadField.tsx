"use client";

import { useRef, type ChangeEvent } from "react";
import Button from "./Button";
import { useUploadImagem } from "@/hooks/useUploadImagem";

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  uploadEndpoint: string;
  alt?: string;
};

export default function ImageUploadField({
  label = "Imagem",
  value,
  onChange,
  uploadEndpoint,
  alt = "Imagem enviada",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImagem(uploadEndpoint);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    upload.mutate(file, {
      onSuccess: (data) => onChange(data.url),
    });
  }

  return (
    <div className="space-y-2">
      <span className="font-semibold text-foreground">{label}</span>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={alt}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? "Enviando..." : "Selecionar imagem"}
          </Button>
        </div>
      </div>
    </div>
  );
}
