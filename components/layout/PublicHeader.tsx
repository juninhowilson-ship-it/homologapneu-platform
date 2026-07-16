import Link from "next/link";
import { LogIn } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-brand-foreground">
            HP
          </div>
          <div className="leading-tight">
            <p className="font-bold text-foreground">HomologaPneu</p>
            <p className="text-[11px] text-muted-foreground">
              Plataforma de Homologações
            </p>
          </div>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
        >
          <LogIn size={16} />
          Entrar
        </Link>
      </div>
    </header>
  );
}
