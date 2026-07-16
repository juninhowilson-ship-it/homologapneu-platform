import "server-only";
import {
  createImportBatch,
  updateImportBatch,
  createImportErrors,
  createAuditLog,
  listImportBatches as listImportBatchesRepo,
  findImportBatchById,
  findAuditLogsForBatch,
  deleteVehicleVersion,
  deleteTire,
  deleteManufacturer,
  deleteTireManufacturer,
  deleteHomologationById,
  deleteVehicleModelById,
} from "@/repositories/importBatches";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type { ChangeSet } from "@/lib/importer/diff";
import type { Prisma } from "@prisma/client";

type ImportFileType = Prisma.ImportBatchUncheckedCreateInput["fileType"];
type ImportEntity = Prisma.ImportBatchUncheckedCreateInput["entity"];

export type AuditableEntity =
  | "Manufacturer"
  | "TireManufacturer"
  | "VehicleModel"
  | "VehicleVersion"
  | "Tire"
  | "Homologation"
  | "Wheel"
  | "VehiclePressureSpec";

export async function iniciarLote(params: {
  fileName: string;
  fileType: ImportFileType;
  entity: ImportEntity;
  userId: number | null;
  sourceVersion?: string;
  collectedAt?: Date;
  sourceUrl?: string;
  importHash?: string;
}) {
  return createImportBatch({
    fileName: params.fileName,
    fileType: params.fileType,
    entity: params.entity,
    userId: params.userId,
    sourceVersion: params.sourceVersion ?? null,
    collectedAt: params.collectedAt ?? null,
    sourceUrl: params.sourceUrl ?? null,
    importHash: params.importHash ?? null,
    status: "PROCESSANDO",
  });
}

export async function registrarCriacao(
  entity: AuditableEntity,
  entityId: number,
  importBatchId: number,
  userId: number | null
) {
  await createAuditLog({
    entity,
    entityId,
    action: "CREATE",
    importBatchId,
    userId,
  });
}

export async function registrarAtualizacao(
  entity: AuditableEntity,
  entityId: number,
  importBatchId: number,
  userId: number | null,
  changes: ChangeSet | null
) {
  await createAuditLog({
    entity,
    entityId,
    action: "UPDATE",
    importBatchId,
    userId,
    changes: changes ? JSON.stringify(changes) : null,
  });
}

/**
 * Auditoria genérica para uso fora do pipeline de importação (CRUD manual
 * via UI/API). importBatchId fica nulo nesses casos.
 */
export async function registrarAlteracaoManual(params: {
  entity: AuditableEntity;
  entityId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  userId: number | null;
  changes?: ChangeSet | null;
}) {
  await createAuditLog({
    entity: params.entity,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId,
    changes: params.changes ? JSON.stringify(params.changes) : null,
  });
}

export async function finalizarLote(
  id: number,
  params: {
    totalRows: number;
    importedCount: number;
    updatedCount: number;
    duplicateCount: number;
    errorCount: number;
    durationMs: number;
    erros: { rowNumber: number | null; message: string; rawData: string | null }[];
  }
) {
  const status =
    params.errorCount === 0
      ? "CONCLUIDO"
      : params.importedCount + params.updatedCount > 0
        ? "CONCLUIDO_COM_ERROS"
        : "FALHOU";

  await createImportErrors(
    params.erros.map((erro) => ({ ...erro, importBatchId: id }))
  );

  await updateImportBatch(id, {
    totalRows: params.totalRows,
    importedCount: params.importedCount,
    updatedCount: params.updatedCount,
    duplicateCount: params.duplicateCount,
    errorCount: params.errorCount,
    status,
    finishedAt: new Date(),
    durationMs: params.durationMs,
  });
}

export async function listarLotes() {
  const lotes = await listImportBatchesRepo();
  return lotes.map((lote) => ({
    id: lote.id,
    fileName: lote.fileName,
    fileType: lote.fileType,
    entity: lote.entity,
    status: lote.status,
    userName: lote.user?.name ?? null,
    totalRows: lote.totalRows,
    importedCount: lote.importedCount,
    updatedCount: lote.updatedCount,
    duplicateCount: lote.duplicateCount,
    errorCount: lote.errorCount,
    sourceVersion: lote.sourceVersion,
    collectedAt: lote.collectedAt ? lote.collectedAt.toISOString() : null,
    sourceUrl: lote.sourceUrl,
    importHash: lote.importHash,
    startedAt: lote.startedAt.toISOString(),
    finishedAt: lote.finishedAt ? lote.finishedAt.toISOString() : null,
    durationMs: lote.durationMs,
    rolledBackAt: lote.rolledBackAt ? lote.rolledBackAt.toISOString() : null,
  }));
}

export async function obterLote(id: number) {
  const lote = await findImportBatchById(id);
  if (!lote) {
    throw new NotFoundError("Lote de importação não encontrado");
  }

  return {
    id: lote.id,
    fileName: lote.fileName,
    fileType: lote.fileType,
    entity: lote.entity,
    status: lote.status,
    userName: lote.user?.name ?? null,
    totalRows: lote.totalRows,
    importedCount: lote.importedCount,
    updatedCount: lote.updatedCount,
    duplicateCount: lote.duplicateCount,
    errorCount: lote.errorCount,
    sourceVersion: lote.sourceVersion,
    collectedAt: lote.collectedAt ? lote.collectedAt.toISOString() : null,
    sourceUrl: lote.sourceUrl,
    importHash: lote.importHash,
    startedAt: lote.startedAt.toISOString(),
    finishedAt: lote.finishedAt ? lote.finishedAt.toISOString() : null,
    durationMs: lote.durationMs,
    rolledBackAt: lote.rolledBackAt ? lote.rolledBackAt.toISOString() : null,
    erros: lote.errors.map((erro) => ({
      id: erro.id,
      rowNumber: erro.rowNumber,
      message: erro.message,
      rawData: erro.rawData,
    })),
  };
}

const DELETE_BY_ENTITY: Record<string, (id: number) => Promise<void>> = {
  VehicleVersion: deleteVehicleVersion,
  VehicleModel: deleteVehicleModelById,
  Tire: deleteTire,
  Manufacturer: deleteManufacturer,
  TireManufacturer: deleteTireManufacturer,
  Homologation: deleteHomologationById,
};

export async function reverterLote(id: number) {
  const lote = await findImportBatchById(id);
  if (!lote) {
    throw new NotFoundError("Lote de importação não encontrado");
  }
  if (lote.rolledBackAt) {
    throw new ConflictError("Este lote já foi revertido anteriormente");
  }

  const criacoes = await findAuditLogsForBatch(id);

  let removidos = 0;
  let falhas = 0;

  for (const log of criacoes) {
    const deleteFn = DELETE_BY_ENTITY[log.entity];
    if (!deleteFn) {
      falhas++;
      continue;
    }
    try {
      await deleteFn(log.entityId);
      removidos++;
    } catch {
      falhas++;
    }
  }

  await updateImportBatch(id, {
    status: "REVERTIDO",
    rolledBackAt: new Date(),
  });

  await createAuditLog({
    entity: "ImportBatch",
    entityId: id,
    action: "ROLLBACK",
    importBatchId: id,
  });

  return { total: criacoes.length, removidos, falhas };
}
