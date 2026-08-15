import { BadgeCheck, Crown } from "lucide-react";

const RECURSOS_ATUAIS = [
  "Pesquisa inteligente por veículo, pneu ou medida",
  "Fichas completas de veículos com medidas homologadas",
  "Centro Técnico e consulta por medida",
  "Minha Garagem e Comparador de Pneus",
  "IA Assistente com respostas baseadas na base oficial",
  "Documentos oficiais rastreáveis",
];

export default function PlanosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Crown size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            Planos e Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground">
            Seu acesso atual e o que vem por aí
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand/40 bg-surface">
        <div className="border-b border-border bg-brand px-6 py-4">
          <p className="text-lg font-extrabold text-brand-foreground">
            Acesso Completo
          </p>
          <p className="text-sm font-medium text-brand-foreground/70">
            Plano atual da sua conta
          </p>
        </div>
        <ul className="space-y-3 p-6">
          {RECURSOS_ATUAIS.map((recurso) => (
            <li key={recurso} className="flex items-start gap-2 text-sm">
              <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand" />
              <span className="text-foreground">{recurso}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center">
        <p className="font-bold text-foreground">
          Planos pagos e API para empresas — em breve
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Estamos preparando níveis de assinatura com API de integração e
          recursos avançados para empresas. Enquanto isso, todo o conteúdo da
          plataforma segue disponível na sua conta.
        </p>
      </div>
    </div>
  );
}
