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
} from "@/repositories/importBatches";
import { NotFoundError, ConflictError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

type ImportFileType = Prisma.ImportBatchUncheckedCreateInput["fileType"];
type ImportEntity = Prisma.ImportBatchUncheckedCreateInput["entity"];

export async function iniciarLote(params: {
  fileName: string;
  fileType: ImportFileType;
  entity: ImportEntity;
  userId: number | null;
}) {
  return createImportBatch({
    fileName: params.fileName,
    fileType: params.fileType,
    entity: params.entity,
    userId: params.userId,
    status: "PROCESSANDO",
  });
}

export async function registrarCriacao(
  entity: "VehicleVersion" | "Tire",
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

export async function finalizarLote(
  id: number,
  params: {
    totalRows: number;
    importedCount: number;
    duplicateCount: number;
    errorCount: number;
    durationMs: number;
    erros: { rowNumber: number | null; message: string; rawData: string | null }[];
  }
) {
  const status =
    params.errorCount === 0
      ? "CONCLUIDO"
      : params.importedCount > 0
        ? "CONCLUIDO_COM_ERROS"
        : "FALHOU";

  await createImportErrors(
    params.erros.map((erro) => ({ ...erro, importBatchId: id }))
  );

  await updateImportBatch(id, {
    totalRows: params.totalRows,
    importedCount: params.importedCount,
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
    duplicateCount: lote.duplicateCount,
    errorCount: lote.errorCount,
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
    duplicateCount: lote.duplicateCount,
    errorCount: lote.errorCount,
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
  Tire: deleteTire,
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
