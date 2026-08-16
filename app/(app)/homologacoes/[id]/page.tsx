import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, FileCheck2, History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableTh,
  TableTd,
} from "@/components/ui/Table";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";

export const dynamic = "force-dynamic";

async function getHomologationDetails(id: string) {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return prisma.homologation.findUnique({
    where: { id: parsed },
    include: {
      vehicleVersion: {
        include: {
          vehicleModel: { include: { manufacturer: true } },
          engine: true,
        },
      },
      tires: { include: { tire: true } },
    },
  });
}

export default async function HomologationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const homog = await getHomologationDetails(id);
  if (!homog) notFound();

  const versao = homog.vehicleVersion;
  const vm = versao.vehicleModel;
  const pneus = [...homog.tires].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "ORIGINAL" ? -1 : 1
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Homologações", href: "/homologacoes" },
          { label: homog.code },
        ]}
        className="mb-6"
      />

      {/* Cabeçalho */}
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
          {vm.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vm.photoUrl}
              alt={`${vm.manufacturer.name} ${vm.name}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Car className="text-muted-foreground" size={36} />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Homologação <span className="font-mono">{homog.code}</span>
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground">
                {vm.manufacturer.name} {vm.name} {versao.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ano {homog.year} · {versao.engine.name}
              </p>
            </div>

            <Badge tone={VALIDATION_STATUS_TONE[homog.validationStatus]}>
              {VALIDATION_STATUS_LABELS[homog.validationStatus]}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/veiculo/${versao.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
            >
              <Car size={15} />
              Ver ficha do veículo
            </Link>
            <Link
              href={`/homologacoes/${homog.id}/historico`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand/50"
            >
              <History size={15} />
              Histórico
            </Link>
          </div>
        </div>
      </div>

      {/* Pneus da homologação */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-secondary px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <FileCheck2 size={18} className="text-brand" />
            Pneus desta homologação
          </h2>
        </div>

        {pneus.length > 0 ? (
          <Table>
            <TableHead>
              <tr>
                <TableTh>Medida</TableTh>
                <TableTh>Pneu</TableTh>
                <TableTh>Índices</TableTh>
                <TableTh>Tipo</TableTh>
                <TableTh>Características</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {pneus.map((ht) => (
                <TableRow key={ht.id}>
                  <TableTd className="font-mono font-bold text-foreground">
                    {ht.tire.size}
                  </TableTd>
                  <TableTd>
                    {ht.tire.brand} {ht.tire.model}
                  </TableTd>
                  <TableTd className="font-mono text-muted-foreground">
                    {ht.tire.loadIndex}/{ht.tire.speedIndex}
                  </TableTd>
                  <TableTd>
                    <Badge tone={ht.role === "ORIGINAL" ? "success" : "neutral"}>
                      {ht.role === "ORIGINAL"
                        ? "Original"
                        : ht.role === "SUBSTITUTO"
                          ? "Substituto"
                          : "Opcional"}
                    </Badge>
                  </TableTd>
                  <TableTd className="text-muted-foreground">
                    {[ht.tire.runFlat ? "Run Flat" : null, ht.tire.xl ? "XL" : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Nenhum pneu vinculado a esta homologação.
          </p>
        )}
      </div>
    </div>
  );
}
