'use client';

import { Shield, Lock, Eye, Key } from 'lucide-react';

export default function SegurancaPage() {
  const features = [
    { icon: Lock, title: 'Criptografia TLS 1.3', desc: 'Todas as conexões são criptografadas' },
    { icon: Key, title: 'Autenticação 2FA', desc: 'Proteja sua conta com dois fatores' },
    { icon: Eye, title: 'Auditoria Completa', desc: 'Rastreie todas as ações e acesso' },
    { icon: Shield, title: 'GDPR Compliant', desc: 'Conformidade total com regulamentações' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Confiança</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Segurança & Compliance</h1>
          <p className="text-sm text-black/70">Seus dados estão seguros com nós</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a]">
                <Icon className="w-8 h-8 text-[#FFB81C] mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Certificações</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {['ISO 27001', 'SOC 2', 'GDPR', 'CCPA'].map((cert, i) => (
              <div key={i} className="text-center p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <Shield className="w-6 h-6 text-[#003366] mx-auto mb-2" />
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{cert}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Certificado</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
