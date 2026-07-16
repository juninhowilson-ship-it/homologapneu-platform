import { FileSearch, BrainCircuit, History, ShieldCheck } from "lucide-react";

const PASSOS = [
  {
    titulo: "Documentos Oficiais",
    descricao:
      "Cada homologação é rastreada até o documento oficial da montadora ou órgão regulador que a originou — manual, catálogo técnico ou boletim de homologação.",
    icone: FileSearch,
  },
  {
    titulo: "Curadoria Inteligente",
    descricao:
      "Um pipeline de curadoria compara evidências de múltiplas fontes independentes antes de aprovar um registro, reduzindo erros e divergências.",
    icone: BrainCircuit,
  },
  {
    titulo: "Histórico",
    descricao:
      "Toda alteração fica registrada em uma linha do tempo auditável: o que mudou, quando e a partir de qual fonte ou lote de importação.",
    icone: History,
  },
  {
    titulo: "Confiabilidade",
    descricao:
      "Cada registro exibe seu status de validação — Validado, Necessita Validação ou Rejeitado — para que você saiba o quanto pode confiar na informação.",
    icone: ShieldCheck,
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground">Como funciona</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          O HomologaPneu consolida e verifica dados oficiais para que a
          consulta seja rápida — e confiável.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map((passo) => (
          <div
            key={passo.titulo}
            className="rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <passo.icone size={22} />
            </div>
            <h3 className="mt-4 font-bold text-foreground">{passo.titulo}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{passo.descricao}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
