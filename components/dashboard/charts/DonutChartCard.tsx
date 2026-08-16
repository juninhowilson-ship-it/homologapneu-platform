"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import EmptyState from "@/components/ui/EmptyState";
import type { RankingItem } from "@/types/dashboard";

const CORES = [
  "var(--chart-cat-3)",
  "var(--chart-cat-1)",
  "var(--chart-cat-2)",
  "var(--chart-cat-5)",
  "var(--chart-cat-6)",
  "var(--chart-cat-7)",
  "var(--chart-cat-8)",
  "var(--chart-cat-4)",
];

type Props = {
  title: string;
  subtitle?: string;
  data: RankingItem[];
  height?: number;
};

export default function DonutChartCard({
  title,
  subtitle,
  data,
  height = 260,
}: Props) {
  const total = data.reduce((soma, item) => soma + item.value, 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="font-bold text-foreground">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}

      {data.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Sem dados suficientes"
            description="Ainda não há dados reais para este indicador."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <div style={{ width: 160, height }} className="relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {total.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                total
              </span>
            </div>
          </div>

          <ul className="w-full space-y-1.5">
            {data.slice(0, 8).map((item, index) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <li
                  key={item.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: CORES[index % CORES.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.value.toLocaleString("pt-BR")}
                    <span className="ml-1.5 text-xs">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
