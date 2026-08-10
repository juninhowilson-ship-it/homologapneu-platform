'use client';

import { Clock, Eye, Heart, BarChart2, Download } from 'lucide-react';

export default function HistoricoPage() {
  const events = [
    { vehicle: 'Toyota Corolla 2024', action: 'Visualizado', date: '2 horas atrás', icon: Eye },
    { vehicle: 'Honda Civic 2023', action: 'Salvo como favorito', date: '5 horas atrás', icon: Heart },
    { vehicle: 'Volkswagen Golf 2022', action: 'Comparação de pneus', date: '1 dia atrás', icon: BarChart2 },
    { vehicle: 'Ford Fiesta 2023', action: 'Baixou documentos', date: '2 dias atrás', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Clock className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Histórico</h1>
            <p className="text-sm text-black/70">Sua atividade na plataforma</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <h2 className="text-2xl font-bold text-white mb-6">📋 Buscas Recentes</h2>
        <div className="space-y-4">
          {events.map((evt, i) => {
            const Icon = evt.icon;
            return (
              <div key={i} className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6 hover:border-[#FFB81C] transition-all flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#FFB81C]/20 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-[#FFB81C]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{evt.vehicle}</h3>
                  <p className="text-sm text-[#888888]">{evt.action}</p>
                </div>
                <span className="text-sm text-[#666666]">{evt.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
