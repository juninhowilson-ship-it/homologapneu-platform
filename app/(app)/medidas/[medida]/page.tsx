"use client";

import { use } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useMedida } from "@/hooks/useMedidas";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants/evidence";
import type { ApplicationStatus } from "@prisma/client";

const VALIDATION_TONE: Record<string, "success" | "warning" | "danger"> = {
  VALIDADO: "success",
  NECESSITA_VALIDACAO: "warning",
  REJEITADO: "danger",
};

export default function MedidaDetalhePage({
  params,
}: {
  params: Promise<{ medida: string }>;
}) {
  const { medida: medidaParam } = use(params);
  const medida = decodeURIComponent(medidaParam);
  const { data, isLoading } = useMedida(medida);

  return (
    <main className="space-y-8 p-10">
      <div>
        <Link href="/medidas" className="text-sm text-brand hover:underline">
          ← Todas as medidas
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{medida}</h1>
        <p className="mt-2 text-muted-foreground">
          Fabricantes de pneu → Modelos → Veículos compatíveis → Versões →
          Homologações, nessa medida.
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <h3 className="text-muted-foreground">Pneus nessa medida</h3>
              <p className="mt-2 text-3xl font-bold">{data.totalPneus}</p>
            </Card>
            <Card>
              <h3 className="text-muted-foreground">Veículos compatíveis</h3>
              <p className="mt-2 text-3xl font-bold">{data.totalVeiculos}</p>
            </Card>
            <Card>
              <h3 className="text-muted-foreground">Homologações confirmadas</h3>
              <p className="mt-2 text-3xl font-bold">{data.totalHomologacoesConfirmadas}</p>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">Homologações confirmadas</h2>
            {data.fabricantesPneus.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum pneu cadastrado nesta medida ainda.
              </p>
            ) : (
              <div className="space-y-6">
                {data.fabricantesPneus.map((fab) => (
                  <Card key={fab.fabricanteId}>
                    <h3 className="text-xl font-bold">{fab.fabricante}</h3>
                    <div className="mt-4 space-y-4">
                      {fab.modelos.map((modelo) => (
                        <div key={modelo.tireId} className="rounded-lg border border-border p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold">{modelo.modelo}</p>
                            <Badge tone="neutral">
                              Carga {modelo.indiceCarga} · Vel. {modelo.indiceVelocidade}
                            </Badge>
                            {modelo.xl && <Badge tone="neutral">XL</Badge>}
                            {modelo.runFlat && <Badge tone="neutral">Run Flat</Badge>}
                          </div>

                          {modelo.veiculosCompativeis.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Nenhum veículo confirmado ainda para este pneu.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {modelo.veiculosCompativeis.map((v) => (
                                <div
                                  key={v.vehicleVersionId}
                                  className="rounded border border-border/60 bg-surface-muted/40 p-3"
                                >
                                  <p className="font-medium">
                                    {v.fabricante} {v.modelo} {v.versao} ({v.anoInicial}
                                    {v.anoInicial !== v.anoFinal ? `–${v.anoFinal}` : ""})
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {v.motor} · {v.combustivel}
                                    {v.transmissao ? ` · ${v.transmissao}` : ""}
                                    {v.tracao ? ` · ${v.tracao}` : ""} · {v.categoria}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {v.homologacoesConfirmadas.map((h) => (
                                      <Link
                                        key={h.homologacaoId}
                                        href={`/homologacoes/${h.homologacaoId}/historico`}
                                      >
                                        <Badge tone={VALIDATION_TONE[h.status] ?? "neutral"}>
                                          {h.codigo} · {h.papel} · {h.ano}
                                        </Badge>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">Aplicações candidatas (em consolidação)</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Ainda não confirmadas como homologação oficial — apresentadas
              como aplicação compatível até reunirem confiança suficiente.
            </p>
            {data.aplicacoesCandidatas.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma evidência coletada ainda para esta medida.
              </p>
            ) : (
              <div className="space-y-3">
                {data.aplicacoesCandidatas.map((c) => (
                  <Card key={c.applicationId} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {c.tireManufacturerName} {c.tireModel} → {c.vehicleManufacturerName}{" "}
                        {c.vehicleModel} {c.vehicleVersion} ({c.yearStart || "?"}–{c.yearEnd || "?"})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c.evidenceCount} evidência(s) · pontuação {c.confidence}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[c.status as ApplicationStatus]}>
                      {STATUS_LABEL[c.status as ApplicationStatus]}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
