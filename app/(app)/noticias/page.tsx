import Link from "next/link";
import { FileCheck2, FileText, Newspaper } from "lucide-react";
import { listarNoticias } from "@/services/noticias";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function NoticiasPage() {
  const noticias = await listarNoticias();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Newspaper size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Notícias</h1>
          <p className="text-sm text-muted-foreground">
            Novidades reais da base: homologações publicadas e documentos
            oficiais adicionados
          </p>
        </div>
      </div>

      {noticias.length === 0 ? (
        <EmptyState
          title="Nada por aqui ainda"
          description="Quando novas homologações ou documentos oficiais forem publicados, eles aparecem neste feed."
        />
      ) : (
        <div className="space-y-3">
          {noticias.map((item, index) => {
            const Icone = item.tipo === "HOMOLOGACAO" ? FileCheck2 : FileText;
            const conteudo = (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-brand/50">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Icone size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{item.titulo}</p>
                  <p className="text-sm text-muted-foreground">{item.descricao}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatarData(item.data)}
                </span>
              </div>
            );

            if (!item.link) return <div key={index}>{conteudo}</div>;

            return item.link.startsWith("/") ? (
              <Link key={index} href={item.link} className="block">
                {conteudo}
              </Link>
            ) : (
              <a
                key={index}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {conteudo}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
