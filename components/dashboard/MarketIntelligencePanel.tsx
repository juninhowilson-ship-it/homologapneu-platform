import BarChartCard from "./charts/BarChartCard";
import type { DashboardMercado } from "@/types/dashboard";
import {
  CATEGORY_LABELS,
  SEGMENT_LABELS,
  FUEL_LABELS,
  type VehicleCategory,
  type VehicleSegment,
  type FuelType,
} from "@/lib/constants/veiculo";

type Props = {
  mercado: DashboardMercado;
};

export default function MarketIntelligencePanel({ mercado }: Props) {
  const categoria = mercado.distribuicaoCategoria.map((item) => ({
    name: CATEGORY_LABELS[item.name as VehicleCategory] ?? item.name,
    value: item.value,
  }));

  const segmento = mercado.distribuicaoSegmento.map((item) => ({
    name: SEGMENT_LABELS[item.name as VehicleSegment] ?? item.name,
    value: item.value,
  }));

  const combustivel = mercado.distribuicaoCombustivel.map((item) => ({
    name: FUEL_LABELS[item.name as FuelType] ?? item.name,
    value: item.value,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inteligência de Mercado</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <BarChartCard
          title="Top Fabricantes de Veículos"
          data={mercado.topFabricantesVeiculos}
        />
        <BarChartCard
          title="Top Fabricantes de Pneus"
          data={mercado.topFabricantesPneus}
        />
        <BarChartCard
          title="Homologações por Fabricante"
          data={mercado.homologacoesPorFabricante.slice(0, 8)}
        />
        <BarChartCard
          title="Medidas Mais Homologadas"
          data={mercado.medidasMaisHomologadas}
        />
        <BarChartCard
          title="Aros Mais Utilizados"
          data={mercado.arosMaisUtilizados}
        />
        <BarChartCard
          title="Homologações Mais Utilizadas"
          subtitle="Por código"
          data={mercado.homologacoesMaisUtilizadas}
        />
        <BarChartCard
          title="Veículos com Mais Homologações"
          data={mercado.veiculosComMaisHomologacoes}
        />
        <BarChartCard
          title="Distribuição por Categoria"
          data={categoria}
          colorMode="categorical"
        />
        <BarChartCard
          title="Distribuição por Segmento"
          data={segmento}
          colorMode="categorical"
        />
        <BarChartCard
          title="Distribuição por Combustível"
          data={combustivel}
          colorMode="categorical"
        />
      </div>
    </div>
  );
}
