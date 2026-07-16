import { Car, FileText, CalendarDays, Gauge } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import type { ResultadoPesquisa } from "@/types/homologation";

type Props = {
  resultado: ResultadoPesquisa;
};

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ResultadoCard({ resultado }: Props) {
  return (
    <Card className="shadow-md transition hover:shadow-lg">
      <div className="flex flex-col gap-5 sm:flex-row">
        <a
          href={`/veiculo/${resultado.veiculoId}`}
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted"
        >
          {resultado.veiculoImagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultado.veiculoImagemUrl}
              alt={`${resultado.veiculoFabricante} ${resultado.veiculoModelo}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Car className="text-muted-foreground" size={28} />
          )}
        </a>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <a
                href={`/veiculo/${resultado.veiculoId}`}
                className="text-xl font-bold text-foreground hover:text-brand"
              >
                {resultado.veiculoFabricante} {resultado.veiculoModelo}
              </a>
              <p className="text-muted-foreground">
                {formatarFaixaAno(resultado.veiculoAnoInicial, resultado.veiculoAnoFinal)}{" "}
                · {resultado.veiculoVersao} · {resultado.veiculoMotorizacao}
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Badge tone={resultado.pneuTipo === "ORIGINAL" ? "success" : "neutral"}>
                  {resultado.pneuTipo === "ORIGINAL" ? "Original" : "Opcional"}
                </Badge>
                <span className="text-sm text-muted-foreground">Medida do Pneu</span>
              </div>
              <p className="text-2xl font-bold">{resultado.pneuMedida}</p>
            </div>
          </div>

          <hr className="my-4 border-border" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Índice de Carga</p>
              <p className="font-semibold">{resultado.pneuIndiceCarga}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Índice de Velocidade</p>
              <p className="font-semibold">{resultado.pneuIndiceVelocidade}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Run Flat / XL</p>
              <p className="font-semibold">
                {resultado.pneuRunFlat ? "Run Flat" : "—"}
                {resultado.pneuRunFlat && resultado.pneuXl ? " · " : ""}
                {resultado.pneuXl ? "XL" : resultado.pneuRunFlat ? "" : "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Fabricante do Pneu</p>
              <p className="font-semibold">
                {resultado.pneuFabricante} {resultado.pneuModelo}
              </p>
            </div>

            <div className="flex items-start gap-1.5">
              <Gauge size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Pressões (vazio)</p>
                <p className="font-semibold">
                  {resultado.pressaoDianteira ?? "—"} / {resultado.pressaoTraseira ?? "—"}
                </p>
              </div>
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

            <div>
              <p className="text-muted-foreground">Confiabilidade</p>
              <Badge tone={VALIDATION_STATUS_TONE[resultado.homologacaoConfiabilidade]}>
                {VALIDATION_STATUS_LABELS[resultado.homologacaoConfiabilidade]}
              </Badge>
            </div>

            <div className="flex items-start gap-1.5">
              <CalendarDays size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Atualizado em</p>
                <p className="font-semibold">
                  {formatarData(resultado.homologacaoAtualizadoEm)}
                </p>
              </div>
            </div>
          </div>

          {resultado.homologacaoDocumentoUrl && (
            <a
              href={resultado.homologacaoDocumentoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <FileText size={15} />
              {resultado.homologacaoDocumentoNome ?? "Documento oficial"}
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
