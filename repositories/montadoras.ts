import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const withModelsCount = {
  include: {
    automotiveGroup: true,
    _count: { select: { models: true } },
  },
} satisfies Prisma.ManufacturerDefaultArgs;

export type MontadoraRecord = Prisma.ManufacturerGetPayload<
  typeof withModelsCount
>;

export async function listMontadoras(): Promise<MontadoraRecord[]> {
  return prisma.manufacturer.findMany({
    ...withModelsCount,
    orderBy: { name: "asc" },
  });
}

export async function findMontadoraById(
  id: number
): Promise<MontadoraRecord | null> {
  return prisma.manufacturer.findUnique({ where: { id }, ...withModelsCount });
}

export async function findMontadoraByName(
  name: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.manufacturer.findFirst({
    where: {
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function createMontadora(
  data: Prisma.ManufacturerUncheckedCreateInput
): Promise<MontadoraRecord> {
  return prisma.manufacturer.create({ data, ...withModelsCount });
}

export async function updateMontadora(
  id: number,
  data: Prisma.ManufacturerUncheckedUpdateInput
): Promise<MontadoraRecord> {
  return prisma.manufacturer.update({ where: { id }, data, ...withModelsCount });
}

export async function deleteMontadora(id: number): Promise<void> {
  await prisma.manufacturer.delete({ where: { id } });
}

export async function findOrCreateAutomotiveGroup(
  name: string
): Promise<number> {
  const existing = await prisma.automotiveGroup.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.automotiveGroup.create({
    data: { name },
    select: { id: true },
  });
  return created.id;
}
