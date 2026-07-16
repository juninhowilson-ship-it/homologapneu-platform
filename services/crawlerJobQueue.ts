import "server-only";
import { prisma } from "@/lib/prisma";
import type { CrawlerJobQueue, CrawlerJobStatus } from "@prisma/client";

/**
 * Fila unificada de jobs do Intelligent Crawler (tabela CrawlerJob) —
 * DOWNLOAD/OCR/PARSING/CURADORIA compartilham o mesmo mecanismo de
 * retry/timeout/prioridade/log, só o `payload` (JSON) muda de forma por
 * `queue`. Mesmo padrão já usado por ImportQueueItem +
 * processarProximoDaFila() (services/sourceManager.ts): fila como dado,
 * processada um item por vez por uma chamada explícita (manual ou cron)
 * — não há um worker em background separado nesta stack serverless.
 *
 * Este arquivo é infraestrutura nova, ainda não conectada ao loop de
 * download síncrono de executarCrawler() (services/intelligentCrawler.ts)
 * para não alterar uma execução em andamento — a próxima etapa é migrar
 * processarDocumento() para enfileirar em vez de baixar/extrair inline.
 */

const BACKOFF_BASE_MS = 30_000;

export type EnfileirarJobInput = {
  queue: CrawlerJobQueue;
  payload: unknown;
  priority?: number;
  maxAttempts?: number;
  timeoutMs?: number;
};

export async function enfileirarJob(input: EnfileirarJobInput) {
  return prisma.crawlerJob.create({
    data: {
      queue: input.queue,
      payload: JSON.stringify(input.payload),
      priority: input.priority ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
      timeoutMs: input.timeoutMs ?? 120_000,
    },
  });
}

function proximaTentativa(attempts: number): Date {
  // Backoff exponencial simples: 30s, 60s, 120s, ...
  const atraso = BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return new Date(Date.now() + atraso);
}

function appendLog(log: string | null, linha: string): string {
  const timestamp = new Date().toISOString();
  const entrada = `[${timestamp}] ${linha}`;
  return log ? `${log}\n${entrada}` : entrada;
}

/** Marca como ERRO qualquer job EXECUTANDO cujo timeoutMs já estourou —
 * proteção contra um processo que morreu no meio (crash, deploy) sem
 * nunca chamar concluirJob/falharJob. Chamar antes de pegar o próximo
 * job pendente. */
export async function reconciliarJobsTravados(): Promise<number> {
  const travados = await prisma.crawlerJob.findMany({
    where: { status: "EXECUTANDO", startedAt: { not: null } },
  });
  let total = 0;
  for (const job of travados) {
    const limite = job.startedAt!.getTime() + job.timeoutMs;
    if (Date.now() <= limite) continue;
    await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: job.attempts < job.maxAttempts ? "AGUARDANDO_RETRY" : "ERRO",
        nextAttemptAt: proximaTentativa(job.attempts),
        error: `Timeout (${job.timeoutMs}ms) — processo não concluiu a tempo.`,
        log: appendLog(job.log, `Timeout detectado após ${job.timeoutMs}ms.`),
      },
    });
    total++;
  }
  return total;
}

export type Processador = (payload: unknown) => Promise<{ log?: string } | void>;

/** Pega o próximo job elegível (maior prioridade, mais antigo primeiro,
 * dentre PENDENTE ou AGUARDANDO_RETRY com nextAttemptAt já vencido) de
 * UMA fila específica e processa com o `processador` fornecido pelo
 * chamador (cada fila tem sua própria lógica de trabalho). */
export async function processarProximoJob(
  queue: CrawlerJobQueue,
  processador: Processador
): Promise<{ processado: false } | { processado: true; jobId: number; status: CrawlerJobStatus }> {
  await reconciliarJobsTravados();

  const job = await prisma.crawlerJob.findFirst({
    where: {
      queue,
      status: { in: ["PENDENTE", "AGUARDANDO_RETRY"] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  if (!job) return { processado: false };

  await prisma.crawlerJob.update({
    where: { id: job.id },
    data: { status: "EXECUTANDO", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const payload = JSON.parse(job.payload);
    const resultado = await processador(payload);
    await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: "CONCLUIDO",
        finishedAt: new Date(),
        log: appendLog(job.log, resultado?.log ?? "Concluído com sucesso."),
      },
    });
    return { processado: true, jobId: job.id, status: "CONCLUIDO" };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    const tentativasFeitas = job.attempts + 1;
    const podeTentarDeNovo = tentativasFeitas < job.maxAttempts;
    await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: podeTentarDeNovo ? "AGUARDANDO_RETRY" : "ERRO",
        finishedAt: podeTentarDeNovo ? null : new Date(),
        nextAttemptAt: proximaTentativa(tentativasFeitas),
        error: mensagem,
        log: appendLog(job.log, `Tentativa ${tentativasFeitas}/${job.maxAttempts} falhou: ${mensagem}`),
      },
    });
    return { processado: true, jobId: job.id, status: podeTentarDeNovo ? "AGUARDANDO_RETRY" : "ERRO" };
  }
}

export async function listarJobs(filtro?: { queue?: CrawlerJobQueue; status?: CrawlerJobStatus }) {
  return prisma.crawlerJob.findMany({
    where: { queue: filtro?.queue, status: filtro?.status },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function resumoFilas() {
  const jobs = await prisma.crawlerJob.groupBy({
    by: ["queue", "status"],
    _count: { _all: true },
  });
  return jobs.map((j) => ({ queue: j.queue, status: j.status, total: j._count._all }));
}
