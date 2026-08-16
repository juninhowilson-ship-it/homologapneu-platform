"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Car,
  CircleDot,
  Fuel,
  Gauge,
  Globe,
  Layers,
  Settings2,
  Sparkles,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useVeiculo } from "@/hooks/useVeiculo";
import { useFichaTecnica } from "@/hooks/useFichaTecnica";
import {
  FUEL_LABELS,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";
import type { LucideIcon } from "lucide-react";

type Props = {
  id: number;
};

function Spec({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {rotulo}
        </p>
        <p className="truncate font-semibold text-foreground">{valor}</p>
      </div>
    </div>
  );
}

export default function FichaTecnicaVeiculo({ id }: Props) {
  const { data: veiculo, isLoading: carregandoVeiculo } = useVeiculo(id);
  const { data: ficha, isLoading: carregandoFicha } = useFichaTecnica(id);

  if (carregandoVeiculo || !veiculo) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const originais = ficha?.pneus.filter((p) => p.papel === "ORIGINAL") ?? [];
  const demais = ficha?.pneus.filter((p) => p.papel !== "ORIGINAL") ?? [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do veículo com foto */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-0 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="relative flex min-h-52 items-center justify-center bg-gradient-to-br from-surface-secondary to-surface-muted p-6">
            {ficha?.imagemUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ficha.imagemUrl}
                alt={`${veiculo.manufacturerName} ${veiculo.model}`}
                className="max-h-48 w-full object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Car size={44} />
                <span className="text-xs">Sem foto cadastrada</span>
              </div>
            )}

            {ficha?.logoMontadoraUrl && (
              <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white p-1.5 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ficha.logoMontadoraUrl}
                  alt={veiculo.manufacturerName}
                  className="h-full w-full object-contain"
                />
              </span>
            )}
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  {veiculo.manufacturerName}
                </p>
                <h2 className="mt-1 text-3xl font-extrabold leading-tight text-foreground">
                  {veiculo.model}
                </h2>
                <p className="mt-1 text-lg text-muted-foreground">
                  {veiculo.version}
                </p>
              </div>

              <Badge tone={veiculo.isActive ? "success" : "neutral"}>
                {veiculo.isActive ? "Em linha" : "Fora de linha"}
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
              <Spec
                icone={Layers}
                rotulo="Ano"
                valor={
                  veiculo.yearStart === veiculo.yearEnd
                    ? String(veiculo.yearStart)
                    : `${veiculo.yearStart}–${veiculo.yearEnd}`
                }
              />
              <Spec icone={Settings2} rotulo="Motor" valor={veiculo.engine} />
              <Spec icone={Gauge} rotulo="Potência" valor={veiculo.power ?? "—"} />
              <Spec
                icone={Fuel}
                rotulo="Combustível"
                valor={FUEL_LABELS[veiculo.fuel]}
              />
              <Spec
                icone={Car}
                rotulo="Categoria"
                valor={CATEGORY_LABELS[veiculo.category]}
              />
              <Spec
                icone={Sparkles}
                rotulo="Segmento"
                valor={veiculo.segment ? SEGMENT_LABELS[veiculo.segment] : "—"}
              />
              <Spec icone={Globe} rotulo="País" valor={veiculo.country ?? "—"} />
            </div>
          </div>
        </div>
      </section>

      {/* Pneus homologados */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground">
            Pneus homologados
          </h3>
          {ficha && ficha.pneus.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {ficha.pneus.length}{" "}
              {ficha.pneus.length === 1 ? "opção" : "opções"}
            </span>
          )}
        </div>

        {carregandoFicha ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : !ficha || ficha.pneus.length === 0 ? (
          <EmptyState
            title="Nenhuma homologação encontrada"
            description="Este veículo ainda não possui pneus homologados cadastrados."
          />
        ) : (
          <div className="space-y-6">
            {originais.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-400">
                  <BadgeCheck size={14} />
                  Original de fábrica
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {originais.map((pneu) => (
                    <article
                      key={pneu.tireId}
                      className="rounded-xl border border-green-800/50 bg-green-950/20 p-4"
                    >
                      <p className="font-mono text-2xl font-bold text-foreground">
                        {pneu.medida}
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {pneu.marca} {pneu.modelo}
                        {pneu.especificacao && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {pneu.especificacao}
                          </span>
                        )}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Homologado em {pneu.homologacaoAno}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {demais.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Demais medidas homologadas
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {demais.map((pneu) => (
                    <article
                      key={pneu.tireId}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-lg font-bold text-foreground">
                          {pneu.medida}
                        </p>
                        <Badge tone="neutral">
                          {pneu.papel === "SUBSTITUTO" ? "Substituto" : "Opcional"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {pneu.marca} {pneu.modelo}
                      </p>
                      {pneu.especificacao && (
                        <p className="text-xs text-muted-foreground">
                          {pneu.especificacao}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Alternativas de outras marcas */}
      {ficha && ficha.alternativas.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <CircleDot size={16} className="text-brand" />
            <h3 className="text-lg font-bold text-foreground">
              Outras marcas na mesma medida
            </h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Pneus da base nas medidas homologadas acima. Verifique sempre os
            índices de carga e velocidade antes de substituir.
          </p>

          <div className="space-y-4">
            {ficha.alternativas.map((alternativa) => (
              <div
                key={alternativa.medida}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-4 py-2.5">
                  <p className="font-mono font-bold text-brand">
                    {alternativa.medida}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {alternativa.pneus.length}{" "}
                    {alternativa.pneus.length === 1 ? "opção" : "opções"}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {alternativa.pneus.map((pneu) => (
                    <li
                      key={pneu.tireId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                    >
                      <span className="font-semibold text-foreground">
                        {pneu.marca}{" "}
                        <span className="font-normal">{pneu.modelo}</span>
                        {pneu.especificacao && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {pneu.especificacao}
                          </span>
                        )}
                      </span>
                      {pneu.originalEmOutroVeiculo && (
                        <Badge tone="success">Original em outro veículo</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link
        href={`/veiculo/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline no-print"
      >
        Ver ficha completa do veículo →
      </Link>
    </div>
  );
}
