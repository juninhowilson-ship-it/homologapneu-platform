"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  pesquisaFiltrosSchema,
  type PesquisaFiltros,
} from "@/lib/validations/pesquisa";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";
import { usePesquisa } from "@/hooks/usePesquisa";
import SearchBox from "./SearchBox";
import Resultados from "./Resultados";

export default function PesquisaContainer() {
  const [filtrosAtivos, setFiltrosAtivos] = useState<PesquisaFiltros | null>(
    null
  );

  const { data: opcoes, isLoading: carregandoOpcoes } = useFiltrosPesquisa();
  const { register, handleSubmit } = useForm<PesquisaFiltros>({
    resolver: zodResolver(pesquisaFiltrosSchema),
    defaultValues: {},
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
