'use client';

import { BarChart3, TrendingUp, PieChart, LineChart } from 'lucide-react';

export default function EstatisticasPage() {
  const charts = [
    { title: 'Homologações por Marca', icon: BarChart3, data: 'Pirelli: 420, Continental: 238, Giti: 142' },
    { title: 'Taxa de Validação', icon: TrendingUp, data: '85% ↑ 12% vs. mês anterior' },
    { title: 'Distribuição de Pneus', icon: PieChart, data: 'Performance: 45%, Conforto: 35%, Eco: 20%' },
    { title: 'Crescimento', icon: LineChart, data: '+15% homologações este mês' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003366] to-[#0052CC] px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <BarChart3 className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-[#FF6B35] font-semibold text-sm uppercase">Dados</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Estatísticas</h1>
          <p className="text-lg text-blue-100">Visualizações e análises em tempo real</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-2 gap-6">
          {charts.map((chart, i) => {
            const Icon = chart.icon;
            return (
              <div key={i} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-white dark:bg-gray-800 hover:border-[#FF6B35] transition">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-[#003366]/10">
                    <Icon className="w-6 h-6 text-[#003366]" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{chart.title}</h3>
                </div>
                <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-gray-500 dark:text-gray-400 text-center">[Gráfico: {chart.data}]</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{chart.data}</p>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-12 rounded-xl bg-gradient-to-r from-[#003366] to-[#0052CC] text-white p-8">
          <h2 className="text-2xl font-bold mb-4">Resumo do Período</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { label: 'Consultas', value: '12.4K' },
              { label: 'Usuários Únicos', value: '847' },
              { label: 'Dados Validados', value: '98.5%' },
              { label: 'Tempo Médio', value: '1.2s' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-sm opacity-90">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
