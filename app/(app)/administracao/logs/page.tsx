import Link from "next/link";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import { listarAuditLogs } from "@/services/auditoria";

export const dynamic = "force-dynamic";

const ACAO_LABEL: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Excluído",
};

const ACAO_TONE: Record<string, "success" | "warning" | "danger"> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "danger",
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const paginaAtual = Math.max(1, Number(page) || 1);
  const pageSize = 30;

  const { data: logs, total } = await listarAuditLogs({
    page: paginaAtual,
    pageSize,
  });

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6 p-10">
      <div>
        <h1 className="text-4xl font-bold">Logs</h1>
        <p className="mt-2 text-muted-foreground">
          Trilha de auditoria de todas as criações, atualizações e exclusões
          registradas no sistema — {total} evento(s).
        </p>
      </div>

      <Table>
        <TableHead>
          <tr>
            <TableTh>Quando</TableTh>
            <TableTh>Ação</TableTh>
            <TableTh>Entidade</TableTh>
            <TableTh>Usuário</TableTh>
            <TableTh>Lote</TableTh>
          </tr>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableTd className="whitespace-nowrap text-sm text-muted-foreground">
                {formatarDataHora(log.createdAt)}
              </TableTd>
              <TableTd>
                <Badge tone={ACAO_TONE[log.action] ?? "neutral"}>
                  {ACAO_LABEL[log.action] ?? log.action}
                </Badge>
              </TableTd>
              <TableTd className="font-semibold">
                {log.entity} #{log.entityId}
              </TableTd>
              <TableTd>{log.userName ?? "—"}</TableTd>
              <TableTd>{log.importBatchId ? `#${log.importBatchId}` : "—"}</TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {logs.length === 0 && (
        <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {paginaAtual} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {paginaAtual > 1 && (
            <Link
              href={`/administracao/logs?page=${paginaAtual - 1}`}
              className="rounded-lg bg-surface-muted px-3 py-1.5 font-semibold hover:bg-border"
            >
              ← Anterior
            </Link>
          )}
          {paginaAtual < totalPaginas && (
            <Link
              href={`/administracao/logs?page=${paginaAtual + 1}`}
              className="rounded-lg bg-surface-muted px-3 py-1.5 font-semibold hover:bg-border"
            >
              Próxima →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
