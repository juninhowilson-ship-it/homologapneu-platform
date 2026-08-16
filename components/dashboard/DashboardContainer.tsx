"use client";

import dynamic from "next/dynamic";
import {
  Car,
  CircleDot,
  Factory,
  FileCheck2,
  Images,
  Layers,
  Ruler,
  Target,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import KpiCard from "./KpiCard";
import BuscaGuiadaCard from "./BuscaGuiadaCard";
import QuickLinks from "./QuickLinks";
import CoberturaNacionalTable from "./CoberturaNacionalTable";
import { useDashboard } from "@/hooks/useDashboard";

const MarketIntelligencePanel = dynamic(
  () => import("./MarketIntelligencePanel"),
  { ssr: false, loading: () => <PanelSkeleton /> }
);

const PesquisaInsightsPanel = dynamic(() => import("./PesquisaInsightsPanel"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});

function PanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}

function formatarDataHora(iso: string | null) {
  if (!iso) return "Sem registros";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardContainer() {
  const { data, isLoading } = useDashboard();
  const kpis = data?.kpis;

  return (
    <div className="space-y-12">
      <BuscaGuiadaCard />

      {/* Indicadores — o card de homologações é o foco da tela */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              A base em números
            </h2>
            <p className="text-sm text-muted-foreground">
              Dados reais, atualizados a cada publicação de homologação
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Atualizado em{" "}
            {isLoading ? "…" : formatarDataHora(kpis?.ultimaAtualizacao ?? null)}
          </span>
        </div>

        {isLoading || !kpis ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              destaque
              icon={FileCheck2}
              label="Homologações publicadas"
              value={kpis.homologacoes}
              hint="Combinações veículo × pneu confirmadas por fonte oficial"
              className="col-span-2 lg:row-span-2"
            />
            <KpiCard icon={Ruler} label="Medidas distintas" value={kpis.medidas} />
            <KpiCard icon={CircleDot} label="Pneus catalogados" value={kpis.pneus} />
            <KpiCard icon={Car} label="Versões de veículos" value={kpis.veiculos} />
            <KpiCard icon={Layers} label="Modelos" value={kpis.modelos} />
            <KpiCard icon={Factory} label="Montadoras" value={kpis.fabricantes} />
            <KpiCard icon={CircleDot} label="Marcas de pneu" value={kpis.marcas} />
            <KpiCard icon={Images} label="Imagens" value={kpis.imagens} />
            <KpiCard
              icon={Target}
              label="Cobertura do Brasil"
              value={`${kpis.coberturaBrasil}%`}
              hint="Modelos do catálogo FIPE já com versão técnica documentada"
            />
          </div>
        )}
      </section>

      <QuickLinks />

      <CoberturaNacionalTable />

      {isLoading || !data ? (
        <PanelSkeleton />
      ) : (
        <MarketIntelligencePanel mercado={data.mercado} />
      )}

      {isLoading || !data ? (
        <PanelSkeleton />
      ) : (
        <PesquisaInsightsPanel pesquisas={data.pesquisas} />
      )}
    </div>
  );
}
