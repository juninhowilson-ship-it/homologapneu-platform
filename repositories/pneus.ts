import "server-only";
import { prisma } from "@/lib/prisma";
import type { PneuListQuery } from "@/lib/validations/pneu";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    tireManufacturer: true,
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
      { brand: { contains: query.q } },
      { model: { contains: query.q } },
      { size: { contains: query.q } },
      { ean: { contains: query.q } },
      { tireManufacturer: { name: { contains: query.q } } },
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

export async function createPneu(
  data: Prisma.TireUncheckedCreateInput
): Promise<PneuRecord> {
  return prisma.tire.create({ data, ...withRelations });
}

export async function updatePneu(
  id: number,
  data: Prisma.TireUncheckedUpdateInput
): Promise<PneuRecord> {
  return prisma.tire.update({ where: { id }, data, ...withRelations });
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
