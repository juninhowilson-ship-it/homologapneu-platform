'use client';

import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImportacaoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Upload className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Dados</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Importar Dados</h1>
          <p className="text-sm text-black/70">Carregue arquivos CSV, XLSX ou JSON</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-[#FF6B35] rounded-xl p-12 text-center bg-[#1a1a1a] mb-8">
          <Upload className="w-12 h-12 text-[#FFB81C] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Arraste arquivos aqui</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">ou clique para selecionar</p>
          <button className="px-6 py-3 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
            Selecionar Arquivo
          </button>
        </div>

        {/* Formats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {['CSV', 'XLSX', 'JSON'].map((fmt, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 text-center bg-[#1a1a1a]">
              <FileText className="w-8 h-8 text-[#003366] mx-auto mb-2" />
              <h3 className="font-bold text-gray-900 dark:text-white">{fmt}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Suportado</p>
            </div>
          ))}
        </div>

        {/* Recent Uploads */}
        <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Importações Recentes</h3>
          <div className="space-y-3">
            {[
              { file: 'homologacoes_08_2024.csv', date: '2 horas atrás', status: 'Sucesso', count: '245 registros' },
              { file: 'pneus_update.xlsx', date: '1 dia atrás', status: 'Sucesso', count: '1.823 registros' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.file}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.date} • {item.count}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
