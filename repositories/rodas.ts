import "server-only";
import { prisma } from "@/lib/prisma";
import type { RodaListQuery } from "@/lib/validations/roda";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    _count: { select: { homologationWheels: true } },
  },
} satisfies Prisma.WheelDefaultArgs;

export type RodaRecord = Prisma.WheelGetPayload<typeof withRelations>;

export async function listRodas(
  query: RodaListQuery
): Promise<{ data: RodaRecord[]; total: number }> {
  const where: Prisma.WheelWhereInput = {};

  if (query.q) {
    where.boltPattern = { contains: query.q, mode: "insensitive" };
  }
  if (query.diameter) where.diameter = query.diameter;
  if (query.boltPattern) where.boltPattern = query.boltPattern;

  const [data, total] = await Promise.all([
    prisma.wheel.findMany({
      where,
      ...withRelations,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.wheel.count({ where }),
  ]);

  return { data, total };
}

export async function findRodaById(id: number): Promise<RodaRecord | null> {
  return prisma.wheel.findUnique({ where: { id }, ...withRelations });
}

export async function findRodaByBusinessKey(
  width: number,
  diameter: number,
  offset: number | null,
  boltPattern: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.wheel.findFirst({
    where: {
      width,
      diameter,
      offset,
      boltPattern,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findRodasByIds(ids: number[]) {
  return prisma.wheel.findMany({ where: { id: { in: ids } } });
}

export async function createRoda(
  data: Prisma.WheelUncheckedCreateInput
): Promise<RodaRecord> {
  return prisma.wheel.create({ data, ...withRelations });
}

export async function updateRoda(
  id: number,
  data: Prisma.WheelUncheckedUpdateInput
): Promise<RodaRecord> {
  return prisma.wheel.update({ where: { id }, data, ...withRelations });
}

export async function deleteRoda(id: number): Promise<void> {
  await prisma.wheel.delete({ where: { id } });
}
