"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, Ruler, Factory, FileDigit } from "lucide-react";

const ATALHOS = [
  { label: "Buscar por veículo", campo: "veiculo", icone: Car },
  { label: "Buscar por medida", campo: "medida", icone: Ruler },
  { label: "Buscar por fabricante", campo: "fabricante", icone: Factory },
  { label: "Buscar por código OE", campo: "codigo", icone: FileDigit },
] as const;

export default function HeroSearch() {
  const router = useRouter();
  const [texto, setTexto] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termo = texto.trim();
    router.push(termo ? `/pesquisa?q=${encodeURIComponent(termo)}` : "/pesquisa");
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-black/5"
      >
        <Search className="ml-3 shrink-0 text-muted-foreground" size={22} />
        <input
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Digite a marca, modelo, medida do pneu ou código de homologação…"
          className="w-full bg-transparent px-2 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand px-6 py-3 font-bold text-brand-foreground transition hover:bg-brand-hover"
        >
          Pesquisar
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {ATALHOS.map((atalho) => (
          <a
            key={atalho.campo}
            href={`/pesquisa?campo=${atalho.campo}`}
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <atalho.icone size={15} />
            {atalho.label}
          </a>
        ))}
      </div>
    </div>
  );
}
