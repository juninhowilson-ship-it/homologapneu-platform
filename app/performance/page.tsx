'use client';

import { Zap, Activity, Gauge, Server } from 'lucide-react';

export default function PerformancePage() {
  const metrics = [
    { icon: Zap, label: 'Tempo de Resposta', value: '145ms', status: 'Rápido' },
    { icon: Activity, label: 'Uptime', value: '99.98%', status: 'Excelente' },
    { icon: Gauge, label: 'Taxa Erro', value: '0.02%', status: 'Ótimo' },
    { icon: Server, label: 'Latência DB', value: '12ms', status: 'Rápido' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Gauge className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Monitor</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Performance</h1>
          <p className="text-sm text-black/70">Monitoramento em tempo real da plataforma</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="rounded-xl bg-gradient-to-br from-[#003366] to-[#0052CC] text-white p-6 shadow-lg">
                <Icon className="w-6 h-6 mb-3 opacity-70" />
                <p className="text-sm opacity-90">{m.label}</p>
                <p className="text-3xl font-bold mt-2">{m.value}</p>
                <p className="text-xs mt-2 opacity-75">{m.status}</p>
              </div>
            );
          })}
        </div>

        {/* Graphs */}
        <div className="grid md:grid-cols-2 gap-6">
          {['CPU', 'Memória', 'Requisições/seg', 'Erros/hora'].map((chart, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{chart}</h3>
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">[Gráfico: {chart}]</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
