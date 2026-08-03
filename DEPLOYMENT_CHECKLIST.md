# Deployment Checklist - HomologaPneu Performance & Scalability

## Pre-Deployment (Development)

### Code Review & Testing
- [ ] Revisar alterações em `middleware.ts`
- [ ] Revisar alterações em `next.config.ts`
- [ ] Testar rate limiting localmente
- [ ] Testar cache invalidation
- [ ] Executar testes de carga (k6, Artillery)
- [ ] Validar logs estruturados com real-time monitoring

### Database Optimization
- [ ] Criar migration com `optimize-database.sql`
- [ ] Testar migration em staging
  ```bash
  psql $DATABASE_URL < prisma/migrations/optimize-database.sql
  ```
- [ ] Verificar criar materialized views:
  ```sql
  SELECT matviewname FROM pg_matviews;
  ```
- [ ] Validar índices foram criados:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN ('Homologation', 'HomologationTire', 'TireManufacturer');
  ```
- [ ] Executar ANALYZE nas tabelas principais:
  ```sql
  ANALYZE "Homologation";
  ANALYZE "HomologationTire";
  ANALYZE "TireManufacturer";
  ```

### Environment Variables
- [ ] Configurar `NEXT_PUBLIC_APP_URL` para production origin
- [ ] Configurar `DATABASE_URL` com connection pooling
  - Verificar se usando PgBouncer ou Supabase connection pooling
  - Pool size recomendado: 20-50 connections
- [ ] Verificar `DIRECT_URL` (para migrations)
- [ ] Verificar `NODE_ENV=production`
- [ ] Configurar `SENTRY_DSN` para error tracking (opcional)

### Infrastructure Setup

#### Database
- [ ] Pool de conexões ativo (Supabase: Connection Pooling enabled)
- [ ] Backup automático configurado
- [ ] Monitoring de queries lentas ativo
- [ ] Query timeout configurado (30s recomendado)
- [ ] Max connections: mínimo 100, máximo 500

#### CDN/Cache (Vercel ou similar)
- [ ] Cache headers validados via curl:
  ```bash
  curl -I https://api.example.com/api/fabricantes
  # Deve retornar: Cache-Control: public, max-age=86400, s-maxage=604800
  ```
- [ ] ISR revalidation ativo
- [ ] Gzip/Brotli compression verificado
- [ ] CORS headers verificados

#### Monitoring & Logging
- [ ] CloudWatch/ELK configurado para receber logs JSON
- [ ] Sentry (ou similar) configurado para error tracking
- [ ] New Relic/Datadog (ou similar) para APM
- [ ] Health check endpoint `/api/health` acessível
- [ ] Alertas configurados:
  - HTTP 5xx errors > 1% de taxa
  - Latência p99 > 1000ms
  - Database connection errors
  - Cache hit rate < 60%
  - Memory usage > 80%

---

## Deployment (Staging)

### Pre-Deployment Checks
- [ ] Build succeeds sem warnings
  ```bash
  npm run build
  ```
- [ ] Linting passes
  ```bash
  npm run lint
  ```
- [ ] Environment variables setados
- [ ] Database migrations executadas

### Deployment
- [ ] Deploy to staging environment
- [ ] Testar health check:
  ```bash
  curl https://staging-api.example.com/api/health
  # Resposta esperada: { "status": "healthy", ... }
  ```
- [ ] Testar endpoints críticos:
  ```bash
  # Dashboard (deve ter Cache-Control com ISR)
  curl -I https://staging-api.example.com/api/dashboard

  # Fabricantes (deve estar cacheado)
  curl -I https://staging-api.example.com/api/fabricantes

  # Rate limiting (fazer 200+ requisições)
  for i in {1..200}; do curl -s https://staging-api.example.com/api/status; done
  ```

### Performance Testing
- [ ] Executar teste de carga com k6:
  ```bash
  npm install -D k6
  k6 run tests/load-test.js --vus 50 --duration 5m
  ```
- [ ] Verificar P50, P95, P99 latency
  - P50: < 200ms
  - P95: < 500ms
  - P99: < 1000ms
- [ ] Verificar cache hit rates
  - Esperado: > 70% para rotas estáticas
- [ ] Verificar database connection pool utilization
  - Esperado: < 80% de conexões ativas

### Data Integrity
- [ ] Verificar integridade de dados pós-migration
  ```sql
  SELECT COUNT(*) FROM "Homologation" WHERE "vehicleGenerationId" IS NULL;
  SELECT COUNT(*) FROM "HomologationTire" WHERE "tireId" IS NULL;
  ```
- [ ] Testar workflows críticos:
  - Login/logout
  - Criar homologação
  - Fazer upload de documento
  - Gerar relatório
  - Exportar Excel/PDF

---

## Deployment (Production)

### Pre-Production Checks
- [ ] Backup do banco de dados realizado
- [ ] Rollback plan documentado
- [ ] On-call team notificado
- [ ] Maintenance window comunicado se necessário

### Blue-Green Deployment (Vercel)
- [ ] Environment "production" setado
- [ ] Database migrations prontas
- [ ] Deploy para staging URL funciona
- [ ] Validar mudanças de performance em staging antes de prod

### Deployment Steps
1. [ ] Deploy application
   ```bash
   git tag -a v1.0.0-perf-optimization -m "Performance & Scalability Optimization"
   git push origin v1.0.0-perf-optimization
   ```

2. [ ] Executar database migrations
   ```bash
   npm run db:migrate:prod
   ```

3. [ ] Executar SQL de otimização
   ```bash
   psql $DATABASE_URL < prisma/migrations/optimize-database.sql
   ```

4. [ ] Refresh materialized views (pode levar alguns minutos)
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY homog_count_by_manufacturer;
   REFRESH MATERIALIZED VIEW CONCURRENTLY tire_statistics;
   ```

