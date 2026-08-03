# Performance & Scalability Guide - HomologaPneu

Guia completo de otimizações implementadas e como usá-las.

## Índice

1. [Middleware de Performance](#middleware-de-performance)
2. [Cache Strategy](#cache-strategy)
3. [Database Optimization](#database-optimization)
4. [API Route Patterns](#api-route-patterns)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

---

## Middleware de Performance

### O que foi implementado

Arquivo: `middleware.ts`

- **Rate Limiting**: 100 requisições por 15 minutos por IP
- **CORS Headers**: Restrito a origins configurados
- **Request Deduplication**: Idempotência para POST/PUT/PATCH via header `Idempotency-Key`
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Cache Headers**: Aplicados automaticamente por tipo de rota
- **Structured Logging**: Cada request logged como JSON

### Como usar

#### Rate Limiting
O middleware já aplicada automáticamente. Para testar:

```bash
# Fazer 150 requisições rápido (deve retornar 429 depois de 100)
for i in {1..150}; do
  curl -i https://api.example.com/api/status
done
```

Headers de resposta:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1722674400000
```

#### Idempotência (Deduplicação)
Para POST/PUT/PATCH, fornecer header único:

```bash
curl -X POST https://api.example.com/api/homologacoes \
  -H "Idempotency-Key: my-unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"modelId": 1, "tireId": 2}'
```

Se chamar com mesmo `Idempotency-Key` dentro de 24h, recebe resposta cacheada:
```
X-Deduplication-Cache: HIT
```

#### CORS
Domínios permitidos configuráveis via env:

```env
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Origem será adicionada automaticamente a `Access-Control-Allow-Origin`.

---

## Cache Strategy

### Configuração por Rota

Arquivo: `lib/cache/revalidation-config.ts`

| Rota | TTL Browser | TTL CDN | Stale-While-Revalidate | Uso |
|------|------------|---------|------------------------|-----|
| `/api/dashboard` | 1h | 1h | 24h | Stats agregadas |
| `/api/fabricantes` | 24h | 24h | 7d | Lista estática |
| `/api/medidas` | 24h | 24h | 7d | Referência |
| `/api/homologacoes` | 1h | 1h | 24h | Dados com filtros |
| `/api/media/*` | 7d | 7d | - | Imagens (immutable) |
| `/api/curadoria/*` | no-cache | no-cache | - | Dados em tempo real |

### ISR (Incremental Static Regeneration)

O Next.js 16 regenera rotas automaticamente quando expira o TTL:

```typescript
// Exemplo no next.config.ts
{
  source: "/api/fabricantes/:path*",
  headers: [
    {
      key: "Cache-Control",
      value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600",
    },
  ],
}
```

Significado:
- `max-age=86400`: Browser cacheia por 24h
- `s-maxage=604800`: CDN cacheia por 7d
- `stale-while-revalidate=1209600`: Serve versão expirada enquanto regenera em background

### In-Memory Cache Service

Arquivo: `lib/cache/cache-service.ts`

#### Uso Básico

```typescript
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-service";

// Obter do cache ou calcular
const fabricantes = await cache.getOrSet(
  CACHE_KEYS.MANUFACTURERS_LIST,
  async () => {
    return await db.manufacturer.findMany();
  },
  CACHE_TTL.VERY_LONG // 24h
);
```

#### Cache Keys Pré-definidas

```typescript
// Fabricantes
cache.get(CACHE_KEYS.MANUFACTURERS_LIST)
cache.get(CACHE_KEYS.MANUFACTURERS_BY_ID(5))

// Homologações
cache.get(CACHE_KEYS.HOMOLOGATION_DETAIL(123))
cache.get(CACHE_KEYS.HOMOLOGATION_HISTORY(123))

// Pneus
cache.get(CACHE_KEYS.TIRE_BY_ID(42))
cache.get(CACHE_KEYS.TIRE_FAMILIES)

// Veículos
cache.get(CACHE_KEYS.VEHICLE_BY_ID(99))
cache.get(CACHE_KEYS.VEHICLE_MODELS(5)) // Por fabricante
```

#### TTL Presets

```typescript
CACHE_TTL.SHORT          // 5 min - dados muito dinâmicos
CACHE_TTL.MEDIUM         // 30 min - semi-estáticos
CACHE_TTL.LONG           // 1h - dados estáveis
CACHE_TTL.VERY_LONG      // 24h - referência
CACHE_TTL.PERMANENT      // 7d - praticamente imutável
```

#### Invalidação

```typescript
import { invalidateCacheOnChange } from "@/lib/cache/cache-service";

// Quando criar/atualizar/deletar fabricante
invalidateCacheOnChange("manufacturer");

// Quando criar homologação
invalidateCacheOnChange("homologation");
```

Isso limpa:
- Cache do item modificado
- Caches relacionados (ex: dashboard depende de homologações)

#### Monitoring

```typescript
import { cache } from "@/lib/cache/cache-service";

// Ver estatísticas
console.log(cache.getStats());
// Output: { size: 45, memoryUsageMB: 2.3, isDev: true }

// Limpar tudo se necessário
cache.clear();

// Limpar por padrão
cache.deletePattern("manufacturer:.*");
```

---

## Database Optimization

### Materialized Views

Arquivo: `prisma/migrations/optimize-database.sql`

Duas views pré-calculadas para queries de dashboard:

#### 1. `homog_count_by_manufacturer`
Contagem de homologações por fabricante, atualizada a cada refresh.

```sql
-- Ver dados
SELECT * FROM homog_count_by_manufacturer
ORDER BY total_homologations DESC;

-- Atualizar view (executar periodicamente via cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY homog_count_by_manufacturer;
```

Uso em TypeScript:
```typescript
const stats = await db.$queryRaw`
  SELECT * FROM homog_count_by_manufacturer
  WHERE manufacturer_id = ${manufacturerId}
`;
```

#### 2. `tire_statistics`
Stats agregadas de pneus por fabricante.

```typescript
const tireStats = await db.$queryRaw`
  SELECT * FROM tire_statistics
  ORDER BY total_homologations DESC
  LIMIT 10
`;
```

### Índices Criados

Índices otimizados para queries críticas:

- `idx_homologation_created_date`: Busca por data
- `idx_homologation_manufacturer_status`: Busca por fabricante
- `idx_homologation_validation_status`: Busca por validação
- `idx_tire_manufacturer_name`: Busca por pneu
- `idx_vehicle_model_normalized`: Busca por veículo
- E mais 8 índices específicos

### Maintenance

#### Refresh Materialized Views (executar diariamente)

```bash
# Manualmente
psql $DATABASE_URL -c "SELECT refresh_materialized_views();"

# Via cron (Linux/macOS)
0 2 * * * psql $DATABASE_URL -c "SELECT refresh_materialized_views();"

# Via Windows Task Scheduler
# PowerShell: $trigger = New-ScheduledTaskTrigger -Daily -At 2:00 AM
```

#### Analyze Tables (executar semanalmente)

```bash
psql $DATABASE_URL -c "ANALYZE;"
```

#### Reindex (executar mensalmente ou se fragmentação > 20%)

```bash
psql $DATABASE_URL -c "
  REINDEX INDEX CONCURRENTLY idx_homologation_created_date;
  REINDEX INDEX CONCURRENTLY idx_homologation_manufacturer_status;
"
```

### Monitorar Performance de Queries

```sql
-- Queries mais lentas
SELECT 
  query,
  calls,
  mean_time,
  max_time,
  total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Índices não utilizados
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE 'pg_toast%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tamanho de tabelas e índices
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## API Route Patterns

### Padrões Otimizados

Arquivo: `lib/api/optimized-route-patterns.ts`

Funções helper para criar rotas otimizadas com cache, logging e error handling automático.

#### Padrão 1: GET com Cache (Data Estática)

```typescript
// app/api/fabricantes/route.ts
import { createOptimizedGETHandler } from "@/lib/api/optimized-route-patterns";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-service";
import { listManufacturers } from "@/services/fabricantes";

export const GET = createOptimizedGETHandler(
  CACHE_KEYS.MANUFACTURERS_LIST,
  CACHE_TTL.VERY_LONG,
  () => listManufacturers()
);

// Resposta automática com cache headers:
// X-Cache: HIT (do cache) ou MISS (novo fetch)
// Cache-Control: public, max-age=3600, s-maxage=86400
```

#### Padrão 2: POST com Idempotência

```typescript
// app/api/homologacoes/route.ts
import { createOptimizedPOSTHandler } from "@/lib/api/optimized-route-patterns";
import { homologacaoFormSchema } from "@/lib/validations";
import { createHomologacao } from "@/services/homologacoes";

export const POST = createOptimizedPOSTHandler(
  (data) => homologacaoFormSchema.parse(data),
  (data) => createHomologacao(data),
  ["homolog.*", "dashboard"] // Cache keys para invalidar
);

// Requer header: Idempotency-Key
// curl -X POST /api/homologacoes \
//   -H "Idempotency-Key: unique-key-123" \
//   -d '{...}'
```

#### Padrão 3: GET com Filtros

```typescript
// app/api/homologacoes/route.ts
import { createOptimizedListHandler } from "@/lib/api/optimized-route-patterns";

export const GET = createOptimizedListHandler(
  (params) => listHomologacoes(params),
  "homologations",
  CACHE_TTL.MEDIUM
);

// Query strings geram cache keys automáticas
// GET /api/homologacoes?manufacturerId=1&limit=20 → cache key: homologations:{"manufacturerId":"1","limit":"20"}
```

#### Padrão 4: DELETE com Invalidação

```typescript
// app/api/homologacoes/[id]/route.ts
import { createOptimizedDELETEHandler } from "@/lib/api/optimized-route-patterns";

export const DELETE = createOptimizedDELETEHandler(
  (id) => deleteHomologacao(id),
  ["homolog.*", "dashboard"] // Padrões de cache para limpar
);
```

---

## Monitoring & Logging

### Health Check Endpoint

Arquivo: `app/api/health/route.ts`

Verifica saúde da aplicação:

```bash
curl https://api.example.com/api/health
```

Resposta esperada (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2024-08-03T19:30:45.123Z",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "memory": {
      "status": "ok",
      "heapUsedPercent": 42.5,
      "heapUsedMB": 256,
      "externalMB": 12
    }
  },
  "buildTime": "2024-08-03T19:00:00.000Z"
}
```

Usar em liveness probes de Kubernetes:
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Structured Logging

Arquivo: `lib/logging/structured-logger.ts`

Todos os logs em formato JSON para agregação em ELK/CloudWatch.

#### Uso em Rotas

```typescript
import { createRequestLogger } from "@/lib/logging/structured-logger";

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const log = createRequestLogger(requestId);

  try {
    log.info("Fetching fabricantes", { userId: "123" });
    const data = await db.manufacturer.findMany();
    return NextResponse.json(data);
  } catch (error) {
    log.error("Failed to fetch fabricantes", error, { userId: "123" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

Logs aparecem como:
```json
{
  "timestamp": "2024-08-03T19:30:45.123Z",
  "level": "error",
  "message": "Failed to fetch fabricantes",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123",
  "error": {
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n  at...",
    "code": "ECONNREFUSED"
  },
  "duration": 5123
}
```

#### Medir Duração de Operação

```typescript
import { logger } from "@/lib/logging/structured-logger";

const result = await logger.timeAsync(
  "Fetch homologations",
  async () => {
    return await db.homologation.findMany();
  },
  { userId: "123", manufacturerId: "5" }
);
// Log: { message: "Fetch homologations completed", duration: 145 }
```

---

## Troubleshooting

### Cache não funciona

1. Verificar se chave está no formato correto:
   ```typescript
   console.log(cache.getStats()); // Ver tamanho do cache
   ```

2. Verificar se TTL é suficiente
   ```typescript
   // Aumentar TTL
   cache.set("key", value, CACHE_TTL.VERY_LONG); // 24h
   ```

3. Limpar cache se necessário
   ```typescript
   cache.clear(); // Reset tudo
   cache.deletePattern("manufacturer:.*"); // Por padrão
   ```

### Rate limiting muito agressivo

Edit `middleware.ts`:
```typescript
const RATE_LIMIT_CONFIG = {
  requests: 200, // Aumentar limite
  windowMs: 15 * 60 * 1000, // Ou aumentar janela
};
```

Em produção, usar Redis:
```typescript
// Adicionar na config: npm install @upstash/ratelimit @upstash/redis
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(200, "15 m"),
});
```

### Database queries lentas

1. Verificar se índice existe:
   ```sql
   SELECT * FROM pg_indexes 
   WHERE tablename = 'Homologation'
   AND indexname LIKE 'idx_%';
   ```

2. Usar EXPLAIN para análise:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM "Homologation" 
   WHERE "vehicleGenerationId" = 1
   ORDER BY "createdAt" DESC LIMIT 20;
   ```

3. Refresh materialized views:
   ```bash
   psql $DATABASE_URL -c "SELECT refresh_materialized_views();"
   ```

### High memory usage

1. Ver cache stats:
   ```typescript
   const stats = cache.getStats();
   if (stats.memoryUsageMB > 500) {
     cache.clear(); // Reset se > 500MB
   }
   ```

2. Reduzir TTL ou limpar por padrão:
   ```typescript
   cache.deletePattern(".*old.*");
   ```

3. Monitor em produção via `/api/health`

### Cors errors

1. Verificar origin:
   ```bash
   curl -H "Origin: http://example.com" \
     -v https://api.example.com/api/dashboard
   ```

2. Adicionar origin em `.env.production`:
   ```env
   NEXT_PUBLIC_APP_URL=http://example.com
   ```

3. Reiniciar aplicação

---

## Performance Metrics

Após otimizações, espera-se:

| Métrica | Antes | Depois | Target |
|---------|-------|--------|--------|
| API P50 Latency | 500ms | 100ms | < 200ms |
| API P95 Latency | 2000ms | 300ms | < 500ms |
| Cache Hit Rate | 0% | 75% | > 70% |
| Database CPU | 80% | 30% | < 50% |
| Memory (Node) | 600MB | 350MB | < 500MB |
| Requests/sec | 50 | 500+ | 1000+ target |

---

## Recursos Adicionais

- [Next.js 16 Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html)
- [Sentry Error Tracking](https://sentry.io/for/performance/)
- [k6 Load Testing](https://k6.io/docs/)
