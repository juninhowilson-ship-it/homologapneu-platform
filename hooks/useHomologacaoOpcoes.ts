"use client";

import { useQuery } from "@tanstack/react-query";

export type VeiculoOpcao = {
  id: number;
  label: string;
  version: string;
  engine: string;
  yearStart: number;
  yearEnd: number;
};

export type PneuOpcao = {
  id: number;
  label: string;
  size: string;
  runFlat: boolean;
  xl: boolean;
};

export type HomologacaoOpcoes = {
  veiculos: VeiculoOpcao[];
  pneus: PneuOpcao[];
};

async function fetchOpcoes(): Promise<HomologacaoOpcoes> {
  const response = await fetch("/api/homologacoes/opcoes");

  if (!response.ok) {
    throw new Error("Não foi possível carregar as opções.");
  }

  return response.json();
}

export function useHomologacaoOpcoes() {
  return useQuery({
    queryKey: ["homologacoes-opcoes"],
    queryFn: fetchOpcoes,
    staleTime: 60_000,
  });
}
