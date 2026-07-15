import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LotesImportacaoPanel from "@/components/administracao/LotesImportacaoPanel";
import ImportadoresPanel from "@/components/administracao/ImportadoresPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdministracaoPage() {
  const [
    veiculosPendentes,
    pneusPendentes,
    homologacoesPendentes,
    fabricantesPendentes,
    montadorasPendentes,
    totalLotes,
    lotesComErro,
  ] = await Promise.all([
    prisma.vehicleVersion.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
    prisma.tire.count({ where: { validationStatus: "NECESSITA_VALIDACAO" } }),
    prisma.homologation.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
    prisma.tireManufacturer.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
    prisma.manufacturer.count({
      where: { validationStatus: "NECESSITA_VALIDACAO" },
    }),
    prisma.importBatch.count(),
    prisma.importBatch.count({
      where: { errorCount: { gt: 0 } },
    }),
  ]);

  const totalPendente =
    veiculosPendentes +
    pneusPendentes +
    homologacoesPendentes +
    fabricantesPendentes +
    montadorasPendentes;

  const statsValidacao = [
    { label: "Montadoras", value: montadorasPendentes },
    { label: "Fabricantes de Pneus", value: fabricantesPendentes },
    { label: "Veículos", value: veiculosPendentes },
    { label: "Pneus", value: pneusPendentes },
    { label: "Homologações", value: homologacoesPendentes },
  ];

  return (
    <main className="space-y-10 p-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Administração</h1>
          <Badge tone="warning">Somente admin</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Painel de importação, auditoria e estatísticas da Base Oficial
          HomologaPneu.
        </p>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Registros aguardando validação</h2>
          <span className="text-sm text-muted-foreground">
            {totalPendente} registro(s) marcado(s) como &quot;Necessita
            Validação&quot;
          </span>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
          {statsValidacao.map((stat) => (
            <Card key={stat.label}>
              <h3 className="text-muted-foreground">{stat.label}</h3>
              <p className="mt-3 text-4xl font-bold">{stat.value}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Importação de arquivos</h2>
        <Card className="space-y-4">
          <div>
            <p className="text-muted-foreground">
              Todos os importadores aceitam CSV, Excel (XLSX), ODS, JSON e
              XML (PDF estruturado com suporte preparado). Cada importação
              gera um lote rastreável, listado abaixo, com opção de reversão.
              Importe na ordem: Montadoras/Fabricantes → Veículos/Pneus →
              Homologações, pois cada etapa referencia a anterior por nome.
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <span>
                Total de lotes: <strong>{totalLotes}</strong>
              </span>
              <span>
                Lotes com erros: <strong>{lotesComErro}</strong>
              </span>
            </div>
          </div>

          <ImportadoresPanel />
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Histórico de importações</h2>
        <LotesImportacaoPanel />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/administracao/fontes"
          className="inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground transition hover:opacity-90"
        >
          Ver Fontes de Dados →
        </Link>
        <Link
          href="/administracao/curadoria"
          className="inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground transition hover:opacity-90"
        >
          Curadoria Inteligente →
        </Link>
      </div>
    </main>
  );
}
