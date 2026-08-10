'use client';

import { Bell, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function AlertasPage() {
  const alerts = [
    { type: 'new', title: 'Nova Homologação', message: 'Toyota Corolla 2025 foi adicionada', time: '2 horas atrás', icon: CheckCircle2, color: 'text-[#51e0a1]', bg: 'bg-[#1a5e3d]' },
    { type: 'update', title: 'Atualização Importante', message: 'Documentos do Ford Fiesta 2023 foram atualizados', time: '5 horas atrás', icon: AlertCircle, color: 'text-[#FFB81C]', bg: 'bg-[#5a4a1a]' },
    { type: 'info', title: 'Dica', message: 'Compare pneus para encontrar as melhores opções para seu veículo', time: '1 dia atrás', icon: Info, color: 'text-[#60a5fa]', bg: 'bg-[#1a3a5a]' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Notificações</h1>
            <p className="text-sm text-black/70">Alertas e atualizações da plataforma</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        <h2 className="text-2xl font-bold text-white mb-6">🔔 Seus Alertas</h2>
        <div className="space-y-4">
          {alerts.map((alert, i) => {
            const Icon = alert.icon;
            return (
              <div key={i} className={`rounded-lg border-l-4 ${alert.bg} p-6 border border-[#333333]`}>
                <div className="flex items-start gap-4">
                  <Icon className={`w-6 h-6 ${alert.color} mt-1 shrink-0`} />
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{alert.title}</h3>
                    <p className="text-[#888888] text-sm mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs text-[#666666] shrink-0">{alert.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
