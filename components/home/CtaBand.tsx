import Link from "next/link";
import { LogIn, Mail, MessageCircle } from "lucide-react";
import { CONTATO_EMAIL, SOLICITAR_ACESSO_EMAIL } from "@/lib/constants/contato";

export default function CtaBand() {
  return (
    <section className="bg-header py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
          Já tem uma conta ou quer conhecer a plataforma?
        </h2>
        <p className="mt-3 text-white/70">
          O acesso ao HomologaPneu é restrito. Entre com sua conta ou solicite
          liberação para sua equipe.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-bold text-brand-foreground transition hover:bg-brand-hover"
          >
            <LogIn size={18} />
            Entrar
          </Link>

          <a
            href={`mailto:${SOLICITAR_ACESSO_EMAIL}?subject=${encodeURIComponent(
              "Solicitação de acesso ao HomologaPneu"
            )}`}
            className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/15"
          >
            <Mail size={18} />
            Solicitar acesso
          </a>

          <a
            href={`mailto:${CONTATO_EMAIL}`}
            className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white/80 transition hover:text-white"
          >
            <MessageCircle size={18} />
            Falar conosco
          </a>
        </div>
      </div>
    </section>
  );
}
