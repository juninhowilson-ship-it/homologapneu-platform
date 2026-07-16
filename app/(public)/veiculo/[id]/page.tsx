import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, FileText, Gauge, ShieldCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  FUEL_LABELS,
  CATEGORY_LABELS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import { obterFichaVeiculoPublica } from "@/services/publico";
import TimelineVeiculo from "@/components/veiculo-publico/TimelineVeiculo";

export const dynamic = "force-dynamic";

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function VeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const veiculoId = Number(id);

  if (!Number.isFinite(veiculoId)) notFound();

  const ficha = await obterFichaVeiculoPublica(veiculoId);
  if (!ficha) notFound();

  const { veiculo, versoesIrmas, homologacoes, medidas, documentos, timeline } = ficha;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/pesquisa" className="text-sm font-semibold text-brand hover:underline">
        ← Voltar para a pesquisa
      </Link>

      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
          {veiculo.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={veiculo.imageUrl}
              alt={`${veiculo.manufacturerName} ${veiculo.model}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Car className="text-muted-foreground" size={40} />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {veiculo.manufacturerName}
              </p>
              <h1 className="text-3xl font-extrabold text-foreground">
                {veiculo.model} {veiculo.version}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {formatarFaixaAno(veiculo.yearStart, veiculo.yearEnd)} ·{" "}
                {veiculo.engine} · {FUEL_LABELS[veiculo.fuel]}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge tone={veiculo.isActive ? "success" : "danger"}>
                {veiculo.isActive ? "Ativo" : "Inativo"}
              </Badge>
              <Badge tone={VALIDATION_STATUS_TONE[veiculo.validationStatus]}>
                <ShieldCheck size={12} className="mr-1 inline" />
                {VALIDATION_STATUS_LABELS[veiculo.validationStatus]}
              </Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Categoria</p>
              <p className="font-semibold">{CATEGORY_LABELS[veiculo.category]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Segmento</p>
              <p className="font-semibold">
                {veiculo.segment ? SEGMENT_LABELS[veiculo.segment] : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Potência</p>
              <p className="font-semibold">{veiculo.power ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Homologações</p>
              <p className="font-semibold">{veiculo.homologationsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {versoesIrmas.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Todas as versões</h2>
          <div className="flex flex-wrap gap-3">
            {versoesIrmas.map((versao) => (
              <Link
                key={versao.id}
                href={`/veiculo/${versao.id}`}
                className={`rounded-xl border px-4 py-3 text-sm transition ${
                  versao.id === veiculo.id
                    ? "border-brand bg-brand/10 font-semibold text-foreground"
                    : "border-border bg-surface hover:border-brand/50"
                }`}
              >
                <p className="font-semibold">{versao.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarFaixaAno(versao.yearStart, versao.yearEnd)} ·{" "}
                  {versao.engineName}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {medidas.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Todas as medidas</h2>
          <div className="flex flex-wrap gap-2">
            {medidas.map((medida) => (
              <span
                key={medida}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm font-semibold"
              >
                <Gauge size={13} className="text-brand" />
                {medida}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Homologações</h2>
        <div className="space-y-4">
          {homologacoes.map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge tone="warning">{h.code}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Ano {h.year} · {h.engine}
                  </span>
                </div>
                <Badge tone={VALIDATION_STATUS_TONE[h.validationStatus]}>
                  {VALIDATION_STATUS_LABELS[h.validationStatus]}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {h.tires.map((tire) => (
                  <div key={tire.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                    <Badge tone={tire.role === "ORIGINAL" ? "success" : "neutral"}>
                      {tire.role === "ORIGINAL" ? "Original" : "Opcional"}
                    </Badge>
                    <p className="mt-2 font-semibold">{tire.tireLabel}</p>
                    <p className="text-muted-foreground">
                      Carga {tire.size} — {tire.runFlat ? "Run Flat" : "Convencional"}
                      {tire.xl ? " · XL" : ""}
                    </p>
                  </div>
                ))}
              </div>

              {h.pressureSpecs[0] && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Gauge size={14} />
                  Pressões (vazio): {h.pressureSpecs[0].emptyFront ?? "—"} /{" "}
                  {h.pressureSpecs[0].emptyRear ?? "—"}
                </p>
              )}

              {h.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                >
                  <FileText size={14} />
                  {doc.name}
                </a>
              ))}
            </div>
          ))}
        </div>
      </section>

      {documentos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-foreground">Documentos do veículo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {documentos.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand"
              >
                <FileText size={16} />
                {doc.name}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {formatarData(doc.createdAt)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 mb-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Histórico · Linha do tempo</h2>
        <TimelineVeiculo eventos={timeline} />
      </section>
    </div>
  );
}
