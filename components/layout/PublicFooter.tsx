import Link from "next/link";
import { CONTATO_EMAIL, SOLICITAR_ACESSO_EMAIL } from "@/lib/constants/contato";

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-brand-foreground">
              HP
            </div>
            <p className="font-bold text-foreground">HomologaPneu</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Plataforma de homologações de pneus e veículos, com documentos
            oficiais, curadoria inteligente e histórico auditável. Acesso
            restrito.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Acesso</p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Entrar
            </Link>
            <a
              href={`mailto:${SOLICITAR_ACESSO_EMAIL}?subject=${encodeURIComponent(
                "Solicitação de acesso ao HomologaPneu"
              )}`}
              className="hover:text-foreground"
            >
              Solicitar acesso
            </a>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Contato</p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <a href={`mailto:${CONTATO_EMAIL}`} className="hover:text-foreground">
              Falar conosco
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HomologaPneu. Todos os direitos reservados.
      </div>
    </footer>
  );
}
