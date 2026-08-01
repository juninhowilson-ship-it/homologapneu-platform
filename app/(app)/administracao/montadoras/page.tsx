import Badge from "@/components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/components/ui/Table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatarData(data: Date | null) {
  if (!data) return "Nunca";
  return data.toLocaleString("pt-BR");
}

async function carregarPainel() {
  // Só busca detalhe das montadoras com sinal real de pipeline rodado
  // (documento baixado ou execução registrada) — evita N+1 nas ~100
  // montadoras da FIPE sem nenhuma atividade de importação ainda.
  const [nomesComDocumento, nomesComHistorico] = await Promise.all([
    prisma.documentUpload.findMany({
      where: { manufacturerName: { not: null } },
      distinct: ["manufacturerName"],
      select: { manufacturerName: true },
    }),
    prisma.importHistory.findMany({ distinct: ["manufacturerName"], select: { manufacturerName: true } }),
  ]);
  const nomesAtivos = [
    ...new Set(
      [...nomesComDocumento.map((d) => d.manufacturerName), ...nomesComHistorico.map((h) => h.manufacturerName)].filter(
        (n): n is string => Boolean(n)
      )
    ),
  ];

  const manufacturers = await prisma.manufacturer.findMany({
    where: { deletedAt: null, name: { in: nomesAtivos, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  const linhas = await Promise.all(
    manufacturers.map(async (m) => {
      const [totalModelos, modelosEstruturados, pdfs, homologacoes, pendentes, ultimaExecucao, ultimoDocumento] =
        await Promise.all([
          prisma.vehicleModel.count({ where: { manufacturerId: m.id } }),
          prisma.vehicleModel.count({
            where: { manufacturerId: m.id, deletedAt: null, versions: { some: {} } },
          }),
          prisma.documentUpload.count({
            where: { manufacturerName: { equals: m.name, mode: "insensitive" }, storagePath: { not: null } },
          }),
          prisma.homologation.count({
            where: { vehicleVersion: { vehicleModel: { manufacturerId: m.id } } },
          }),
          prisma.homologationCandidate.count({
            where: {
              status: "PENDENTE_REVISAO",
              documentUpload: { manufacturerName: { equals: m.name, mode: "insensitive" } },
            },
          }),
          prisma.importHistory.findFirst({
            where: { manufacturerName: { equals: m.name, mode: "insensitive" } },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.documentUpload.findFirst({
            where: { manufacturerName: { equals: m.name, mode: "insensitive" } },
            orderBy: { uploadedAt: "desc" },
            select: { uploadedAt: true },
          }),
        ]);

      return {
        id: m.id,
        name: m.name,
        totalModelos,
        modelosEstruturados,
        pdfs,
        homologacoes,
        pendentes,
        statusImportacao: ultimaExecucao?.status ?? null,
        ultimaAtualizacao: ultimaExecucao?.updatedAt ?? ultimoDocumento?.uploadedAt ?? null,
      };
    })
  );

  // Só entra no painel quem tem algum sinal real de pipeline rodado
  // (documento baixado ou execução registrada) — evita listar as ~100
  // montadoras da FIPE sem nenhuma atividade de importação ainda.
  return linhas
    .filter((l) => l.pdfs > 0 || l.statusImportacao !== null || l.totalModelos > 0)
    .sort((a, b) => {
      const ta = a.ultimaAtualizacao?.getTime() ?? 0;
      const tb = b.ultimaAtualizacao?.getTime() ?? 0;
      return tb - ta;
    });
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  CONCLUIDO: "success",
  EXECUTANDO: "warning",
  FALHOU: "danger",
  PAUSADO: "neutral",
};

export default async function MontadorasPipelinePage() {
  const linhas = await carregarPainel();

  return (
    <main className="space-y-8 p-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Montadoras — Pipeline de Importação</h1>
          <Badge tone="warning">Somente admin</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Status do pipeline <code>npm run manufacturer:import</code> por montadora: catálogo
          normalizado, documentos no Storage, homologações e candidatos ainda aguardando revisão
          humana.
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableTh>Montadora</TableTh>
            <TableTh>% catálogo normalizado</TableTh>
            <TableTh>PDFs no Storage</TableTh>
            <TableTh>Homologações</TableTh>
            <TableTh>Pendências (candidatos)</TableTh>
            <TableTh>Última atualização</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {linhas.map((l) => {
            const percentual = l.totalModelos > 0 ? Math.round((l.modelosEstruturados / l.totalModelos) * 100) : 0;
            return (
              <TableRow key={l.id}>
                <TableTd>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{l.name}</span>
                    {l.statusImportacao && (
                      <Badge tone={STATUS_TONE[l.statusImportacao] ?? "neutral"}>{l.statusImportacao}</Badge>
                    )}
                  </div>
                </TableTd>
                <TableTd>
                  {percentual}% ({l.modelosEstruturados}/{l.totalModelos})
                </TableTd>
                <TableTd>{l.pdfs}</TableTd>
                <TableTd>{l.homologacoes}</TableTd>
                <TableTd>{l.pendentes > 0 ? <Badge tone="warning">{l.pendentes}</Badge> : "0"}</TableTd>
                <TableTd>{formatarData(l.ultimaAtualizacao)}</TableTd>
              </TableRow>
            );
          })}
          {linhas.length === 0 && (
            <TableRow>
              <TableTd colSpan={6}>Nenhuma montadora com pipeline rodado ainda.</TableTd>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
