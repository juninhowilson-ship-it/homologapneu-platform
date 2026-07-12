"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import {
  pesquisaFiltrosSchema,
  type PesquisaFiltros,
} from "@/lib/validations/pesquisa";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";
import { usePesquisa } from "@/hooks/usePesquisa";
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

  const [filtrosAtivos, setFiltrosAtivos] = useState<PesquisaFiltros | null>(
    temFiltrosIniciais ? filtrosIniciais : null
  );

  const { data: opcoes, isLoading: carregandoOpcoes } = useFiltrosPesquisa();
  const { register, handleSubmit } = useForm<PesquisaFiltros>({
    resolver: zodResolver(pesquisaFiltrosSchema),
    defaultValues: filtrosIniciais,
  });

  const {
    data: resultados,
    isFetching: buscando,
    isError: erroNaBusca,
  } = usePesquisa(filtrosAtivos);

  function onSubmit(valores: PesquisaFiltros) {
    setFiltrosAtivos(valores);
  }

  return (
    <>
      <SearchBox
        register={register}
        onSubmit={handleSubmit(onSubmit)}
        opcoes={opcoes}
        carregandoOpcoes={carregandoOpcoes}
        buscando={buscando}
      />

      <div className="mt-10">
        <Resultados
          resultados={resultados ?? []}
          buscado={filtrosAtivos !== null}
          carregando={buscando}
          erro={erroNaBusca}
        />
      </div>
    </>
  );
}