5. [ ] Testar health check em produção
   ```bash
   curl https://api.example.com/api/health
   ```

### Post-Deployment Validation

#### Functional Tests
- [ ] Logar na aplicação
- [ ] Acessar dashboard
- [ ] Listar homologações (verificar cache headers)
- [ ] Buscar por fabricante
- [ ] Gerar relatório
- [ ] Fazer upload de arquivo

#### Performance Validation
- [ ] Health check retorna "healthy"
- [ ] Latency P99 < 1000ms
- [ ] Cache hit rate > 70%
- [ ] Database query time < 100ms (p95)
- [ ] Memory usage stable < 80%
- [ ] Não há erros 5xx

#### Monitoring
- [ ] Logs aparecem em CloudWatch/ELK
- [ ] Alertas funcionando
- [ ] APM mostrando traces corretos
- [ ] Database connections estáveis

#### Browser Testing
- [ ] DevTools Network mostra:
  - Gzip/Brotli compression ativo
  - Cache headers corretos
  - 304 Not Modified para recursos cacheados
- [ ] Testar em múltiplos navegadores (Chrome, Firefox, Safari, Edge)
- [ ] Testar em mobile (via DevTools mobile emulation)

---

## Post-Deployment (Weekly Maintenance)

### Database Maintenance
- [ ] Executar VACUUM ANALYZE semanal
  ```sql
  VACUUM ANALYZE;
  ```
- [ ] Monitorar tamanho de índices
  ```sql
  SELECT schemaname, tablename, indexname, 
         pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_indexes 
  WHERE schemaname = 'public'
  ORDER BY pg_relation_size(indexrelid) DESC;
  ```
- [ ] Reindex se > 20% fragmentação (raro)
  ```sql
  REINDEX INDEX CONCURRENTLY idx_homogation_created_date;
  ```
- [ ] Refresh materialized views (executar via cron ou manualmente)
  ```sql
  SELECT refresh_materialized_views();
  ```

### Cache Maintenance
- [ ] Verificar cache statistics
  ```typescript
  import { cache } from "@/lib/cache/cache-service";
  console.log(cache.getStats());
  ```
