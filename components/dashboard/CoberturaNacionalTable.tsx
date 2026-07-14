"use client";

import Skeleton from "@/components/ui/Skeleton";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import { useCoberturaNacional } from "@/hooks/useCoberturaNacional";
import type { CoberturaMetrica, CoberturaNacional } from "@/types/cobertura";

const LINHAS: { chave: keyof Omit<CoberturaNacional, "calculadoEm">; label: string }[] = [
  { chave: "montadoras", label: "Montadoras" },
  { chave: "modelos", label: "Modelos" },
  { chave: "versoes", label: "Versões" },
  { chave: "pneus", label: "Pneus" },
  { chave: "homologacoes", label: "Homologações" },
  { chave: "imagens", label: "Imagens" },
  { chave: "coberturaBrasil", label: "Cobertura do Brasil" },
];

function formatarPercentual(valor: number) {
  return `${valor.toFixed(2)}%`;
}

export default function CoberturaNacionalTable() {
  const { data, isLoading } = useCoberturaNacional();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Cobertura Nacional</h2>
        {data && (
          <span className="text-sm text-muted-foreground">
            Calculado em {new Date(data.calculadoEm).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Categoria</TableTh>
              <TableTh>Concluídos</TableTh>
              <TableTh>Total</TableTh>
              <TableTh>Percentual</TableTh>
              <TableTh>Definição</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {LINHAS.map(({ chave, label }) => {
              const metrica = data[chave] as CoberturaMetrica;
              return (
                <TableRow key={chave}>
                  <TableTd className="font-medium">{label}</TableTd>
                  <TableTd>{metrica.concluidos.toLocaleString("pt-BR")}</TableTd>
                  <TableTd>{metrica.total.toLocaleString("pt-BR")}</TableTd>
                  <TableTd className="font-semibold">
                    {formatarPercentual(metrica.percentual)}
                  </TableTd>
                  <TableTd className="max-w-md text-xs text-muted-foreground">
                    {metrica.definicao}
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
