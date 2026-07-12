import "server-only";
import { prisma } from "@/lib/prisma";
import type { HomologacaoListQuery } from "@/lib/validations/homologacao";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    vehicle: { include: { manufacturer: true } },
    tire: { include: { tireManufacturer: true } },
  },
} satisfies Prisma.HomologationDefaultArgs;

export type HomologacaoRecord = Prisma.HomologationGetPayload<
  typeof withRelations
>;

export async function listHomologacoes(
  query: HomologacaoListQuery
): Promise<{ data: HomologacaoRecord[]; total: number }> {
  const where: Prisma.HomologationWhereInput = {};

  if (query.q) {
    where.OR = [
      { code: { contains: query.q } },
      { version: { contains: query.q } },
      { vehicle: { model: { contains: query.q } } },
      { vehicle: { manufacturer: { name: { contains: query.q } } } },
      { tire: { model: { contains: query.q } } },
      { tire: { tireManufacturer: { name: { contains: query.q } } } },
    ];
  }

  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.tireId) where.tireId = query.tireId;
  if (query.code) where.code = query.code;
  if (query.runFlat) where.runFlat = query.runFlat === "true";
  if (query.xl) where.xl = query.xl === "true";

  const [data, total] = await Promise.all([
    prisma.homologation.findMany({
      where,
      ...withRelations,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.homologation.count({ where }),
  ]);

  return { data, total };
}

export async function findHomologacaoById(
  id: number
): Promise<HomologacaoRecord | null> {
  return prisma.homologation.findUnique({ where: { id }, ...withRelations });
}

export async function findHomologacaoByBusinessKey(
  vehicleId: number,
  tireId: number,
  code: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.homologation.findFirst({
    where: {
      vehicleId,
      tireId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function createHomologacao(
  data: Prisma.HomologationUncheckedCreateInput
): Promise<HomologacaoRecord> {
  return prisma.homologation.create({ data, ...withRelations });
}

export async function updateHomologacao(
  id: number,
  data: Prisma.HomologationUncheckedUpdateInput
): Promise<HomologacaoRecord> {
  return prisma.homologation.update({ where: { id }, data, ...withRelations });
}

export async function deleteHomologacao(id: number): Promise<void> {
  await prisma.homologation.delete({ where: { id } });
}

export async function findVehicleById(id: number) {
  return prisma.vehicle.findUnique({ where: { id } });
}

export async function findTireById(id: number) {
  return prisma.tire.findUnique({ where: { id } });
}

export async function listVehicleOptions() {
  return prisma.vehicle.findMany({
    select: {
      id: true,
      model: true,
      version: true,
      engine: true,
      yearStart: true,
      yearEnd: true,
      manufacturer: { select: { name: true } },
    },
    orderBy: [{ manufacturer: { name: "asc" } }, { model: "asc" }],
  });
}

export async function listTireOptions() {
  return prisma.tire.findMany({
    select: {
      id: true,
      brand: true,
      model: true,
      size: true,
      runFlat: true,
      xl: true,
      tireManufacturer: { select: { name: true } },
    },
    orderBy: [{ tireManufacturer: { name: "asc" } }, { model: "asc" }],
  });
}
