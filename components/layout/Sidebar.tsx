"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const menus = [
  {
    nome: "Painel",
    rota: "/",
    adminOnly: false,
  },
  {
    nome: "Pesquisa",
    rota: "/pesquisa",
    adminOnly: false,
  },
  {
    nome: "Centro Técnico",
    rota: "/centro-tecnico",
    adminOnly: false,
  },
  {
    nome: "Veículos",
    rota: "/veiculos",
    adminOnly: true,
  },
  {
    nome: "Pneus",
    rota: "/pneus",
    adminOnly: true,
  },
  {
    nome: "Homologações",
    rota: "/homologacoes",
    adminOnly: true,
  },
  {
    nome: "Fabricantes",
    rota: "/fabricantes",
    adminOnly: true,
  },
  {
    nome: "Relatórios",
    rota: "/relatorios",
    adminOnly: true,
  },
  {
    nome: "Usuários",
    rota: "/usuarios",
    adminOnly: true,
  },
];

const menusDev = [
  {
    nome: "Status do Desenvolvimento",
    rota: "/dev",
  },
  {
    nome: "Roadmap",
    rota: "/roadmap",
  },
];

export default function Sidebar() {

  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const menusVisiveis = menus.filter((item) => !item.adminOnly || isAdmin);

  return (

    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen p-6">

      <p className="uppercase text-xs text-gray-400 mb-5">
        Menu
      </p>

      <div className="space-y-3">

        {menusVisiveis.map((item) => (

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

      {isAdmin && (
        <>
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
        </>
      )}

    </aside>

  );

}
