import "server-only";
import { prisma } from "@/lib/prisma";
import type { VeiculoListQuery } from "@/lib/validations/veiculo";
import type { Prisma } from "@prisma/client";

const withRelations = {
  include: {
    vehicleModel: { include: { manufacturer: true } },
    engine: true,
    transmission: true,
    generation: true,
    platform: true,
    images: true,
    documents: true,
    _count: { select: { homologations: true } },
  },
} satisfies Prisma.VehicleVersionDefaultArgs;

export type VeiculoRecord = Prisma.VehicleVersionGetPayload<typeof withRelations>;

function buildOrderBy(
  sortBy: VeiculoListQuery["sortBy"],
  sortDir: VeiculoListQuery["sortDir"]
): Prisma.VehicleVersionOrderByWithRelationInput {
  switch (sortBy) {
    case "model":
      return { vehicleModel: { name: sortDir } };
    case "version":
      return { name: sortDir };
    default:
      return { [sortBy]: sortDir };
  }
}

export async function listVeiculos(
  query: VeiculoListQuery
): Promise<{ data: VeiculoRecord[]; total: number }> {
  const where: Prisma.VehicleVersionWhereInput = {};

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { vehicleModel: { name: { contains: query.q, mode: "insensitive" } } },
      { engine: { name: { contains: query.q, mode: "insensitive" } } },
      {
        vehicleModel: {
          manufacturer: { name: { contains: query.q, mode: "insensitive" } },
        },
      },
    ];
  }

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  if (query.manufacturerId) {
    where.vehicleModel = { manufacturerId: query.manufacturerId };
  }
  if (query.fuel) where.engine = { fuel: query.fuel };
  if (query.category) where.category = query.category;
  if (query.segment) where.segment = query.segment;

  const [data, total] = await Promise.all([
    prisma.vehicleVersion.findMany({
      where,
      ...withRelations,
      orderBy: buildOrderBy(query.sortBy, query.sortDir),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.vehicleVersion.count({ where }),
  ]);

  return { data, total };
}

export async function findVeiculoById(
  id: number
): Promise<VeiculoRecord | null> {
  return prisma.vehicleVersion.findUnique({ where: { id }, ...withRelations });
}

export async function findVeiculoByBusinessKey(
  manufacturerId: number,
  model: string,
  version: string,
  engine: string,
  fuel: Prisma.EngineUncheckedCreateInput["fuel"],
  power: string | null,
  excludeId?: number
): Promise<{ id: number } | null> {
  return prisma.vehicleVersion.findFirst({
    where: {
      vehicleModel: { manufacturerId, name: model },
      name: version,
      engine: { name: engine, fuel, power },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function findOrCreateVehicleModel(
  manufacturerId: number,
  name: string
): Promise<number> {
  const existing = await prisma.vehicleModel.findFirst({
    where: { manufacturerId, name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.vehicleModel.create({
    data: { manufacturerId, name },
    select: { id: true },
  });
  return created.id;
}

export async function findOrCreateEngine(
  name: string,
  fuel: Prisma.EngineUncheckedCreateInput["fuel"],
  power: string | null,
  torque?: string | null
): Promise<number> {
  const existing = await prisma.engine.findFirst({
    where: { name, fuel, power },
    select: { id: true },
  });
  if (existing) {
    if (torque) {
      await prisma.engine.update({
        where: { id: existing.id },
        data: { torque },
      });
    }
    return existing.id;
  }

  const created = await prisma.engine.create({
    data: {
      name,
      fuel,
      power,
      torque: torque ?? null,
      turbo: /turbo|tsi|tfsi/i.test(name),
    },
    select: { id: true },
  });
  return created.id;
}

export async function findOrCreatePlatform(name: string): Promise<number> {
  const existing = await prisma.platform.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.platform.create({
    data: { name },
    select: { id: true },
  });
  return created.id;
}

type VeiculoWriteData = {
  manufacturerId: number;
  model: string;
  version: string;
  yearStart: number;
  yearEnd: number;
  manufactureYearStart?: number | null;
  manufactureYearEnd?: number | null;
  engine: string;
  power: string | null;
  torque?: string | null;
  fuel: Prisma.EngineUncheckedCreateInput["fuel"];
  category: Prisma.VehicleVersionUncheckedCreateInput["category"];
  regulatoryCategory?: string | null;
  segment: Prisma.VehicleVersionUncheckedCreateInput["segment"];
  internalCode?: string | null;
  platformName?: string | null;
  drivetrain?: Prisma.VehicleVersionUncheckedCreateInput["drivetrain"];
  doors?: number | null;
  country: string | null;
  imageUrl: string | null;
  notes: string | null;
  isActive: boolean;
  validationStatus: Prisma.VehicleVersionUncheckedCreateInput["validationStatus"];
  source: string | null;
  validatedBy: string | null;
  validatedAt: Date | null;
};

async function upsertPrincipalImage(
  vehicleVersionId: number,
  imageUrl: string | null
) {
  if (imageUrl) {
    await prisma.vehicleImage.upsert({
      where: { vehicleVersionId_type: { vehicleVersionId, type: "PRINCIPAL" } },
      update: { url: imageUrl },
      create: { vehicleVersionId, type: "PRINCIPAL", url: imageUrl },
    });
  } else {
    await prisma.vehicleImage.deleteMany({
      where: { vehicleVersionId, type: "PRINCIPAL" },
    });
  }
}

export async function createVeiculo(
  data: VeiculoWriteData
): Promise<VeiculoRecord> {
  const vehicleModelId = await findOrCreateVehicleModel(
    data.manufacturerId,
    data.model
  );
  const engineId = await findOrCreateEngine(
    data.engine,
    data.fuel,
    data.power,
    data.torque
  );
  const platformId = data.platformName
    ? await findOrCreatePlatform(data.platformName)
    : undefined;

  const record = await prisma.vehicleVersion.create({
    data: {
      vehicleModelId,
      engineId,
      platformId,
      name: data.version,
      internalCode: data.internalCode ?? null,
      yearStart: data.yearStart,
      yearEnd: data.yearEnd,
      manufactureYearStart: data.manufactureYearStart ?? null,
      manufactureYearEnd: data.manufactureYearEnd ?? null,
      category: data.category,
      regulatoryCategory: data.regulatoryCategory ?? null,
      segment: data.segment,
      drivetrain: data.drivetrain,
      doors: data.doors ?? null,
      country: data.country,
      notes: data.notes,
      isActive: data.isActive,
      validationStatus: data.validationStatus,
      source: data.source,
      validatedBy: data.validatedBy,
      validatedAt: data.validatedAt,
    },
    ...withRelations,
  });

  await upsertPrincipalImage(record.id, data.imageUrl);
  return findVeiculoById(record.id) as Promise<VeiculoRecord>;
}

export async function updateVeiculo(
  id: number,
  data: VeiculoWriteData
): Promise<VeiculoRecord> {
  const vehicleModelId = await findOrCreateVehicleModel(
    data.manufacturerId,
    data.model
  );
  const engineId = await findOrCreateEngine(
    data.engine,
    data.fuel,
    data.power,
    data.torque
  );
  const platformId = data.platformName
    ? await findOrCreatePlatform(data.platformName)
    : undefined;

  await prisma.vehicleVersion.update({
    where: { id },
    data: {
      vehicleModelId,
      engineId,
      platformId,
      name: data.version,
      internalCode: data.internalCode ?? null,
      yearStart: data.yearStart,
      yearEnd: data.yearEnd,
      manufactureYearStart: data.manufactureYearStart ?? null,
      manufactureYearEnd: data.manufactureYearEnd ?? null,
      category: data.category,
      regulatoryCategory: data.regulatoryCategory ?? null,
      segment: data.segment,
      drivetrain: data.drivetrain,
      doors: data.doors ?? null,
      country: data.country,
      notes: data.notes,
      isActive: data.isActive,
      validationStatus: data.validationStatus,
      source: data.source,
      validatedBy: data.validatedBy,
      validatedAt: data.validatedAt,
    },
    ...withRelations,
  });

  await upsertPrincipalImage(id, data.imageUrl);
  return findVeiculoById(id) as Promise<VeiculoRecord>;
}

export async function deleteVeiculo(id: number): Promise<void> {
  await prisma.vehicleVersion.delete({ where: { id } });
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

/**
 * Documentos oficiais do veiculo (manual, catalogo). Estrutura pronta para
 * uso futuro por conectores/importadores que informem URLs de documentos —
 * nenhuma fonte atual fornece isso, entao nao ha nenhum fluxo chamando
 * esta funcao ainda.
 */
export async function createVehicleDocument(data: {
  vehicleVersionId: number;
  name: string;
  url: string;
  type?: string | null;
}): Promise<void> {
  await prisma.vehicleDocument.create({ data });
}
