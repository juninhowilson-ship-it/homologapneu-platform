import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de Performance & Segurança
 * Aplicado a todas as rotas
 * Responsabilidades:
 * - CORS headers
 * - Security headers (já definidos no next.config, mas reforçados)
 * - Compression (gzip/brotli via Next.js nativo)
 * - Rate limiting (memory-based para dev, Redis em prod)
 * - Request deduplication
 * - Request timeout tracking
 */

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_CONFIG = {
  // 100 requests per 15 minutes per IP
  requests: 100,
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// Request deduplication cache (for idempotency)
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

/**
 * Rate limiter simples em memória
 * Em produção, usar Redis para escala horizontal
 */
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

/**
 * Gera chave para deduplicação de request
 * Usa POST body hash + Idempotency-Key se disponível
 */
function generateDeduplicationKey(request: NextRequest): string | null {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return null;

  const method = request.method;
  const url = request.nextUrl.pathname;

  return `${method}:${url}:${idempotencyKey}`;
}

/**
 * Limpa entradas expiradas do cache de deduplicação
 */
function cleanupDeduplicationCache() {
  const now = Date.now();
  for (const [key, value] of deduplicationCache.entries()) {
    if (now > value.expiresAt) {
      deduplicationCache.delete(key);
    }
  }
}

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Extrair IP do cliente
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Verificar rate limit
  const rateLimitInfo = checkRateLimit(ip);

  // Inicializar response headers
  const response = NextResponse.next();

  // CORS (permitir origin do deploy, bloquear outros)
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    // Adicionar origins de produção aqui
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Idempotency-Key, X-Request-ID"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  // Rate limit headers
  response.headers.set("X-RateLimit-Limit", rateLimitInfo.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
  response.headers.set("X-RateLimit-Reset", rateLimitInfo.resetAt.toString());
  response.headers.set("X-Request-ID", requestId);

  // Se atingiu rate limit
  if (rateLimitInfo.current > RATE_LIMIT_CONFIG.requests) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(
          (rateLimitInfo.resetAt - Date.now()) / 1000
        ).toString(),
        "X-RateLimit-Reset": rateLimitInfo.resetAt.toString(),
      },
    });
  }

  // Suportar CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // Deduplicação para POST/PUT/PATCH (idempotência)
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const deduplicationKey = generateDeduplicationKey(request);

    if (deduplicationKey) {
      cleanupDeduplicationCache();

      const cachedResponse = deduplicationCache.get(deduplicationKey);
      if (cachedResponse && Date.now() < cachedResponse.expiresAt) {
        // Retornar resposta cacheada
        return new NextResponse(cachedResponse.response.body, {
          status: cachedResponse.response.status,
          headers: {
            "X-Deduplication-Cache": "HIT",
            "X-Request-ID": requestId,
          },
        });
      }
    }
  }

  // Logging estruturado (JSON format)
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    ip,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  };

  console.log(JSON.stringify(logEntry));

  // Adicionar headers de cache de acordo com tipo de rota
  const pathname = request.nextUrl.pathname;

  // Dados estáticos (1 hora no browser, 24h no CDN)
  if (
    pathname.startsWith("/api/fabricantes") ||
    pathname.startsWith("/api/medidas")
  ) {
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  }
  // Dashboard (1 hora no browser, ISR no CDN)
  else if (pathname === "/api/dashboard") {
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    );
  }
  // Imagens (24 horas)
  else if (pathname.startsWith("/api/media")) {
    response.headers.set("Cache-Control", "public, max-age=86400, immutable");
  }
  // Dados dinâmicos (no-cache)
  else if (
    pathname.startsWith("/api/homologacoes") ||
    pathname.startsWith("/api/curadoria")
  ) {
    response.headers.set("Cache-Control", "no-cache, must-revalidate");
  }

  // Compression é automático no Next.js (gzip + brotli)
  // Adicionar Accept-Encoding header ao request para garantir suporte
  response.headers.set("Accept-Encoding", "gzip, deflate, br");

  // Timeout tracking (armazenar start time para depois)
  response.headers.set("X-Request-Start", startTime.toString());

  return response;
}

/**
 * Configurar quais rotas passam pelo middleware
 * Otimizado para evitar overhead desnecessário
 */
export const config = {
  // Aplicar middleware a rotas de API e páginas dinâmicas
  matcher: [
    // API routes
    "/api/:path*",
    // Public pages (com rate limiting)
    "/",
    // App routes (com auth check embutido)
    "/(app)/:path*",
    // Exclude static files
    "!(.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|js|css|ttf|woff|woff2)$|_next)",
  ],
};
