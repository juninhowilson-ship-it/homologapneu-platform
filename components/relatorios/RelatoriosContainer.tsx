"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileSpreadsheet, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import SearchBox from "@/components/pesquisa/SearchBox";
import RelatorioTable from "./RelatorioTable";
import {
  pesquisaFiltrosSchema,
  type PesquisaFiltros,
} from "@/lib/validations/pesquisa";
import { useFiltrosPesquisa } from "@/hooks/useFiltrosPesquisa";
import { usePesquisa } from "@/hooks/usePesquisa";

function filtrosParaQueryString(filtros: PesquisaFiltros) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  return params.toString();
}

export default function RelatoriosContainer() {
  const [filtrosAtivos, setFiltrosAtivos] = useState<PesquisaFiltros>({});

  const { data: opcoes, isLoading: carregandoOpcoes } = useFiltrosPesquisa();
  const { register, handleSubmit } = useForm<PesquisaFiltros>({
    resolver: zodResolver(pesquisaFiltrosSchema),
    defaultValues: {},
  });

  const {
    data: resultados,
    isFetching: carregando,
  } = usePesquisa(filtrosAtivos);

  function onSubmit(valores: PesquisaFiltros) {
    setFiltrosAtivos(valores);
  }

  const queryString = filtrosParaQueryString(filtrosAtivos);
  const total = resultados?.length ?? 0;

  return (
    <>
      <div className="no-print rounded-2xl border border-border bg-surface">
        <div className="px-6 py-4">
          <p className="text-sm font-semibold text-foreground">Filtros</p>
          <p className="text-sm text-muted-foreground">
            Sem filtros, o relatório traz todas as homologações.
          </p>
        </div>
        <div className="border-t border-border">
          <SearchBox
            register={register}
            onSubmit={handleSubmit(onSubmit)}
            opcoes={opcoes}
            carregandoOpcoes={carregandoOpcoes}
            buscando={carregando}
          />
        </div>
      </div>

      <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground">
          {carregando ? "Carregando…" : `${total} registro(s) no relatório`}
        </p>

        <div className="flex gap-3">
          <a href={`/api/relatorios/excel?${queryString}`}>
            <Button type="button" variant="secondary">
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={18} />
                Exportar Excel
              </span>
            </Button>
          </a>

          <Button type="button" onClick={() => window.print()} disabled={total === 0}>
            <span className="flex items-center gap-2">
              <Printer size={18} />
              Exportar PDF
            </span>
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 hidden text-xl font-bold print:block">
          Relatório de Homologações — {new Date().toLocaleDateString("pt-BR")}
        </h2>
        <RelatorioTable resultados={resultados ?? []} carregando={carregando} />
      </div>
    </>
  );
}
