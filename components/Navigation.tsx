'use client';

import Link from 'next/link';
import { Menu, X, User, Search, Heart, Clock, Bell } from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#000000] border-b border-[#333333]">
      <div className="max-w-full mx-auto px-6 sm:px-12">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFB81C] flex items-center justify-center">
              <span className="text-black font-bold text-xs">⌛</span>
            </div>
            <span className="font-bold text-white hidden sm:inline text-sm">HomologaPneu</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] rounded-lg border border-[#333333] w-full">
              <Search className="w-4 h-4 text-[#888888]" />
              <input
                type="text"
                placeholder="Buscar veículo, marca ou medida..."
                className="bg-transparent text-white placeholder-[#888888] text-sm outline-none flex-1"
              />
            </div>
          </div>

          {/* Right Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Favoritos */}
            <button className="p-2 text-[#888888] hover:text-[#FFB81C] transition rounded-lg hover:bg-[#2a2a2a]">
              <Heart className="w-5 h-5" />
            </button>

            {/* Histórico */}
            <button className="p-2 text-[#888888] hover:text-[#FFB81C] transition rounded-lg hover:bg-[#2a2a2a]">
              <Clock className="w-5 h-5" />
            </button>

            {/* Notificações */}
            <button className="p-2 text-[#888888] hover:text-[#FFB81C] transition rounded-lg hover:bg-[#2a2a2a] relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FFB81C] rounded-full"></span>
            </button>

            {/* Profile */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] border border-[#333333] hover:border-[#FFB81C] transition">
              <div className="w-5 h-5 rounded-full bg-[#FFB81C] flex items-center justify-center text-black text-xs font-bold">
                W
              </div>
              <span className="text-white text-xs">Wilson</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[#888888]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#333333] py-4 space-y-2">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full px-3 py-2 bg-[#2a2a2a] text-white placeholder-[#888888] rounded-lg border border-[#333333] text-sm"
            />
          </div>
        )}
      </div>
    </nav>
  );
}
