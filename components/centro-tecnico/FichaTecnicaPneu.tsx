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
import { usePneu } from "@/hooks/usePneu";
import { useHomologacoes } from "@/hooks/useHomologacoes";
import {
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENT_LABELS,
} from "@/lib/constants/pneu";

type Props = {
  id: number;
};

export default function FichaTecnicaPneu({ id }: Props) {
  const { data: pneu, isLoading: carregandoPneu } = usePneu(id);
  const { data: homologacoes, isLoading: carregandoHomologacoes } =
    useHomologacoes({
      q: "",
      tireId: id,
      sortBy: "year",
      sortDir: "desc",
      page: 1,
      pageSize: 100,
    });

  if (carregandoPneu || !pneu) {
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
            {pneu.tireManufacturerName} {pneu.brand} {pneu.model}
          </h2>
          <Badge tone={pneu.isActive ? "success" : "neutral"}>
            {pneu.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Medida</p>
            <p className="font-semibold">{pneu.size}</p>
          </div>
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
            <p className="text-muted-foreground">Selante / Tubeless</p>
            <p className="font-semibold">
              {pneu.seal ? "Selante" : "Sem selante"} /{" "}
              {pneu.tubeless ? "Tubeless" : "Com câmara"}
            </p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-bold">Veículos homologados</h3>

        {carregandoHomologacoes ? (
          <Skeleton className="h-40 w-full" />
        ) : !homologacoes || homologacoes.data.length === 0 ? (
          <EmptyState
            title="Nenhuma homologação encontrada"
            description="Este pneu ainda não está homologado para nenhum veículo."
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableTh>Código</TableTh>
                <TableTh>Tipo</TableTh>
                <TableTh>Veículo</TableTh>
                <TableTh>Montadora</TableTh>
                <TableTh>Ano</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {homologacoes.data.map((homologacao) => {
                const tire = homologacao.tires.find((t) => t.tireId === id);

                return (
                  <TableRow key={homologacao.id}>
                    <TableTd>
                      <Badge tone="warning">{homologacao.code}</Badge>
                    </TableTd>
                    <TableTd>
                      {tire && (
                        <Badge tone={tire.role === "ORIGINAL" ? "success" : "neutral"}>
                          {tire.role === "ORIGINAL" ? "Original" : "Opcional"}
                        </Badge>
                      )}
                    </TableTd>
                    <TableTd className="font-semibold">
                      {homologacao.vehicleLabel}
                    </TableTd>
                    <TableTd>{homologacao.manufacturerName}</TableTd>
                    <TableTd>{homologacao.year}</TableTd>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
