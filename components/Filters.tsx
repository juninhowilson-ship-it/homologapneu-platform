'use client';

import { Filter, X } from 'lucide-react';
import { useState } from 'react';

export function AdvancedFilters() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold hover:border-[#FF6B35] transition"
      >
        <Filter className="w-4 h-4" />
        Filtros Avançados
        {open && <X className="w-4 h-4 ml-auto" />}
      </button>

      {open && (
        <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Fabricante
              </label>
              <select className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option>Todos</option>
                <option>Toyota</option>
                <option>Honda</option>
                <option>Ford</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Validação
              </label>
              <select className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option>Todos</option>
                <option>Validado</option>
                <option>Pendente</option>
                <option>Rejeitado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Período
              </label>
              <select className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option>Últimos 30 dias</option>
                <option>Últimos 90 dias</option>
                <option>Este ano</option>
                <option>Todos</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="flex-1 px-4 py-2 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
              Aplicar
            </button>
            <button className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickFilter({ options }: { options: string[] }) {
  const [active, setActive] = useState(options[0]);

  return (
    <div className="flex gap-2">
      {options.map(option => (
        <button
          key={option}
          onClick={() => setActive(option)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            active === option
              ? 'bg-[#003366] text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
