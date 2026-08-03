'use client';

/**
 * StatCard - Card de métrica para dashboard
 */

import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  trend?: number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

const colorClass = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
};

export function StatCard({
  label,
  value,
  trend,
  icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className={`rounded-lg bg-gradient-to-br ${colorClass[color]} p-6 text-white shadow-lg`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm opacity-90">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        {icon && <div className="text-4xl opacity-80">{icon}</div>}
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-100' : 'text-red-100'}`}>
          {trend >= 0 ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
          <span>{Math.abs(trend)}% vs. mês anterior</span>
        </div>
      )}
    </div>
  );
}
