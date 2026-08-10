'use client';

import { Settings, Bell, Lock, Palette, Database } from 'lucide-react';

export default function ConfiguracoesPage() {
  const sections = [
    { icon: Bell, title: 'Notificações', desc: 'Email, push e SMS' },
    { icon: Palette, title: 'Aparência', desc: 'Tema e idioma' },
    { icon: Lock, title: 'Privacidade', desc: 'Dados e segurança' },
    { icon: Database, title: 'Banco de Dados', desc: 'Backup e sincronização' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003366] to-[#0052CC] px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF6B35] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Settings className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-[#FF6B35] font-semibold text-sm uppercase">Sistema</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Configurações</h1>
          <p className="text-lg text-blue-100">Personalize sua experiência na plataforma</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-2 gap-6">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <div key={i} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 hover:border-[#FF6B35] transition cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[#003366]/10 group-hover:bg-[#FF6B35]/10 transition">
                    <Icon className="w-6 h-6 text-[#003366] group-hover:text-[#FF6B35] transition" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{section.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{section.desc}</p>
                  </div>
                  <span className="text-[#003366] dark:text-[#0052CC]">›</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle Options */}
        <div className="mt-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Preferências</h2>
          <div className="space-y-4">
            {[
              { label: 'Notificações por Email', enabled: true },
              { label: 'Modo Escuro', enabled: true },
              { label: 'Autosalvar', enabled: true },
              { label: 'Analytics', enabled: false },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                <label className="font-semibold text-gray-900 dark:text-white">{pref.label}</label>
                <input type="checkbox" defaultChecked={pref.enabled} className="w-5 h-5 rounded cursor-pointer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
