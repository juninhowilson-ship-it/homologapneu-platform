"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  // Navegar fecha o menu mobile
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Trava o scroll da página enquanto o drawer está aberto
  useEffect(() => {
    if (!menuAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [menuAberto]);

  return (
    <div className="min-h-screen bg-surface-muted">
      <Header onToggleMenu={() => setMenuAberto((aberto) => !aberto)} />

      <div className="flex">
        {/* Desktop: sidebar fixa */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile: drawer sobreposto */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              aria-hidden="true"
              onClick={() => setMenuAberto(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto shadow-xl">
              <Sidebar />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
