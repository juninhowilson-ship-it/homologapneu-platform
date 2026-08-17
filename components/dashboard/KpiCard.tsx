import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Card em destaque: fundo com o acento da marca e número maior. */
  destaque?: boolean;
  className?: string;
};

function formatarValor(valor: string | number) {
  return typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor;
}

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icone,
  destaque = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 transition",
        destaque
          ? "border-brand/40 bg-gradient-to-br from-brand/15 via-surface to-surface"
          : "border-border bg-surface hover:border-brand/40",
        className
      )}
    >
      {Icone && (
        <Icone
          size={destaque ? 22 : 18}
          aria-hidden
          className={cn(
            "mb-3",
            destaque ? "text-brand" : "text-muted-foreground group-hover:text-brand"
          )}
        />
      )}

      <p
        className={cn(
          "font-bold tabular-nums leading-none text-foreground",
          destaque ? "text-4xl" : "text-2xl"
        )}
      >
        {formatarValor(value)}
      </p>

      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>

      {hint && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/80">
          {hint}
        </p>
      )}
    </div>
  );
}
