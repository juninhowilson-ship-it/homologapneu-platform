import "server-only";
import { prisma } from "@/lib/prisma";
import type { AiSuggestionStatus, AiSuggestionType, Prisma } from "@prisma/client";

export type CreateAiSuggestionInput = {
  jobId: number;
  type: AiSuggestionType;
  status: AiSuggestionStatus;
  payload: string;
  confidence: number;
  rawSnippet?: string | null;
  page?: number | null;
};

export async function createAiSuggestions(inputs: CreateAiSuggestionInput[]) {
  if (inputs.length === 0) return [];
  await prisma.aiSuggestion.createMany({ data: inputs });
  return prisma.aiSuggestion.findMany({
    where: { jobId: inputs[0].jobId },
    orderBy: { id: "asc" },
  });
}

export type AiSuggestionFilter = {
  status?: AiSuggestionStatus;
  type?: AiSuggestionType;
  minConfidence?: number;
  jobId?: number;
};

export async function listAiSuggestions(
  filtro: AiSuggestionFilter,
  page = 1,
  pageSize = 50
) {
  const where: Prisma.AiSuggestionWhereInput = {
    status: filtro.status,
    type: filtro.type,
    jobId: filtro.jobId,
    confidence: filtro.minConfidence ? { gte: filtro.minConfidence } : undefined,
  };

  const [data, total] = await Promise.all([
    prisma.aiSuggestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { job: { select: { fileName: true, createdAt: true } } },
    }),
    prisma.aiSuggestion.count({ where }),
  ]);

  return { data, total };
}

export async function findAiSuggestionById(id: number) {
  return prisma.aiSuggestion.findUnique({
    where: { id },
    include: { job: { select: { fileName: true, createdAt: true } } },
  });
}

export async function reviewAiSuggestion(
  id: number,
  data: { status: AiSuggestionStatus; reviewedByIdRaw: number | null; reviewNotes: string | null }
) {
  return prisma.aiSuggestion.update({
    where: { id },
    data: {
      status: data.status,
      reviewedByIdRaw: data.reviewedByIdRaw,
      reviewNotes: data.reviewNotes,
      reviewedAt: new Date(),
    },
  });
}

export async function countAiSuggestionsByStatus() {
  const grupos = await prisma.aiSuggestion.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return grupos.map((g) => ({ status: g.status, total: g._count._all }));
}

export async function countAiSuggestionsByType() {
  const grupos = await prisma.aiSuggestion.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  return grupos.map((g) => ({ type: g.type, total: g._count._all }));
}

export async function averageConfidence(): Promise<number | null> {
  const resultado = await prisma.aiSuggestion.aggregate({ _avg: { confidence: true } });
  return resultado._avg.confidence !== null ? Math.round(resultado._avg.confidence) : null;
}

export async function countAiSuggestions() {
  return prisma.aiSuggestion.count();
}
