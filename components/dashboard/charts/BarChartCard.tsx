"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import type { RankingItem } from "@/types/dashboard";

const CATEGORICAL_COLORS = [
  "var(--chart-cat-1)",
  "var(--chart-cat-2)",
  "var(--chart-cat-3)",
  "var(--chart-cat-4)",
  "var(--chart-cat-5)",
  "var(--chart-cat-6)",
  "var(--chart-cat-7)",
  "var(--chart-cat-8)",
];

type Props = {
  title: string;
  subtitle?: string;
  data: RankingItem[];
  colorMode?: "sequential" | "categorical";
  height?: number;
};

export default function BarChartCard({
  title,
  subtitle,
  data,
  colorMode = "sequential",
  height = 280,
}: Props) {
  return (
    <Card>
      <h3 className="text-lg font-bold">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      {data.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Sem dados suficientes"
            description="Ainda não há dados reais para este indicador."
          />
        </div>
      ) : (
        <div style={{ width: "100%", height }} className="mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                stroke="var(--chart-axis)"
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-muted)" }}
                contentStyle={{
                  background: "var(--chart-tooltip-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      colorMode === "categorical"
                        ? CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
                        : "var(--chart-sequential)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
