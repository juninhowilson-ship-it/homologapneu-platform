'use client';

import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';

export default function AnalyticsAvancadoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <BarChart3 className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Analytics</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Analytics Avançado</h1>
          <p className="text-sm text-black/70">Análise profunda de dados e comportamento</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Users, label: 'Usuários Ativos', value: '2.4K', trend: '+12%' },
            { icon: BarChart3, label: 'Consultas/Dia', value: '15.8K', trend: '+8%' },
            { icon: Clock, label: 'Tempo Médio', value: '2.3s', trend: '-5%' },
            { icon: TrendingUp, label: 'Taxa Conversão', value: '34.2%', trend: '+3%' },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="rounded-xl bg-gradient-to-br from-[#003366] to-[#0052CC] text-white p-6 shadow-lg">
                <Icon className="w-6 h-6 mb-3 opacity-70" />
                <p className="text-sm opacity-90">{kpi.label}</p>
                <p className="text-3xl font-bold mt-2">{kpi.value}</p>
                <p className="text-xs mt-2 opacity-75">{kpi.trend} vs. semana anterior</p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {['Tráfego por Hora', 'Usuários por Região', 'Dispositivos', 'Navegadores'].map((chart, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-8 bg-[#1a1a1a]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{chart}</h3>
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">[Gráfico: {chart}]</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
