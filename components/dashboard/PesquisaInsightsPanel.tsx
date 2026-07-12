import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import BarChartCard from "./charts/BarChartCard";
import type { DashboardPesquisas } from "@/types/dashboard";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

type Props = {
  pesquisas: DashboardPesquisas;
};

export default function PesquisaInsightsPanel({ pesquisas }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pesquisas</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <BarChartCard
          title="Pesquisas Mais Realizadas"
          data={pesquisas.pesquisasMaisRealizadas}
        />
        <BarChartCard
          title="Veículos Mais Pesquisados"
          data={pesquisas.veiculosMaisPesquisados}
        />
        <BarChartCard
          title="Pneus Mais Pesquisados"
          data={pesquisas.pneusMaisPesquisados}
        />

        <Card>
          <h3 className="text-lg font-bold">Últimos Acessos</h3>
          <p className="text-sm text-muted-foreground">
            Pesquisas mais recentes na Pesquisa Inteligente.
          </p>

          {pesquisas.ultimosAcessos.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nenhum acesso registrado ainda"
                description="O histórico é gravado automaticamente a cada pesquisa realizada."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {pesquisas.ultimosAcessos.map((acesso) => (
                <li
                  key={acesso.id}
                  className="border-b border-border pb-2 last:border-0"
                >
                  <p className="font-semibold">{acesso.resumo}</p>
                  <p className="text-muted-foreground">
                    {acesso.resultCount} resultado(s) · {formatarData(acesso.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
