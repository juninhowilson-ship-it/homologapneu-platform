import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";

const NAV = [
  { nome: "Início", rota: "/" },
  { nome: "Pesquisar", rota: "/pesquisa" },
];

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
              Banco Oficial de Homologações
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.rota}
              href={item.rota}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-surface-muted hover:text-foreground"
            >
              {item.nome}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/pesquisa"
            className="hidden items-center gap-2 rounded-lg bg-surface-muted px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-border sm:flex"
          >
            <Search size={16} />
            Pesquisar
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
          >
            <ShieldCheck size={16} />
            Painel administrativo
          </Link>
        </div>
      </div>
    </header>
  );
}
