"use client";

import { useEffect, useState, type ReactNode } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);

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
            {/* Clicar em qualquer item do menu navega e fecha o drawer —
                sem efeito observando a rota, que dispararia render em
                cascata a cada navegação. */}
            <div
              className="absolute inset-y-0 left-0 w-64 overflow-y-auto shadow-xl"
              onClick={() => setMenuAberto(false)}
            >
              <Sidebar />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
