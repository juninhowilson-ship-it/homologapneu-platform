import "server-only";
import { prisma } from "@/lib/prisma";
import type { AiConflictSeverity, AiConflictStatus, AiConflictType, Prisma } from "@prisma/client";

export type CreateAiConflictInput = {
  jobId: number;
  type: AiConflictType;
  severity: AiConflictSeverity;
  description: string;
  suggestionIds: string;
};

export async function createAiConflicts(inputs: CreateAiConflictInput[]) {
  if (inputs.length === 0) return [];
  await prisma.aiConflict.createMany({ data: inputs });
  return prisma.aiConflict.findMany({
    where: { jobId: inputs[0].jobId },
    orderBy: { id: "asc" },
  });
}

export type AiConflictFilter = {
  status?: AiConflictStatus;
  type?: AiConflictType;
  jobId?: number;
};

export async function listAiConflicts(filtro: AiConflictFilter, page = 1, pageSize = 50) {
  const where: Prisma.AiConflictWhereInput = {
    status: filtro.status,
    type: filtro.type,
    jobId: filtro.jobId,
  };

  const [data, total] = await Promise.all([
    prisma.aiConflict.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { job: { select: { fileName: true, createdAt: true } } },
    }),
    prisma.aiConflict.count({ where }),
  ]);

  return { data, total };
}

export async function findAiConflictById(id: number) {
  return prisma.aiConflict.findUnique({
    where: { id },
    include: { job: { select: { fileName: true, createdAt: true } } },
  });
}

export async function resolveAiConflict(
  id: number,
  data: { status: AiConflictStatus; resolvedByIdRaw: number | null }
) {
  return prisma.aiConflict.update({
    where: { id },
    data: {
      status: data.status,
      resolvedByIdRaw: data.resolvedByIdRaw,
      resolvedAt: new Date(),
    },
  });
}

export async function countOpenAiConflicts() {
  return prisma.aiConflict.count({ where: { status: "ABERTO" } });
}
