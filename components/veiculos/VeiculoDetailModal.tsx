"use client";

import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useVeiculo } from "@/hooks/useVeiculo";
import {
  FUEL_LABELS,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";

type Props = {
  open: boolean;
  onClose: () => void;
  id: number | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

export default function VeiculoDetailModal({ open, onClose, id }: Props) {
  const { data: veiculo, isLoading } = useVeiculo(open ? id : null);

  return (
    <Dialog open={open} onClose={onClose} title="Detalhes do Veículo" size="md">
      {isLoading || !veiculo ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
              {veiculo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={veiculo.imageUrl}
                  alt={`${veiculo.manufacturerName} ${veiculo.model}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sem imagem
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold">
                {veiculo.manufacturerName} {veiculo.model}
              </h3>
              <p className="text-muted-foreground">
                {veiculo.version} •{" "}
                {formatarFaixaAno(veiculo.yearStart, veiculo.yearEnd)}
              </p>
            </div>

            <Badge
              tone={veiculo.isActive ? "success" : "danger"}
              className="ml-auto"
            >
              {veiculo.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Motorização</p>
              <p className="font-semibold">{veiculo.engine}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Potência</p>
              <p className="font-semibold">{veiculo.power ?? "—"}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Combustível</p>
              <p className="font-semibold">{FUEL_LABELS[veiculo.fuel]}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Categoria</p>
              <p className="font-semibold">
                {CATEGORY_LABELS[veiculo.category]}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Segmento</p>
              <p className="font-semibold">
                {veiculo.segment ? SEGMENT_LABELS[veiculo.segment] : "—"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">País</p>
              <p className="font-semibold">{veiculo.country ?? "—"}</p>
            </div>
          </div>

          {veiculo.notes && (
            <p>
              <span className="mb-1 block text-muted-foreground">
                Observações:
              </span>
              {veiculo.notes}
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Homologações associadas: {veiculo.homologationsCount}
          </p>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <div>
              <span className="block">Criado em</span>
              <span className="text-foreground">
                {formatDate(veiculo.createdAt)}
              </span>
            </div>

            <div>
              <span className="block">Última atualização</span>
              <span className="text-foreground">
                {formatDate(veiculo.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
