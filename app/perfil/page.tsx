'use client';

import { User, Mail, Phone, Lock, LogOut, Settings } from 'lucide-react';

export default function PerfilPage() {
  const user = {
    name: 'Wilson Júnior',
    email: 'wilson@example.com',
    phone: '(19) 99999-9999',
    role: 'Admin',
    joinDate: 'Janeiro 2024',
    status: 'Ativo',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <User className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Conta</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Meu Perfil</h1>
          <p className="text-sm text-black/70">Gerencie suas informações e configurações</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#003366] to-[#0052CC] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                {user.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{user.name}</h2>
              <p className="text-sm text-[#FFB81C] font-semibold mb-4">{user.role}</p>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>Membro desde {user.joinDate}</p>
                <p className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {user.status}
                </p>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </h3>
              <div className="space-y-4">
                {[
                  { icon: User, label: 'Nome', value: user.name },
                  { icon: Mail, label: 'Email', value: user.email },
                  { icon: Phone, label: 'Telefone', value: user.phone },
                ].map((field, i) => {
                  const Icon = field.icon;
                  return (
                    <div key={i} className="flex items-center gap-4 pb-4 border-b border-[#333333] last:border-0">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{field.label}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{field.value}</p>
                      </div>
                      <button className="text-[#003366] dark:text-[#0052CC] font-semibold hover:underline">Editar</button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Segurança
              </h3>
              <button className="w-full px-4 py-3 rounded-lg border-2 border-[#333333] text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 mb-2">
                <Lock className="w-4 h-4" />
                Alterar Senha
              </button>
              <button className="w-full px-4 py-3 rounded-lg border-2 border-[#333333] text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" />
                Autenticação de Dois Fatores
              </button>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-6">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-4">Zona de Risco</h3>
              <button className="w-full px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" />
                Fazer Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
