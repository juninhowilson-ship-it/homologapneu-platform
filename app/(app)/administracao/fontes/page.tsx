"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import {
  useFontesDados,
  useEnfileirarFonte,
  useProcessarFila,
  type FonteDados,
} from "@/hooks/useFontesDados";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ATIVA: "success",
  PENDENTE: "warning",
  BLOQUEADA: "danger",
};

function formatarData(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

export default function FontesDeDadosPage() {
  const { data, isLoading } = useFontesDados();
  const enfileirar = useEnfileirarFonte();
  const processarFila = useProcessarFila();

  return (
    <main className="space-y-8 p-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Fontes de Dados</h1>
          <Badge tone="warning">Somente admin</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Catálogo formal de toda fonte conhecida (ativa ou bloqueada),
          derivado automaticamente dos conectores reais implementados.
          Adicionar uma fonte nova nunca exige mudar esta tela.
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-8">
            <Card>
              <h3 className="text-xs text-muted-foreground">Cadastradas</h3>
              <p className="mt-2 text-3xl font-bold">{data.fontesCadastradas}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Ativas</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">{data.fontesAtivas}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Bloqueadas</h3>
              <p className="mt-2 text-3xl font-bold text-red-600">{data.fontesBloqueadas}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Pendentes</h3>
              <p className="mt-2 text-3xl font-bold">{data.fontesPendentes}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Última sincronização</h3>
              <p className="mt-2 text-sm font-semibold">{formatarData(data.ultimaSincronizacao)}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Registros importados</h3>
              <p className="mt-2 text-3xl font-bold">{data.totalRegistrosImportados}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Homologações por fonte</h3>
              <p className="mt-2 text-3xl font-bold">{data.totalHomologacoesPorFonte}</p>
            </Card>
            <Card>
              <h3 className="text-xs text-muted-foreground">Fila pendente / erros</h3>
              <p className="mt-2 text-3xl font-bold">
                {data.itensPendentesNaFila} <span className="text-base text-red-600">/ {data.fontesComErro}</span>
              </p>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => processarFila.mutate()} disabled={processarFila.isPending}>
              {processarFila.isPending ? "Processando..." : "Processar próximo item da fila"}
            </Button>
          </div>
          {processarFila.data && (
            <p className="text-right text-sm text-muted-foreground">
              {JSON.stringify(processarFila.data)}
            </p>
          )}

          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Fonte</TableTh>
                <TableTh>Categoria</TableTh>
                <TableTh>Tipo</TableTh>
                <TableTh>Status</TableTh>
                <TableTh>Confiabilidade</TableTh>
                <TableTh>Última sync</TableTh>
                <TableTh>Registros</TableTh>
                <TableTh>Homologações</TableTh>
                <TableTh>Erro</TableTh>
                <TableTh>Ação</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.fontes.map((fonte: FonteDados) => (
                <TableRow key={fonte.id}>
                  <TableTd>
                    <p className="font-medium">{fonte.name}</p>
                    {fonte.baseUrl && (
                      <a
                        href={fonte.baseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        {fonte.baseUrl}
                      </a>
                    )}
                  </TableTd>
                  <TableTd>{fonte.category}</TableTd>
                  <TableTd>{fonte.type}</TableTd>
                  <TableTd>
                    <Badge tone={STATUS_TONE[fonte.status] ?? "neutral"}>{fonte.status}</Badge>
                  </TableTd>
                  <TableTd>{fonte.reliability}</TableTd>
                  <TableTd className="text-sm">{formatarData(fonte.lastSyncAt)}</TableTd>
                  <TableTd>{fonte.importedRecordsCount}</TableTd>
                  <TableTd>{fonte.confirmedHomologationsCount}</TableTd>
                  <TableTd className="max-w-xs truncate text-xs text-red-600">
                    {fonte.lastError ?? "—"}
                  </TableTd>
                  <TableTd>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={fonte.status !== "ATIVA" || enfileirar.isPending}
                      onClick={() => enfileirar.mutate(fonte.id)}
                    >
                      Enfileirar
                    </Button>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-sm text-muted-foreground">
            Ver também: <Link href="/administracao" className="text-brand hover:underline">Administração</Link>
          </p>
        </>
      )}
    </main>
  );
}
