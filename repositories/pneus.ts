import "server-only";
import { prisma } from "@/lib/prisma";
import type { PneuListQuery } from "@/lib/validations/pneu";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    tireManufacturer: true,
    tireFamily: true,
    technologies: { include: { technology: true } },
    _count: { select: { homologationTires: true } },
  },
} satisfies Prisma.TireDefaultArgs;

export type PneuRecord = Prisma.TireGetPayload<typeof withRelations>;

export async function listPneus(
  query: PneuListQuery
): Promise<{ data: PneuRecord[]; total: number }> {
  const where: Prisma.TireWhereInput = {};

  if (query.q) {
    where.OR = [
      { brand: { contains: query.q, mode: "insensitive" } },
      { model: { contains: query.q, mode: "insensitive" } },
      { size: { contains: query.q, mode: "insensitive" } },
      { ean: { contains: query.q, mode: "insensitive" } },
      { tireManufacturer: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  if (query.tireManufacturerId) where.tireManufacturerId = query.tireManufacturerId;
  if (query.category) where.category = query.category;
  if (query.segment) where.segment = query.segment;
  if (query.runFlat) where.runFlat = query.runFlat === "true";
  if (query.xl) where.xl = query.xl === "true";

  const [data, total] = await Promise.all([
    prisma.tire.findMany({
      where,
      ...withRelations,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.tire.count({ where }),
  ]);

  return { data, total };
}

export async function findPneuById(id: number): Promise<PneuRecord | null> {
  return prisma.tire.findUnique({ where: { id }, ...withRelations });
}

export async function findPneuByBusinessKey(
  tireManufacturerId: number,
  model: string,
  size: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.tire.findFirst({
    where: {
      tireManufacturerId,
      model,
      size,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findPneuByEan(
  ean: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.tire.findFirst({
    where: {
      ean,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findOrCreateTireFamily(
  tireManufacturerId: number,
  name: string
): Promise<number> {
  const existing = await prisma.tireFamily.findFirst({
    where: { tireManufacturerId, name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.tireFamily.create({
    data: { tireManufacturerId, name },
    select: { id: true },
  });
  return created.id;
}

export async function findOrCreateLoadIndex(
  code: string,
  source: string | null
): Promise<number> {
  const existing = await prisma.loadIndex.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.loadIndex.create({
    data: { code, source },
    select: { id: true },
  });
  return created.id;
}

export async function findOrCreateSpeedIndex(
  code: string,
  source: string | null
): Promise<number> {
  const existing = await prisma.speedIndex.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.speedIndex.create({
    data: { code, source },
    select: { id: true },
  });
  return created.id;
}

export async function findOrCreateTechnology(
  name: string,
  source: string | null
): Promise<number> {
  const existing = await prisma.technology.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.technology.create({
    data: { name, description: source ? `Origem: ${source}` : null },
    select: { id: true },
  });
  return created.id;
}

export async function syncTireTechnologies(
  tireId: number,
  technologyIds: number[]
): Promise<void> {
  await prisma.$transaction([
    prisma.tireTechnology.deleteMany({ where: { tireId } }),
    ...(technologyIds.length > 0
      ? [
          prisma.tireTechnology.createMany({
            data: technologyIds.map((technologyId) => ({ tireId, technologyId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}

async function resolveIndexRefIds(
  loadIndex: string | undefined,
  speedIndex: string | undefined,
  source: string | null
): Promise<{ loadIndexId?: number; speedIndexId?: number }> {
  const [loadIndexId, speedIndexId] = await Promise.all([
    loadIndex ? findOrCreateLoadIndex(loadIndex, source) : Promise.resolve(undefined),
    speedIndex
      ? findOrCreateSpeedIndex(speedIndex, source)
      : Promise.resolve(undefined),
  ]);

  return {
    ...(loadIndexId !== undefined ? { loadIndexId } : {}),
    ...(speedIndexId !== undefined ? { speedIndexId } : {}),
  };
}

export async function createPneu(
  data: Prisma.TireUncheckedCreateInput
): Promise<PneuRecord> {
  const refs = await resolveIndexRefIds(
    data.loadIndex,
    data.speedIndex,
    typeof data.source === "string" ? data.source : null
  );
  return prisma.tire.create({ data: { ...data, ...refs }, ...withRelations });
}

export async function updatePneu(
  id: number,
  data: Prisma.TireUncheckedUpdateInput
): Promise<PneuRecord> {
  const refs = await resolveIndexRefIds(
    typeof data.loadIndex === "string" ? data.loadIndex : undefined,
    typeof data.speedIndex === "string" ? data.speedIndex : undefined,
    typeof data.source === "string" ? data.source : null
  );
  return prisma.tire.update({
    where: { id },
    data: { ...data, ...refs },
    ...withRelations,
  });
}

export async function deletePneu(id: number): Promise<void> {
  await prisma.tire.delete({ where: { id } });
}

export async function findTireManufacturerById(
  id: number
): Promise<{ id: number } | null> {
  return prisma.tireManufacturer.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function listTireManufacturers(): Promise<
  { id: number; name: string }[]
> {
  return prisma.tireManufacturer.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
