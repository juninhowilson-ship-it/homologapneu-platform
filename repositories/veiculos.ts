import "server-only";
import { prisma } from "@/lib/prisma";
import type { VeiculoListQuery } from "@/lib/validations/veiculo";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    manufacturer: true,
    _count: { select: { homologations: true } },
  },
} satisfies Prisma.VehicleDefaultArgs;

export type VeiculoRecord = Prisma.VehicleGetPayload<typeof withRelations>;

export async function listVeiculos(
  query: VeiculoListQuery
): Promise<{ data: VeiculoRecord[]; total: number }> {
  const where: Prisma.VehicleWhereInput = {};

  if (query.q) {
    where.OR = [
      { model: { contains: query.q } },
      { version: { contains: query.q } },
      { engine: { contains: query.q } },
      { manufacturer: { name: { contains: query.q } } },
    ];
  }

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  if (query.manufacturerId) where.manufacturerId = query.manufacturerId;
  if (query.fuel) where.fuel = query.fuel;
  if (query.category) where.category = query.category;
  if (query.segment) where.segment = query.segment;

  const [data, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      ...withRelations,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { data, total };
}

export async function findVeiculoById(
  id: number
): Promise<VeiculoRecord | null> {
  return prisma.vehicle.findUnique({ where: { id }, ...withRelations });
}

export async function findVeiculoByBusinessKey(
  manufacturerId: number,
  model: string,
  version: string,
  engine: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.vehicle.findFirst({
    where: {
      manufacturerId,
      model,
      version,
      engine,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function createVeiculo(
  data: Prisma.VehicleUncheckedCreateInput
): Promise<VeiculoRecord> {
  return prisma.vehicle.create({ data, ...withRelations });
}

export async function updateVeiculo(
  id: number,
  data: Prisma.VehicleUncheckedUpdateInput
): Promise<VeiculoRecord> {
  return prisma.vehicle.update({ where: { id }, data, ...withRelations });
}

export async function deleteVeiculo(id: number): Promise<void> {
  await prisma.vehicle.delete({ where: { id } });
}

export async function listManufacturers(): Promise<
  { id: number; name: string }[]
> {
  return prisma.manufacturer.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function findManufacturerById(
  id: number
): Promise<{ id: number } | null> {
  return prisma.manufacturer.findUnique({ where: { id }, select: { id: true } });
}
