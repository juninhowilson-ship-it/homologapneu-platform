# Architecture Diagram - Performance Optimization

## Request Flow com Otimizações

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUEST                             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EDGE/CDN (Vercel Edge)                           │
│  • Gzip/Brotli compression                                          │
│  • Cache-Control headers validation                                 │
│  • Geographic distribution                                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  MIDDLEWARE (middleware.ts)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Rate Limiting        │ CORS Headers      │ Deduplication    │   │
│  │ 100 req/15min per IP │ X-Content-Type    │ Idempotency-Key  │   │
│  │                      │ X-Frame-Options   │ Cache 24h result │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Structured Logging (JSON format)                            │   │
│  │ { timestamp, level, message, requestId, context, duration } │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│          ROUTE HANDLER (app/api/[route]/route.ts)                  │
│                                                                      │
│  ┌──────────────────┐      ┌──────────────────┐                    │
│  │ GET /api/dash    │      │ POST /api/homolog│                    │
│  │                  │      │                  │                    │
│  │ 1. Cache check   │      │ 1. Idempotency   │                    │
│  │ 2. If miss →DB   │      │ 2. Validate      │                    │
│  │ 3. Cache result  │      │ 3. Create        │                    │
│  │ 4. Cache headers │      │ 4. Invalidate    │                    │
│  │                  │      │ 5. Return 201    │                    │
│  └──────────────────┘      └──────────────────┘                    │
│                                                                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          │                              │
          ▼                              ▼
  ┌──────────────────┐        ┌──────────────────┐
  │   CACHE LAYER    │        │  DATABASE LAYER  │
  ├──────────────────┤        ├──────────────────┤
  │ In-Memory Cache  │        │ PostgreSQL 15    │
  │ • TTL per entry  │        │                  │
  │ • Pattern regex  │        │ Materialized:    │
  │ • Stats tracking │        │ • homog_count    │
  │ • Auto cleanup   │        │ • tire_stats     │
  │                  │        │                  │
  │ Size: < 1GB      │        │ Indexes:         │
  │ Hit Rate: > 70%  │        │ • 10+ otimizados │
  │                  │        │ • Foreign keys   │
  │ Key Types:       │        │ • Compound idx   │
  │ • MANUFACTURERS  │        │                  │
  │ • HOMOLOGATIONS  │        │ Connection Pool: │
  │ • TIRES          │        │ • 20-50 conn     │
  │ • VEHICLES       │        │ • PgBouncer      │
  │ • REPORTS        │        │                  │
  └──────────────────┘        └──────────────────┘
          ▲                              ▲
          │                              │
          └──────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │    CACHE INVALIDATION         │
         │  on CREATE/UPDATE/DELETE      │
         │                               │
         │  invalidateCacheOnChange:     │
         │  • manufacturer  →  dash+homolog
         │  • tire         →  dash+homolog
         │  • homologation →  dashboard   │
         │  • vehicle      →  dash+homolog│
         └───────────────────────────────┘
```

---

## Cache Strategy - Timeline

```
TIME →

GET /api/fabricantes

Browser Cache (24h)
├─┬─┬─┬─┬─┬─┬─ ... ─┬─┬─ 24h expires
│ │ │ │ │ │ │       │ │
v v v v v v v       v v
HIT HIT HIT HIT HIT  HIT HIT (no request)

CDN Cache (7d)
├─┬─┬─┬─┬─┬─┬─ ... ─┬─┬─┬─┬─┬─┬─┬─ 7d expires
│ │ │ │ │ │ │       │ │ │ │ │ │ │
CONCURRENT REQUESTS (cache served by CDN)

Stale-While-Revalidate (14d)
├─┬─┬─┬─┬─ ... ─┬─┬─┬─┬─ ... ─┬─┬─ 14d expires
                             ^
                      serve stale + revalidate
                      in background

ISR Regeneration (scheduled)
       background     background     background
       regenerate     regenerate     regenerate
       ▼             ▼             ▼
      db query      db query      db query
```

**Resultado:** Usuário sempre vê dados (cacheados ou stale), DB é protegido de picos.

---

## Performance Gains - Antes vs Depois

```
LATENCY PERCENTILES:

  P50       P95       P99
Before: ██████  ████████████  ████████████████
After:  ██      ████            ████████

EXAMPLE QUERIES:
                Before    After    Gain
GET /dashboard   2000ms   150ms    92%
GET /fabricantes  500ms    20ms    96%
POST /homolog    1500ms   800ms    47%
GET search      3000ms   1200ms    60%

