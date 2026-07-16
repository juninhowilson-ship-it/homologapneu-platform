"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  pesquisaFiltrosSchema,
  type PesquisaFiltros,
} from "@/lib/validations/pesquisa";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";
import { usePesquisa } from "@/hooks/usePesquisa";
import { usePesquisaLivre } from "@/hooks/usePesquisaLivre";
import BuscaLivreBox from "./BuscaLivreBox";
import SearchBox from "./SearchBox";
import Resultados from "./Resultados";

const CAMPOS_FILTRO: (keyof PesquisaFiltros)[] = [
  "fabricante",
  "modelo",
  "ano",
  "motorizacao",
  "medida",
  "homologacao",
  "fabricantePneu",
  "runFlat",
  "xl",
  "indiceCarga",
  "indiceVelocidade",
  "categoria",
  "segmento",
];

function filtrosDaUrl(params: URLSearchParams): PesquisaFiltros {
  const filtros: Record<string, string> = {};

  for (const campo of CAMPOS_FILTRO) {
    const valor = params.get(campo);
    if (valor) filtros[campo] = valor;
  }

  return filtros as PesquisaFiltros;
}

export default function PesquisaContainer() {
  const searchParams = useSearchParams();
  const filtrosIniciais = filtrosDaUrl(searchParams);
  const temFiltrosIniciais = Object.keys(filtrosIniciais).length > 0;
  const qInicial = searchParams.get("q") ?? "";
  const campoAtalho = searchParams.get("campo");

  const [modo, setModo] = useState<"livre" | "filtros">(
    temFiltrosIniciais ? "filtros" : "livre"
  );
  const [textoLivre, setTextoLivre] = useState(qInicial);
  const [textoBuscado, setTextoBuscado] = useState<string | null>(
    qInicial || null
  );
  const [filtrosAtivos, setFiltrosAtivos] = useState<PesquisaFiltros | null>(
    temFiltrosIniciais ? filtrosIniciais : null
  );
  const [filtrosAbertos, setFiltrosAbertos] = useState(
    temFiltrosIniciais || Boolean(campoAtalho)
  );

  const { data: opcoes, isLoading: carregandoOpcoes } = useFiltrosPesquisa();
  const { register, handleSubmit } = useForm<PesquisaFiltros>({
    resolver: zodResolver(pesquisaFiltrosSchema),
    defaultValues: filtrosIniciais,
  });

  const {
    data: resultadosLivre,
    isFetching: buscandoLivre,
    isError: erroLivre,
  } = usePesquisaLivre(modo === "livre" ? textoBuscado : null);

  const {
    data: resultadosFiltros,
    isFetching: buscandoFiltros,
    isError: erroFiltros,
  } = usePesquisa(modo === "filtros" ? filtrosAtivos : null);

  const resultados = useMemo(
    () => (modo === "livre" ? (resultadosLivre ?? []) : (resultadosFiltros ?? [])),
    [modo, resultadosLivre, resultadosFiltros]
  );

  function buscarLivre() {
    setModo("livre");
    setTextoBuscado(textoLivre);
  }

  function onSubmitFiltros(valores: PesquisaFiltros) {
    setModo("filtros");
    setFiltrosAtivos(valores);
  }

  const buscado = modo === "livre" ? textoBuscado !== null : filtrosAtivos !== null;
  const carregando = modo === "livre" ? buscandoLivre : buscandoFiltros;
  const erro = modo === "livre" ? erroLivre : erroFiltros;

  return (
    <>
      <BuscaLivreBox
        value={textoLivre}
        onChange={setTextoLivre}
        onSubmit={buscarLivre}
        carregando={modo === "livre" && carregando}
      />

      <div className="mt-4 rounded-2xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setFiltrosAbertos((aberto) => !aberto)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <SlidersHorizontal size={16} />
            Filtros avançados
          </span>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${
              filtrosAbertos ? "rotate-180" : ""
            }`}
          />
        </button>

        {filtrosAbertos && (
          <div className="border-t border-border">
            <SearchBox
              register={register}
              onSubmit={handleSubmit(onSubmitFiltros)}
              opcoes={opcoes}
              carregandoOpcoes={carregandoOpcoes}
              buscando={modo === "filtros" && carregando}
            />
          </div>
        )}
      </div>

      <div className="mt-10">
        <Resultados
          resultados={resultados}
          buscado={buscado}
          carregando={carregando}
          erro={erro}
        />
      </div>
    </>
  );
}
