import Link from "next/link";
import { LogIn, Mail, MessageCircle } from "lucide-react";
import { CONTATO_EMAIL, SOLICITAR_ACESSO_EMAIL } from "@/lib/constants/contato";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#FFB81C]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#FFB81C]/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
        <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-[#FFB81C]/30 bg-[#FFB81C]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#FFB81C]">
          🔒 Acesso restrito e controlado
        </span>

        <h1 className="animate-fade-in-up mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Homologa<span className="text-[#FFB81C]">Pneu</span>
        </h1>

        <p className="animate-fade-in-up mt-4 text-lg text-[#a3a3a3] sm:text-xl">
          A plataforma oficial de homologações de pneus e veículos, com
          documentos rastreáveis, curadoria inteligente e histórico auditável.
        </p>

        <div className="animate-fade-in-up mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-[#FFB81C] text-black px-6 py-3 font-bold transition hover:bg-[#FFC847]"
          >
            <LogIn size={18} />
            Entrar
          </Link>

          <a
            href={`mailto:${SOLICITAR_ACESSO_EMAIL}?subject=${encodeURIComponent(
              "Solicitação de acesso ao HomologaPneu"
            )}`}
            className="flex items-center gap-2 rounded-lg border-2 border-[#FFB81C] text-[#FFB81C] px-6 py-3 font-bold transition hover:bg-[#FFB81C]/10"
          >
            <Mail size={18} />
            Solicitar acesso
          </a>

          <a
            href={`mailto:${CONTATO_EMAIL}`}
            className="flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-[#888888] transition hover:text-[#FFB81C]"
          >
            <MessageCircle size={18} />
            Falar conosco
          </a>
        </div>
      </div>
    </section>
  );
}
