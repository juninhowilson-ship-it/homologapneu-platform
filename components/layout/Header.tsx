"use client";

import Link from "next/link";
import { Bell, Settings, ExternalLink } from "lucide-react";
import Logo from "./Logo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";

export default function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="h-16 flex items-center justify-between bg-header px-8 shadow">
      <Link href="/dashboard">
        <Logo />
      </Link>

      <div className="flex items-center gap-5 text-white">
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
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
