import { BadgeCheck, Car, Shield, Globe, Users } from "lucide-react";
import StatCard from "@/components/ui/StatCard";

/**
 * Números institucionais da faixa de estatísticas (arredondados; página é
 * pública e não consulta o banco por decisão de acesso — ver proxy.ts).
 * Fonte: base de produção em ago/2026.
 */
const ESTATISTICAS = [
  { icone: BadgeCheck, valor: "+1.700", rotulo: "Medidas cadastradas" },
  { icone: Car, valor: "+8.000", rotulo: "Modelos de veículos" },
  { icone: Shield, valor: "+3.000", rotulo: "Homologações" },
  { icone: Globe, valor: "+270", rotulo: "Marcas de pneus" },
  { icone: Users, valor: "+130", rotulo: "Montadoras" },
];

export default function StatsBand() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-surface p-6 sm:grid-cols-3 lg:grid-cols-5">
          {ESTATISTICAS.map((stat) => (
            <StatCard
              key={stat.rotulo}
              icon={stat.icone}
              value={stat.valor}
              label={stat.rotulo}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
