import { CheckCircle2 } from "lucide-react";

const BENEFICIOS = [
  "Agilidade na consulta de homologações, medidas e documentos oficiais",
  "Curadoria inteligente que cruza múltiplas fontes antes de aprovar um registro",
  "Rastreabilidade completa: toda alteração fica registrada e auditável",
  "Atualização contínua a partir do monitoramento das montadoras",
  "Painel administrativo único para cadastros, documentos e usuários",
  "Acesso controlado — dados sensíveis nunca ficam expostos publicamente",
];

export default function Benefits() {
  return (
    <section className="bg-surface-muted py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground">Benefícios</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Por que times técnicos e comerciais usam o HomologaPneu.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {BENEFICIOS.map((beneficio) => (
            <div
              key={beneficio}
              className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"
            >
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-sm font-medium text-foreground">{beneficio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
