'use client';

import { Heart, Share2, Trash2 } from 'lucide-react';

export default function FavoritosPage() {
  const favorites = [
    { vehicle: 'Toyota Corolla 2024 2.0 XEi', tires: 4, confidence: 98 },
    { vehicle: 'Honda Civic 2023 1.5 EX', tires: 3, confidence: 95 },
    { vehicle: 'Volkswagen Golf 2022 1.4', tires: 4, confidence: 92 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#FFB81C] text-black px-6 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <Heart className="w-6 h-6 fill-current" />
          <div>
            <h1 className="text-2xl font-bold">Meus Favoritos</h1>
            <p className="text-sm text-black/70">Homologações salvas para acesso rápido</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-6 py-12 sm:px-12">
        {favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map((fav, i) => (
              <div key={i} className="rounded-lg border border-[#333333] bg-[#1a1a1a] p-6 hover:border-[#FFB81C] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-2">{fav.vehicle}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#888888]">🛞 {fav.tires} pneus</span>
                      <span className="text-[#FFB81C] font-bold">{fav.confidence}% confiança</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-[#2a2a2a] text-[#FFB81C] hover:bg-[#FFB81C]/20 transition">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg bg-[#2a2a2a] text-red-400 hover:bg-red-500/20 transition">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-[#888888] mx-auto mb-4 opacity-50" />
            <p className="text-[#888888] text-lg">Nenhum favorito salvo ainda</p>
            <p className="text-[#666666] text-sm mt-2">Clique no ❤️ em uma homologação para salvá-la aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
