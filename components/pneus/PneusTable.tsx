import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
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
import { TIRE_CATEGORY_LABELS } from "@/lib/constants/pneu";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import type { Pneu } from "@/types/pneu";
import type { PneusQuery } from "@/hooks/usePneus";

type Props = {
  pneus: Pneu[];
  isLoading: boolean;
  sortBy: PneusQuery["sortBy"];
  sortDir: PneusQuery["sortDir"];
  onSort: (column: PneusQuery["sortBy"]) => void;
  onView: (pneu: Pneu) => void;
  onEdit: (pneu: Pneu) => void;
  onDelete: (pneu: Pneu) => void;
};

const COLUMNS: { key: PneusQuery["sortBy"]; label: string }[] = [
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "size", label: "Medida" },
];

export default function PneusTable({
  pneus,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (pneus.length === 0) {
    return (
      <EmptyState
        title="Nenhum pneu encontrado"
        description="Ajuste a busca ou os filtros, ou cadastre um novo pneu."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Imagem</TableTh>
          <TableTh>Fabricante</TableTh>

          {COLUMNS.map((column) => (
            <TableTh
              key={column.key}
              sortable
              sortDirection={sortBy === column.key ? sortDir : null}
              onSort={() => onSort(column.key)}
            >
              {column.label}
            </TableTh>
          ))}

          <TableTh>Run Flat</TableTh>
          <TableTh>XL</TableTh>
          <TableTh>Categoria</TableTh>
          <TableTh>Status</TableTh>
          <TableTh>Validação</TableTh>
          <TableTh>Ações</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {pneus.map((pneu) => (
          <TableRow key={pneu.id}>
            <TableTd>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
                {pneu.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pneu.imageUrl}
                    alt={`${pneu.tireManufacturerName} ${pneu.model}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            </TableTd>

            <TableTd className="font-semibold">
              {pneu.tireManufacturerName}
            </TableTd>
            <TableTd>{pneu.brand}</TableTd>
            <TableTd>{pneu.model}</TableTd>
            <TableTd>{pneu.size}</TableTd>
            <TableTd>{pneu.runFlat ? "Sim" : "Não"}</TableTd>
            <TableTd>{pneu.xl ? "Sim" : "Não"}</TableTd>
            <TableTd>{TIRE_CATEGORY_LABELS[pneu.category]}</TableTd>

            <TableTd>
              <Badge tone={pneu.isActive ? "success" : "danger"}>
                {pneu.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </TableTd>

            <TableTd>
              <Badge tone={VALIDATION_STATUS_TONE[pneu.validationStatus]}>
                {VALIDATION_STATUS_LABELS[pneu.validationStatus]}
              </Badge>
            </TableTd>

            <TableTd>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(pneu)}
                >
                  Ver
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(pneu)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(pneu)}
                  className="text-red-600"
                >
                  Excluir
                </Button>
              </div>
            </TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
