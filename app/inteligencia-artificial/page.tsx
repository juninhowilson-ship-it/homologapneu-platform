'use client';

import { Sparkles, Brain, Zap } from 'lucide-react';

export default function IAPage() {
  const features = [
    { title: 'Busca Semântica', desc: 'Entende o significado, não apenas palavras-chave' },
    { title: 'Recomendações', desc: 'Sugere pneus baseado em histórico e padrões' },
    { title: 'Detecção Anomalias', desc: 'Identifica dados suspeitos automaticamente' },
    { title: 'Clustering', desc: 'Agrupa homologações similares' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Brain className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">IA</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Inteligência Artificial</h1>
          <p className="text-sm text-black/70">Recursos alimentados por Machine Learning</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((f, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a] hover:border-[#FFB81C] transition">
              <Sparkles className="w-6 h-6 text-[#FFB81C] mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-[#FFB81C] text-black text-white p-8">
          <div className="flex items-center gap-4 mb-4">
            <Zap className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Assistente de IA</h2>
          </div>
          <p className="text-blue-100 mb-6">Faça perguntas sobre homologações e receba respostas em tempo real</p>
          <input
            type="text"
            placeholder="Ex: Quais pneus são compatíveis com Toyota Corolla 2024?"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
          />
        </div>
      </div>
    </div>
  );
}
