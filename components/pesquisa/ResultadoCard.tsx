import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ResultadoPesquisa } from "@/types/homologation";

type Props = {
  resultado: ResultadoPesquisa;
};

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

export default function ResultadoCard({ resultado }: Props) {
  return (
    <Card className="shadow-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {resultado.veiculoFabricante} {resultado.veiculoModelo}
          </h2>

          <p className="text-muted-foreground">
            {formatarFaixaAno(resultado.veiculoAnoInicial, resultado.veiculoAnoFinal)} •{" "}
            {resultado.veiculoMotorizacao}
          </p>
        </div>

        <div className="text-right">
          <p className="text-muted-foreground">Medida do Pneu</p>
          <p className="text-2xl font-bold">{resultado.pneuMedida}</p>
        </div>
      </div>

      <hr className="my-5 border-border" />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <div>
          <p className="text-muted-foreground">Run Flat</p>
          <p>{resultado.pneuRunFlat ? "Sim" : "Não"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">XL</p>
          <p>{resultado.pneuXl ? "Sim" : "Não"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Índice de Carga</p>
          <p>{resultado.pneuIndiceCarga}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Índice de Velocidade</p>
          <p>{resultado.pneuIndiceVelocidade}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Fabricante do Pneu</p>
          <p>
            {resultado.pneuFabricante} {resultado.pneuModelo}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">Homologação</p>
          <div className="flex items-center gap-2">
            <Badge tone="warning">{resultado.homologacaoCodigo}</Badge>
            <span className="text-sm text-muted-foreground">
              {resultado.homologacaoAno}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
