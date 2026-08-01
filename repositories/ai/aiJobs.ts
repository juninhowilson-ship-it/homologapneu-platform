import "server-only";
import { prisma } from "@/lib/prisma";
import type { AiJobQueue, AiJobStatus, Prisma } from "@prisma/client";

const withoutContent = {
  select: {
    id: true,
    queue: true,
    status: true,
    priority: true,
    fileName: true,
    fileHash: true,
    fileSize: true,
    extractedText: true,
    result: true,
    attempts: true,
    maxAttempts: true,
    timeoutMs: true,
    error: true,
    log: true,
    requestedByIdRaw: true,
    nextAttemptAt: true,
    createdAt: true,
    startedAt: true,
    finishedAt: true,
  },
} satisfies Prisma.AiJobDefaultArgs;

export type AiJobSummary = Prisma.AiJobGetPayload<typeof withoutContent>;

export type CreateAiJobInput = {
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileContent: Buffer;
  requestedByIdRaw: number | null;
  priority?: number;
};

export async function createAiJob(input: CreateAiJobInput) {
  return prisma.aiJob.create({
    data: {
      fileName: input.fileName,
      fileHash: input.fileHash,
      fileSize: input.fileSize,
      // Buffer.buffer pode ser um SharedArrayBuffer (ArrayBufferLike), que o
      // tipo Bytes do Prisma 7 não aceita — recopia para um Uint8Array com
      // ArrayBuffer garantido.
      fileContent: new Uint8Array(input.fileContent),
      requestedByIdRaw: input.requestedByIdRaw,
      priority: input.priority ?? 0,
    },
    ...withoutContent,
  });
}

export async function findAiJobById(id: number): Promise<AiJobSummary | null> {
  return prisma.aiJob.findUnique({ where: { id }, ...withoutContent });
}

export async function findAiJobWithContent(id: number) {
  return prisma.aiJob.findUnique({ where: { id } });
}

export async function findAiJobByHash(fileHash: string): Promise<AiJobSummary | null> {
  return prisma.aiJob.findFirst({
    where: { fileHash },
    orderBy: { createdAt: "desc" },
    ...withoutContent,
  });
}

export async function listAiJobs(filtro?: {
  queue?: AiJobQueue;
  status?: AiJobStatus;
}): Promise<AiJobSummary[]> {
  return prisma.aiJob.findMany({
    where: { queue: filtro?.queue, status: filtro?.status },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 200,
    ...withoutContent,
  });
}

export async function findNextEligibleAiJob(queue: AiJobQueue) {
  return prisma.aiJob.findFirst({
    where: {
      queue,
      status: { in: ["PENDENTE", "AGUARDANDO_RETRY"] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function findStuckAiJobs() {
  return prisma.aiJob.findMany({
    where: { status: "EXECUTANDO", startedAt: { not: null } },
  });
}

export async function markAiJobExecuting(id: number) {
  return prisma.aiJob.update({
    where: { id },
    data: { status: "EXECUTANDO", startedAt: new Date(), attempts: { increment: 1 } },
  });
}

export async function markAiJobConcluded(
  id: number,
  data: { extractedText: string | null; result: string; log: string | null }
) {
  return prisma.aiJob.update({
    where: { id },
    data: {
      status: "CONCLUIDO",
      finishedAt: new Date(),
      extractedText: data.extractedText,
      result: data.result,
      log: data.log,
    },
  });
}

export async function markAiJobFailed(
  id: number,
  data: { status: AiJobStatus; nextAttemptAt: Date; finishedAt: Date | null; error: string; log: string | null }
) {
  return prisma.aiJob.update({
    where: { id },
    data: {
      status: data.status,
      finishedAt: data.finishedAt,
      nextAttemptAt: data.nextAttemptAt,
      error: data.error,
      log: data.log,
    },
  });
}

export async function countAiJobs(filtro?: { status?: AiJobStatus }) {
  return prisma.aiJob.count({ where: { status: filtro?.status } });
}

export async function averageAiJobDurationMs(): Promise<number | null> {
  const jobs = await prisma.aiJob.findMany({
    where: { status: "CONCLUIDO", startedAt: { not: null }, finishedAt: { not: null } },
    select: { startedAt: true, finishedAt: true },
    take: 500,
    orderBy: { finishedAt: "desc" },
  });
  if (jobs.length === 0) return null;
  const total = jobs.reduce(
    (soma, job) => soma + (job.finishedAt!.getTime() - job.startedAt!.getTime()),
    0
  );
  return Math.round(total / jobs.length);
}
