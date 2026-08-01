import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { resolveManufacturerId } from "@/lib/masterData/resolveManufacturer";
import { normalizeLookupKey } from "@/lib/masterData/normalizeName";

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

/**
 * Resolução canônica por normalizedName + SearchAlias — ver
 * lib/masterData/resolveManufacturer.ts. Nunca faz match por `name` puro.
 */
export async function findMontadoraByName(
  name: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  const match = await resolveManufacturerId(prisma, name);
  if (!match) return null;
  if (excludeId && match.id === excludeId) return null;
  return { id: match.id };
}

export async function createMontadora(
  data: Omit<Prisma.ManufacturerUncheckedCreateInput, "normalizedName">
): Promise<MontadoraRecord> {
  return prisma.manufacturer.create({
    data: { ...data, normalizedName: normalizeLookupKey(data.name) },
    ...withModelsCount,
  });
}

export async function updateMontadora(
  id: number,
  data: Prisma.ManufacturerUncheckedUpdateInput
): Promise<MontadoraRecord> {
  const patch: Prisma.ManufacturerUncheckedUpdateInput = { ...data };
  if (typeof patch.name === "string") {
    patch.normalizedName = normalizeLookupKey(patch.name);
  }
  return prisma.manufacturer.update({ where: { id }, data: patch, ...withModelsCount });
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
