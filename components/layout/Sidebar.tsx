"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  {
    nome: "Painel",
    rota: "/",
  },
  {
    nome: "Pesquisa",
    rota: "/pesquisa",
  },
  {
    nome: "Veículos",
    rota: "/veiculos",
  },
  {
    nome: "Pneus",
    rota: "/pneus",
  },
  {
    nome: "Homologações",
    rota: "/homologacoes",
  },
  {
    nome: "Fabricantes",
    rota: "/fabricantes",
  },
  {
    nome: "Centro Técnico",
    rota: "/centro-tecnico",
  },
  {
    nome: "Relatórios",
    rota: "/relatorios",
  },
];

const menusDev = [
  {
    nome: "Painel Dev",
    rota: "/dev",
  },
  {
    nome: "Roadmap",
    rota: "/roadmap",
  },
];

export default function Sidebar() {

  const pathname = usePathname();

  return (

    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen p-6">

      <p className="uppercase text-xs text-gray-400 mb-5">
        Menu
      </p>

      <div className="space-y-3">

        {menus.map((item) => (

          <Link
            key={item.rota}
            href={item.rota}
            className={`block p-3 rounded-lg transition

            ${
              pathname === item.rota
                ? "bg-brand text-brand-foreground font-bold"
                : "hover:bg-slate-700"
            }
            `}
          >

            {item.nome}

          </Link>

        ))}

      </div>

      <p className="uppercase text-xs text-gray-400 mb-5 mt-8">
        Dev
      </p>

      <div className="space-y-3">

        {menusDev.map((item) => (

          <Link
            key={item.rota}
            href={item.rota}
            className={`block p-3 rounded-lg transition

            ${
              pathname === item.rota
                ? "bg-brand text-brand-foreground font-bold"
                : "hover:bg-slate-700"
            }
            `}
          >

            {item.nome}

          </Link>

        ))}

      </div>

    </aside>

  );

}