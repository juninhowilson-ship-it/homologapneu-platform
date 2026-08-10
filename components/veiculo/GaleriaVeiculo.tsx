"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ImagemVeiculo } from "@/services/veiculoFicha";

const TIPO_LABELS: Record<string, string> = {
  PRINCIPAL: "Visão Frontal",
  FRONTAL: "Frontal",
  TRASEIRA: "Traseira",
  LATERAL: "Lateral",
};

export default function GaleriaVeiculo({ imagens }: { imagens: ImagemVeiculo[] }) {
  const [imagemSelecionada, setImagemSelecionada] = useState<number | null>(null);
  const imagemAtual = imagemSelecionada !== null ? imagens[imagemSelecionada] : null;

  if (!imagens.length) return null;

  return (
    <>
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Galeria de fotos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {imagens.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setImagemSelecionada(idx)}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface transition hover:border-brand/50"
            >
              <div className="aspect-square overflow-hidden bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={TIPO_LABELS[img.type]}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <p className="text-sm font-semibold text-white">
                  {TIPO_LABELS[img.type]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {imagemAtual && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagemSelecionada(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setImagemSelecionada(null)}
              className="absolute -right-12 -top-12 rounded-full bg-surface p-2 text-foreground transition hover:bg-surface-muted"
            >
              <X size={20} />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemAtual.url}
              alt={TIPO_LABELS[imagemAtual.type]}
              className="max-h-[90vh] max-w-4xl object-contain"
            />

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setImagemSelecionada((idx) =>
                    idx === 0 ? imagens.length - 1 : (idx ?? 0) - 1
                  )
                }
                className="rounded-lg bg-surface p-2 text-foreground transition hover:bg-surface-muted"
              >
                <ChevronLeft size={20} />
              </button>

              <span className="text-sm text-muted-foreground">
                {TIPO_LABELS[imagemAtual.type]} · {(imagemSelecionada ?? 0) + 1} de{" "}
                {imagens.length}
              </span>

              <button
                onClick={() =>
                  setImagemSelecionada((idx) =>
                    idx === imagens.length - 1 ? 0 : (idx ?? 0) + 1
                  )
                }
                className="rounded-lg bg-surface p-2 text-foreground transition hover:bg-surface-muted"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
