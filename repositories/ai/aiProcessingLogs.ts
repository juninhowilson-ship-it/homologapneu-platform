import "server-only";
import { prisma } from "@/lib/prisma";

export type CreateAiProcessingLogInput = {
  jobId: number;
  actorIdRaw: number | null;
  actorLabel: string;
  documentName: string;
  durationMs: number;
  result: string;
  averageConfidence: number | null;
};

export async function createAiProcessingLog(input: CreateAiProcessingLogInput) {
  return prisma.aiProcessingLog.create({ data: input });
}

export async function listRecentAiProcessingLogs(take = 200) {
  return prisma.aiProcessingLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
}
