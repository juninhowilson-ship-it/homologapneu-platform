"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GitCompareArrows, Plus, Search, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENT_LABELS,
  TIRE_TYPE_LABELS,
} from "@/lib/constants/pneu";
import type { PneuComparacao, PneuSugestao } from "@/services/comparador";

const MAX_PNEUS = 3;

async function buscarSugestoes(q: string): Promise<PneuSugestao[]> {
  const response = await fetch(`/api/comparador/pneus?q=${encodeURIComponent(q)}`);
  if (!response.ok) throw new Error("Falha na busca de pneus.");
  return (await response.json()).pneus;
}

async function buscarComparacao(ids: number[]): Promise<PneuComparacao[]> {
  const response = await fetch(`/api/comparador?ids=${ids.join(",")}`);
  if (!response.ok) throw new Error("Falha ao comparar pneus.");
  return (await response.json()).pneus;
}

function simNao(valor: boolean) {
  return valor ? "Sim" : "Não";
}

function idsIniciaisDaUrl(params: URLSearchParams): number[] {
  return (params.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, MAX_PNEUS);
}

function ComparadorContent() {
  const searchParams = useSearchParams();
  const [ids, setIds] = useState<number[]>(() => idsIniciaisDaUrl(searchParams));
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const { data: sugestoes } = useQuery({
    queryKey: ["comparador-busca", buscaDebounced],
    queryFn: () => buscarSugestoes(buscaDebounced),
    enabled: buscaDebounced.trim().length >= 2,
  });

  const { data: pneus, isLoading } = useQuery({
    queryKey: ["comparador", ids],
    queryFn: () => buscarComparacao(ids),
    enabled: ids.length > 0,
  });

  function adicionar(id: number) {
    setBusca("");
    setIds((atual) =>
      atual.includes(id) || atual.length >= MAX_PNEUS ? atual : [...atual, id]
    );
  }

  function remover(id: number) {
    setIds((atual) => atual.filter((x) => x !== id));
  }

  const linhas: {
    rotulo: string;
    valor: (p: PneuComparacao) => string;
  }[] = [
    { rotulo: "Medida", valor: (p) => p.medida },
    { rotulo: "Marca", valor: (p) => p.marca },
    { rotulo: "Fabricante", valor: (p) => p.fabricante },
    {
      rotulo: "Índice de carga",
      valor: (p) =>
        p.cargaMaximaKg ? `${p.indiceCarga} (${p.cargaMaximaKg} kg)` : p.indiceCarga,
    },
    {
      rotulo: "Índice de velocidade",
      valor: (p) =>
        p.velocidadeMaximaKmh
          ? `${p.indiceVelocidade} (${p.velocidadeMaximaKmh} km/h)`
          : p.indiceVelocidade,
    },
    {
      rotulo: "Construção",
      valor: (p) =>
        TIRE_TYPE_LABELS[p.construcao as keyof typeof TIRE_TYPE_LABELS] ??
        p.construcao,
    },
    {
      rotulo: "Categoria",
      valor: (p) =>
        TIRE_CATEGORY_LABELS[p.categoria as keyof typeof TIRE_CATEGORY_LABELS] ??
        p.categoria,
    },
    {
      rotulo: "Segmento",
      valor: (p) =>
        p.segmento
          ? TIRE_SEGMENT_LABELS[p.segmento as keyof typeof TIRE_SEGMENT_LABELS] ??
            p.segmento
          : "—",
    },
    { rotulo: "Run Flat", valor: (p) => simNao(p.runFlat) },
    { rotulo: "Reforçado (XL)", valor: (p) => simNao(p.xl) },
    { rotulo: "Seal", valor: (p) => simNao(p.seal) },
    { rotulo: "Tubeless", valor: (p) => simNao(p.tubeless) },
    {
      rotulo: "Tecnologias",
      valor: (p) => (p.tecnologias.length ? p.tecnologias.join(", ") : "—"),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <GitCompareArrows size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            Comparador de Pneus
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare especificações técnicas de até {MAX_PNEUS} pneus lado a lado
          </p>
        </div>
      </div>

      {/* Busca para adicionar pneus */}
      {ids.length < MAX_PNEUS && (
        <div className="relative mb-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 focus-within:border-brand">
            <Search size={16} className="text-muted-foreground" />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar pneu por medida, marca ou modelo (ex.: 225/45R17, Pirelli)..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {buscaDebounced.trim().length >= 2 && busca.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              {sugestoes && sugestoes.length > 0 ? (
                sugestoes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => adicionar(s.id)}
                    disabled={ids.includes(s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-surface-secondary disabled:opacity-40"
                  >
                    <span className="truncate">
                      <span className="font-semibold text-foreground">
                        {s.marca} {s.modelo}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs text-brand">{s.medida}</span>
                      <Plus size={14} className="text-muted-foreground" />
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Nenhum pneu encontrado.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparação */}
      {ids.length === 0 ? (
        <EmptyState
          title="Nenhum pneu selecionado"
          description="Use a busca acima para adicionar até três pneus e comparar as especificações."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="w-44 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Especificação
                </th>
                {(pneus ?? []).map((p) => (
                  <th key={p.id} className="px-5 py-4 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">
                          {p.marca} {p.modelo}
                        </p>
                        <Badge tone="warning" className="mt-1 font-mono">
                          {p.medida}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => remover(p.id)}
                        aria-label={`Remover ${p.marca} ${p.modelo}`}
                        className="rounded p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={ids.length + 1}
                    className="px-5 py-6 text-muted-foreground"
                  >
                    Carregando comparação...
                  </td>
                </tr>
              ) : (
                linhas.map((linha, index) => (
                  <tr
                    key={linha.rotulo}
                    className={`border-b border-border last:border-0 ${
                      index % 2 === 1 ? "bg-surface-muted" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-semibold text-muted-foreground">
                      {linha.rotulo}
                    </td>
                    {(pneus ?? []).map((p) => (
                      <td key={p.id} className="px-5 py-3 text-foreground">
                        {linha.valor(p)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparadorPage() {
  return (
    <Suspense fallback={null}>
      <ComparadorContent />
    </Suspense>
  );
}
