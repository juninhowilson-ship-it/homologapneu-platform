'use client';

import { Settings, Users, BarChart3, Shield, Database, Lock } from 'lucide-react';

export default function AdminPage() {
  const stats = [
    { label: 'Usuários Ativos', value: '1,247', icon: Users },
    { label: 'Dados no Banco', value: '50 GB', icon: Database },
    { label: 'Taxa Cache', value: '94%', icon: BarChart3 },
    { label: 'Segurança', value: 'SSL', icon: Shield },
  ];

  const sections = [
    { name: 'Usuários', description: 'Gerenciar contas e permissões', icon: Users, color: 'from-[#1a5e9e]' },
    { name: 'Dados', description: 'Importar, validar e exportar', icon: Database, color: 'from-[#d97706]' },
    { name: 'Relatórios', description: 'Logs e análise de uso', icon: BarChart3, color: 'from-[#10b981]' },
    { name: 'Configurações', description: 'Sistema e integrações', icon: Settings, color: 'from-[#FFB81C]' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Settings className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Painel de Controle</h1>
            <p className="text-sm text-black/70">Gerencie a plataforma</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg bg-gradient-to-br from-[#1a5e9e] to-[#0f3a6f] p-6 text-white border border-[#333333]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 opacity-60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sections */}
        <h2 className="text-2xl font-bold text-white mb-6">⚙️ Gerenciamento</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.name}
                className={`rounded-lg bg-gradient-to-br ${section.color} to-opacity-50 p-6 text-white border border-[#333333] hover:border-[#FFB81C] cursor-pointer transition-all`}
              >
                <Icon className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="font-bold mb-1">{section.name}</h3>
                <p className="text-sm opacity-80">{section.description}</p>
              </div>
            );
          })}
        </div>

        {/* Security Section */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#FFB81C]" />
            Segurança
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-[#2a2a2a] border border-[#51e0a1]">
              <p className="text-[#51e0a1] text-sm font-bold">✓ SSL/TLS Ativo</p>
              <p className="text-[#888888] text-xs mt-1">Certificado válido até 2025-12-31</p>
            </div>
            <div className="p-4 rounded-lg bg-[#2a2a2a] border border-[#51e0a1]">
              <p className="text-[#51e0a1] text-sm font-bold">✓ 2FA Habilitado</p>
              <p className="text-[#888888] text-xs mt-1">1,247 usuários com autenticação 2 fatores</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
