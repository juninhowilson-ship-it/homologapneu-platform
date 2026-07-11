import { type UseFormRegister } from "react-hook-form";
import SelectCampo from "./SelectCampo";
import BotaoPesquisar from "./BotaoPesquisar";
import type { PesquisaFiltros } from "@/lib/validations/pesquisa";
import type { OpcoesFiltroPesquisa } from "@/types/homologation";
import {
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENT_LABELS,
  type TireCategory,
  type TireSegment,
} from "@/lib/constants/pneu";

const SIM_NAO = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

type Props = {
  register: UseFormRegister<PesquisaFiltros>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  opcoes?: OpcoesFiltroPesquisa;
  carregandoOpcoes: boolean;
  buscando: boolean;
};

export default function SearchBox({
  register,
  onSubmit,
  opcoes,
  carregandoOpcoes,
  buscando,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="bg-surface rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold">Pesquisa Inteligente</h2>

      <p className="text-muted-foreground mt-2">
        Localize homologações rapidamente combinando os filtros abaixo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <SelectCampo
          label="Fabricante"
          options={opcoes?.fabricantes ?? []}
          disabled={carregandoOpcoes}
          {...register("fabricante")}
        />

        <SelectCampo
          label="Veículo"
          options={opcoes?.modelos ?? []}
          disabled={carregandoOpcoes}
          {...register("modelo")}
        />

        <SelectCampo
          label="Ano"
          options={opcoes?.anos.map(String) ?? []}
          disabled={carregandoOpcoes}
          {...register("ano")}
        />

        <SelectCampo
          label="Motorização"
          options={opcoes?.motorizacoes ?? []}
          disabled={carregandoOpcoes}
          {...register("motorizacao")}
        />

        <SelectCampo
          label="Medida do Pneu"
          options={opcoes?.medidas ?? []}
          disabled={carregandoOpcoes}
          {...register("medida")}
        />

        <SelectCampo
          label="Homologação"
          options={opcoes?.homologacoes ?? []}
          disabled={carregandoOpcoes}
          {...register("homologacao")}
        />

        <SelectCampo
          label="Fabricante do Pneu"
          options={opcoes?.fabricantesPneu ?? []}
          disabled={carregandoOpcoes}
          {...register("fabricantePneu")}
        />

        <SelectCampo
          label="Run Flat"
          options={SIM_NAO}
          disabled={carregandoOpcoes}
          {...register("runFlat")}
        />

        <SelectCampo
          label="XL"
          options={SIM_NAO}
          disabled={carregandoOpcoes}
          {...register("xl")}
        />

        <SelectCampo
          label="Índice de Carga"
          options={opcoes?.indicesCarga ?? []}
          disabled={carregandoOpcoes}
          {...register("indiceCarga")}
        />

        <SelectCampo
          label="Índice de Velocidade"
          options={opcoes?.indicesVelocidade ?? []}
          disabled={carregandoOpcoes}
          {...register("indiceVelocidade")}
        />

        <SelectCampo
          label="Categoria do Pneu"
          options={
            opcoes?.categorias.map((categoria) => ({
              value: categoria,
              label: TIRE_CATEGORY_LABELS[categoria as TireCategory] ?? categoria,
            })) ?? []
          }
          disabled={carregandoOpcoes}
          {...register("categoria")}
        />

        <SelectCampo
          label="Segmento do Pneu"
          options={
            opcoes?.segmentos.map((segmento) => ({
              value: segmento,
              label: TIRE_SEGMENT_LABELS[segmento as TireSegment] ?? segmento,
            })) ?? []
          }
          disabled={carregandoOpcoes}
          {...register("segmento")}
        />
      </div>

      <div className="mt-8">
        <BotaoPesquisar carregando={buscando} />
      </div>
    </form>
  );
}
