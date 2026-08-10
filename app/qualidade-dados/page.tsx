'use client';

import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

export default function QualidadeDadosPage() {
  const metrics = [
    { name: 'Completude', score: 98, status: 'Excelente' },
    { name: 'Acurácia', score: 96, status: 'Excelente' },
    { name: 'Consistência', score: 94, status: 'Muito Bom' },
    { name: 'Atualização', score: 92, status: 'Muito Bom' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Qualidade</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Qualidade de Dados</h1>
          <p className="text-sm text-black/70">Métricas e relatórios de qualidade em tempo real</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{m.name}</p>
              <p className="text-4xl font-bold text-[#003366] dark:text-[#0052CC] mb-2">{m.score}%</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-[#FFB81C] text-black h-full rounded-full" style={{ width: `${m.score}%` }} />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-3">{m.status}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Questões Identificadas</h2>
          <div className="space-y-4">
            {[
              { msg: '5 registros com campo motor vazio', sev: 'Baixa' },
              { msg: '2 homologações com ano inconsistente', sev: 'Média' },
              { msg: 'Continental: 3 modelos duplicados', sev: 'Média' },
            ].map((issue, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{issue.msg}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Severidade: {issue.sev}</p>
                </div>
                <button className="text-[#003366] dark:text-[#0052CC] font-semibold text-sm">Resolver</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
