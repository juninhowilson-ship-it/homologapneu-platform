import { FileText } from "lucide-react";
import Card from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatarData(iso: Date) {
  return iso.toLocaleDateString("pt-BR");
}

export default async function DocumentosPage() {
  const [documentosHomologacao, documentosVeiculo] = await Promise.all([
    prisma.homologationDocument.findMany({
      include: {
        homologation: {
          select: {
            code: true,
            vehicleVersion: {
              select: {
                name: true,
                vehicleModel: { select: { name: true, manufacturer: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.vehicleDocument.findMany({
      include: {
        vehicleVersion: {
          select: {
            name: true,
            vehicleModel: { select: { name: true, manufacturer: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <main className="space-y-10 p-10">
      <div>
        <h1 className="text-4xl font-bold">Documentos</h1>
        <p className="mt-2 text-muted-foreground">
          Documentos oficiais vinculados a homologações e veículos —{" "}
          {documentosHomologacao.length + documentosVeiculo.length} documento(s)
          mais recente(s).
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Documentos de Homologação</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {documentosHomologacao.map((doc) => (
            <Card key={`h-${doc.id}`} className="space-y-1">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-semibold text-foreground hover:text-brand"
              >
                <FileText size={16} className="shrink-0 text-brand" />
                {doc.name}
              </a>
              <p className="text-sm text-muted-foreground">
                {doc.homologation.vehicleVersion.vehicleModel.manufacturer.name}{" "}
                {doc.homologation.vehicleVersion.vehicleModel.name}{" "}
                {doc.homologation.vehicleVersion.name} · Homologação{" "}
                {doc.homologation.code}
              </p>
              <p className="text-xs text-muted-foreground">
                Adicionado em {formatarData(doc.createdAt)}
              </p>
            </Card>
          ))}
          {documentosHomologacao.length === 0 && (
            <p className="text-muted-foreground">Nenhum documento de homologação.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Documentos de Veículo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {documentosVeiculo.map((doc) => (
            <Card key={`v-${doc.id}`} className="space-y-1">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-semibold text-foreground hover:text-brand"
              >
                <FileText size={16} className="shrink-0 text-brand" />
                {doc.name}
              </a>
              <p className="text-sm text-muted-foreground">
                {doc.vehicleVersion.vehicleModel.manufacturer.name}{" "}
                {doc.vehicleVersion.vehicleModel.name} {doc.vehicleVersion.name}
                {doc.type ? ` · ${doc.type}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Adicionado em {formatarData(doc.createdAt)}
              </p>
            </Card>
          ))}
          {documentosVeiculo.length === 0 && (
            <p className="text-muted-foreground">Nenhum documento de veículo.</p>
          )}
        </div>
      </div>
    </main>
  );
}
