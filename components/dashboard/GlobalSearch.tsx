"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";
import type { OpcoesFiltroPesquisa } from "@/types/homologation";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";

type CampoBusca = keyof Pick<
  PesquisaFiltros,
  "modelo" | "fabricante" | "medida" | "fabricantePneu" | "homologacao"
>;

function encontrarCampo(
  termo: string,
  opcoes: OpcoesFiltroPesquisa
): { campo: CampoBusca; valor: string } | null {
  const alvo = termo.trim().toLowerCase();
  if (!alvo) return null;

  const grupos: { campo: CampoBusca; valores: string[] }[] = [
    { campo: "modelo", valores: opcoes.modelos },
    { campo: "fabricante", valores: opcoes.fabricantes },
    { campo: "medida", valores: opcoes.medidas },
    { campo: "fabricantePneu", valores: opcoes.fabricantesPneu },
    { campo: "homologacao", valores: opcoes.homologacoes },
  ];

  for (const grupo of grupos) {
    const exato = grupo.valores.find((valor) => valor.toLowerCase() === alvo);
    if (exato) return { campo: grupo.campo, valor: exato };
  }

  for (const grupo of grupos) {
    const parcial = grupo.valores.find((valor) =>
      valor.toLowerCase().includes(alvo)
    );
    if (parcial) return { campo: grupo.campo, valor: parcial };
  }

  return null;
}

export default function GlobalSearch() {
  const [termo, setTermo] = useState("");
  const router = useRouter();
  const { data: opcoes } = useFiltrosPesquisa();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termo.trim()) return;

    const encontrado = opcoes ? encontrarCampo(termo, opcoes) : null;
    const params = new URLSearchParams();

    if (encontrado) {
      params.set(encontrado.campo, encontrado.valor);
    } else {
      params.set("modelo", termo.trim());
    }

    router.push(`/pesquisa?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Buscar por veículo, pneu, medida, fabricante ou homologação..."
          value={termo}
          onChange={(event) => setTermo(event.target.value)}
        />
      </div>
      <Button type="submit">Buscar</Button>
    </form>
  );
}
