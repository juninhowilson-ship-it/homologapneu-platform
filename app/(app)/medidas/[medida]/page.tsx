"use client";

import { use } from "react";
import Link from "next/link";
import { Car, CheckCircle2, CircleDot, Ruler } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/dashboard/KpiCard";
import { useMedida } from "@/hooks/useMedidas";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants/evidence";
import type { ApplicationStatus } from "@prisma/client";
import type { BuscaPorMedida } from "@/types/medida";

type LinhaVeiculo = {
  chave: string;
  vehicleVersionId: number;
  fabricante: string;
  modelo: string;
  versao: string;
  anos: string;
  motor: string;
  combustivel: string;
  categoria: string;
  pneuMarca: string;
  pneuModelo: string;
  especificacao: string;
  papel: string;
  homologacaoId: number;
  codigo: string;
  ano: number;
  status: string;
};

/**
 * Achata Fabricante → Modelo → Veículo em uma lista centrada no VEÍCULO: a
 * pergunta de quem abre uma medida é "quais carros calçam isso", e não a
 * árvore de catálogo.
 */
function veiculosHomologados(data: BuscaPorMedida): LinhaVeiculo[] {
  const linhas: LinhaVeiculo[] = [];

  for (const fabricante of data.fabricantesPneus) {
    for (const modelo of fabricante.modelos) {
      const especificacao = [
        `${modelo.indiceCarga}${modelo.indiceVelocidade}`,
        modelo.xl ? "XL" : null,
        modelo.runFlat ? "Run Flat" : null,
      ]
        .filter(Boolean)
        .join(" ");

      for (const veiculo of modelo.veiculosCompativeis) {
        for (const homologacao of veiculo.homologacoesConfirmadas) {
          linhas.push({
            chave: `${homologacao.homologacaoId}-${modelo.tireId}`,
            vehicleVersionId: veiculo.vehicleVersionId,
            fabricante: veiculo.fabricante,
            modelo: veiculo.modelo,
            versao: veiculo.versao,
            anos:
              veiculo.anoInicial === veiculo.anoFinal
                ? String(veiculo.anoInicial)
                : `${veiculo.anoInicial}–${veiculo.anoFinal}`,
            motor: veiculo.motor,
            combustivel: veiculo.combustivel,
            categoria: veiculo.categoria,
            pneuMarca: fabricante.fabricante,
            pneuModelo: modelo.modelo,
            especificacao,
            papel: homologacao.papel,
            homologacaoId: homologacao.homologacaoId,
            codigo: homologacao.codigo,
            ano: homologacao.ano,
            status: homologacao.status,
          });
        }
      }
    }
  }

  // Originais primeiro, depois por montadora
  return linhas.sort((a, b) => {
    if (a.papel !== b.papel) return a.papel === "ORIGINAL" ? -1 : 1;
    return (
      a.fabricante.localeCompare(b.fabricante) || a.modelo.localeCompare(b.modelo)
    );
  });
}

export default function MedidaDetalhePage({
  params,
}: {
  params: Promise<{ medida: string }>;
}) {
  const { medida: medidaParam } = use(params);
  const medida = decodeURIComponent(medidaParam);
  const { data, isLoading } = useMedida(medida);

  const linhas = data ? veiculosHomologados(data) : [];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header>
        <Link
          href="/medidas"
          className="text-sm text-brand transition hover:underline"
        >
          ← Todas as medidas
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <Ruler size={24} />
          </span>
          <div>
            <h1 className="font-mono text-4xl font-extrabold tracking-tight text-foreground">
              {medida}
            </h1>
            <p className="text-sm text-muted-foreground">
              Veículos que calçam esta medida de fábrica ou como opção homologada
            </p>
          </div>
        </div>
      </header>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              destaque
              icon={CheckCircle2}
              label="Homologações confirmadas"
              value={data.totalHomologacoesConfirmadas}
            />
            <KpiCard icon={Car} label="Veículos compatíveis" value={data.totalVeiculos} />
            <KpiCard icon={CircleDot} label="Pneus nesta medida" value={data.totalPneus} />
          </div>

          {/* O que o usuário quer ver primeiro: os veículos */}
          <section>
            <h2 className="mb-1 text-xl font-bold text-foreground">
              Veículos homologados nesta medida
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Cada linha é uma homologação confirmada — clique para abrir a ficha
              do veículo.
            </p>

            {linhas.length === 0 ? (
              <EmptyState
                title="Nenhuma homologação confirmada nesta medida"
                description="Assim que uma homologação for publicada para esta medida, ela aparece aqui."
              />
            ) : (
              <div className="space-y-3">
                {linhas.map((linha) => (
                  <Link
                    key={linha.chave}
                    href={`/veiculo/${linha.vehicleVersionId}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-brand/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-foreground">
                          {linha.fabricante} {linha.modelo}
                        </p>
                        <Badge
                          tone={linha.papel === "ORIGINAL" ? "success" : "neutral"}
                        >
                          {linha.papel === "ORIGINAL"
                            ? "Original de fábrica"
                            : linha.papel === "SUBSTITUTO"
                              ? "Substituto"
                              : "Opcional"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {linha.versao} · {linha.anos} · {linha.motor} ·{" "}
                        {linha.combustivel}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {linha.pneuMarca}{" "}
                        <span className="font-normal">{linha.pneuModelo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {linha.especificacao} · homologação {linha.codigo}/
                        {linha.ano}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Catálogo de pneus nesta medida */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-foreground">
              Pneus disponíveis nesta medida
            </h2>
            {data.fabricantesPneus.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum pneu cadastrado nesta medida ainda.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.fabricantesPneus.map((fab) => (
                  <div
                    key={fab.fabricanteId}
                    className="overflow-hidden rounded-xl border border-border bg-surface"
                  >
                    <div className="border-b border-border bg-surface-secondary px-4 py-2.5">
                      <h3 className="font-bold text-foreground">
                        {fab.fabricante}
                      </h3>
                    </div>
                    <ul className="divide-y divide-border">
                      {fab.modelos.map((modelo) => (
                        <li
                          key={modelo.tireId}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                        >
                          <span className="font-semibold text-foreground">
                            {modelo.modelo}
                            <span className="ml-2 font-normal text-muted-foreground">
                              {modelo.indiceCarga}
                              {modelo.indiceVelocidade}
                              {modelo.xl ? " XL" : ""}
                              {modelo.runFlat ? " Run Flat" : ""}
                            </span>
                          </span>
                          {modelo.veiculosCompativeis.length > 0 && (
                            <Badge tone="success">
                              {modelo.veiculosCompativeis.length} veículo(s)
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {data.aplicacoesCandidatas.length > 0 && (
            <section>
              <h2 className="mb-1 text-xl font-bold text-foreground">
                Aplicações candidatas
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Ainda não confirmadas como homologação oficial — em consolidação
                por evidências.
              </p>
              <div className="space-y-3">
                {data.aplicacoesCandidatas.map((c) => (
                  <div
                    key={c.applicationId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {c.tireManufacturerName} {c.tireModel} →{" "}
                        {c.vehicleManufacturerName} {c.vehicleModel}{" "}
                        {c.vehicleVersion} ({c.yearStart || "?"}–
                        {c.yearEnd || "?"})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c.evidenceCount} evidência(s) · pontuação {c.confidence}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[c.status as ApplicationStatus]}>
                      {STATUS_LABEL[c.status as ApplicationStatus]}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
