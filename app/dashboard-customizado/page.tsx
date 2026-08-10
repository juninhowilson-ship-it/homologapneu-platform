'use client';

import { LayoutGrid, Trash2, Plus } from 'lucide-react';

export default function DashboardCustomizadoPage() {
  const widgets = [
    { id: 1, title: 'Homologações Recentes', size: 'large' },
    { id: 2, title: 'Top Fabricantes', size: 'medium' },
    { id: 3, title: 'Taxa Validação', size: 'small' },
    { id: 4, title: 'Busca Rápida', size: 'medium' },
    { id: 5, title: 'Alertas', size: 'small' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-16 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LayoutGrid className="w-8 h-8 text-[#FFB81C]" />
              <div>
                <span className="text-[#FFB81C] font-semibold text-sm uppercase block">Dashboard</span>
                <h1 className="text-4xl font-bold text-white">Meu Dashboard</h1>
              </div>
            </div>
            <button className="px-6 py-2 rounded-lg bg-white text-[#003366] font-semibold hover:bg-gray-100 transition">
              Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Widgets</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Arraste para reorganizar</p>
        </div>

        <div className="grid gap-6">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 bg-[#1a1a1a] hover:border-[#FFB81C] transition cursor-move ${
                widget.size === 'large' ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white">{widget.title}</h3>
                <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 text-red-600 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg mt-4" />
            </div>
          ))}
        </div>

        <button className="mt-8 flex items-center gap-2 px-6 py-3 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
          <Plus className="w-4 h-4" />
          Adicionar Widget
        </button>
      </div>
    </div>
  );
}
