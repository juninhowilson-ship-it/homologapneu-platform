"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Wrench,
  Ruler,
  Car,
  Disc,
  FileCheck2,
  Factory,
  FileText,
  Bot,
  Sparkles,
  Users,
  ScrollText,
  BarChart3,
  Settings,
  Activity,
  Map as MapIcon,
  Images,
  type LucideIcon,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type MenuItem = {
  nome: string;
  rota: string;
  icone: LucideIcon;
  adminOnly: boolean;
};

const menuGeral: MenuItem[] = [
  { nome: "Dashboard", rota: "/dashboard", icone: LayoutDashboard, adminOnly: false },
  { nome: "Pesquisa", rota: "/pesquisa", icone: Search, adminOnly: false },
  { nome: "Centro Técnico", rota: "/centro-tecnico", icone: Wrench, adminOnly: false },
  { nome: "Medidas", rota: "/medidas", icone: Ruler, adminOnly: false },
];

const menuCadastros: MenuItem[] = [
  { nome: "Veículos", rota: "/veiculos", icone: Car, adminOnly: true },
  { nome: "Pneus", rota: "/pneus", icone: Disc, adminOnly: true },
  { nome: "Homologações", rota: "/homologacoes", icone: FileCheck2, adminOnly: true },
  { nome: "Fabricantes", rota: "/fabricantes", icone: Factory, adminOnly: true },
];

const menuAdministracao: MenuItem[] = [
  { nome: "Biblioteca de Imagens", rota: "/administracao/midia", icone: Images, adminOnly: true },
  { nome: "Documentos", rota: "/administracao/documentos", icone: FileText, adminOnly: true },
  { nome: "Crawler", rota: "/administracao/crawler", icone: Bot, adminOnly: true },
  { nome: "Curadoria", rota: "/administracao/curadoria", icone: Sparkles, adminOnly: true },
  { nome: "Usuários", rota: "/usuarios", icone: Users, adminOnly: true },
  { nome: "Logs", rota: "/administracao/logs", icone: ScrollText, adminOnly: true },
  { nome: "Relatórios", rota: "/relatorios", icone: BarChart3, adminOnly: true },
  { nome: "Administração", rota: "/administracao", icone: Settings, adminOnly: true },
];

const menusDev: MenuItem[] = [
  { nome: "Status do Desenvolvimento", rota: "/dev", icone: Activity, adminOnly: true },
  { nome: "Roadmap", rota: "/roadmap", icone: MapIcon, adminOnly: true },
];

function GrupoMenu({
  titulo,
  itens,
  pathname,
  isAdmin,
}: {
  titulo: string;
  itens: MenuItem[];
  pathname: string;
  isAdmin: boolean;
}) {
  const visiveis = itens.filter((item) => !item.adminOnly || isAdmin);
  if (visiveis.length === 0) return null;

  return (
    <div>
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {titulo}
      </p>
      <div className="space-y-1">
        {visiveis.map((item) => {
          const ativo =
            pathname === item.rota || pathname.startsWith(`${item.rota}/`);
          const Icone = item.icone;
          return (
            <Link
              key={item.rota}
              href={item.rota}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                ativo
                  ? "bg-brand font-semibold text-brand-foreground shadow-sm"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <Icone size={18} strokeWidth={2} className="shrink-0" />
              <span>{item.nome}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <aside className="min-h-screen w-64 shrink-0 space-y-8 bg-sidebar p-5 text-sidebar-foreground">
      <GrupoMenu titulo="Geral" itens={menuGeral} pathname={pathname} isAdmin={isAdmin} />
      <GrupoMenu
        titulo="Cadastros"
        itens={menuCadastros}
        pathname={pathname}
        isAdmin={isAdmin}
      />
      <GrupoMenu
        titulo="Administração"
        itens={menuAdministracao}
        pathname={pathname}
        isAdmin={isAdmin}
      />
      <GrupoMenu titulo="Dev" itens={menusDev} pathname={pathname} isAdmin={isAdmin} />
    </aside>
  );
}
