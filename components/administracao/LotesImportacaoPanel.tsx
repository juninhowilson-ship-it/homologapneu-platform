"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import { useImportBatches, useImportBatch } from "@/hooks/useImportBatches";
import { useReverterLote } from "@/hooks/useImportBatchMutations";
import type { ImportBatchResumo, ImportBatchStatus } from "@/types/importBatch";

const STATUS_LABEL: Record<ImportBatchStatus, string> = {
  PROCESSANDO: "Processando",
  CONCLUIDO: "Concluído",
  CONCLUIDO_COM_ERROS: "Concluído com erros",
  FALHOU: "Falhou",
  REVERTIDO: "Revertido",
};

const STATUS_TONE: Record<
  ImportBatchStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  PROCESSANDO: "neutral",
  CONCLUIDO: "success",
  CONCLUIDO_COM_ERROS: "warning",
  FALHOU: "danger",
  REVERTIDO: "neutral",
};

const ENTITY_LABEL: Record<string, string> = {
  MONTADORAS: "Montadoras",
  VEICULOS: "Veículos",
  PNEUS: "Pneus",
  HOMOLOGACOES: "Homologações",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function ErrosLoteDialog({
  loteId,
  onClose,
}: {
  loteId: number | null;
  onClose: () => void;
}) {
  const { data: lote, isLoading } = useImportBatch(loteId);

  return (
    <Dialog
      open={loteId !== null}
      onClose={onClose}
      title="Erros do lote de importação"
      size="lg"
    >
      {isLoading || !lote ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : lote.erros.length === 0 ? (
        <p className="text-muted-foreground">
          Este lote não registrou erros.
        </p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {lote.erros.map((erro) => (
            <div
              key={erro.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                {erro.rowNumber !== null && (
                  <Badge tone="danger">Linha {erro.rowNumber}</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{erro.message}</p>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

export default function LotesImportacaoPanel() {
  const { data: lotes, isLoading } = useImportBatches();
  const reverter = useReverterLote();
  const [errosLoteId, setErrosLoteId] = useState<number | null>(null);
  const [rollbackTarget, setRollbackTarget] =
    useState<ImportBatchResumo | null>(null);

  function handleConfirmRollback() {
    if (!rollbackTarget) return;
    reverter.mutate(rollbackTarget.id, {
      onSuccess: () => setRollbackTarget(null),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!lotes || lotes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma importação registrada"
        description="Os lotes de importação de Veículos e Pneus aparecerão aqui assim que forem executados."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableTh>Arquivo</TableTh>
            <TableTh>Entidade</TableTh>
            <TableTh>Status</TableTh>
            <TableTh>Usuário</TableTh>
            <TableTh>Total</TableTh>
            <TableTh>Importados</TableTh>
            <TableTh>Duplicados</TableTh>
            <TableTh>Erros</TableTh>
            <TableTh>Iniciado em</TableTh>
            <TableTh>Duração</TableTh>
            <TableTh>Ações</TableTh>
          </tr>
        </TableHead>

        <TableBody>
          {lotes.map((lote) => (
            <TableRow key={lote.id}>
              <TableTd className="font-semibold">{lote.fileName}</TableTd>
              <TableTd>{ENTITY_LABEL[lote.entity] ?? lote.entity}</TableTd>
              <TableTd>
                <Badge tone={STATUS_TONE[lote.status]}>
                  {STATUS_LABEL[lote.status]}
                </Badge>
              </TableTd>
              <TableTd>{lote.userName ?? "—"}</TableTd>
              <TableTd>{lote.totalRows}</TableTd>
              <TableTd>{lote.importedCount}</TableTd>
              <TableTd>{lote.duplicateCount}</TableTd>
              <TableTd>{lote.errorCount}</TableTd>
              <TableTd>{formatDateTime(lote.startedAt)}</TableTd>
              <TableTd>{formatDuration(lote.durationMs)}</TableTd>
              <TableTd>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={lote.errorCount === 0}
                    onClick={() => setErrosLoteId(lote.id)}
                  >
                    Ver erros
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={
                      lote.rolledBackAt !== null || lote.importedCount === 0
                    }
                    onClick={() => setRollbackTarget(lote)}
                  >
                    Reverter
                  </Button>
                </div>
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ErrosLoteDialog
        loteId={errosLoteId}
        onClose={() => setErrosLoteId(null)}
      />

      <Dialog
        open={rollbackTarget !== null}
        onClose={() => setRollbackTarget(null)}
        title="Reverter lote de importação"
        size="sm"
      >
        <p className="text-muted-foreground">
          {rollbackTarget && (
            <>
              Tem certeza que deseja reverter o lote &quot;
              {rollbackTarget.fileName}&quot;? Os {rollbackTarget.importedCount}{" "}
              registro(s) importado(s) por este lote serão excluídos. Esta
              ação não pode ser desfeita.
            </>
          )}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRollbackTarget(null)}
            disabled={reverter.isPending}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmRollback}
            disabled={reverter.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {reverter.isPending ? "Revertendo..." : "Reverter lote"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
