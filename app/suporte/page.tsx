'use client';

import { HelpCircle, MessageCircle, Mail, BookOpen, ChevronRight } from 'lucide-react';

export default function SuportePage() {
  const faqs = [
    { q: 'Como buscar uma homologação?', a: 'Use a barra de busca ou filtros avançados' },
    { q: 'Posso comparar pneus?', a: 'Sim, acesse a página de comparação' },
    { q: 'Como exportar dados?', a: 'Vá em Relatórios > Exportar' },
    { q: 'Qual é o limite de requisições à API?', a: '1000 requisições/hora' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <HelpCircle className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Ajuda</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Central de Suporte</h1>
          <p className="text-sm text-black/70">Encontre respostas e entre em contato com nossa equipe</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        {/* Contact Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: MessageCircle, title: 'Chat', desc: 'Fale conosco agora' },
            { icon: Mail, title: 'Email', desc: 'suporte@homologapneu.com' },
            { icon: BookOpen, title: 'Documentação', desc: 'Guias e tutoriais' },
          ].map((opt, i) => {
            const Icon = opt.icon;
            return (
              <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a] hover:border-[#FFB81C] transition cursor-pointer">
                <Icon className="w-8 h-8 text-[#FFB81C] mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{opt.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{opt.desc}</p>
              </div>
            );
          })}
        </div>

        {/* FAQs */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Perguntas Frequentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a] hover:border-[#FFB81C] transition cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                {faq.q}
                <ChevronRight className="w-5 h-5 group-open:rotate-90 transition" />
              </summary>
              <p className="text-gray-600 dark:text-gray-400 mt-4">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
