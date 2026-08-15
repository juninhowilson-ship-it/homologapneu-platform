import "server-only";
import { prisma } from "@/lib/prisma";
import type { PasswordResetChannel } from "@prisma/client";

export async function createResetRequest(data: {
  userId: number;
  channel: PasswordResetChannel;
  tokenHash?: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetRequest.create({ data });
}

export async function findValidResetByTokenHash(tokenHash: string) {
  return prisma.passwordResetRequest.findFirst({
    where: {
      tokenHash,
      channel: "EMAIL",
      status: "PENDENTE",
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { id: true, isActive: true } } },
  });
}

/**
 * Marca como concluídas TODAS as solicitações pendentes do usuário (não só a
 * usada): depois que a senha muda, qualquer token antigo deixa de fazer
 * sentido e não deve continuar utilizável.
 */
export async function concluirResetsPendentes(userId: number) {
  await prisma.passwordResetRequest.updateMany({
    where: { userId, status: "PENDENTE" },
    data: { status: "CONCLUIDA", usedAt: new Date() },
  });
}

export async function usuariosComResetPendente(
  userIds: number[]
): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();

  const pendentes = await prisma.passwordResetRequest.findMany({
    where: {
      userId: { in: userIds },
      status: "PENDENTE",
      expiresAt: { gt: new Date() },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  return new Set(pendentes.map((p) => p.userId));
}

/**
 * Anti-flood: quantas solicitações o usuário abriu na última hora,
 * independente do canal.
 */
export async function countResetsRecentes(userId: number): Promise<number> {
  return prisma.passwordResetRequest.count({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
}
