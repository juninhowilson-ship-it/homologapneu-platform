import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findNextEligibleAiJob,
  findStuckAiJobs,
  findAiJobWithContent,
  markAiJobExecuting,
  markAiJobConcluded,
  markAiJobFailed,
} from "@/repositories/ai/aiJobs";
import { createAiProcessingLog } from "@/repositories/ai/aiProcessingLogs";
import { processarJobDeAnalise } from "@/services/ai/analyze";
import type { AiJobStatus } from "@prisma/client";

/// Worker da IA Engine — mesmo espírito de services/crawlerJobQueue.ts
/// (fila como dado, processada por chamada explícita, sem worker em
/// background separado nesta stack serverless). Diferente da fila do
/// Crawler (multi-fila, processador genérico recebido por parâmetro), a
/// fila da IA tem um único tipo de trabalho (DOCUMENT_ANALYSIS), então a
/// mecânica de retry/timeout e o trabalho de domínio (processarJobDeAnalise)
/// ficam juntos neste arquivo em vez de separados por um `Processador`
/// genérico.

const BACKOFF_BASE_MS = 30_000;

function proximaTentativa(attempts: number): Date {
  const atraso = BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return new Date(Date.now() + atraso);
}

/** Marca como ERRO qualquer AiJob EXECUTANDO cujo timeoutMs já estourou —
 * proteção contra um processo que morreu no meio (crash, deploy). */
export async function reconciliarJobsDeIATravados(): Promise<number> {
  const travados = await findStuckAiJobs();
  let total = 0;
  for (const job of travados) {
    const limite = job.startedAt!.getTime() + job.timeoutMs;
    if (Date.now() <= limite) continue;
    await markAiJobFailed(job.id, {
      status: job.attempts < job.maxAttempts ? "AGUARDANDO_RETRY" : "ERRO",
      nextAttemptAt: proximaTentativa(job.attempts),
      finishedAt: null,
      error: `Timeout (${job.timeoutMs}ms) — processo não concluiu a tempo.`,
      log: appendLog(job.log, `Timeout detectado após ${job.timeoutMs}ms.`),
    });
    total++;
  }
  return total;
}

function appendLog(log: string | null, linha: string): string {
  const timestamp = new Date().toISOString();
  const entrada = `[${timestamp}] ${linha}`;
  return log ? `${log}\n${entrada}` : entrada;
}

export type ProcessarProximoJobResultado =
  | { processado: false }
  | { processado: true; jobId: number; status: AiJobStatus };

export type Ator = { idRaw: number | null; label: string };

/** Pega o próximo AiJob elegível (PENDENTE ou AGUARDANDO_RETRY com
 * nextAttemptAt vencido, maior prioridade primeiro) e roda a pipeline de
 * análise (services/ai/analyze.ts). Chamado por POST /api/ai/jobs/process
 * — botão "Processar próximo" no Dashboard IA. */
export async function processarProximoJobDeIA(ator: Ator): Promise<ProcessarProximoJobResultado> {
  await reconciliarJobsDeIATravados();

  const job = await findNextEligibleAiJob("DOCUMENT_ANALYSIS");
  if (!job) return { processado: false };

  await markAiJobExecuting(job.id);
  const inicio = Date.now();

  try {
    const jobCompleto = await findAiJobWithContent(job.id);
    if (!jobCompleto) throw new Error("Job desapareceu durante o processamento.");

    const resumo = await processarJobDeAnalise(jobCompleto);

    await markAiJobConcluded(job.id, {
      extractedText: resumo.extractedText,
      result: resumo.result,
      log: appendLog(
        job.log,
        `Concluído: ${resumo.suggestionCount} sugestão(ões), ${resumo.conflictCount} conflito(s).`
      ),
    });

    await createAiProcessingLog({
      jobId: job.id,
      actorIdRaw: ator.idRaw,
      actorLabel: ator.label,
      documentName: job.fileName,
      durationMs: Date.now() - inicio,
      result: "CONCLUIDO",
      averageConfidence: resumo.averageConfidence,
    });

    return { processado: true, jobId: job.id, status: "CONCLUIDO" };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    const tentativasFeitas = job.attempts + 1;
    const podeTentarDeNovo = tentativasFeitas < job.maxAttempts;
    const status: AiJobStatus = podeTentarDeNovo ? "AGUARDANDO_RETRY" : "ERRO";

    await markAiJobFailed(job.id, {
      status,
      nextAttemptAt: proximaTentativa(tentativasFeitas),
      finishedAt: podeTentarDeNovo ? null : new Date(),
      error: mensagem,
      log: appendLog(job.log, `Tentativa ${tentativasFeitas}/${job.maxAttempts} falhou: ${mensagem}`),
    });

    await createAiProcessingLog({
      jobId: job.id,
      actorIdRaw: ator.idRaw,
      actorLabel: ator.label,
      documentName: job.fileName,
      durationMs: Date.now() - inicio,
      result: status,
      averageConfidence: null,
    });

    return { processado: true, jobId: job.id, status };
  }
}

/** Usado pelo Dashboard IA para saber se há trabalho pendente sem disparar
 * o processamento (evita um GET com efeito colateral). */
export async function existeJobPendente(): Promise<boolean> {
  const job = await prisma.aiJob.findFirst({
    where: { status: { in: ["PENDENTE", "AGUARDANDO_RETRY"] } },
    select: { id: true },
  });
  return job !== null;
}
