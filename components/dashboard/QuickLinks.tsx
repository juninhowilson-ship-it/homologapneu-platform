"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ATALHOS = [
  { titulo: "Pesquisa Inteligente", rota: "/pesquisa", icone: "🔍", adminOnly: false },
  { titulo: "Centro Técnico", rota: "/centro-tecnico", icone: "🛠️", adminOnly: false },
  { titulo: "Fabricantes", rota: "/fabricantes", icone: "🏭", adminOnly: true },
  { titulo: "Veículos", rota: "/veiculos", icone: "🚗", adminOnly: true },
  { titulo: "Pneus", rota: "/pneus", icone: "🛞", adminOnly: true },
  { titulo: "Homologações", rota: "/homologacoes", icone: "✅", adminOnly: true },
  { titulo: "Relatórios", rota: "/relatorios", icone: "📄", adminOnly: true },
];

export default function QuickLinks() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const atalhosVisiveis = ATALHOS.filter((atalho) => !atalho.adminOnly || isAdmin);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Acesso Rápido</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {atalhosVisiveis.map((atalho) => (
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
