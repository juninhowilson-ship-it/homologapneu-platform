"use client";

import Dialog from "@/components/ui/Dialog";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
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
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Pneus homologados
            </p>

            <Table>
              <TableHead>
                <tr>
                  <TableTh>Tipo</TableTh>
                  <TableTh>Pneu</TableTh>
                  <TableTh>Medida</TableTh>
                  <TableTh>Run Flat</TableTh>
                  <TableTh>XL</TableTh>
                </tr>
              </TableHead>
              <TableBody>
                {homologacao.tires.map((tire) => (
                  <TableRow key={tire.id}>
                    <TableTd>
                      <Badge tone={tire.role === "ORIGINAL" ? "success" : "neutral"}>
                        {tire.role === "ORIGINAL" ? "Original" : "Opcional"}
                      </Badge>
                    </TableTd>
                    <TableTd className="font-semibold">
                      {tire.tireLabel}
                    </TableTd>
                    <TableTd>{tire.size}</TableTd>
                    <TableTd>{tire.runFlat ? "Sim" : "Não"}</TableTd>
                    <TableTd>{tire.xl ? "Sim" : "Não"}</TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
