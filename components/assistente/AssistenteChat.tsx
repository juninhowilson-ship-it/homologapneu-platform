"use client";

import { useRef, useState, useEffect } from "react";
import { Bot, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MensagemAssistente } from "@/services/ai/assistente";

type Props = {
  /** Contexto opcional enviado ao backend (ex.: veículo da página atual) */
  contexto?: string;
  /** Altura da área de mensagens (classe Tailwind) */
  alturaClasse?: string;
  className?: string;
};

const MENSAGEM_INICIAL: MensagemAssistente = {
  autor: "assistente",
  texto:
    "Olá! Posso ajudar com informações sobre pneus, medidas e homologações registradas na base. Pergunte algo como \"quais medidas são homologadas para o Corolla 2020?\"",
};

export default function AssistenteChat({
  contexto,
  alturaClasse = "h-80",
  className,
}: Props) {
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([
    MENSAGEM_INICIAL,
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
  }, [mensagens, enviando]);

  async function enviar() {
    const pergunta = texto.trim();
    if (!pergunta || enviando) return;

    const novoHistorico: MensagemAssistente[] = [
      ...mensagens,
      { autor: "usuario", texto: pergunta },
    ];
    setMensagens(novoHistorico);
    setTexto("");
    setEnviando(true);

    try {
      const response = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta,
          contexto,
          // Sem a mensagem de boas-vindas; só as últimas trocas, truncadas —
          // o backend valida no máximo 20 mensagens de 2000 caracteres e o
          // serviço usa apenas as 6 últimas.
          historico: novoHistorico
            .slice(1, -1)
            .slice(-6)
            .map((m) => ({ ...m, texto: m.texto.slice(0, 2000) })),
        }),
      });

      const data = await response.json().catch(() => null);
      const resposta = response.ok
        ? data?.resposta ?? "Não consegui responder agora."
        : data?.error ?? "Não consegui responder agora. Tente novamente.";

      setMensagens((atual) => [...atual, { autor: "assistente", texto: resposta }]);
    } catch {
      setMensagens((atual) => [
        ...atual,
        {
          autor: "assistente",
          texto: "Falha de conexão. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-5 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Bot size={16} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">IA Assistente</h2>
          <p className="text-[11px] text-muted-foreground">
            Respostas baseadas apenas nos dados homologados da base
          </p>
        </div>
      </div>

      <div
        ref={listaRef}
        className={cn("flex-1 space-y-3 overflow-y-auto p-4", alturaClasse)}
      >
        {mensagens.map((m, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm",
              m.autor === "usuario"
                ? "ml-auto bg-brand text-brand-foreground"
                : "bg-surface-secondary text-foreground"
            )}
          >
            {m.texto}
          </div>
        ))}
        {enviando && (
          <div className="max-w-[85%] rounded-xl bg-surface-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
            Consultando a base...
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          type="text"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") enviar();
          }}
          placeholder="Pergunte algo..."
          aria-label="Pergunta para o assistente"
          disabled={enviando}
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand disabled:opacity-60"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          aria-label="Enviar pergunta"
          className="rounded-lg bg-brand p-2.5 text-brand-foreground transition hover:bg-brand-hover disabled:opacity-50"
        >
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  );
}
