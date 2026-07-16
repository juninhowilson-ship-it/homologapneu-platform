import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/jwt";

// /api/crawler/cron é chamado pelo Vercel Cron (sem cookie de sessão) —
// autenticado por CRON_SECRET dentro do próprio handler, não por login.
const PUBLIC_API_PREFIXES = ["/api/auth/login", "/api/status", "/api/crawler/cron"];

// Nenhum dado do banco é exibido sem login (decisão de 2026-07-16): a única
// página pública é a Landing Page ("/"), puramente institucional (ver
// app/(public)/page.tsx — sem consultas ao banco). /status é uma página de
// observabilidade pré-existente e não relacionada aos dados de negócio.
const PUBLIC_PAGE_PATHS = ["/", "/status"];

const ADMIN_ONLY_PAGE_PREFIXES = [
  "/fabricantes",
  "/veiculos",
  "/pneus",
  "/homologacoes",
  "/usuarios",
  "/relatorios",
  "/dev",
  "/roadmap",
  "/administracao",
];

const ALWAYS_ADMIN_API_PREFIXES = [
  "/api/fabricantes",
  "/api/usuarios",
  "/api/manufacturers",
  "/api/tire-manufacturers",
  "/api/importer",
  "/api/storage",
  "/api/fontes",
  "/api/curadoria",
  "/api/crawler",
  "/api/auditoria",
  "/api/status-dev",
  "/api/import-batches",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isMutation(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function requiresAdmin(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/")) {
    return matchesPrefix(pathname, ADMIN_ONLY_PAGE_PREFIXES);
  }

  if (matchesPrefix(pathname, ALWAYS_ADMIN_API_PREFIXES)) {
    return true;
  }

  // Veiculos/Pneus/Rodas: list/create + upload/import são admin-only. A busca
  // por um unico registro (GET /:id) fica aberta a qualquer usuario
  // autenticado, pois e usada pelo Centro Tecnico.
  for (const base of ["/api/veiculos", "/api/pneus", "/api/rodas"]) {
    if (pathname === base) return true;
    if (pathname.startsWith(`${base}/upload`) || pathname.startsWith(`${base}/import`)) {
      return true;
    }
    if (pathname.startsWith(`${base}/`) && isMutation(method)) {
      return true;
    }
  }

  // Homologacoes: listar/consultar opcoes fica aberto (Centro Tecnico usa),
  // mutacoes sao admin-only.
  if (pathname === "/api/homologacoes" && isMutation(method)) {
    return true;
  }
  if (
    pathname.startsWith("/api/homologacoes/") &&
    pathname !== "/api/homologacoes/opcoes" &&
    isMutation(method)
  ) {
    return true;
  }

  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (
    pathname === "/login" ||
    matchesPrefix(pathname, PUBLIC_API_PREFIXES) ||
    matchesPrefix(pathname, PUBLIC_PAGE_PATHS)
  ) {
    if (pathname === "/login") {
      const session = await decrypt(request.cookies.get("session")?.value);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const session = await decrypt(request.cookies.get("session")?.value);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role !== "ADMIN" && requiresAdmin(pathname, request.method)) {
    if (isApi) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
