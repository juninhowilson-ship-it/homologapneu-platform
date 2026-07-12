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
import type { Homologacao } from "@/types/homologacao";
import type { HomologacoesQuery } from "@/hooks/useHomologacoes";

type Props = {
  homologacoes: Homologacao[];
  isLoading: boolean;
  sortBy: HomologacoesQuery["sortBy"];
  sortDir: HomologacoesQuery["sortDir"];
  onSort: (column: HomologacoesQuery["sortBy"]) => void;
  onView: (homologacao: Homologacao) => void;
  onEdit: (homologacao: Homologacao) => void;
  onDelete: (homologacao: Homologacao) => void;
};

const COLUMNS: { key: HomologacoesQuery["sortBy"]; label: string }[] = [
  { key: "code", label: "Código" },
  { key: "year", label: "Ano" },
];

export default function HomologacoesTable({
  homologacoes,
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

  if (homologacoes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma homologação encontrada"
        description="Ajuste a busca ou os filtros, ou cadastre uma nova homologação."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableTh>Veículo</TableTh>
          <TableTh>Pneu</TableTh>

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
          <TableTh>Ações</TableTh>
        </tr>
      </TableHead>

      <TableBody>
        {homologacoes.map((homologacao) => (
          <TableRow key={homologacao.id}>
            <TableTd className="font-semibold">
              {homologacao.vehicleLabel}
            </TableTd>
            <TableTd>{homologacao.tireLabel}</TableTd>
            <TableTd>
              <Badge tone="warning">{homologacao.code}</Badge>
            </TableTd>
            <TableTd>{homologacao.year}</TableTd>
            <TableTd>{homologacao.runFlat ? "Sim" : "Não"}</TableTd>
            <TableTd>{homologacao.xl ? "Sim" : "Não"}</TableTd>

            <TableTd>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(homologacao)}
                >
                  Ver
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(homologacao)}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(homologacao)}
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