- [ ] Limpar cache se > 500MB
  ```typescript
  cache.clear();
  ```
- [ ] Revisar cache hit rates nos logs

### Performance Monitoring
- [ ] Revisar latency trends (diária)
- [ ] Revisar error rates (diária)
- [ ] Revisar database slow queries (semanal)
- [ ] Revisar disk space utilization (semanal)
- [ ] Revisar memory trends (semanal)

### Alerting Configuration

#### Critical Alerts (Notify immediately)
- [ ] HTTP 5xx error rate > 5%
- [ ] Database connection errors
- [ ] Health check endpoint returns unhealthy
- [ ] API latency p99 > 5s
- [ ] Application out of memory

#### Warning Alerts (Notify on-call)
- [ ] HTTP 4xx error rate > 10%
- [ ] API latency p99 > 2s
- [ ] Cache hit rate < 50%
- [ ] Database CPU > 80%
- [ ] Database connection pool > 80% utilized

---

## Rollback Plan

Se problemas críticos após deployment:

1. [ ] Identificar o problema
   - Checkar `/api/health`
   - Revisar logs recentes em CloudWatch
   - Revisar APM traces
   - Testar endpoints críticos

2. [ ] Rollback options:
   ```bash
   # Option 1: Rollback via Git (Vercel)
   git revert HEAD
   git push origin main
   # Vercel redeploys automatically

   # Option 2: Manual rollback no Vercel dashboard
   # Deployments > Rollback to previous version

   # Option 3: Database rollback (não necessário se apenas código changed)
   # Ter backup pronto: pg_restore backup.sql
   ```

3. [ ] Validar após rollback
   - [ ] Health check retorna healthy
   - [ ] Endpoints funcionam
   - [ ] Logs normalizados

4. [ ] Post-mortem
   - [ ] Documentar causa
   - [ ] Criar issue no GitHub
   - [ ] Atualizar runbook

---

## Performance Baselines (Target Metrics)

Após deployment, espera-se:

| Métrica | Target | Alerta |
|---------|--------|--------|
| API Latency (p50) | < 200ms | > 500ms |
| API Latency (p95) | < 500ms | > 1000ms |
| API Latency (p99) | < 1000ms | > 2000ms |
| Cache Hit Rate | > 70% | < 50% |
| Database Query Time (p95) | < 100ms | > 200ms |
| Memory Usage | < 512MB | > 800MB |
| HTTP 5xx Errors | < 1% | > 5% |
| Database Connections | < 50% utilized | > 80% |
| Disk Usage | < 80% | > 90% |

---

## Configuration Files Checklist

- [ ] `middleware.ts` - Rate limiting, CORS, logging
- [ ] `next.config.ts` - Cache headers, compression, ISR config
- [ ] `lib/cache/revalidation-config.ts` - ISR settings per route
- [ ] `lib/cache/cache-service.ts` - In-memory cache
- [ ] `lib/logging/structured-logger.ts` - JSON logging
- [ ] `app/api/health/route.ts` - Health check endpoint
- [ ] `prisma/migrations/optimize-database.sql` - Database indexes & views
- [ ] `.env.production` - Production environment variables

---

## Documentation

- [ ] README.md atualizado com instruções de deployment
- [ ] Runbook criado para on-call team
- [ ] Architecture diagram atualizado
- [ ] Performance optimization guide documentado
- [ ] Troubleshooting guide criado

---

## Sign-Off

- [ ] Tech Lead: _______________________ Data: _______
- [ ] DevOps: _________________________ Data: _______
- [ ] Product Owner: __________________ Data: _______

---

## Notes

- Performance optimization é iterativa — continuar monitorando e ajustando TTLs
- Em caso de crescimento > 1000 req/s, considerar:
  - Redis para cache distribuído
  - PostgreSQL replication (read replicas)
  - Elasticsearch para buscas complexas
  - Message queue (Bull/RabbitMQ) para background jobs
- Manter backup de `materialized_views` queries para recriar se necessário
