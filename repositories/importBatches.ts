import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createImportBatch(
  data: Prisma.ImportBatchUncheckedCreateInput
) {
  return prisma.importBatch.create({ data });
}

export async function updateImportBatch(
  id: number,
  data: Prisma.ImportBatchUncheckedUpdateInput
) {
  return prisma.importBatch.update({ where: { id }, data });
}

export async function createImportErrors(
  errors: Prisma.ImportErrorUncheckedCreateInput[]
) {
  if (errors.length === 0) return;
  await prisma.importError.createMany({ data: errors });
}

export async function createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
  await prisma.auditLog.create({ data });
}

export async function listImportBatches() {
  return prisma.importBatch.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      _count: { select: { errors: true } },
    },
  });
}

export async function findImportBatchById(id: number) {
  return prisma.importBatch.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      errors: { orderBy: { rowNumber: "asc" } },
    },
  });
}

export async function findAuditLogsForBatch(importBatchId: number) {
  return prisma.auditLog.findMany({
    where: { importBatchId, action: "CREATE" },
  });
}

export async function deleteVehicleVersion(id: number) {
  await prisma.vehicleVersion.delete({ where: { id } });
}

export async function deleteTire(id: number) {
  await prisma.tire.delete({ where: { id } });
}

export async function deleteManufacturer(id: number) {
  await prisma.manufacturer.delete({ where: { id } });
}

export async function deleteTireManufacturer(id: number) {
  await prisma.tireManufacturer.delete({ where: { id } });
}

export async function deleteHomologationById(id: number) {
  await prisma.homologation.delete({ where: { id } });
}

export async function deleteVehicleModelById(id: number) {
  await prisma.vehicleModel.delete({ where: { id } });
}
