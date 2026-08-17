import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  className?: string;
};

/**
 * Contador de destaque no estilo do mockup: ícone circular amarelo, número
 * grande e rótulo abaixo. Usado nas faixas de estatísticas (landing, rodapé
 * da página de veículo).
 */
export default function StatCard({ icon: Icon, value, label, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
        <Icon size={20} aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
