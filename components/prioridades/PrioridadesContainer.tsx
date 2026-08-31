"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  History,
  Image as ImageIcon,
  ListChecks,
  BookOpen,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import KpiCard from "@/components/dashboard/KpiCard";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  usePrioridades,
  useVersoesPendentes,
  type MarcaPendente,
} from "@/hooks/usePrioridades";

function percentual(valor: number) {
  return `${Math.round(valor * 100)}%`;
}

/** Verde só quando a cobertura do ano está de fato boa. */
function tomCobertura(cobertura: number): "success" | "warning" | "danger" {
  if (cobertura >= 0.7) return "success";
  if (cobertura >= 0.3) return "warning";
  return "danger";
}

function LinhaMarca({
  marca,
  ano,
}: {
  marca: MarcaPendente;
  ano: number;
}) {
  const [aberta, setAberta] = useState(false);
  const { data: versoes, isLoading } = useVersoesPendentes(
    ano,
    aberta ? marca.manufacturerId : null
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setAberta((estava) => !estava)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted"
      >
        {aberta ? (
          <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        )}

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">
            {marca.marca}
          </span>
          <span className="block text-xs text-muted-foreground">
            {marca.versoes} {marca.versoes === 1 ? "versão" : "versões"} no ano
          </span>
        </span>

        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {marca.comFoto > 0 && (
            <Badge
              tone="neutral"
              title="Versões pendentes que já têm foto cadastrada"
            >
              <ImageIcon size={12} className="mr-1" />
              {marca.comFoto}
            </Badge>
          )}
          {marca.comCatalogoFabricante > 0 && (
            <Badge
              tone="neutral"
              title="Versões pendentes cujo modelo aparece em catálogo de fabricante — há por onde começar"
            >
              <BookOpen size={12} className="mr-1" />
              {marca.comCatalogoFabricante}
            </Badge>
          )}
          <Badge tone="danger">{marca.semHomologacao} sem homologação</Badge>
        </span>
      </button>

      {aberta && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !versoes || versoes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nenhuma versão pendente.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {versoes.map((versao) => (
                <li
                  key={versao.vehicleVersionId}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <Link
                      href={`/veiculo/${versao.vehicleVersionId}`}
                      className="font-semibold text-foreground hover:text-brand hover:underline"
                    >
                      {versao.modelo} {versao.versao}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {versao.motor} · {versao.anoInicial}–{versao.anoFinal}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
                    {versao.temFoto && (
                      <Badge tone="neutral" title="Já tem foto">
                        <ImageIcon size={12} />
                      </Badge>
                    )}
                    {versao.temCatalogoFabricante && (
                      <Badge
                        tone="warning"
                        title="O modelo aparece em catálogo de fabricante — dá para começar por ali"
                      >
                        <BookOpen size={12} className="mr-1" />
                        catálogo
                      </Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrioridadesContainer() {
  const [ano, setAno] = useState<number | null>(null);
  const { data, isLoading } = usePrioridades(ano);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data || data.anos.length === 0) {
    return (
      <EmptyState
        title="Nada na fila"
        description="Não há veículos no recorte atual para priorizar."
      />
    );
  }

  const anoAtivo = ano ?? data.ano ?? data.anos[0].ano;
  const resumo = data.anos.find((a) => a.ano === anoAtivo);

  return (
    <div className="space-y-6">
      {/* Seletor de ano — a fila é atacada um ano depois do outro */}
      <div className="flex flex-wrap gap-2">
        {data.anos.map((item) => {
          const ativo = item.ano === anoAtivo;
          return (
            <button
              key={item.ano}
              type="button"
              onClick={() => setAno(item.ano)}
              aria-pressed={ativo}
              className={
                ativo
                  ? "rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
                  : "rounded-lg bg-surface-muted px-4 py-2 text-sm font-bold text-foreground transition hover:bg-border"
              }
            >
              {item.ano}
              <span
                className={
                  ativo
                    ? "ml-2 font-normal opacity-80"
                    : "ml-2 font-normal text-muted-foreground"
                }
              >
                {item.semHomologacao}
              </span>
            </button>
          );
        })}
      </div>

      {resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={`Versões do ano ${resumo.ano}`}
            value={resumo.versoes}
            icon={CalendarClock}
          />
          <KpiCard
            label="Sem homologação"
            value={resumo.semHomologacao}
            hint="É a fila deste ano"
            icon={ListChecks}
            destaque
          />
          <KpiCard
            label="Com homologação"
            value={resumo.comHomologacao}
            icon={FileCheck2}
          />
          <KpiCard
            label="Cobertura"
            value={percentual(resumo.cobertura)}
            hint={
              tomCobertura(resumo.cobertura) === "danger"
                ? "Ano mais atrasado da fila"
                : undefined
            }
            icon={FileCheck2}
          />
        </div>
      )}

      <section>
        <h2 className="mb-1 text-lg font-bold text-foreground">
          Por marca, do maior buraco para o menor
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Abra uma marca para ver as versões pendentes. As etiquetas mostram o
          que já existe para apoiar o trabalho: foto cadastrada e menção do
          modelo em catálogo de fabricante.
        </p>

        {data.marcas.length === 0 ? (
          <EmptyState
            title={`${anoAtivo} está fechado`}
            description="Todas as versões deste ano têm homologação confirmada. Pode passar para o próximo ano."
          />
        ) : (
          <div className="space-y-2">
            {data.marcas.map((marca) => (
              <LinhaMarca key={marca.manufacturerId} marca={marca} ano={anoAtivo} />
            ))}
          </div>
        )}
      </section>

      {/* Segundo eixo: coberto na estatística, defasado na prática */}
      {data.defasadas.length > 0 && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <History size={16} className="text-amber-400" />
            <h2 className="text-lg font-bold text-foreground">
              Homologação antiga para veículo novo
            </h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Estes veículos de {anoAtivo} contam como cobertos, mas o documento
            mais recente que temos é de anos atrás. Vale revisar se ainda vale.
          </p>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <ul className="divide-y divide-border">
              {data.defasadas.map((item) => (
                <li
                  key={item.vehicleVersionId}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <Link
                    href={`/veiculo/${item.vehicleVersionId}`}
                    className="font-semibold text-foreground hover:text-brand hover:underline"
                  >
                    {item.marca} {item.modelo}{" "}
                    <span className="font-normal text-muted-foreground">
                      {item.versao}
                    </span>
                  </Link>
                  <Badge tone="warning">
                    homologação de {item.anoHomologacao} · {item.defasagem} anos
                    de defasagem
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
