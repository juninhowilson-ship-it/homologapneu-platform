/**
 * Cache Service - In-memory caching com TTL
 * Production-ready cache com invalidation
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
    this.cleanup();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  invalidate(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    let deleted = 0;
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    this.cleanup();
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total === 0 ? 0 : (this.hits / total) * 100,
    };
  }

  reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheService = new CacheService();

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 300, // 5 minutos
  MEDIUM: 3600, // 1 hora
  LONG: 86400, // 24 horas
  VERY_LONG: 604800, // 7 dias
};

// Cache key patterns
export const CACHE_KEYS = {
  HOMOLOGATIONS: "homog:",
  MANUFACTURERS: "mfg:",
  VEHICLE_MODELS: "vm:",
  STATS: "stats:",
};