CACHE HIT RATE:
0% ──────────────────────────── 100%
Before: ░░░░░░░░░░░░░░░░░░░░░ 0%
After:  ██████████████░░░░░░░░░ 74%

REQUESTS/SECOND:
100 req/s ────────────────── 10000 req/s
Before: ██░░░░░░░░░ 50 req/s
After:  ██████████░░ 500 req/s
Goal:   ███████████████░ 1000+ req/s

DATABASE CPU:
80% ──────────────────────── 10%
Before: ████████████████░░░░ 80%
After:  ██░░░░░░░░░░░░░░░░░░ 20%
```

---

## Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ DEVELOPMENT                                                  │
│ • Write code with optimizations                             │
│ • Test locally: npm run build                               │
│ • Load test: k6 run scripts/load-test.ts                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGING (Pre-production)                                     │
│ • Deploy code                                               │
│ • Run database migrations                                   │
│ • Refresh materialized views                                │
│ • Test endpoints: curl /api/health                          │
│ • Load test with realistic data                             │
│ • Validate cache headers                                    │
│ • Monitor for 24h                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (Sign-off)
┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION                                                   │
│ • Blue-green deployment                                     │
│ • Database migrations (forward compatible)                  │
│ • Refresh views                                             │
│ • Smoke tests: curl /api/health                             │
│ • Monitor metrics: latency, cache, errors                   │
│ • Prepared rollback plan                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ MAINTENANCE (Weekly/Monthly)                                 │
│ • VACUUM ANALYZE databases                                  │
│ • Refresh materialized views (daily)                        │
│ • Monitor slow queries                                      │
│ • Adjust TTLs based on real usage                           │
│ • Reindex if fragmentation > 20%                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
FRONTEND                    EDGE/CDN                BACKEND
┌────────────┐             ┌──────────┐           ┌──────────────┐
│ React 19   │──────────▶ │ Vercel   │──────────▶│ Next.js 16   │
│ TypeScript │            │ Edge     │           │ Node.js 20   │
│ TailwindCSS│            │ Network  │           │ TypeScript   │
└────────────┘            └──────────┘           └──────────────┘
                                                  ▼
                                            ┌──────────────────┐
                                            │ OPTIMIZATION     │
                                            │ ────────────────│
                                            │ • middleware.ts │
                                            │ • Cache service │
                                            │ • Logging       │
                                            │ • Rate limiting │
                                            └──────────────────┘
                                                  ▼
                          ┌─────────────────────────────────────┐
                          │ PostgreSQL 15                       │
                          │ • Connection pooling (20-50)        │
                          │ • Materialized views                │
                          │ • 10+ indexes                       │
                          │ • Query timeout: 30s                │
                          └─────────────────────────────────────┘

MONITORING                 LOGGING                 ALERTING
┌────────────┐            ┌──────────┐           ┌──────────┐
│ Vercel     │            │ CloudWatch/
│ Analytics  │───────────▶│ ELK      │──────────▶│ PagerDuty│
│ P95/P99    │            │ JSON logs│           │ Slack    │
└────────────┘            └──────────┘           └──────────┘
```

---

## Cache Hierarchy

```
REQUEST LIFECYCLE:

1. BROWSER CACHE (max-age)
   └─ Válido por: 24h (fabricantes) ou 1h (dashboard)
   └─ Se expirou → vai para CDN

2. CDN CACHE (s-maxage / Vercel Edge)
   └─ Válido por: 7d (fabricantes) ou 1h (dashboard)
   └─ Se expirado → vai para aplicação (ISR regeneration)
   └─ Enquanto regenera → serve stale (< 1ms)

3. MEMORY CACHE (in-app)
   └─ Válido por: TTL específico do endpoint
   └─ Hit: < 1ms
   └─ Miss: vai para DB

4. DATABASE (PostgreSQL)
   └─ Query simples: 15ms
   └─ Query complexa: 100-500ms
   └─ Materialized view: 15ms
   └─ Índice: 1-5ms

CACHE HIT PATH (esperado 99% do tempo):
Request → Browser (cache HIT) → 0-1ms
          ▼ (if expired)
          CDN (ISR cache HIT) → 5-10ms
          ▼ (if expired)
          Memory (in-app cache HIT) → 0.5-1ms
          ▼ (if expired)
          Database (indexed query) → 15-50ms
```

---

## Scaling Dimensions

