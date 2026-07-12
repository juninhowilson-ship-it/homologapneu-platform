import "server-only";
import { prisma } from "@/lib/prisma";
import type { HomologacaoListQuery } from "@/lib/validations/homologacao";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    vehicle: { include: { manufacturer: true } },
    tires: {
      include: { tire: { include: { tireManufacturer: true } } },
      orderBy: { role: "asc" },
    },
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
      { tires: { some: { tire: { model: { contains: query.q } } } } },
      {
        tires: {
          some: { tire: { tireManufacturer: { name: { contains: query.q } } } },
        },
      },
    ];
  }

  if (query.vehicleId) where.vehicleId = query.vehicleId;

  const tireCondition: Prisma.HomologationTireWhereInput = {};
  if (query.tireId) tireCondition.tireId = query.tireId;
  if (query.runFlat || query.xl) {
    tireCondition.tire = {
      ...(query.runFlat ? { runFlat: query.runFlat === "true" } : {}),
      ...(query.xl ? { xl: query.xl === "true" } : {}),
    };
  }
  if (Object.keys(tireCondition).length > 0) {
    where.tires = { some: tireCondition };
  }

  if (query.code) where.code = query.code;

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
  code: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.homologation.findFirst({
    where: {
      vehicleId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

type TireAssignment = { tireId: number; role: "ORIGINAL" | "OPCIONAL" };

type HomologacaoWriteData = {
  vehicleId: number;
  code: string;
  year: number;
  version: string;
  engine: string;
  notes: string | null;
  tires: TireAssignment[];
};

export async function createHomologacao(
  data: HomologacaoWriteData
): Promise<HomologacaoRecord> {
  return prisma.homologation.create({
    data: {
      vehicleId: data.vehicleId,
      code: data.code,
      year: data.year,
      version: data.version,
      engine: data.engine,
      notes: data.notes,
      tires: { create: data.tires },
    },
    ...withRelations,
  });
}

export async function updateHomologacao(
  id: number,
  data: HomologacaoWriteData
): Promise<HomologacaoRecord> {
  return prisma.homologation.update({
    where: { id },
    data: {
      vehicleId: data.vehicleId,
      code: data.code,
      year: data.year,
      version: data.version,
      engine: data.engine,
      notes: data.notes,
      tires: {
        deleteMany: {},
        create: data.tires,
      },
    },
    ...withRelations,
  });
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

export async function findTiresByIds(ids: number[]) {
  return prisma.tire.findMany({ where: { id: { in: ids } } });
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
