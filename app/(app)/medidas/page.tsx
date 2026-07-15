"use client";

import Link from "next/link";
import Skeleton from "@/components/ui/Skeleton";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import { useMedidas } from "@/hooks/useMedidas";

export default function MedidasPage() {
  const { data, isLoading } = useMedidas();

  return (
    <main className="space-y-6 p-10">
      <div>
        <h1 className="text-4xl font-bold">Medidas</h1>
        <p className="mt-2 text-muted-foreground">
          Busca reversa: a medida é a unidade principal. Escolha uma medida
          para ver fabricantes de pneu, modelos, veículos compatíveis e
          homologações confirmadas.
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>Medida</TableTh>
              <TableTh>Pneus cadastrados</TableTh>
              <TableTh>Veículos</TableTh>
              <TableTh>Homologações confirmadas</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.medida}>
                <TableTd>
                  <Link
                    href={`/medidas/${encodeURIComponent(m.medida)}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {m.medida}
                  </Link>
                </TableTd>
                <TableTd>{m.totalPneus}</TableTd>
                <TableTd>{m.totalVeiculos}</TableTd>
                <TableTd>{m.totalHomologacoes}</TableTd>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableTd colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma medida cadastrada ainda.
                </TableTd>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