```
DIMENSION 1: Request Volume
           │
      1000 req/s ─ OPTIMIZE HERE (current)
           │      • In-memory cache ✓
           │      • Rate limiting ✓
           │      • Middleware ✓
           │
      10000 req/s ─ ADD REDIS
           │      • Distributed cache
           │      • Session store
           │
     100000 req/s ─ ADD MICROSERVICES
           │      • API Gateway
           │      • Service mesh
           │
     1000000 req/s ─ GLOBAL SCALE
                   • Multi-region
                   • Replication

DIMENSION 2: Data Size
           │
      100GB ─ OPTIMIZE HERE (current)
           │  • Indexes ✓
           │  • Partitions
           │  • Materialized views ✓
           │
      1TB ──  ADD READ REPLICAS
           │  • Geographic distribution
           │
      10TB ─ ADD SHARDING
           │  • Partition by region/tenant
           │

DIMENSION 3: Complexity
           │
    Simple queries ─ OPTIMIZE HERE (current)
      (<100ms)     │ • Index optimization ✓
           │      │ • Query caching ✓
           │      │
 Medium queries ──  • Materialized views ✓
    (100-1000ms)   │ • Query tuning
           │      │
 Complex queries ─ • Pre-compute in jobs
    (>1s)         │ • Elasticsearch
```

---

## Monitoring Dashboard (Ideal)

```
┌────────────────────────────────────────────────────────────────┐
│                    HomologaPneu - System Health                │
│ Last 24h  │ ════════════════════════════════════════════════ │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ API Latency (P95)                 Cache Hit Rate              │
│ ▁▂▃▄▅▆▇ 312ms ✓                  ███████░░░░░ 74% ✓          │
│                                                                │
│ Error Rate              Database Connections                  │
│ ▁▁▁▁▁▁▁ 0.08% ✓         ████░░░░░░░░░ 35/100 ✓              │
│                                                                │
│ Memory Usage            Network I/O                           │
│ ████░░░░░░ 340MB ✓      ▁▂▃▄▅ 2.4 Gbps                      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Top Slow Endpoints:                   Top Endpoints:          │
│ 1. POST /api/curadoria/upload  2100ms 1. GET /api/dashboard   │
│ 2. POST /api/relatorios/excel   890ms 2. GET /api/fabricantes │
│ 3. GET  /api/pesquisa/livre     750ms 3. GET /api/homologacoes│
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Alerts (Last 24h):                                            │
│ ✓ No critical alerts                                          │
│ ⚠ Cache hit rate below 70% for 2h (recovered)                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting Decision Tree

```
                         Problem?
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
          API Slow?              Error 5xx?
          (P99 > 1s)             (rate > 1%)
            │                       │
      ┌─────┴─────┐           ┌─────┴─────┐
      ▼           ▼           ▼           ▼
   Cache   Database    App      DB
   Miss    Slow      Crash    Down
    │       │         │        │
 Clear  Check slow  Restart  Promote
cache   queries     server    replica

  Database Slow?
  (query > 100ms)
      │
      ├─ Run EXPLAIN
      ├─ Check index
      ├─ Check stats
      └─ VACUUM ANALYZE

  High Memory?
  (> 80%)
      │
      ├─ Check cache size
      ├─ Clear cache
      ├─ Reduce TTL
      └─ Monitor leak
```

---

## File Dependencies

```
middleware.ts (Rate limit, CORS)
  ├─ app/api/dashboard/route.ts
  ├─ app/api/fabricantes/route.ts
  ├─ app/api/homologacoes/route.ts
  └─ ... all API routes

next.config.ts (Cache headers, compression)
  ├─ Middleware.ts
  └─ ... automatic for all routes

lib/cache/cache-service.ts
  ├─ lib/cache/revalidation-config.ts
  ├─ app/api/[route]/route.ts (all endpoints)
  ├─ services/fabricantes.ts
  ├─ services/homologacoes.ts
  └─ services/dashboard.ts

lib/logging/structured-logger.ts
  ├─ middleware.ts
  ├─ app/api/health/route.ts
  └─ app/api/[route]/route.ts (all endpoints)

prisma/migrations/optimize-database.sql
  ├─ services/dashboard.ts
  ├─ services/fabricantes.ts
  └─ (materialized views queries)

lib/api/optimized-route-patterns.ts (HELPERS - optional)
  └─ app/api/[route]/route.ts (new implementations)
```

---

**Version:** 1.0  
**Last Update:** 2026-08-03
