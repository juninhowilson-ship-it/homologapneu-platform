import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScreenshotPreview from "@/components/dev/ScreenshotPreview";
import { prisma } from "@/lib/prisma";
import {
  EPICS,
  STATUS_LABEL,
  STATUS_TONE,
  calcularProgresso,
  formatarData,
} from "@/lib/roadmap-data";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

const TELAS = [
  { title: "Painel", route: "/" },
  { title: "Pesquisa Inteligente", route: "/pesquisa" },
  { title: "Veículos", route: "/veiculos" },
  { title: "Pneus", route: "/pneus" },
  { title: "Homologações", route: "/homologacoes" },
  { title: "Fabricantes", route: "/fabricantes" },
  { title: "Centro Técnico", route: "/centro-tecnico" },
];

export default async function DevPage() {
  const [fabricantes, veiculos, pneus, homologacoes] = await Promise.all([
    prisma.tireManufacturer.count(),
    prisma.vehicle.count(),
    prisma.tire.count(),
    prisma.homologation.count(),
  ]);

  const progresso = calcularProgresso(EPICS);
  const proximosEpics = EPICS.filter((epic) => epic.status === "pendente");
  const atualizadoEm = new Date().toLocaleString("pt-BR");

  const stats = [
    { label: "Fabricantes", value: fabricantes },
    { label: "Veículos", value: veiculos },
    { label: "Pneus", value: pneus },
    { label: "Homologações", value: homologacoes },
  ];

  return (
    <main className="space-y-10 p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">Painel de Desenvolvimento</h1>
            <Badge tone="warning">Somente dev</Badge>
          </div>
          <p className="mt-2 text-muted-foreground">
            Acompanhamento interno do progresso do HomologaPneu. Esta página
            não é destinada a usuários finais.
          </p>
        </div>

        <div className="text-right text-sm text-muted-foreground">
          <p>
            Versão do sistema:{" "}
            <span className="font-semibold text-foreground">
              v{packageJson.version}
            </span>
          </p>
          <p>
            Última atualização:{" "}
            <span className="font-semibold text-foreground">
              {atualizadoEm}
            </span>
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Progresso geral do projeto</h2>
          <span className="text-2xl font-bold text-brand">{progresso}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-bold">Dados cadastrados</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <h3 className="text-muted-foreground">{stat.label}</h3>
              <p className="mt-3 text-4xl font-bold">{stat.value}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">EPICs</h2>
        <div className="space-y-3">
          {EPICS.map((epic) => (
            <Card
              key={epic.id}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{epic.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {epic.descricao}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatarData(epic.data)}
                </span>
                <Badge tone={STATUS_TONE[epic.status]}>
                  {STATUS_LABEL[epic.status]}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Próximos EPICs</h2>
        <ul className="list-disc space-y-2 pl-5">
          {proximosEpics.map((epic) => (
            <li key={epic.id}>
              <span className="font-semibold">{epic.titulo}</span> —{" "}
              {epic.descricao}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">Telas principais</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pré-visualização ao vivo — sempre reflete o estado atual da
          aplicação.
        </p>
        <div className="flex flex-wrap gap-6">
          {TELAS.map((tela) => (
            <ScreenshotPreview
              key={tela.route}
              title={tela.title}
              route={tela.route}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
