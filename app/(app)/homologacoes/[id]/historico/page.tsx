"use client";

import { use } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useHistoricoHomologacao } from "@/hooks/useHistoricoHomologacao";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants/evidence";
import type { ApplicationStatus } from "@prisma/client";

const ACAO_LABEL: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Excluído",
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function HistoricoHomologacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError } = useHistoricoHomologacao(Number(id));

  return (
    <main className="space-y-8 p-10">
      <div>
        <Link href="/homologacoes" className="text-sm text-brand hover:underline">
          ← Homologações
        </Link>
        <h1 className="mt-2 text-4xl font-bold">Histórico da Homologação</h1>
      </div>

      {isError && (
        <Card className="border border-red-300">
          <p className="text-red-700">Homologação não encontrada.</p>
        </Card>
      )}

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <Card>
            <h2 className="text-xl font-bold">
              {data.homologacao.code} — {data.homologacao.vehicleLabel}
            </h2>
            <p className="mt-1 text-muted-foreground">
              Ano {data.homologacao.year} · {data.homologacao.engine}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-semibold">{data.homologacao.validationStatus}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Fonte:</span>{" "}
                {data.homologacao.source ?? "—"}
              </span>
              <span>
                <span className="text-muted-foreground">Validado por:</span>{" "}
                {data.homologacao.validatedBy ?? "—"}
              </span>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-2xl font-bold">Linha do tempo (auditoria)</h2>
            {data.eventos.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhum evento de auditoria registrado para este registro ainda.
              </p>
            ) : (
              <div className="relative space-y-6 border-l-2 border-border pl-6">
                {data.eventos.map((ev) => (
                  <div key={ev.id} className="relative">
                    <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand" />
                    <p className="text-sm text-muted-foreground">{formatarDataHora(ev.quando)}</p>
                    <p className="font-semibold">
                      {ACAO_LABEL[ev.acao] ?? ev.acao}
                      {ev.quem ? ` por ${ev.quem}` : ""}
                      {ev.loteId ? ` (lote #${ev.loteId})` : ""}
                    </p>
                    {ev.mudancas && (
                      <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-surface-muted p-2 text-xs">
                        {ev.mudancas}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-bold">Evidências independentes relacionadas</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Aplicações coletadas por outras fontes (fabricante, montadora,
              manual, catálogo OE, marketplace) para o mesmo veículo/versão.
            </p>
            {data.evidenciasRelacionadas.length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma evidência independente coletada ainda para este veículo.
              </p>
            ) : (
              <div className="space-y-3">
                {data.evidenciasRelacionadas.map((ev) => (
                  <Card key={ev.applicationId} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {ev.tireManufacturerName} {ev.tireModel}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ev.evidenceCount} evidência(s) · pontuação {ev.confidence}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[ev.status as ApplicationStatus]}>
                      {STATUS_LABEL[ev.status as ApplicationStatus]}
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
