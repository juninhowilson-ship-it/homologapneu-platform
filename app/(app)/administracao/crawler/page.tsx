"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import {
  useCrawlerDashboard,
  useExecutarCrawler,
  useCrawlerConfig,
  useDefinirFrequencia,
  useSolicitarParada,
  type CrawlerSourceRow,
} from "@/hooks/useCrawler";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ATIVA: "success",
  PENDENTE: "warning",
  BLOQUEADA: "danger",
  ERRO: "danger",
  CONCLUIDO: "success",
  EXECUTANDO: "warning",
  FALHOU: "danger",
};

function formatarData(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

function formatarDuracao(ms: number | null) {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min ${s % 60}s`;
}

export default function CrawlerPage() {
  const { data, isLoading } = useCrawlerDashboard();
  const executar = useExecutarCrawler();
  const { data: config } = useCrawlerConfig();
  const definirFrequencia = useDefinirFrequencia();
  const solicitarParada = useSolicitarParada();

  return (
    <main className="space-y-8 p-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">HomologaPneu Intelligent Crawler</h1>
          <Badge tone="warning">Somente admin</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Agente autônomo de descoberta e atualização do banco mestre: visita as
          fontes oficiais cadastradas, baixa PDFs novos, calcula SHA-256 e envia
          cada documento para a Curadoria Inteligente existente — nunca publica
          nada sozinho, tudo fica pendente de revisão humana.
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-6">
            <Card>
              <h3 className="text-xs text-muted-foreground">Fabricantes monitorados</h3>
              <p className="mt-2 text-3xl font-bold">{data.fontes.fabricantesMonitorados}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Última execução</h3>
              <p className="mt-2 text-sm font-semibold">
                {formatarData(data.estatisticas.ultimaExecucao?.startedAt ?? null)}
              </p>
              {data.estatisticas.ultimaExecucao && (
                <Badge tone={STATUS_TONE[data.estatisticas.ultimaExecucao.status] ?? "neutral"}>
                  {data.estatisticas.ultimaExecucao.status}
                </Badge>
              )}
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Novos PDFs (última execução)</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">{data.estatisticas.novosPdfs}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Pendências OCR</h3>
              <p className="mt-2 text-3xl font-bold text-amber-600">{data.estatisticas.pendenciasOcr}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Pendências revisão</h3>
              <p className="mt-2 text-3xl font-bold text-amber-600">{data.estatisticas.pendenciasRevisao}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Erros / Tempo médio</h3>
              <p className="mt-2 text-xl font-bold">
                <span className="text-red-600">{data.estatisticas.falhas}</span>
                {" / "}
                {formatarDuracao(data.estatisticas.tempoMedioMs)}
              </p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Documentos processados</h3>
              <p className="mt-2 text-3xl font-bold">{data.estatisticas.documentosProcessados}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Fontes ativas / bloqueadas</h3>
              <p className="mt-2 text-xl font-bold">
                <span className="text-green-600">{data.fontes.fontesAtivas}</span>
                {" / "}
                <span className="text-red-600">{data.fontes.fontesBloqueadas}</span>
              </p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Alertas não reconhecidos</h3>
              <p className="mt-2 text-3xl font-bold text-amber-600">{data.estatisticas.alertasNaoReconhecidos}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Frequência de execução automática
              </label>
              <Select
                value={config?.frequency ?? "MANUAL"}
                onChange={(e) => definirFrequencia.mutate(e.target.value as "DAILY" | "WEEKLY" | "MANUAL")}
                hidePlaceholder
                options={[
                  { value: "MANUAL", label: "Manual (só pelo botão abaixo)" },
                  { value: "DAILY", label: "Diária" },
                  { value: "WEEKLY", label: "Semanal" },
                ]}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                O cron do Vercel (vercel.json) chama a rota uma vez por dia; ela só
                executa de fato quando a frequência escolhida já venceu.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => solicitarParada.mutate()}
                disabled={solicitarParada.isPending}
              >
                {solicitarParada.isPending ? "Solicitando..." : "Parar"}
              </Button>
              <Button type="button" onClick={() => executar.mutate()} disabled={executar.isPending}>
                {executar.isPending ? "Executando..." : "Executar agora"}
              </Button>
            </div>
          </div>
          {solicitarParada.data && (
            <p className="text-sm text-muted-foreground">
              Parada solicitada — a execução em andamento (se houver) para assim que checar o sinal entre uma fonte e a próxima.
            </p>
          )}
          {executar.data && (
            <p className="text-sm text-muted-foreground">
              Fontes verificadas: {executar.data.sourcesChecked} · Documentos encontrados:{" "}
              {executar.data.documentsFound} · Baixados: {executar.data.documentsDownloaded} · Pulados:{" "}
              {executar.data.documentsSkipped} · Candidatos criados: {executar.data.candidatesCreated} · Erros:{" "}
              {executar.data.errorCount}
            </p>
          )}
          {executar.isError && <p className="text-sm text-red-600">{(executar.error as Error).message}</p>}

          {data.alertas.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold">Alertas — documentos mudaram de versão</h2>
              <div className="space-y-2">
                {data.alertas.map((alerta) => (
                  <Card key={alerta.id} className="text-sm">
                    <p className="font-semibold">{alerta.manufacturerName ?? "—"}</p>
                    <p className="text-muted-foreground">{alerta.message}</p>
                    <a href={alerta.sourceUrl} target="_blank" rel="noreferrer" className="text-xs hover:underline">
                      {alerta.sourceUrl}
                    </a>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-4 text-lg font-bold">Catálogo de fontes</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>Fabricante</TableTh>
                  <TableTh>Categoria</TableTh>
                  <TableTh>Tipo</TableTh>
                  <TableTh>URL</TableTh>
                  <TableTh>Robots</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh>Última visita</TableTh>
                  <TableTh>Última atualização</TableTh>
                  <TableTh>Docs encontrados</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.fontes.fontes.map((fonte: CrawlerSourceRow) => (
                  <TableRow key={fonte.id}>
                    <TableTd>{fonte.manufacturerName}</TableTd>
                    <TableTd className="text-xs">{fonte.category}</TableTd>
                    <TableTd className="text-xs">{fonte.kind}</TableTd>
                    <TableTd className="max-w-[220px] truncate">
                      <a href={fonte.url} target="_blank" rel="noreferrer" className="text-xs hover:underline">
                        {fonte.url}
                      </a>
                    </TableTd>
                    <TableTd className="text-xs">
                      {fonte.robotsAllowed === null ? "—" : fonte.robotsAllowed ? "Permitido" : "Bloqueado"}
                    </TableTd>
                    <TableTd>
                      <Badge tone={STATUS_TONE[fonte.status] ?? "neutral"}>{fonte.status}</Badge>
                    </TableTd>
                    <TableTd className="text-xs">{formatarData(fonte.lastVisitedAt)}</TableTd>
                    <TableTd className="text-xs">{formatarData(fonte.lastUpdatedAt)}</TableTd>
                    <TableTd>{fonte.documentsFound}</TableTd>
                  </TableRow>
                ))}
                {data.fontes.fontes.length === 0 && (
                  <TableRow>
                    <TableTd colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma fonte cadastrada ainda.
                    </TableTd>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold">Histórico de execuções</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>Início</TableTh>
                  <TableTh>Gatilho</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh>Fontes</TableTh>
                  <TableTh>Encontrados</TableTh>
                  <TableTh>Baixados</TableTh>
                  <TableTh>Pulados</TableTh>
                  <TableTh>Candidatos</TableTh>
                  <TableTh>Erros</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.historico.map((run) => (
                  <TableRow key={run.id}>
                    <TableTd className="text-xs">{formatarData(run.startedAt)}</TableTd>
                    <TableTd className="text-xs">{run.trigger}</TableTd>
                    <TableTd>
                      <Badge tone={STATUS_TONE[run.status] ?? "neutral"}>{run.status}</Badge>
                    </TableTd>
                    <TableTd>{run.sourcesChecked}</TableTd>
                    <TableTd>{run.documentsFound}</TableTd>
                    <TableTd>{run.documentsDownloaded}</TableTd>
                    <TableTd>{run.documentsSkipped}</TableTd>
                    <TableTd>{run.candidatesCreated}</TableTd>
                    <TableTd className={run.errorCount > 0 ? "text-red-600" : ""}>{run.errorCount}</TableTd>
                  </TableRow>
                ))}
                {data.historico.length === 0 && (
                  <TableRow>
                    <TableTd colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma execução ainda.
                    </TableTd>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Ver também:{" "}
            <Link href="/administracao/curadoria" className="text-brand hover:underline">
              Curadoria Inteligente
            </Link>{" "}
            ·{" "}
            <Link href="/administracao" className="text-brand hover:underline">
              Administração
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
