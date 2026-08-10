import Link from "next/link";
import { LogIn, Mail, MessageCircle } from "lucide-react";
import { CONTATO_EMAIL, SOLICITAR_ACESSO_EMAIL } from "@/lib/constants/contato";

export default function CtaBand() {
  return (
    <section className="bg-[#000000] py-16 border-t border-[#333333]">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
          Já tem uma conta ou quer conhecer a plataforma?
        </h2>
        <p className="mt-3 text-[#888888]">
          O acesso ao HomologaPneu é restrito. Entre com sua conta ou solicite
          liberação para sua equipe.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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
