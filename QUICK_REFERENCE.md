# Quick Reference - Performance Optimization

## Files Created (10 files + 1 updated)

```
✓ middleware.ts                              (NEW) Rate limiting, CORS, logging
✓ next.config.ts                             (UPD) Cache headers, compression
✓ app/api/health/route.ts                    (NEW) Health check endpoint
✓ lib/cache/cache-service.ts                 (NEW) In-memory cache with TTL
✓ lib/cache/revalidation-config.ts           (NEW) ISR config by route
✓ lib/logging/structured-logger.ts           (NEW) JSON structured logging
✓ lib/api/optimized-route-patterns.ts        (NEW) 6 route handler patterns
✓ prisma/migrations/optimize-database.sql    (NEW) Indexes + materialized views
✓ scripts/load-test.ts                       (NEW) k6 load test script
✓ DEPLOYMENT_CHECKLIST.md                    (NEW) 80+ deployment steps
✓ PERFORMANCE_GUIDE.md                       (NEW) Complete usage guide
✓ IMPLEMENTATION_EXAMPLES.md                 (NEW) 7 practical examples
✓ OPTIMIZATION_SUMMARY.md                    (NEW) This summary
✓ OPTIMIZATION_ARCHITECTURE.md               (NEW) Visual architecture
✓ QUICK_REFERENCE.md                         (NEW) This quick ref
```

---

## Getting Started (1 hour)

### 1. Database (10 min)
```bash
psql $DATABASE_URL < prisma/migrations/optimize-database.sql
psql $DATABASE_URL -c "SELECT matviewname FROM pg_matviews;" # Verify
```

### 2. Test Build (5 min)
```bash
npm run build  # Should succeed
```

### 3. Deploy to Staging (15 min)
```bash
git push origin main  # If using Vercel CI/CD
# Or: vercel deploy --prod
```

### 4. Validate (30 min)
```bash
# Health check
curl https://staging.example.com/api/health

# Cache headers
curl -I https://staging.example.com/api/fabricantes

# Load test
npm install -D k6
k6 run scripts/load-test.ts --vus 50 --duration 5m
```

---

## Essential Commands

### Database
```bash
# Run optimization SQL
psql $DATABASE_URL < prisma/migrations/optimize-database.sql

# Refresh materialized views
psql $DATABASE_URL -c "SELECT refresh_materialized_views();"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# VACUUM (cleanup)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Reindex (if fragmented)
psql $DATABASE_URL -c "REINDEX INDEX CONCURRENTLY idx_name;"
```

### Application
```bash
# Build
npm run build

# Dev with optimization
npm run dev

# Load test
k6 run scripts/load-test.ts --vus 100 --duration 10m

# Check health
curl http://localhost:3000/api/health
```

### Monitoring
```bash
# View logs (structured JSON)
tail -f /var/log/app.log | jq '.'

# Filter by level
tail -f /var/log/app.log | jq 'select(.level == "error")'

# Filter by request ID
tail -f /var/log/app.log | jq 'select(.requestId == "550e8400...")'
```

---

## Cache Control Quick Guide

### Browser Cache Duration
- Static (fabricantes, medidas): **24h**
- Dashboard: **1h**
- Homologações: **1h**
- Media (images): **7d**
- Dynamic (curadoria): **no-cache**

### CDN Cache Duration
- Static: **7d** (Vercel Edge)
- Dashboard: **1h**
- Homologações: **1h**
- Media: **7d**

### Stale-While-Revalidate
- Static: **14d** (serve stale while regenerating)
- Dynamic: **24h**
- Curadoria: **none** (always fresh)

### Example URL
```
GET https://api.example.com/api/fabricantes
Response headers:
Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600
```

---

## Cache Service API

### Get or Set
```typescript
const data = await cache.getOrSet(
  CACHE_KEYS.MANUFACTURERS_LIST,
  () => fetchManufacturers(),
  CACHE_TTL.VERY_LONG  // 24h
);
```

### Direct Get
```typescript
const data = cache.get(CACHE_KEYS.MANUFACTURERS_LIST);
```

### Set
```typescript
cache.set(CACHE_KEYS.MANUFACTURERS_LIST, data, 86400);
```

### Invalidate
```typescript
// By key pattern
cache.deletePattern("manufacturer:.*");

// Or use helper
invalidateCacheOnChange("manufacturer");

// Clear all
cache.clear();
```

### Stats
```typescript
console.log(cache.getStats());
// { size: 45, memoryUsageMB: 2.3, isDev: false }
```

---

## Logging Usage

### Basic
```typescript
import { logger } from "@/lib/logging/structured-logger";

logger.info("Event happened", { userId: "123", action: "login" });
logger.warn("Something unexpected", { value: 99 });
logger.error("Failed operation", error, { context: "data" });
```

### With Request Context
```typescript
import { createRequestLogger } from "@/lib/logging/structured-logger";

const log = createRequestLogger(requestId);
log.info("Processing request", { userId: "123" });
```

### With Timing
```typescript
await logger.timeAsync(
  "Fetch data",
  () => db.query(),
  { userId: "123" }
);
// Logs: { message: "Fetch data completed", duration: 145 }
```

