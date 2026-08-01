import type { CacheProvider, PrismaClient } from "@prisma/client";

/**
 * Wrapper genérico sobre a tabela ExternalCache (Fase Enterprise) —
 * existia no schema desde então, mas nunca tinha sido usada por nenhum
 * código real até aqui. Sem `server-only`: precisa ser importável tanto
 * pelo app quanto por scripts standalone (scripts/lib/fipeCatalog.ts),
 * mesmo padrão de lib/masterData/*.
 */
type PrismaLike = Pick<PrismaClient, "externalCache">;

export type CachedResult<T> = { value: T; fromCache: boolean };

/**
 * Busca `payload` em cache (provider+cacheKey); se ausente ou expirado,
 * chama `fetcher()`, grava o resultado (serializado como JSON) com
 * validade de `ttlMs` a partir de agora, e retorna. Nunca lança por causa
 * do cache em si — se a leitura/escrita do cache falhar, o chamador ainda
 * recebe o resultado real de `fetcher()` (cache é uma otimização, nunca
 * um ponto único de falha). `fromCache` permite ao chamador pular efeitos
 * colaterais que só fazem sentido para uma chamada de rede real (ex.: o
 * sleep de rate-limit em scripts/lib/fipeCatalog.ts).
 */
export async function getCachedOrFetch<T>(
  db: PrismaLike,
  provider: CacheProvider,
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<CachedResult<T>> {
  try {
    const cached = await db.externalCache.findUnique({
      where: { provider_cacheKey: { provider, cacheKey } },
    });
    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
      return { value: JSON.parse(cached.payload) as T, fromCache: true };
    }
  } catch {
    // Cache indisponível (ex.: tabela ainda não migrada num ambiente
    // antigo) — segue para o fetch real, nunca bloqueia o chamador.
  }

  const fresh = await fetcher();

  try {
    const payload = JSON.stringify(fresh);
    await db.externalCache.upsert({
      where: { provider_cacheKey: { provider, cacheKey } },
      update: { payload, fetchedAt: new Date(), expiresAt: new Date(Date.now() + ttlMs) },
      create: { provider, cacheKey, payload, expiresAt: new Date(Date.now() + ttlMs) },
    });
  } catch {
    // Gravar cache é best-effort — se falhar, o valor real já foi obtido
    // e é retornado normalmente, só a próxima chamada não vai reaproveitar.
  }

  return { value: fresh, fromCache: false };
}
