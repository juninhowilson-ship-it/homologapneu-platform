import Link from "next/link";
import { CalendarClock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  VALIDATION_STATUS_LABELS,
  VALIDATION_STATUS_TONE,
} from "@/lib/constants/validacao";
import type { Homologacao } from "@/types/homologacao";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function LatestHomologations({
  homologacoes,
}: {
  homologacoes: Homologacao[];
}) {
  if (homologacoes.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-foreground">
            Últimas homologações adicionadas
          </h2>
          <p className="mt-2 text-muted-foreground">
            Os registros mais recentes incorporados ao Banco Oficial.
          </p>
        </div>
        <Link
          href="/pesquisa"
          className="hidden text-sm font-semibold text-brand hover:underline sm:block"
        >
          Ver pesquisa completa →
        </Link>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {homologacoes.map((h) => (
          <Link
            key={h.id}
            href={`/veiculo/${h.vehicleId}`}
            className="group rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h.manufacturerName}
                </p>
                <h3 className="mt-1 font-bold text-foreground group-hover:text-brand">
                  {h.vehicleLabel}
                </h3>
              </div>
              <Badge tone={VALIDATION_STATUS_TONE[h.validationStatus]}>
                {VALIDATION_STATUS_LABELS[h.validationStatus]}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {h.year} · {h.engine}
            </p>

            {h.originalTire && (
              <p className="mt-3 text-sm font-semibold text-foreground">
                Pneu original: {h.originalTire.size}
              </p>
            )}

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock size={13} />
              Adicionada em {formatarData(h.createdAt)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
