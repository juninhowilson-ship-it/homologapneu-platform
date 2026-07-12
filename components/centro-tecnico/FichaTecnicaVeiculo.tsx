"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
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
import { useVeiculo } from "@/hooks/useVeiculo";
import { useHomologacoes } from "@/hooks/useHomologacoes";
import {
  FUEL_LABELS,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";

type Props = {
  id: number;
};

export default function FichaTecnicaVeiculo({ id }: Props) {
  const { data: veiculo, isLoading: carregandoVeiculo } = useVeiculo(id);
  const { data: homologacoes, isLoading: carregandoHomologacoes } =
    useHomologacoes({
      q: "",
      vehicleId: id,
      sortBy: "year",
      sortDir: "desc",
      page: 1,
      pageSize: 100,
    });

  if (carregandoVeiculo || !veiculo) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            {veiculo.manufacturerName} {veiculo.model} {veiculo.version}
          </h2>
          <Badge tone={veiculo.isActive ? "success" : "neutral"}>
            {veiculo.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Ano</p>
            <p className="font-semibold">
              {veiculo.yearStart}–{veiculo.yearEnd}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Motor</p>
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
            <p className="font-semibold">{CATEGORY_LABELS[veiculo.category]}</p>
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
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-bold">Pneus homologados</h3>

        {carregandoHomologacoes ? (
          <Skeleton className="h-40 w-full" />
        ) : !homologacoes || homologacoes.data.length === 0 ? (
          <EmptyState
            title="Nenhuma homologação encontrada"
            description="Este veículo ainda não possui pneus homologados cadastrados."
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableTh>Código</TableTh>
                <TableTh>Pneu</TableTh>
                <TableTh>Fabricante</TableTh>
                <TableTh>Medida Original</TableTh>
                <TableTh>Medida Opcional</TableTh>
                <TableTh>Run Flat</TableTh>
                <TableTh>XL</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {homologacoes.data.map((homologacao) => (
                <TableRow key={homologacao.id}>
                  <TableTd>
                    <Badge tone="warning">{homologacao.code}</Badge>
                  </TableTd>
                  <TableTd className="font-semibold">
                    {homologacao.tireLabel}
                  </TableTd>
                  <TableTd>{homologacao.tireManufacturerName}</TableTd>
                  <TableTd>{homologacao.originalSize}</TableTd>
                  <TableTd>{homologacao.optionalSize ?? "—"}</TableTd>
                  <TableTd>{homologacao.runFlat ? "Sim" : "Não"}</TableTd>
                  <TableTd>{homologacao.xl ? "Sim" : "Não"}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
