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
import type { Fabricante } from "@/types/fabricante";
import type { FabricantesQuery } from "@/hooks/useFabricantes";

type Props = {
  fabricantes: Fabricante[];
  isLoading: boolean;
  sortBy: FabricantesQuery["sortBy"];
  sortDir: FabricantesQuery["sortDir"];
  onSort: (column: FabricantesQuery["sortBy"]) => void;
  onView: (fabricante: Fabricante) => void;
  onEdit: (fabricante: Fabricante) => void;
  onDelete: (fabricante: Fabricante) => void;
};

const COLUMNS: { key: FabricantesQuery["sortBy"]; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "country", label: "País" },
  { key: "createdAt", label: "Criado em" },
  { key: "updatedAt", label: "Atualizado em" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function FabricantesTable({
  fabricantes,
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

  if (fabricantes.length === 0) {
    return (
      <EmptyState
        title="Nenhum fabricante encontrado"
        description="Ajuste a busca ou os filtros, ou cadastre um novo fabricante."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Logo</TableTh>

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

          <TableTh>Status</TableTh>
          <TableTh>Pneus</TableTh>
          <TableTh>Ações</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {fabricantes.map((fabricante) => (
          <TableRow key={fabricante.id}>
            <TableTd>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
                {fabricante.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fabricante.logoUrl}
                    alt={fabricante.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            </TableTd>

            <TableTd className="font-semibold">{fabricante.name}</TableTd>
            <TableTd>{fabricante.country}</TableTd>
            <TableTd>{formatDate(fabricante.createdAt)}</TableTd>
            <TableTd>{formatDate(fabricante.updatedAt)}</TableTd>

            <TableTd>
              <Badge tone={fabricante.isActive ? "success" : "danger"}>
                {fabricante.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </TableTd>

            <TableTd>{fabricante.tiresCount}</TableTd>

            <TableTd>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(fabricante)}
                >
                  Ver
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(fabricante)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(fabricante)}
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
