/**
 * Padrões otimizados para implementação de rotas API
 * Usar como template para novas rotas ou refatorar existentes
 */

import { NextResponse, type NextRequest } from "next/server";
import { cache, CACHE_KEYS, CACHE_TTL, invalidateCacheOnChange } from "@/lib/cache/cache-service";
import { logger, createRequestLogger } from "@/lib/logging/structured-logger";
import { Ratelimit } from "@upstash/ratelimit"; // Opcional: usar em produção
import { Redis } from "@upstash/redis"; // Opcional: usar em produção

/**
 * PADRÃO 1: GET com Cache (Data Estática)
 * Exemplo: GET /api/fabricantes
 */
export async function createOptimizedGETHandler<T>(
  cacheKey: string,
  cacheTTL: number,
  fetchFn: () => Promise<T>
) {
  return async function handler(request: NextRequest) {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const log = createRequestLogger(requestId);

    try {
      // Tentar obter do cache
      const cached = cache.get<T>(cacheKey);
      if (cached) {
        log.info("Cache HIT", { cacheKey });
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      }

      // Fetch novo valor
      log.info("Cache MISS - fetching data", { cacheKey });
      const data = await logger.timeAsync(
        `Fetch ${cacheKey}`,
        fetchFn,
        { requestId }
      );

      // Armazenar em cache
      cache.set(cacheKey, data, cacheTTL);

      return NextResponse.json(data, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    } catch (error) {
      log.error("Failed to fetch data", error, { cacheKey });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * PADRÃO 2: POST com Idempotência (Create/Update)
 * Exemplo: POST /api/homologacoes
 * Requer header: Idempotency-Key
 */
export async function createOptimizedPOSTHandler<TRequest, TResponse>(
  validateFn: (data: unknown) => TRequest,
  createFn: (data: TRequest) => Promise<TResponse>,
  invalidateCacheKeys: string[] = []
) {
  return async function handler(request: NextRequest) {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const idempotencyKey = request.headers.get("idempotency-key");
    const log = createRequestLogger(requestId);

    try {
      // Validar idempotency key
      if (!idempotencyKey) {
        log.warn("Missing Idempotency-Key header");
        return NextResponse.json(
          { error: "Idempotency-Key header required" },
          { status: 400 }
        );
      }

      // Verificar se já foi processado (deduplicação)
      const deduplicationKey = `idempotent:${request.method}:${request.nextUrl.pathname}:${idempotencyKey}`;
      const cached = cache.get<TResponse>(deduplicationKey);
      if (cached) {
        log.info("Request deduplicated", { idempotencyKey });
        return NextResponse.json(cached, {
          status: 201,
          headers: { "X-Deduplication": "HIT" },
        });
      }

      // Parse e validar request body
      const body = await request.json();
      const validatedData = validateFn(body);

      // Executar criação
      log.info("Creating resource", { idempotencyKey });
      const response = await logger.timeAsync(
        "Create resource",
        () => createFn(validatedData),
        { requestId, idempotencyKey }
      );

      // Cache resultado por 24h para idempotência
      cache.set(deduplicationKey, response, CACHE_TTL.VERY_LONG);

      // Invalidar caches relacionados
      invalidateCacheKeys.forEach((key) => cache.deletePattern(key));

      return NextResponse.json(response, {
        status: 201,
        headers: { "X-Deduplication": "MISS" },
      });
    } catch (error) {
      log.error("Failed to create resource", error, { idempotencyKey });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * PADRÃO 3: GET com Filtros (Listagem com Query Params)
 * Exemplo: GET /api/homologacoes?manufacturerId=1&limit=20
 * Usar com cuidado - query params geram muitas cache keys
 */
export async function createOptimizedListHandler<T>(
  fetchFn: (params: Record<string, unknown>) => Promise<T>,
  cacheKeyPrefix: string,
  cacheTTL: number
) {
  return async function handler(request: NextRequest) {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const log = createRequestLogger(requestId);

    try {
      // Converter query params em chave de cache
      const params = Object.fromEntries(request.nextUrl.searchParams);
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(params)}`;

      // Tentar cache
      const cached = cache.get<T>(cacheKey);
      if (cached) {
        log.info("List cache HIT", { cacheKey, params });
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
          },
        });
      }

      // Fetch dados
      log.info("List cache MISS", { cacheKey, params });
      const data = await logger.timeAsync(
        `Fetch list ${cacheKeyPrefix}`,
        () => fetchFn(params),
        { requestId, params }
      );

      cache.set(cacheKey, data, cacheTTL);

      return NextResponse.json(data, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      });
    } catch (error) {
      log.error("Failed to fetch list", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * PADRÃO 4: DELETE (Invalidar Caches)
 */
export async function createOptimizedDELETEHandler<T>(
  deleteFn: (id: string) => Promise<T>,
  invalidateCachePatterns: string[] = []
) {
  return async function handler(request: NextRequest, { params }: { params: { id: string } }) {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const log = createRequestLogger(requestId);
    const { id } = params;

    try {
      log.info("Deleting resource", { id });

      const result = await logger.timeAsync(
        "Delete resource",
        () => deleteFn(id),
        { requestId, id }
      );

      // Invalidar caches relacionados
      invalidateCachePatterns.forEach((pattern) => {
        cache.deletePattern(pattern);
        log.info("Cache invalidated", { pattern });
      });

      return NextResponse.json(result);
    } catch (error) {
      log.error("Failed to delete resource", error, { id });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * PADRÃO 5: Rate Limiting (Redis-based para produção)
 * Em desenvolvimento, usar in-memory limiter
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: { limit: number; windowMs: number }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // TODO: Integrar com Redis/Upstash em produção
  // const ratelimit = new Ratelimit({
  //   redis: Redis.fromEnv(),
  //   limiter: Ratelimit.slidingWindow(limiter.limit, `${limiter.windowMs}ms`),
  //   analytics: true,
  // });
  //
  // const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  // if (!success) {
  //   return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  // }

  return { success: true };
}

/**
 * PADRÃO 6: Streaming Response (para grandes exports)
 * Exemplo: GET /api/relatorios/excel
 */
export async function createStreamingHandler(
  streamFn: () => AsyncGenerator<Uint8Array, void, unknown>,
  contentType: string,
  filename: string
) {
  return async function handler(request: NextRequest) {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    const log = createRequestLogger(requestId);

    try {
      log.info("Starting streaming response", { filename, contentType });

      const stream = streamFn();

      return new NextResponse(stream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error) {
      log.error("Streaming failed", error, { filename });
      return NextResponse.json(
        { error: "Failed to generate file" },
        { status: 500 }
      );
    }
  };
}

/**
 * EXEMPLO DE IMPLEMENTAÇÃO
 *
 * // app/api/fabricantes/route.ts
 * import { createOptimizedGETHandler } from "@/lib/api/optimized-route-patterns";
 * import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-service";
 * import { listManufacturers } from "@/services/fabricantes";
 *
 * export const GET = createOptimizedGETHandler(
 *   CACHE_KEYS.MANUFACTURERS_LIST,
 *   CACHE_TTL.VERY_LONG,
 *   () => listManufacturers()
 * );
 */
