"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Settings, ExternalLink, KeyRound, Menu } from "lucide-react";
import Logo from "./Logo";
import GlobalSearchBar from "./GlobalSearchBar";
import AlterarSenhaModal from "@/components/auth/AlterarSenhaModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";

type Props = {
  onToggleMenu?: () => void;
};

export default function Header({ onToggleMenu }: Props) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [senhaModalAberto, setSenhaModalAberto] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between gap-4 bg-header px-4 shadow sm:px-8 sm:gap-6">
      {onToggleMenu && (
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>
      )}

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
            <span
              aria-hidden
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-brand-foreground sm:flex"
            >
              {user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((parte: string) => parte[0]?.toUpperCase())
                .join("")}
            </span>
            <div className="hidden text-right leading-tight sm:block">
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
