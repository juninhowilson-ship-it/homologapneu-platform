/**
 * API Helpers - Padrões otimizados para rotas
 */

import { NextRequest, NextResponse } from "next/server";
import { cacheService, CACHE_TTL } from "./cache-service";

export interface APIOptions {
  cacheTTL?: number;
  cachePattern?: string;
  revalidate?: number;
}

/**
 * Wrapper para GET otimizado com cache automático
 */
export async function getWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  const cached = cacheService.get<T>(key);
  if (cached) return cached;

  const data = await fetcher();
  cacheService.set(key, data, ttl);
  return data;
}

/**
 * Criar resposta GET com headers de cache
 */
export function createCachedResponse<T>(
  data: T,
  ttl: number = 3600,
  staleWhileRevalidate: number = 86400
) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${staleWhileRevalidate}`,
      "CDN-Cache-Control": `max-age=${staleWhileRevalidate}`,
      "Vary": "Accept-Encoding",
    },
  });
}

/**
 * Error handler padronizado
 */
export function handleError(error: any, context: string) {
  console.error(`[${context}]`, error);

  if (error.code === "P2025") {
    return NextResponse.json(
      { error: "Recurso não encontrado" },
      { status: 404 }
    );
  }

  if (error.code === "P2002") {
    return NextResponse.json(
      { error: "Recurso já existe" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
}
