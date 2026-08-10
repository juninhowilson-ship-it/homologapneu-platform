'use client';

import { Package, Star, Download } from 'lucide-react';

export default function MarketplacePage() {
  const extensions = [
    { name: 'Integração Shopify', rating: 4.8, downloads: '1.2K', price: 'Grátis' },
    { name: 'Export Excel Avançado', rating: 4.9, downloads: '2.8K', price: '$9.99' },
    { name: 'Webhook Manager', rating: 4.7, downloads: '856', price: 'Grátis' },
    { name: 'Analytics Dashboard', rating: 4.6, downloads: '1.5K', price: '$19.99' },
    { name: 'Validação IA', rating: 4.9, downloads: '2.1K', price: '$29.99' },
    { name: 'API GraphQL', rating: 4.8, downloads: '932', price: 'Grátis' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="relative overflow-hidden bg-[#FFB81C] text-black px-6 py-20 sm:px-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FFB81C] opacity-5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Package className="w-8 h-8 text-[#FFB81C]" />
            <span className="text-[#FFB81C] font-semibold text-sm uppercase">Extensões</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Marketplace</h1>
          <p className="text-sm text-black/70">Expanda funcionalidades com extensões e plugins</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 sm:px-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {extensions.map((ext, i) => (
            <div key={i} className="border-2 border-[#333333] rounded-xl p-6 bg-[#1a1a1a] hover:border-[#FFB81C] transition">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#003366] to-[#0052CC]" />
                <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                  {ext.price}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{ext.name}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#FFB81C] fill-[#FF6B35]" />
                  {ext.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {ext.downloads}
                </span>
              </div>
              <button className="w-full px-4 py-2 rounded-lg bg-[#003366] text-white font-semibold hover:bg-[#0052CC] transition">
                Instalar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
