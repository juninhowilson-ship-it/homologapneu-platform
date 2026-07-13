import "server-only";
import { prisma } from "@/lib/prisma";
import type { FabricanteListQuery } from "@/lib/validations/fabricante";
import type { Prisma } from "@prisma/client";

const withTiresCount = {
  include: { _count: { select: { tires: true } } },
} satisfies Prisma.TireManufacturerDefaultArgs;

export type FabricanteRecord = Prisma.TireManufacturerGetPayload<
  typeof withTiresCount
>;

export async function listFabricantes(
  query: FabricanteListQuery
): Promise<{ data: FabricanteRecord[]; total: number }> {
  const where: Prisma.TireManufacturerWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { country: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  const [data, total] = await Promise.all([
    prisma.tireManufacturer.findMany({
      where,
      ...withTiresCount,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.tireManufacturer.count({ where }),
  ]);

  return { data, total };
}

export async function findFabricanteById(
  id: number
): Promise<FabricanteRecord | null> {
  return prisma.tireManufacturer.findUnique({
    where: { id },
    ...withTiresCount,
  });
}

export async function findFabricanteByName(
  name: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.tireManufacturer.findFirst({
    where: {
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function createFabricante(
  data: Prisma.TireManufacturerCreateInput
): Promise<FabricanteRecord> {
  return prisma.tireManufacturer.create({ data, ...withTiresCount });
}

export async function updateFabricante(
  id: number,
  data: Prisma.TireManufacturerUpdateInput
): Promise<FabricanteRecord> {
  return prisma.tireManufacturer.update({
    where: { id },
    data,
    ...withTiresCount,
  });
}

export async function deleteFabricante(id: number): Promise<void> {
  await prisma.tireManufacturer.delete({ where: { id } });
}
