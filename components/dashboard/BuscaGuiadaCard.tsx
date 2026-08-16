"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Ruler, Search } from "lucide-react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";

/**
 * Cards de busca guiada do mockup: "Busca por Veículo" (montadora → modelo →
 * ano) e "Busca por Medida". Ambos levam para /pesquisa com os filtros na URL
 * (o PesquisaContainer já lê esses parâmetros).
 */
export default function BuscaGuiadaCard() {
  const router = useRouter();
  const { data: opcoes } = useFiltrosPesquisa();

  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [medida, setMedida] = useState("");

  const anos = useMemo(
    () => (opcoes?.anos ?? []).map((a) => String(a)),
    [opcoes]
  );

  function buscarPorVeiculo() {
    const params = new URLSearchParams();
    if (fabricante) params.set("fabricante", fabricante);
    if (modelo) params.set("modelo", modelo);
    if (ano) params.set("ano", ano);
    if ([...params.keys()].length === 0) return;
    router.push(`/pesquisa?${params.toString()}`);
  }

  function buscarPorMedida() {
    const q = medida.trim();
    if (!q) return;
    router.push(`/pesquisa?medida=${encodeURIComponent(q)}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Car size={18} className="text-brand" />
          Busca por Veículo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontre as medidas homologadas para o seu veículo
        </p>

        <div className="mt-4 space-y-3">
          <Select
            label="Montadora"
            options={opcoes?.fabricantes ?? []}
            placeholder="Selecione a montadora"
            value={fabricante}
            onChange={(event) => setFabricante(event.target.value)}
          />
          <Select
            label="Modelo"
            options={opcoes?.modelos ?? []}
            placeholder="Selecione o modelo"
            value={modelo}
            onChange={(event) => setModelo(event.target.value)}
          />
          <Select
            label="Ano"
            options={anos}
            placeholder="Selecione o ano"
            value={ano}
            onChange={(event) => setAno(event.target.value)}
          />
          <Button
            onClick={buscarPorVeiculo}
            disabled={!fabricante && !modelo && !ano}
            className="w-full"
          >
            <Search size={15} className="mr-1.5 inline" />
            Buscar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Ruler size={18} className="text-brand" />
          Busca por Medida
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte informações completas sobre uma medida de pneu
        </p>

        <div className="mt-4 space-y-3">
          <Input
            label="Medida"
            placeholder="Ex.: 225/45R17"
            value={medida}
            onChange={(event) => setMedida(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") buscarPorMedida();
            }}
          />
          <Button
            onClick={buscarPorMedida}
            disabled={!medida.trim()}
            className="w-full"
          >
            <Search size={15} className="mr-1.5 inline" />
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
}
