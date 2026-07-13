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
import { FUEL_LABELS, CATEGORY_LABELS } from "@/lib/constants/veiculo";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import type { Veiculo } from "@/types/veiculo";
import type { VeiculosQuery } from "@/hooks/useVeiculos";

type Props = {
  veiculos: Veiculo[];
  isLoading: boolean;
  sortBy: VeiculosQuery["sortBy"];
  sortDir: VeiculosQuery["sortDir"];
  onSort: (column: VeiculosQuery["sortBy"]) => void;
  onView: (veiculo: Veiculo) => void;
  onEdit: (veiculo: Veiculo) => void;
  onDelete: (veiculo: Veiculo) => void;
};

const COLUMNS: { key: VeiculosQuery["sortBy"]; label: string }[] = [
  { key: "model", label: "Modelo" },
  { key: "version", label: "Versão" },
  { key: "yearStart", label: "Anos" },
];

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

export default function VeiculosTable({
  veiculos,
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

  if (veiculos.length === 0) {
    return (
      <EmptyState
        title="Nenhum veículo encontrado"
        description="Ajuste a busca ou os filtros, ou cadastre um novo veículo."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Imagem</TableTh>
          <TableTh>Marca</TableTh>

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

          <TableTh>Motorização</TableTh>
          <TableTh>Combustível</TableTh>
          <TableTh>Categoria</TableTh>
          <TableTh>Status</TableTh>
          <TableTh>Validação</TableTh>
          <TableTh>Ações</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {veiculos.map((veiculo) => (
          <TableRow key={veiculo.id}>
            <TableTd>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
                {veiculo.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={veiculo.imageUrl}
                    alt={`${veiculo.manufacturerName} ${veiculo.model}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            </TableTd>

            <TableTd className="font-semibold">
              {veiculo.manufacturerName}
            </TableTd>
            <TableTd>{veiculo.model}</TableTd>
            <TableTd>{veiculo.version}</TableTd>
            <TableTd>
              {formatarFaixaAno(veiculo.yearStart, veiculo.yearEnd)}
            </TableTd>
            <TableTd>{veiculo.engine}</TableTd>
            <TableTd>{FUEL_LABELS[veiculo.fuel]}</TableTd>
            <TableTd>{CATEGORY_LABELS[veiculo.category]}</TableTd>

            <TableTd>
              <Badge tone={veiculo.isActive ? "success" : "danger"}>
                {veiculo.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </TableTd>

            <TableTd>
              <Badge tone={VALIDATION_STATUS_TONE[veiculo.validationStatus]}>
                {VALIDATION_STATUS_LABELS[veiculo.validationStatus]}
              </Badge>
            </TableTd>

            <TableTd>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(veiculo)}
                >
                  Ver
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(veiculo)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(veiculo)}
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
