'use client';

import { ReactNode } from 'react';

export function HeroCard({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string | number; trend?: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[#003366] to-[#0052CC] p-6 text-white shadow-lg hover:shadow-2xl transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-90">{label}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
          {trend && <p className="text-xs mt-2 opacity-75">{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</p>}
        </div>
        <Icon className="w-10 h-10 opacity-80" />
      </div>
    </div>
  );
}

export function DataCard({ title, value, subtitle, onClick }: { title: string; value: string | number; subtitle?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${onClick ? 'cursor-pointer hover:border-[#FF6B35]' : ''} transition`}>
      <p className="text-xs uppercase text-gray-600 dark:text-gray-400 font-semibold">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden hover:border-[#FF6B35] transition">
      {children}
    </div>
  );
}

export function BadgeTag({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const styles = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[variant]}`}>{label}</span>;
}
