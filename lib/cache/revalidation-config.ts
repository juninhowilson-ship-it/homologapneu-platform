/**
 * Configuração de revalidação (ISR + Static) por rota
 * Estratégia de cache otimizada para HomologaPneu
 *
 * ISR (Incremental Static Regeneration): página é pré-renderizada
 * e regenerada em background a cada N segundos
 *
 * Stale-While-Revalidate: serve versão cacheada mesmo se expirada,
 * regenera em background
 */

export const REVALIDATION_CONFIG = {
  // Dashboard: Static com ISR 1h (revalidate a cada 3600s)
  // Razão: dados críticos mas não mudam a cada minuto
  dashboard: {
    revalidate: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    description: "Dashboard principal com stats agregadas",
  },

  // Fabricantes: Static com ISR 24h
  // Razão: lista é muito estável, raramente muda
  manufacturers: {
    revalidate: 86400, // 24 hours
    staleWhileRevalidate: 604800, // 7 days
    description: "Lista de fabricantes",
  },

  // Medidas de pneu: Static com ISR 24h
  // Razão: tabela de referência, praticamente nunca muda
  tires: {
    revalidate: 86400, // 24 hours
    staleWhileRevalidate: 604800, // 7 days
    description: "Especificações de pneus",
  },

  // Homologações (listagem com filtros): ISR 1h
  // Razão: dados frequentemente acessados, update não é crítico
  homologations: {
    revalidate: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    description: "Listagem de homologações com filtros",
  },

  // Homologação individual: ISR 30 min
  // Razão: dados importantes, podem mudar com curadoria
  homologationDetail: {
    revalidate: 1800, // 30 minutes
    staleWhileRevalidate: 86400, // 24 hours
    description: "Detalhe de uma homologação específica",
  },

  // Pesquisa livre: Dynamic (no-cache)
  // Razão: altamente variável, não vale pena cachear
  search: {
    revalidate: false, // No cache
    description: "Busca livre de homologações",
  },

  // Curadoria: Dynamic (no-cache)
  // Razão: dados sensíveis, sempre devem estar frescos
  curation: {
    revalidate: false, // No cache
    description: "Interface de curadoria inteligente",
  },

  // Relatórios: ISR 6h
  // Razão: dados agregados, update a cada 6h é aceitável
  reports: {
    revalidate: 21600, // 6 hours
    staleWhileRevalidate: 86400, // 24 hours
    description: "Relatórios e exportações (Excel/PDF)",
  },

  // Administração (crawler, logs, etc): Dynamic
  // Razão: dados de sistema, sempre devem estar frescos
  admin: {
    revalidate: false, // No cache
    description: "Interfaces administrativas",
  },

  // Mídia (imagens): Static com ISR 7d (immutable)
  // Razão: arquivos não mudam depois de upload
  media: {
    revalidate: 604800, // 7 days
    immutable: true,
    description: "Imagens de veículos e pneus",
  },
} as const;

/**
 * Helper para obter configuração de revalidação
 */
export function getRevalidationConfig(routeKey: keyof typeof REVALIDATION_CONFIG) {
  const config = REVALIDATION_CONFIG[routeKey];
  return {
    revalidate: config.revalidate,
    staleWhileRevalidate: config.staleWhileRevalidate,
    immutable: config.immutable,
    description: config.description,
  };
}

/**
 * Estratégia de cache para diferentes tipos de conteúdo
 * Usar no middleware e headers de resposta
 */
export const CACHE_STRATEGIES = {
  STATIC_IMMUTABLE: "public, max-age=604800, immutable",
  STATIC_1DAY: "public, max-age=86400, s-maxage=86400",
  STATIC_1HOUR: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  DYNAMIC_STALE: "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400",
  NO_CACHE: "no-cache, no-store, must-revalidate",
  PRIVATE_CACHE: "private, max-age=3600",
} as const;

/**
 * Presets para Next.js response headers
 */
export const CACHE_CONTROL_HEADERS = {
  // Imagens estáticas
  image: {
    "Cache-Control": CACHE_STRATEGIES.STATIC_IMMUTABLE,
    "Content-Type": "image/*",
  },
  // Dados de referência (não mudam)
  static: {
    "Cache-Control": CACHE_STRATEGIES.STATIC_1DAY,
  },
  // Dados críticos
  dashboard: {
    "Cache-Control": CACHE_STRATEGIES.STATIC_1HOUR,
  },
  // Dados dinâmicos
  dynamic: {
    "Cache-Control": CACHE_STRATEGIES.NO_CACHE,
  },
} as const;
