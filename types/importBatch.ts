export type ImportBatchStatus =
  | "PROCESSANDO"
  | "CONCLUIDO"
  | "CONCLUIDO_COM_ERROS"
  | "FALHOU"
  | "REVERTIDO";

export type ImportBatchResumo = {
  id: number;
  fileName: string;
  fileType: string;
  entity: string;
  status: ImportBatchStatus;
  userName: string | null;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  rolledBackAt: string | null;
};

export type ImportBatchErro = {
  id: number;
  rowNumber: number | null;
  message: string;
  rawData: string | null;
};

export type ImportBatchDetalhe = ImportBatchResumo & {
  erros: ImportBatchErro[];
};

export type RollbackResultado = {
  total: number;
  removidos: number;
  falhas: number;
};
