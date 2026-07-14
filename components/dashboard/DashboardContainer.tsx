"use client";

import dynamic from "next/dynamic";
import Skeleton from "@/components/ui/Skeleton";
import KpiCard from "./KpiCard";
import GlobalSearch from "./GlobalSearch";
import QuickLinks from "./QuickLinks";
import CoberturaNacionalTable from "./CoberturaNacionalTable";
import { useDashboard } from "@/hooks/useDashboard";

const MarketIntelligencePanel = dynamic(
  () => import("./MarketIntelligencePanel"),
  { ssr: false, loading: () => <PanelSkeleton /> }
);

const PesquisaInsightsPanel = dynamic(
  () => import("./PesquisaInsightsPanel"),
  { ssr: false, loading: () => <PanelSkeleton /> }
);

function PanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-72 w-full" />
      ))}
    </div>
  );
}

function formatarDataHora(iso: string | null) {
  if (!iso) return "Sem registros";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function DashboardContainer() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-10">
      <GlobalSearch />

      <QuickLinks />

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Indicadores</h2>
          <span className="text-sm text-muted-foreground">
            Última atualização do banco:{" "}
            {isLoading
              ? "…"
              : formatarDataHora(data?.kpis.ultimaAtualizacao ?? null)}
          </span>
        </div>

        {isLoading || !data ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Fabricantes" value={data.kpis.fabricantes} />
            <KpiCard label="Marcas" value={data.kpis.marcas} />
            <KpiCard label="Modelos" value={data.kpis.modelos} />
            <KpiCard label="Versões" value={data.kpis.veiculos} />
            <KpiCard label="Pneus" value={data.kpis.pneus} />
            <KpiCard label="Homologações" value={data.kpis.homologacoes} />
            <KpiCard label="Medidas" value={data.kpis.medidas} />
            <KpiCard label="Imagens" value={data.kpis.imagens} />
            <KpiCard
              label="Registros importados"
              value={data.kpis.registrosImportados}
            />
            <KpiCard
              label="Cobertura do Brasil"
              value={`${data.kpis.coberturaBrasil}%`}
              hint="% dos modelos do catálogo oficial FIPE já com versão técnica documentada"
            />
          </div>
        )}
      </div>

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
