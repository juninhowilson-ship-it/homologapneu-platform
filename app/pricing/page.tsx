'use client';

import { Check } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    { name: 'Básico', price: 'Grátis', features: ['Busca básica', '10 favs', 'Suporte por email'] },
    { name: 'Pro', price: '$29', features: ['Busca avançada', '∞ favs', 'Comparação', 'Relatórios', 'Suporte prioritário', 'API acesso'] },
    { name: 'Enterprise', price: 'Customizado', features: ['Tudo no Pro', 'Webhooks', 'SSO', 'SLA 99.9%', 'Suporte 24/7', 'Integrações'] },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-3">Planos Simples e Transparentes</h1>
          <p className="text-sm text-black/70">Escolha o plano certo para você</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`border-2 rounded-xl p-8 transition ${
              i === 1
                ? 'border-[#FF6B35] bg-[#1a1a1a] scale-105 shadow-2xl'
                : 'border-[#333333] bg-[#1a1a1a]'
            }`}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
              <p className="text-4xl font-bold text-[#003366] dark:text-[#0052CC] mb-6">{plan.price}<span className="text-lg">/mês</span></p>
              <button className={`w-full px-6 py-3 rounded-lg font-semibold mb-8 transition ${
                i === 1
                  ? 'bg-[#FFB81C] text-white hover:bg-[#E85A25]'
                  : 'border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                Começar
              </button>
              <div className="space-y-3">
                {plan.features.map((feat, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
