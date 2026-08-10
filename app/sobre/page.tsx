'use client';

import { CheckCircle2, TrendingUp, Lock, Zap } from 'lucide-react';

export default function SobrePage() {
  const features = [
    { icon: CheckCircle2, title: 'Dados Oficiais', desc: 'Informações rastreadas até documentos oficiais' },
    { icon: TrendingUp, title: 'Curadoria Inteligente', desc: 'IA que cruza múltiplas fontes antes de aprovar' },
    { icon: Lock, title: 'Segurança', desc: 'Dados sensíveis protegidos com acesso controlado' },
    { icon: Zap, title: 'Velocidade', desc: 'Busca instantânea com resultados otimizados' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-3">Sobre HomologaPneu</h1>
          <p className="text-sm text-black/70 max-w-2xl">
            Plataforma independente que consolida dados oficiais de homologações com curadoria inteligente
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        {/* Mission */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Missão</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
            Facilitar a busca e verificação de homologações de pneus e veículos com dados oficiais,
            rastreáveis e confiáveis. Eliminamos a necessidade de consultar múltiplas fontes.
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Como Funciona</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="rounded-xl border-2 border-[#333333] bg-[#1a1a1a] p-6 hover:border-[#FFB81C] transition">
                  <Icon className="w-8 h-8 text-[#FFB81C] mb-3" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Homologações', value: '10.000+' },
            { label: 'Modelos', value: '8.000+' },
            { label: 'Marcas', value: '132' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl bg-gradient-to-br from-[#003366] to-[#0052CC] text-white p-8">
              <p className="text-sm font-medium opacity-90 mb-2">{stat.label}</p>
              <p className="text-4xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
