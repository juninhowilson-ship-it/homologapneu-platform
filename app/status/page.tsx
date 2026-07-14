"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useAppStatus } from "@/hooks/useAppStatus";

function formatarDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function StatusPage() {
  const { data, isLoading, isError } = useAppStatus();

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-10">
      <div>
        <h1 className="text-4xl font-bold">Status do HomologaPneu</h1>
        <p className="mt-2 text-muted-foreground">
          Página pública de observabilidade — atualiza automaticamente a cada
          30 segundos.
        </p>
      </div>

      {isError && (
        <Card className="border border-red-300">
          <p className="text-red-700">
            Não foi possível carregar o status agora. Tentando novamente...
          </p>
        </Card>
      )}

      {isLoading || !data ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-lg font-bold">Deploy</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Último commit</dt>
                  <dd className="text-right font-mono">
                    {data.commit ? (
                      <>
                        <code className="rounded bg-surface-muted px-1.5 py-0.5">
                          {data.commit.sha}
                        </code>{" "}
                        <span className="font-sans">{data.commit.message}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Ambiente</dt>
                  <dd>
                    <Badge tone={data.ambiente === "production" ? "success" : "neutral"}>
                      {data.ambiente}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Data do deploy (build)</dt>
                  <dd>{formatarDataHora(data.buildTime)}</dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="text-lg font-bold">Infraestrutura</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Banco PostgreSQL</dt>
                  <dd>
                    <Badge tone={data.banco.ok ? "success" : "danger"}>
                      {data.banco.ok
                        ? `OK (${data.banco.latenciaMs}ms)`
                        : "Indisponível"}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Supabase Storage</dt>
                  <dd>
                    <Badge tone={data.supabase.storageConfigurado ? "success" : "warning"}>
                      {data.supabase.storageConfigurado ? "Configurado" : "Não configurado"}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Supabase Auth</dt>
                  <dd>
                    <Badge tone="neutral">Não utilizado (auth própria)</Badge>
                  </dd>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  {data.supabase.observacao}
                </p>
              </dl>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold">Base de dados</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
              <Card>
                <h3 className="text-muted-foreground">Montadoras</h3>
                <p className="mt-2 text-3xl font-bold">{data.contadores.montadoras}</p>
              </Card>
              <Card>
                <h3 className="text-muted-foreground">Modelos</h3>
                <p className="mt-2 text-3xl font-bold">{data.contadores.modelos}</p>
              </Card>
              <Card>
                <h3 className="text-muted-foreground">Versões</h3>
                <p className="mt-2 text-3xl font-bold">{data.contadores.versoes}</p>
              </Card>
              <Card>
                <h3 className="text-muted-foreground">Pneus</h3>
                <p className="mt-2 text-3xl font-bold">{data.contadores.pneus}</p>
              </Card>
              <Card>
                <h3 className="text-muted-foreground">Homologações</h3>
                <p className="mt-2 text-3xl font-bold">{data.contadores.homologacoes}</p>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <h3 className="text-muted-foreground">Cobertura nacional</h3>
              <p className="mt-2 text-3xl font-bold">{data.coberturaNacional}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                % dos modelos do catálogo FIPE já com versão técnica documentada.
              </p>
            </Card>
            <Card>
              <h3 className="text-muted-foreground">Última importação</h3>
              <p className="mt-2 text-sm font-semibold">
                {data.ultimaImportacao ?? "Nenhuma importação registrada"}
              </p>
            </Card>
          </div>

          <Card>
            <h3 className="text-muted-foreground">Próxima missão em execução</h3>
            <p className="mt-2 text-xl font-semibold">
              {data.proximaMissao ?? "Nenhuma missão pendente no roadmap"}
            </p>
          </Card>

          <p className="text-right text-xs text-muted-foreground">
            Verificado em {formatarDataHora(data.verificadoEm)}
          </p>
        </>
      )}
    </main>
  );
}
