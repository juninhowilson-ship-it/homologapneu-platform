/**
 * Cache Service para HomologaPneu
 * Em-memory cache com TTL para dados frequentemente acessados
 * Em produção, integrar com Redis para escala horizontal
 *
 * Uso:
 * const data = await cache.getOrSet('dashboard', () => fetchDashboard(), 3600)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store = new Map<string, CacheEntry<any>>();
  private readonly isDev = process.env.NODE_ENV === "development";

  /**
   * Obter valor do cache ou calcular se expirado
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T> | T,
    ttlSeconds: number = 3600
  ): Promise<T> {
    // Buscar no cache
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Calcular novo valor
    const value = await Promise.resolve(fn());

    // Armazenar no cache
    this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Obter do cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Armazenar no cache
   */
  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Limpar uma chave
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Limpar todas as chaves com padrão
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Limpar todo cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    let memoryUsage = 0;
    for (const [, entry] of this.store) {
      memoryUsage += JSON.stringify(entry.value).length;
    }

    return {
      size: this.store.size,
      memoryUsageMB: Math.round((memoryUsage / 1024 / 1024) * 100) / 100,
      isDev: this.isDev,
    };
  }
}

// Singleton
export const cache = new CacheService();

/**
 * Cache keys com prefixos para evitar colisões
 */
export const CACHE_KEYS = {
  // Dashboard
  DASHBOARD: "dashboard:main",
  DASHBOARD_STATS: "dashboard:stats",

  // Fabricantes (manufacturers)
  MANUFACTURERS_LIST: "manufacturers:list",
  MANUFACTURERS_BY_ID: (id: number) => `manufacturers:${id}`,

  // Pneus (tires)
  TIRES_LIST: "tires:list",
  TIRE_FAMILIES: "tire:families",
  TIRE_BY_ID: (id: number) => `tire:${id}`,

  // Homologações
  HOMOLOGATIONS_LIST: "homologations:list",
  HOMOLOGATION_DETAIL: (id: number) => `homologation:${id}`,
  HOMOLOGATION_HISTORY: (id: number) => `homologation:${id}:history`,

  // Veículos
  VEHICLES_LIST: "vehicles:list",
  VEHICLE_BY_ID: (id: number) => `vehicle:${id}`,
  VEHICLE_MODELS: (manufacturerId: number) => `vehicle:models:${manufacturerId}`,

  // Medidas
  MEASURES_LIST: "measures:list",

  // Rodas
  WHEELS_LIST: "wheels:list",

  // Relatórios
  REPORTS_CACHE: (reportType: string) => `report:${reportType}`,
} as const;

/**
 * TTL presets para diferentes tipos de dados
 */
export const CACHE_TTL = {
  SHORT: 300, // 5 minutos (dados dinâmicos)
  MEDIUM: 1800, // 30 minutos (dados semi-estáticos)
  LONG: 3600, // 1 hora (dados estáticos)
  VERY_LONG: 86400, // 24 horas (dados de referência)
  PERMANENT: 604800, // 7 dias (praticamente imutável)
} as const;

/**
 * Invalidar cache quando dados mudam
 */
export function invalidateCacheOnChange(entityType: "manufacturer" | "tire" | "homologation" | "vehicle") {
  switch (entityType) {
    case "manufacturer":
      cache.deletePattern("manufacturers:.*");
      cache.deletePattern("homolog.*"); // Homologações dependem de fabricantes
      cache.delete(CACHE_KEYS.DASHBOARD);
      break;

    case "tire":
      cache.deletePattern("tire:.*");
      cache.deletePattern("homolog.*");
      cache.delete(CACHE_KEYS.DASHBOARD);
      break;

    case "homologation":
      cache.deletePattern("homolog.*");
      cache.delete(CACHE_KEYS.DASHBOARD);
      break;

    case "vehicle":
      cache.deletePattern("vehicle:.*");
      cache.deletePattern("homolog.*");
      cache.delete(CACHE_KEYS.DASHBOARD);
      break;
  }
}

/**
 * Preload cache na inicialização (opcional)
 * Útil para dados críticos que devem estar sempre disponíveis
 */
export async function preloadCriticalData() {
  // Exemplo: preload fabricantes
  // Implementar com dados mais críticos do seu caso de uso
  if (process.env.NODE_ENV === "production") {
    console.log("Preloading critical cache data...");
    // await cache.getOrSet(CACHE_KEYS.MANUFACTURERS_LIST, () => fetchManufacturers(), CACHE_TTL.VERY_LONG);
  }
}

/**
 * Clean up cache periodicamente (remover entradas expiradas)
 */
export function setupCacheCleanup(intervalMinutes: number = 60) {
  const intervalMs = intervalMinutes * 60 * 1000;

  const cleanup = () => {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of cache["store"].entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Cache cleanup: removed ${removed} expired entries`);
    }
  };

  // Executar cleanup a cada interval
  setInterval(cleanup, intervalMs);

  // Executar logo na inicialização
  if (process.env.NODE_ENV === "production") {
    cleanup();
  }

  console.log(`Cache cleanup scheduled every ${intervalMinutes} minutes`);
}
