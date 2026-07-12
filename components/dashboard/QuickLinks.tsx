import Link from "next/link";
import Card from "@/components/ui/Card";

const ATALHOS = [
  { titulo: "Pesquisa Inteligente", rota: "/pesquisa", icone: "🔍" },
  { titulo: "Centro Técnico", rota: "/centro-tecnico", icone: "🛠️" },
  { titulo: "Fabricantes", rota: "/fabricantes", icone: "🏭" },
  { titulo: "Veículos", rota: "/veiculos", icone: "🚗" },
  { titulo: "Pneus", rota: "/pneus", icone: "🛞" },
  { titulo: "Homologações", rota: "/homologacoes", icone: "✅" },
  { titulo: "Relatórios", rota: "/relatorios", icone: "📄" },
];

export default function QuickLinks() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Acesso Rápido</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {ATALHOS.map((atalho) => (
          <Link key={atalho.rota} href={atalho.rota}>
            <Card className="flex flex-col items-center gap-2 text-center transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="text-3xl">{atalho.icone}</span>
              <span className="font-semibold">{atalho.titulo}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
