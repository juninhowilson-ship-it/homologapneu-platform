"use client";

import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useHomologacao } from "@/hooks/useHomologacao";

type Props = {
  open: boolean;
  onClose: () => void;
  id: number | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function HomologacaoDetailModal({ open, onClose, id }: Props) {
  const { data: homologacao, isLoading } = useHomologacao(open ? id : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalhes da Homologação"
      size="md"
    >
      {isLoading || !homologacao ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge tone="warning">{homologacao.code}</Badge>
            <h3 className="text-lg font-bold">{homologacao.vehicleLabel}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Montadora</p>
              <p className="font-semibold">{homologacao.manufacturerName}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Ano</p>
              <p className="font-semibold">{homologacao.year}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Versão</p>
              <p className="font-semibold">{homologacao.version}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Motor</p>
              <p className="font-semibold">{homologacao.engine}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Pneu</p>
              <p className="font-semibold">{homologacao.tireLabel}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Fabricante do Pneu</p>
              <p className="font-semibold">
                {homologacao.tireManufacturerName}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Medida Original</p>
              <p className="font-semibold">{homologacao.originalSize}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Medida Opcional</p>
              <p className="font-semibold">
                {homologacao.optionalSize ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Run Flat</p>
              <p className="font-semibold">
                {homologacao.runFlat ? "Sim" : "Não"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">XL</p>
              <p className="font-semibold">{homologacao.xl ? "Sim" : "Não"}</p>
            </div>
          </div>

          {homologacao.notes && (
            <p>
              <span className="mb-1 block text-muted-foreground">
                Observações:
              </span>
              {homologacao.notes}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <div>
              <span className="block">Criado em</span>
              <span className="text-foreground">
                {formatDate(homologacao.createdAt)}
              </span>
            </div>

            <div>
              <span className="block">Última atualização</span>
              <span className="text-foreground">
                {formatDate(homologacao.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