---

## Middleware Features

### Rate Limiting (active by default)
- 100 requests per 15 minutes per IP
- Returns 429 if exceeded
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Idempotency
- Send header: `Idempotency-Key: unique-value`
- Deduplicates POST/PUT/PATCH for 24h
- Returns `X-Deduplication-Cache: HIT/MISS`

### CORS
- Allowed origins: configured via `NEXT_PUBLIC_APP_URL`
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Credentials: true

### Request Logging
- Every request logged as JSON
- Fields: timestamp, level, method, path, ip, userAgent, referer

---

## Route Pattern Examples

### GET with Cache
```typescript
export const GET = createOptimizedGETHandler(
  CACHE_KEYS.MANUFACTURERS_LIST,
  CACHE_TTL.VERY_LONG,
  () => listManufacturers()
);
```

### POST with Idempotency
```typescript
export const POST = createOptimizedPOSTHandler(
  (data) => schema.parse(data),
  (data) => createItem(data),
  ["cache:.*", "dashboard"]  // Invalidate on success
);
```

### GET with Filters
```typescript
export const GET = createOptimizedListHandler(
  (params) => listItems(params),
  "items",  // Cache key prefix
  CACHE_TTL.MEDIUM  // TTL: 30min
);
```

### DELETE with Invalidation
```typescript
export const DELETE = createOptimizedDELETEHandler(
  (id) => deleteItem(id),
  ["item:.*", "list:.*"]  // Patterns to clear
);
```

---

## Health Check Endpoint

### Endpoint
```
GET /api/health
```

### Successful Response (200 OK)
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
      "heapUsedMB": 256
    }
  },
  "buildTime": "2024-08-03T19:00:00.000Z"
}
```

### Error Response (503 Service Unavailable)
```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "error",
      "error": "Connection timeout"
    }
  }
}
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

## Performance Targets

| Metric | Target | Alert | Critical |
|--------|--------|-------|----------|
| API P50 | < 200ms | > 500ms | > 2s |
| API P95 | < 500ms | > 1s | > 5s |
| API P99 | < 1000ms | > 2s | > 5s |
| Cache Hit | > 70% | < 50% | < 10% |
| Error Rate | < 1% | > 5% | > 10% |
| DB CPU | < 50% | > 80% | > 95% |
| Memory | < 500MB | > 800MB | > 1GB |
| Connections | < 50 | > 80 | > 100 |

---

## Troubleshooting

### Cache Not Working
```bash
# Check stats
node -e "import('./lib/cache/cache-service').then(m => console.log(m.cache.getStats()))"

# Clear if needed
# cache.clear()
```

### Database Slow
```sql
-- See slow queries
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 20;

-- Analyze query
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Refresh views
SELECT refresh_materialized_views();
```

### High Memory
```bash
# Check Node memory
node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"

# Clear cache if > 500MB
# cache.clear()
```

### Rate Limit Too Strict
Edit `middleware.ts`:
```typescript
const RATE_LIMIT_CONFIG = {
  requests: 200,  // Increase
  windowMs: 15 * 60 * 1000,
};
```

---

## Environment Variables

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.example.com

# Database (with pooling)
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public
DIRECT_URL=postgresql://user:pass@host:5432/db

# Optional: Error Tracking
SENTRY_DSN=https://...@sentry.io/...

# Optional: Monitoring
DATADOG_API_KEY=...
```

---

## Deployment Checklist (Summary)

### Pre-Deployment
- [ ] npm run build (no errors)
- [ ] npm run lint (no warnings)
- [ ] Load test locally
- [ ] Database backup created
- [ ] Rollback plan documented

### Staging Deployment
- [ ] Code deployed
- [ ] Database migrations run
- [ ] Materialized views refreshed
- [ ] curl /api/health returns 200
- [ ] Cache headers validated
- [ ] Load test passed
- [ ] No new errors in logs

### Production Deployment
- [ ] Blue-green deployment ready
- [ ] Team notified
- [ ] On-call team ready
- [ ] Monitoring dashboards active
- [ ] Alerts configured

### Post-Deployment
- [ ] Smoke tests pass
- [ ] Cache hit rate > 70%
- [ ] API P95 < 500ms
- [ ] Error rate < 1%
- [ ] Memory stable

---

## Key Metrics to Monitor

### Daily
- API latency (P50, P95, P99)
- Error rate (5xx, 4xx)
- Cache hit rate
- Database query time

### Weekly
- Memory trend
- Database size
- Index fragmentation
- Slow query log

### Monthly
- Capacity planning
- TTL effectiveness
- Materialized view refresh time
- Conn pool utilization

---

## References

### Documentation
- DEPLOYMENT_CHECKLIST.md - Full deployment guide
- PERFORMANCE_GUIDE.md - Complete usage guide
- IMPLEMENTATION_EXAMPLES.md - 7 practical examples
- OPTIMIZATION_ARCHITECTURE.md - Visual diagrams

### External Resources
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html)
- [k6 Documentation](https://k6.io/docs/)

---

**Version:** 1.0  
**Last Updated:** 2026-08-03  
**Status:** Ready for implementation
