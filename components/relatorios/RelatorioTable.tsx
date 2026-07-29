import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import type { ResultadoPesquisa } from "@/types/homologation";

type Props = {
  resultados: ResultadoPesquisa[];
  carregando: boolean;
};

const TIPO_PNEU_LABEL: Record<ResultadoPesquisa["pneuTipo"], string> = {
  ORIGINAL: "Original",
  OPCIONAL: "Opcional",
  SUBSTITUTO: "Substituto",
};

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function RelatorioTable({ resultados, carregando }: Props) {
  if (carregando) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (resultados.length === 0) {
    return (
      <EmptyState
        title="Nenhuma homologação encontrada"
        description="Ajuste os filtros acima para gerar o relatório."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Homologação</TableTh>
          <TableTh>Veículo</TableTh>
          <TableTh>Ano</TableTh>
          <TableTh>Motorização</TableTh>
          <TableTh>Tipo</TableTh>
          <TableTh>Pneu</TableTh>
          <TableTh>Run Flat / XL</TableTh>
          <TableTh>Confiabilidade</TableTh>
          <TableTh>Atualizado em</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {resultados.map((resultado, indice) => (
          <TableRow key={`${resultado.homologacaoId}-${resultado.pneuMedida}-${indice}`}>
            <TableTd className="font-semibold">
              <Badge tone="warning">{resultado.homologacaoCodigo}</Badge>
            </TableTd>
            <TableTd>
              <p className="font-semibold text-foreground">
                {resultado.veiculoFabricante} {resultado.veiculoModelo}
              </p>
              <p className="text-muted-foreground">{resultado.veiculoVersao}</p>
            </TableTd>
            <TableTd>
              {formatarFaixaAno(resultado.veiculoAnoInicial, resultado.veiculoAnoFinal)}
            </TableTd>
            <TableTd>{resultado.veiculoMotorizacao}</TableTd>
            <TableTd>
              <Badge tone={resultado.pneuTipo === "ORIGINAL" ? "success" : "neutral"}>
                {TIPO_PNEU_LABEL[resultado.pneuTipo]}
              </Badge>
            </TableTd>
            <TableTd>
              <p className="font-semibold text-foreground">{resultado.pneuMedida}</p>
              <p className="text-muted-foreground">
                {resultado.pneuFabricante} {resultado.pneuModelo}
              </p>
            </TableTd>
            <TableTd>
              {resultado.pneuRunFlat ? "Run Flat" : "—"}
              {resultado.pneuRunFlat && resultado.pneuXl ? " · " : ""}
              {resultado.pneuXl ? "XL" : ""}
            </TableTd>
            <TableTd>
              <Badge tone={VALIDATION_STATUS_TONE[resultado.homologacaoConfiabilidade]}>
                {VALIDATION_STATUS_LABELS[resultado.homologacaoConfiabilidade]}
              </Badge>
            </TableTd>
            <TableTd>{formatarData(resultado.homologacaoAtualizadoEm)}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
