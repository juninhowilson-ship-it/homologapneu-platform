'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const steps = [
    { num: 1, title: 'Criar Conta', desc: 'Registre-se gratuitamente', status: 'Completo' },
    { num: 2, title: 'Configurar Perfil', desc: 'Adicione suas informações', status: 'Completo' },
    { num: 3, title: 'Primeira Busca', desc: 'Experimente a busca inteligente', status: 'Ativo' },
    { num: 4, title: 'Explorar Dados', desc: 'Navegue pelo catálogo completo', status: 'Pendente' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-3">Bem-vindo ao HomologaPneu!</h1>
          <p className="text-sm text-black/70">Vamos começar com um tour rápido pela plataforma</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:px-12">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                step.status === 'Completo' ? 'bg-green-500' :
                step.status === 'Ativo' ? 'bg-[#003366]' :
                'bg-gray-300 dark:bg-gray-600'
              }`}>
                {step.status === 'Completo' ? <CheckCircle2 className="w-6 h-6" /> : step.num}
              </div>
              <div className="flex-1 border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    step.status === 'Completo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                    step.status === 'Ativo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                  }`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
