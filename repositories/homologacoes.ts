import "server-only";
import { prisma } from "@/lib/prisma";
import type { HomologacaoListQuery } from "@/lib/validations/homologacao";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    vehicleVersion: {
      include: { vehicleModel: { include: { manufacturer: true } }, engine: true },
    },
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
      { code: { contains: query.q, mode: "insensitive" } },
      { vehicleVersion: { name: { contains: query.q, mode: "insensitive" } } },
      {
        vehicleVersion: {
          vehicleModel: { name: { contains: query.q, mode: "insensitive" } },
        },
      },
      {
        vehicleVersion: {
          vehicleModel: {
            manufacturer: { name: { contains: query.q, mode: "insensitive" } },
          },
        },
      },
      {
        tires: {
          some: { tire: { model: { contains: query.q, mode: "insensitive" } } },
        },
      },
      {
        tires: {
          some: {
            tire: {
              tireManufacturer: {
                name: { contains: query.q, mode: "insensitive" },
              },
            },
          },
        },
      },
    ];
  }

  if (query.vehicleId) where.vehicleVersionId = query.vehicleId;

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
  vehicleVersionId: number,
  code: string,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.homologation.findFirst({
    where: {
      vehicleVersionId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

type TireAssignment = { tireId: number; role: "ORIGINAL" | "OPCIONAL" };

type HomologacaoWriteData = {
  vehicleVersionId: number;
  code: string;
  year: number;
  manufactureYear: number | null;
  notes: string | null;
  validationStatus: Prisma.HomologationUncheckedCreateInput["validationStatus"];
  source: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  tires: TireAssignment[];
};

export async function createHomologacao(
  data: HomologacaoWriteData
): Promise<HomologacaoRecord> {
  return prisma.homologation.create({
    data: {
      vehicleVersionId: data.vehicleVersionId,
      code: data.code,
      year: data.year,
      manufactureYear: data.manufactureYear,
      notes: data.notes,
      validationStatus: data.validationStatus,
      source: data.source,
      validatedBy: data.validatedBy,
      validatedAt: data.validatedAt,
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
      vehicleVersionId: data.vehicleVersionId,
      code: data.code,
      year: data.year,
      manufactureYear: data.manufactureYear,
      notes: data.notes,
      validationStatus: data.validationStatus,
      source: data.source,
      validatedBy: data.validatedBy,
      validatedAt: data.validatedAt,
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

export async function findVehicleVersionById(id: number) {
  return prisma.vehicleVersion.findUnique({ where: { id } });
}

export async function findVehicleVersionByNaturalKey(
  manufacturerName: string,
  modelName: string,
  versionName: string
): Promise<{ id: number } | null> {
  return prisma.vehicleVersion.findFirst({
    where: {
      name: { equals: versionName, mode: "insensitive" },
      vehicleModel: {
        name: { equals: modelName, mode: "insensitive" },
        manufacturer: { name: { equals: manufacturerName, mode: "insensitive" } },
      },
    },
    select: { id: true },
  });
}

export async function findTireById(id: number) {
  return prisma.tire.findUnique({ where: { id } });
}

export async function findTireByNaturalKey(
  manufacturerName: string,
  model: string,
  size: string
): Promise<{ id: number } | null> {
  return prisma.tire.findFirst({
    where: {
      model: { equals: model, mode: "insensitive" },
      size: { equals: size, mode: "insensitive" },
      tireManufacturer: {
        name: { equals: manufacturerName, mode: "insensitive" },
      },
    },
    select: { id: true },
  });
}

export async function findTiresByIds(ids: number[]) {
  return prisma.tire.findMany({ where: { id: { in: ids } } });
}

export async function listVehicleOptions() {
  const versions = await prisma.vehicleVersion.findMany({
    select: {
      id: true,
      name: true,
      yearStart: true,
      yearEnd: true,
      engine: { select: { name: true } },
      vehicleModel: {
        select: { name: true, manufacturer: { select: { name: true } } },
      },
    },
    orderBy: [
      { vehicleModel: { manufacturer: { name: "asc" } } },
      { vehicleModel: { name: "asc" } },
    ],
  });

  return versions.map((v) => ({
    id: v.id,
    model: v.vehicleModel.name,
    version: v.name,
    engine: v.engine.name,
    yearStart: v.yearStart,
    yearEnd: v.yearEnd,
    manufacturer: { name: v.vehicleModel.manufacturer.name },
  }));
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
