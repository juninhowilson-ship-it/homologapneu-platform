"use client";

import Logo from "./Logo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";

export default function Header() {

    const { data: user } = useCurrentUser();
    const logout = useLogout();

    return (

        <header className="h-16 bg-header flex items-center justify-between px-8 shadow">

            <Logo />

            <div className="flex items-center gap-6 text-white">

                <button aria-label="Notificações" type="button">
                    🔔
                </button>

                <button aria-label="Configurações" type="button">
                    ⚙️
                </button>

                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="font-semibold leading-tight">{user.name}</p>
                            <p className="text-xs text-white/60 leading-tight">
                                {user.role === "ADMIN" ? "Administrador" : "Usuário"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => logout.mutate()}
                            disabled={logout.isPending}
                            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
                        >
                            Sair
                        </button>
                    </div>
                )}

            </div>

        </header>

    );

}
