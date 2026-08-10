'use client';

import { Gauge } from 'lucide-react';

export default function ComparacaoPage() {
  const specs = [
    { label: 'Índice de Carga', p1: '95Y', p2: '95W' },
    { label: 'Índice de Velocidade', p1: '300 km/h', p2: '270 km/h' },
    { label: 'Categoria', p1: 'Performance', p2: 'Conforto' },
    { label: 'Tecnologia', p1: 'Eco+', p2: 'Eco' },
    { label: 'Durabilidade', p1: '⭐⭐⭐⭐⭐', p2: '⭐⭐⭐⭐' },
    { label: 'Aderência', p1: '⭐⭐⭐⭐⭐', p2: '⭐⭐⭐⭐' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Gauge className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Comparação de Pneus</h1>
            <p className="text-sm text-black/70">Análise lado-a-lado de especificações</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <div className="overflow-x-auto">
          <div className="min-w-full bg-[#1a1a1a] rounded-lg border border-[#333333] overflow-hidden">
            {/* Headers */}
            <div className="grid grid-cols-3 bg-[#2a2a2a] border-b border-[#333333]">
              <div className="p-6 border-r border-[#333333]">
                <p className="text-[#888888] text-sm">Especificação</p>
              </div>
              <div className="p-6 border-r border-[#333333] text-center">
                <p className="font-bold text-[#FFB81C]">ADVAN Sport V107</p>
                <p className="text-xs text-[#888888] mt-1">225/45R18 95Y XL</p>
              </div>
              <div className="p-6 text-center">
                <p className="font-bold text-white">BluEarth-GT AE51</p>
                <p className="text-xs text-[#888888] mt-1">225/40R19 96Y XL</p>
              </div>
            </div>

            {/* Specs */}
            {specs.map((spec, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-[#333333] ${i % 2 === 0 ? 'bg-[#0f0f0f]' : ''}`}>
                <div className="p-6 border-r border-[#333333] text-[#e5e5e5] font-semibold">
                  {spec.label}
                </div>
                <div className="p-6 border-r border-[#333333] text-center text-white">
                  {spec.p1}
                </div>
                <div className="p-6 text-center text-white">
                  {spec.p2}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
