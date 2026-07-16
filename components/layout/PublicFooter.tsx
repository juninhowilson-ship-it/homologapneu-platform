import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-brand-foreground">
              HP
            </div>
            <p className="font-bold text-foreground">HomologaPneu</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Banco Oficial Brasileiro de Homologações de Pneus, construído a
            partir de documentos e fontes oficiais das montadoras.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Produto</p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Início
            </Link>
            <Link href="/pesquisa" className="hover:text-foreground">
              Pesquisa inteligente
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Institucional</p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/#como-funciona" className="hover:text-foreground">
              Como funciona
            </Link>
            <Link href="/#fontes-oficiais" className="hover:text-foreground">
              Fontes oficiais
            </Link>
            <Link href="/status" className="hover:text-foreground">
              Status do sistema
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Acesso</p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Painel administrativo
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HomologaPneu. Dados consolidados a partir
        de fontes oficiais — sujeitos a atualização.
      </div>
    </footer>
  );
}
