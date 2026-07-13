"use client";

import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { usePneu } from "@/hooks/usePneu";
import { TIRE_CATEGORY_LABELS, TIRE_SEGMENT_LABELS, TIRE_TYPE_LABELS } from "@/lib/constants/pneu";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";

type Props = {
  open: boolean;
  onClose: () => void;
  id: number | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function PneuDetailModal({ open, onClose, id }: Props) {
  const { data: pneu, isLoading } = usePneu(open ? id : null);

  return (
    <Dialog open={open} onClose={onClose} title="Detalhes do Pneu" size="md">
      {isLoading || !pneu ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
              {pneu.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pneu.imageUrl}
                  alt={`${pneu.tireManufacturerName} ${pneu.model}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Sem imagem</span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold">
                {pneu.tireManufacturerName} {pneu.model}
              </h3>
              <p className="text-muted-foreground">
                {pneu.brand} • {pneu.size}
              </p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-2">
              <Badge tone={pneu.isActive ? "success" : "danger"}>
                {pneu.isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Badge tone={VALIDATION_STATUS_TONE[pneu.validationStatus]}>
                {VALIDATION_STATUS_LABELS[pneu.validationStatus]}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Índice de Carga</p>
              <p className="font-semibold">{pneu.loadIndex}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Índice de Velocidade</p>
              <p className="font-semibold">{pneu.speedIndex}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Categoria</p>
              <p className="font-semibold">
                {TIRE_CATEGORY_LABELS[pneu.category]}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Segmento</p>
              <p className="font-semibold">
                {pneu.segment ? TIRE_SEGMENT_LABELS[pneu.segment] : "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Run Flat</p>
              <p className="font-semibold">{pneu.runFlat ? "Sim" : "Não"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">XL</p>
              <p className="font-semibold">{pneu.xl ? "Sim" : "Não"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Seal</p>
              <p className="font-semibold">{pneu.seal ? "Sim" : "Não"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Tubeless</p>
              <p className="font-semibold">{pneu.tubeless ? "Sim" : "Não"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">EAN</p>
              <p className="font-semibold">{pneu.ean ?? "—"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Família</p>
              <p className="font-semibold">{pneu.family ?? "—"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-semibold">{TIRE_TYPE_LABELS[pneu.type]}</p>
            </div>
          </div>

          {pneu.description && (
            <p>
              <span className="mb-1 block text-muted-foreground">
                Descrição:
              </span>
              {pneu.description}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Homologações associadas: {pneu.homologationsCount}
          </p>

          {pneu.source && (
            <p className="text-sm text-muted-foreground">
              Fonte: {pneu.source}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <div>
              <span className="block">Criado em</span>
              <span className="text-foreground">
                {formatDate(pneu.createdAt)}
              </span>
            </div>

            <div>
              <span className="block">Última atualização</span>
              <span className="text-foreground">
                {formatDate(pneu.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
