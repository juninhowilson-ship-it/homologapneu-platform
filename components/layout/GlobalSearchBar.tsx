"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { usePesquisaLivre } from "@/hooks/usePesquisaLivre";

const MAX_SUGESTOES = 6;

/**
 * Busca global do header (estilo do mockup): campo único que aceita veículo,
 * medida ou pneu, com sugestões da busca inteligente (fuzzy + aliases) do
 * backend. Enter leva para /pesquisa com o texto; clicar numa sugestão abre o
 * veículo correspondente.
 */
export default function GlobalSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [textoDebounced, setTextoDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTextoDebounced(texto), 300);
    return () => clearTimeout(timer);
  }, [texto]);

  // Sugestões seguem o recorte padrão do produto (2020+); a página de
  // pesquisa permite abrir para os anteriores.
  const { data: resultados, isFetching } = usePesquisaLivre(
    textoDebounced.trim().length >= 2 ? textoDebounced : null
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function submeter() {
    const q = texto.trim();
    if (!q) return;
    setAberto(false);
    router.push(`/pesquisa?q=${encodeURIComponent(q)}`);
  }

  // Uma sugestão por veículo (a busca retorna uma linha por pneu homologado)
  const sugestoes = [];
  const veiculosVistos = new Set<number>();
  for (const r of resultados ?? []) {
    if (veiculosVistos.has(r.veiculoId)) continue;
    veiculosVistos.add(r.veiculoId);
    sugestoes.push(r);
    if (sugestoes.length >= MAX_SUGESTOES) break;
  }

  const mostrarDropdown = aberto && textoDebounced.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-xl md:block">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-brand">
        <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submeter();
            if (event.key === "Escape") setAberto(false);
          }}
          placeholder="Buscar por veículo, pneu ou medida..."
          aria-label="Busca global"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {mostrarDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {sugestoes.length > 0 ? (
            <ul>
              {sugestoes.map((r) => (
                <li key={r.veiculoId}>
                  <Link
                    href={`/veiculo/${r.veiculoId}`}
                    onClick={() => setAberto(false)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-surface-secondary"
                  >
                    <span className="truncate text-foreground">
                      {r.veiculoFabricante} {r.veiculoModelo}{" "}
                      <span className="text-muted-foreground">
                        {r.veiculoVersao}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-brand">
                      {r.pneuMedida}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {isFetching ? "Buscando..." : "Nenhum resultado."}
            </p>
          )}

          <button
            type="button"
            onClick={submeter}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm font-semibold text-brand transition hover:bg-surface-secondary"
          >
            Ver todos os resultados →
          </button>
        </div>
      )}
    </div>
  );
}
