"use client";

import { type FormEvent } from "react";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  carregando?: boolean;
};

export default function BuscaLivreBox({
  value,
  onChange,
  onSubmit,
  carregando,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm"
    >
      <Search className="ml-2 shrink-0 text-muted-foreground" size={20} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Marca, modelo, medida do pneu ou código de homologação…"
        className="w-full bg-transparent px-1 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={carregando}
        className="shrink-0 rounded-xl bg-brand px-6 py-3 font-bold text-brand-foreground transition hover:bg-brand-hover disabled:opacity-50"
      >
        {carregando ? "Buscando…" : "Pesquisar"}
      </button>
    </form>
  );
}
