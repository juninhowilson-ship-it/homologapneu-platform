"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Settings, ExternalLink, KeyRound } from "lucide-react";
import Logo from "./Logo";
import GlobalSearchBar from "./GlobalSearchBar";
import AlterarSenhaModal from "@/components/auth/AlterarSenhaModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";

export default function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [senhaModalAberto, setSenhaModalAberto] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between gap-6 bg-header px-8 shadow">
      <Link href="/dashboard" className="shrink-0">
        <Logo />
      </Link>

      <GlobalSearchBar />

      <div className="flex shrink-0 items-center gap-5 text-white">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white sm:flex"
        >
          Site público
          <ExternalLink size={14} />
        </Link>

        <button
          aria-label="Notificações"
          type="button"
          className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Bell size={18} />
        </button>

        <button
          aria-label="Configurações"
          type="button"
          className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Settings size={18} />
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-white/10 pl-5">
            <div className="text-right leading-tight">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-white/60">
                {user.role === "ADMIN" ? "Administrador" : "Usuário"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSenhaModalAberto(true)}
              title="Trocar senha"
              aria-label="Trocar senha"
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <KeyRound size={18} />
            </button>

            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
            >
              Sair
            </button>
          </div>
        )}
      </div>

      <AlterarSenhaModal
        open={senhaModalAberto}
        onClose={() => setSenhaModalAberto(false)}
      />
    </header>
  );
}
