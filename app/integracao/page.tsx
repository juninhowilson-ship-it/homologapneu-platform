'use client';

import { Zap, Key, LinkIcon, CheckCircle2 } from 'lucide-react';

export default function IntegracaoPage() {
  const integrations = [
    { name: 'API REST', status: 'Ativo', key: 'sk_live_***', docs: 'Ver docs' },
    { name: 'Webhooks', status: 'Ativo', desc: '5 endpoints configurados', docs: 'Configurar' },
    { name: 'OAuth 2.0', status: 'Ativo', desc: 'Login social habilitado', docs: 'Docs' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Zap className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Desenvolvedores</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Integrações</h1>
          <p className="text-sm text-black/70">Conecte suas aplicações via API, webhooks e OAuth</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {integrations.map((int, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">{int.name}</h3>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{int.desc || int.key}</p>
              <button className="text-[#003366] dark:text-[#0052CC] font-semibold text-sm hover:underline">{int.docs}</button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Chaves de API</h2>
          <div className="space-y-4">
            {['sk_live_...', 'sk_test_...'].map((key, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-900 font-mono">
                <span>{key}</span>
                <button className="text-[#003366] dark:text-[#0052CC] font-semibold">Copiar</button>
              </div>
            ))}
          </div>
          <button className="mt-6 px-6 py-2 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
            Gerar Nova Chave
          </button>
        </div>
      </div>
    </div>
  );
}
