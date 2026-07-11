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
];

export default function Sidebar() {

  const pathname = usePathname();

  return (

    <aside className="w-64 bg-slate-800 text-white min-h-screen p-6">

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
                ? "bg-yellow-500 text-black font-bold"
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