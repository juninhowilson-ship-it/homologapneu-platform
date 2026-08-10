'use client';

import { Zap, Copy, Trash2, Plus, Check } from 'lucide-react';

export default function WebhooksPage() {
  const webhooks = [
    { url: 'https://app.example.com/webhooks/homolog', event: 'homologacao.criada', status: 'Ativo', lastCall: '5 min' },
    { url: 'https://app.example.com/webhooks/pneus', event: 'pneu.atualizado', status: 'Ativo', lastCall: '2 horas' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Zap className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Webhooks</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Webhooks</h1>
          <p className="text-sm text-black/70">Receba notificações em tempo real de eventos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="flex justify-end mb-8">
          <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
            <Plus className="w-4 h-4" />
            Novo Webhook
          </button>
        </div>

        <div className="space-y-4">
          {webhooks.map((wh, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mb-2">{wh.url}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">{wh.event}</span>
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      {wh.status}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">Última: {wh.lastCall}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
