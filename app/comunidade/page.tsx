'use client';

import { Users, MessageCircle, Star, TrendingUp } from 'lucide-react';

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Users className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Comunidade</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Comunidade HomologaPneu</h1>
          <p className="text-sm text-black/70">Conecte-se com outros profissionais</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Users, label: 'Membros Ativos', value: '4.2K', color: 'from-blue-500' },
            { icon: MessageCircle, label: 'Discussões', value: '892', color: 'from-purple-500' },
            { icon: Star, label: 'Contribuições', value: '1.2K', color: 'from-orange-500' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`rounded-xl bg-gradient-to-br ${stat.color} to-opacity-80 text-white p-6 shadow-lg`}>
                <Icon className="w-6 h-6 mb-3 opacity-70" />
                <p className="text-sm opacity-90">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Discussões Recentes</h3>
            <div className="space-y-4">
              {[
                { title: 'Novo padrão ABNT para pneus', replies: 23 },
                { title: 'Melhor prática em validação', replies: 18 },
                { title: 'Integração com sistemas ERP', replies: 12 },
              ].map((disc, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{disc.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{disc.replies} respostas</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Eventos</h3>
            <div className="space-y-4">
              {[
                { title: 'Webinar: IA em Validação', date: 'Set 15' },
                { title: 'Workshop: API REST', date: 'Set 22' },
                { title: 'Meetup São Paulo', date: 'Set 29' },
              ].map((evt, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{evt.title}</p>
                  <p className="text-xs text-[#FFB81C] mt-1">📅 {evt.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
