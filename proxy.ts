import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/jwt";

// /api/crawler/cron é chamado pelo Vercel Cron (sem cookie de sessão) —
// autenticado por CRON_SECRET dentro do próprio handler, não por login.
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  // Recuperação de senha acontece antes do login, portanto sem sessão. As
  // rotas têm rate limit próprio e resposta anti-enumeração de contas.
  "/api/auth/esqueci-senha",
  "/api/auth/redefinir-senha",
  "/api/status",
  "/api/crawler/cron",
];

// Nenhum dado do banco é exibido sem login (decisão de 2026-07-16): a única
// página pública é a Landing Page ("/"), puramente institucional (ver
// app/(public)/page.tsx — sem consultas ao banco). /status é uma página de
// observabilidade pré-existente e não relacionada aos dados de negócio.
const PUBLIC_PAGE_PATHS = ["/", "/status", "/esqueci-senha", "/redefinir-senha"];

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
  // Fila de prioridade das homologações — visão de backlog, só admin.
  "/api/prioridades",
  "/api/crawler",
  "/api/auditoria",
  "/api/status-dev",
  "/api/import-batches",
  // Botão "IMPORTAR DADOS" (database/import/) — dispatcher único por pasta.
  "/api/database-import",
  // HomologaPneu Media Manager (isolado) — biblioteca de imagens, só admin.
  "/api/media",
  // HomologaPneu IA Engine (isolado) — análise de documentos/sugestões, só admin.
  "/api/ai",
  // Relatórios (exportação Excel/PDF) — página já é admin-only no sidebar.
  "/api/relatorios",
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

// ---------------------------------------------------------------------------
// Performance & Segurança (absorvido de middleware.ts — Next.js 16 unificou
// middleware/proxy em um único arquivo, ver node_modules/next/dist/docs/
// 01-app/01-getting-started/16-proxy.md). Roda antes da checagem de sessão.
// ---------------------------------------------------------------------------

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_CONFIG = {
  // 100 requisições por 15 min por IP. Configurável porque o Next faz
  // prefetch dos links visíveis: uma tela com muitos links consome dezenas
  // de requisições de um mesmo IP legítimo (e ambientes de preview/QA,
  // atrás de um único IP, estouram o padrão).
  requests: Number(process.env.RATE_LIMIT_REQUESTS) || 100,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
};

// Cache de deduplicação de request (idempotência)
const deduplicationCache = new Map<
  string,
  { response: Response; expiresAt: number }
>();

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetAt: number;
}

function checkRateLimit(key: string): RateLimitInfo {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_CONFIG.windowMs });
    return {
      limit: RATE_LIMIT_CONFIG.requests,
      current: 1,
      remaining: RATE_LIMIT_CONFIG.requests - 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
    };
  }

  entry.count++;
  return {
    limit: RATE_LIMIT_CONFIG.requests,
    current: entry.count,
    remaining: Math.max(0, RATE_LIMIT_CONFIG.requests - entry.count),
    resetAt: entry.resetAt,
  };
}

function generateDeduplicationKey(request: NextRequest): string | null {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return null;
  return `${request.method}:${request.nextUrl.pathname}:${idempotencyKey}`;
}

function cleanupDeduplicationCache() {
  const now = Date.now();
  for (const [key, value] of deduplicationCache.entries()) {
    if (now > value.expiresAt) {
      deduplicationCache.delete(key);
    }
  }
}

function applyCacheControl(response: NextResponse, pathname: string) {
  if (pathname.startsWith("/api/fabricantes") || pathname.startsWith("/api/medidas")) {
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  } else if (pathname === "/api/dashboard") {
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    );
  } else if (pathname.startsWith("/api/media")) {
    response.headers.set("Cache-Control", "public, max-age=86400, immutable");
  } else if (pathname.startsWith("/api/homologacoes") || pathname.startsWith("/api/curadoria")) {
    response.headers.set("Cache-Control", "no-cache, must-revalidate");
  }
}

function applySecurityHeaders(response: NextResponse, request: NextRequest, requestId: string) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Idempotency-Key, X-Request-ID"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  response.headers.set("X-Request-ID", requestId);
  response.headers.set("Accept-Encoding", "gzip, deflate, br");
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimitInfo = checkRateLimit(ip);

  if (rateLimitInfo.current > RATE_LIMIT_CONFIG.requests) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((rateLimitInfo.resetAt - Date.now()) / 1000).toString(),
        "X-RateLimit-Reset": rateLimitInfo.resetAt.toString(),
      },
    });
  }

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applySecurityHeaders(preflight, request, requestId);
    return preflight;
  }

  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const deduplicationKey = generateDeduplicationKey(request);
    if (deduplicationKey) {
      cleanupDeduplicationCache();
      const cached = deduplicationCache.get(deduplicationKey);
      if (cached && Date.now() < cached.expiresAt) {
        return new NextResponse(cached.response.body, {
          status: cached.response.status,
          headers: { "X-Deduplication-Cache": "HIT", "X-Request-ID": requestId },
        });
      }
    }
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: request.method,
      path: pathname,
      ip,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    })
  );

  // ---------------------------------------------------------------------
  // Autorização (lógica original de proxy.ts — decisão de negócio, não mexer)
  // ---------------------------------------------------------------------

  function finish(response: NextResponse) {
    applySecurityHeaders(response, request, requestId);
    applyCacheControl(response, pathname);
    response.headers.set("X-RateLimit-Limit", rateLimitInfo.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimitInfo.resetAt.toString());
    response.headers.set("X-Request-Start", startTime.toString());
    return response;
  }

  if (
    pathname === "/login" ||
    matchesPrefix(pathname, PUBLIC_API_PREFIXES) ||
    matchesPrefix(pathname, PUBLIC_PAGE_PATHS)
  ) {
    if (pathname === "/login") {
      const session = await decrypt(request.cookies.get("session")?.value);
      if (session) {
        return finish(NextResponse.redirect(new URL("/dashboard", request.url)));
      }
    }
    return finish(NextResponse.next());
  }

  const session = await decrypt(request.cookies.get("session")?.value);

  if (!session) {
    if (isApi) {
      return finish(NextResponse.json({ error: "Não autenticado" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return finish(NextResponse.redirect(loginUrl));
  }

  if (session.role !== "ADMIN" && requiresAdmin(pathname, request.method)) {
    if (isApi) {
      return finish(
        NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
      );
    }
    return finish(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return finish(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
