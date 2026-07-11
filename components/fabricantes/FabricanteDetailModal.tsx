"use client";

import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useFabricante } from "@/hooks/useFabricante";

type Props = {
  open: boolean;
  onClose: () => void;
  id: number | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function FabricanteDetailModal({ open, onClose, id }: Props) {
  const { data: fabricante, isLoading } = useFabricante(open ? id : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalhes do Fabricante"
      size="sm"
    >
      {isLoading || !fabricante ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
              {fabricante.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fabricante.logoUrl}
                  alt={fabricante.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Sem logo</span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold">{fabricante.name}</h3>
              <p className="text-muted-foreground">{fabricante.country}</p>
            </div>

            <Badge
              tone={fabricante.isActive ? "success" : "danger"}
              className="ml-auto"
            >
              {fabricante.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          {fabricante.website && (
            <p>
              <span className="text-muted-foreground">Site: </span>
              <a
                href={fabricante.website}
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                {fabricante.website}
              </a>
            </p>
          )}

          {fabricante.notes && (
            <p>
              <span className="mb-1 block text-muted-foreground">
                Observações:
              </span>
              {fabricante.notes}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Pneus cadastrados: {fabricante.tiresCount}
          </p>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <div>
              <span className="block">Criado em</span>
              <span className="text-foreground">
                {formatDate(fabricante.createdAt)}
              </span>
            </div>

            <div>
              <span className="block">Última atualização</span>
              <span className="text-foreground">
                {formatDate(fabricante.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
