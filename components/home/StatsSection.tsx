import { Factory, Layers, Car, FileCheck2, FileText, Clock, type LucideIcon } from "lucide-react";
import type { EstatisticasPublicas } from "@/services/publico";

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function formatarAtualizacao(iso: string | null) {
  if (!iso) return "—";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 30) return `Há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `Há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

type Stat = { label: string; value: string; icone: LucideIcon };

export default function StatsSection({ stats }: { stats: EstatisticasPublicas }) {
  const itens: Stat[] = [
    { label: "Fabricantes", value: formatarNumero(stats.fabricantes), icone: Factory },
    { label: "Modelos", value: formatarNumero(stats.modelos), icone: Layers },
    { label: "Versões", value: formatarNumero(stats.versoes), icone: Car },
    { label: "Homologações", value: formatarNumero(stats.homologacoes), icone: FileCheck2 },
    { label: "Documentos Oficiais", value: formatarNumero(stats.documentosOficiais), icone: FileText },
    { label: "Atualizações", value: formatarAtualizacao(stats.ultimaAtualizacao), icone: Clock },
  ];

  return (
    <section className="mx-auto -mt-10 max-w-6xl px-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {itens.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-white p-5 text-center shadow-lg shadow-black/5"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <item.icone size={20} />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{item.value}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
