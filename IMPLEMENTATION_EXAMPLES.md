# Implementation Examples - Performance Optimizations

Exemplos práticos de como implementar as otimizações em rotas existentes.

## Exemplo 1: Refatorar GET /api/dashboard

### Antes (sem otimizações)

```typescript
// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { obterDashboard } from "@/services/dashboard";

export async function GET() {
  const dashboard = await obterDashboard();
  return NextResponse.json(dashboard);
}
```

**Problemas:**
- Sem cache → queda de performance com tráfego
- Sem logging estruturado → difícil debugar
- Sem rate limiting → vulnerável a DoS
- Sem timing → não sabe se é lento

### Depois (com otimizações)

```typescript
// app/api/dashboard/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { obterDashboard } from "@/services/dashboard";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-service";
import { createRequestLogger } from "@/lib/logging/structured-logger";

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const log = createRequestLogger(requestId);
  const startTime = Date.now();

  try {
    // 1. Tentar obter do cache (ISR em browser cache)
    log.info("Fetching dashboard", { source: "cache" });
    
    const dashboard = await cache.getOrSet(
      CACHE_KEYS.DASHBOARD,
      async () => {
        log.info("Dashboard cache miss - fetching from database");
        return await obterDashboard();
      },
      CACHE_TTL.LONG // 1 hora
    );

    const duration = Date.now() - startTime;

    // 2. Retornar com cache headers otimizados
    return NextResponse.json(dashboard, {
      headers: {
        // ISR: Browser cacheia 1h, CDN cacheia 1h, serve stale 24h
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-Response-Time": `${duration}ms`,
        "X-Cache": cache.get(CACHE_KEYS.DASHBOARD) ? "HIT" : "MISS",
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // 3. Log estruturado em caso de erro
    log.error("Failed to fetch dashboard", error, {
      duration,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
    });

    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-cache, must-revalidate",
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  }
}

// Configurar revalidação no next.config.ts
// {
//   source: "/api/dashboard",
//   headers: [
//     {
//       key: "Cache-Control",
//       value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
//     },
//   ],
// },
```

---

## Exemplo 2: Refatorar POST /api/homologacoes

### Antes (sem otimizações)

```typescript
// app/api/homologacoes/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { homologacaoFormSchema } from "@/lib/validations/homologacao";
import { createHomologacao } from "@/services/homologacoes";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = homologacaoFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const homologacao = await createHomologacao(parsed.data);
    return NextResponse.json(homologacao, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
```

**Problemas:**
- Sem idempotência → duplicar homologações ao tentar de novo
- Sem logging → não rastreia quem criou o quê
- Sem validação de Idempotency-Key → não é HTTP-compliant

### Depois (com otimizações)

```typescript
// app/api/homologacoes/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { homologacaoFormSchema } from "@/lib/validations/homologacao";
import { createHomologacao } from "@/services/homologacoes";
import { getCurrentUser } from "@/lib/auth/dal";
import { cache, invalidateCacheOnChange } from "@/lib/cache/cache-service";
import { createRequestLogger } from "@/lib/logging/structured-logger";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const idempotencyKey = request.headers.get("idempotency-key");
  const log = createRequestLogger(requestId);
  const startTime = Date.now();

  try {
    // 1. Validar Idempotency-Key (necessário para idempotência)
    if (!idempotencyKey) {
      log.warn("Missing Idempotency-Key header");
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    // 2. Verificar se já foi processado (deduplicação)
    const deduplicationKey = `homolog:create:${idempotencyKey}`;
    const cached = cache.get(deduplicationKey);
    if (cached) {
      log.info("Request deduplicated - returning cached response", {
        idempotencyKey,
      });
      return NextResponse.json(cached, {
        status: 201,
        headers: { "X-Idempotency-Cache": "HIT" },
      });
    }

    // 3. Parse e validar request
    const body = await request.json();
    const parsed = homologacaoFormSchema.safeParse(body);

    if (!parsed.success) {
      log.warn("Invalid homologation data", { issues: parsed.error.issues });
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // 4. Criar homologação com logging de who/what
    const user = await getCurrentUser();
    log.info("Creating homologation", {
      userId: user?.id,
      email: user?.email,
      modelId: parsed.data.vehicleModelId,
    });

    const homologacao = await createHomologacao(
      parsed.data,
      user?.name ?? null,
      user?.id ?? null
    );

    const duration = Date.now() - startTime;

    // 5. Cache resultado por 24h para idempotência
    cache.set(deduplicationKey, homologacao, 86400);

    // 6. Invalidar caches relacionados (dashboard, listagens)
    invalidateCacheOnChange("homologation");
    log.info("Caches invalidated after create", {
      patterns: ["homolog.*", "dashboard"],
    });

    return NextResponse.json(homologacao, {
      status: 201,
      headers: {
        "X-Idempotency-Cache": "MISS",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    log.error("Failed to create homologation", error, {
      idempotencyKey,
      duration,
    });

    return NextResponse.json(
      { error: "Failed to create homologation" },
      { 
        status: 500,
        headers: { "X-Response-Time": `${duration}ms` },
      }
    );
  }
}
```

**Uso (Client-side):**

```typescript
// Frontend
import { v4 as uuidv4 } from "uuid";

async function criarHomologacao(data) {
  const idempotencyKey = uuidv4(); // Gerar único por request
  
  const response = await fetch("/api/homologacoes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey, // IMPORTANTE!
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  console.log(result);
  // Primeira vez: X-Idempotency-Cache: MISS
  // Segunda vez com mesmo key: X-Idempotency-Cache: HIT (mesma resposta)
}
```

---

## Exemplo 3: Refatorar GET /api/homologacoes

### Antes

```typescript
// app/api/homologacoes/route.ts
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = homologacaoListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 }
    );
  }

  const resultado = await listHomologacoes(parsed.data);
  return NextResponse.json(resultado);
}
```

### Depois (com Cache + Logging)

```typescript
// app/api/homologacoes/route.ts
import { createOptimizedListHandler } from "@/lib/api/optimized-route-patterns";
import { listHomologacoes } from "@/services/homologacoes";

export const GET = createOptimizedListHandler(
  async (params) => {
    // Converter params em formato esperado
    const queryParams = homologacaoListQuerySchema.parse(params);
    return await listHomologacoes(queryParams);
  },
  "homologations", // Prefixo de cache
  1800 // TTL: 30 minutos
);
```

Automático:
- Cache por query params: `homologations:{"manufacturerId":"1","limit":"20"}`
- Logging de cache hits/misses
- Error handling
- Response timing

---

## Exemplo 4: Implementar Database Query com Cache

### Antes

```typescript
// services/fabricantes.ts
export async function getFabricanteStats() {
  // Query complexa que demora 500ms
  const stats = await db.$queryRaw`
    SELECT m.id, m.name, COUNT(h.id) as total
    FROM Manufacturer m
    LEFT JOIN Homologation h ON ...
    GROUP BY m.id
  `;
  return stats;
}
```

**Problema:** Query complexa executada a cada request = lentidão.

### Depois (usar Materialized View + Cache)

```typescript
// services/fabricantes.ts
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache/cache-service";
import { logger } from "@/lib/logging/structured-logger";

export async function getFabricanteStats() {
  // Usa materialized view (pré-calculada) + in-memory cache
  return await cache.getOrSet(
    CACHE_KEYS.MANUFACTURERS_LIST,
    async () => {
      // Query usa materialized view - MUITO mais rápido
      const stats = await logger.timeAsync(
        "Get manufacturer stats from DB",
        async () => {
          return await db.$queryRaw`
            SELECT * FROM homog_count_by_manufacturer
            ORDER BY total_homologations DESC
          `;
        }
      );
      return stats;
    },
    CACHE_TTL.VERY_LONG // 24h
  );
}
```

**Ganho:**
- Query original: 500ms
- Query de materialized view: 15ms
- In-memory cache: < 1ms (no hit)

---

## Exemplo 5: Implementar Refresh de Materialized Views

### Setup (uma vez)

```bash
# Executar SQL de otimização
psql $DATABASE_URL < prisma/migrations/optimize-database.sql

# Verificar que views foram criadas
psql $DATABASE_URL -c "SELECT matviewname FROM pg_matviews;"
```

### Refresh Manual (quando necessário)

```bash
# SSH para servidor ou local
psql $DATABASE_URL -c "SELECT refresh_materialized_views();"
```

### Refresh Automático (Cron)

**Linux/macOS:**
```bash
# Adicionar ao crontab
crontab -e

# Adicionar linha (2 AM todos os dias)
0 2 * * * /usr/bin/psql $DATABASE_URL -c "SELECT refresh_materialized_views();"
```

**Windows (PowerShell):**
```powershell
# Criar arquivo: refresh-views.ps1
psql $env:DATABASE_URL -c "SELECT refresh_materialized_views();"

# Agendar via Task Scheduler
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "C:\scripts\refresh-views.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00 AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Refresh DB Views"
```

---

## Exemplo 6: Adicionar Logging Estruturado em Serviço

### Antes

```typescript
// services/homologacoes.ts
export async function createHomologacao(data, userName, userId) {
  try {
    const homog = await db.homologation.create({ data: {...} });
    console.log("Homologation created", homog.id); // Logging ruim
    return homog;
  } catch (error) {
    console.error("Error:", error); // Stack trace ao stdout
    throw error;
  }
}
```

### Depois

```typescript
// services/homologacoes.ts
import { logger } from "@/lib/logging/structured-logger";

export async function createHomologacao(data, userName, userId) {
  const context = {
    userId,
    userName,
    modelId: data.vehicleModelId,
    tireCount: data.tires?.length || 0,
  };

  try {
    logger.info("Creating homologation", context);

    const homog = await logger.timeAsync(
      "Create homologation in database",
      () => db.homologation.create({ 
        data: {
          ...data,
          createdBy: userId,
        } 
      }),
      context
    );

    logger.info("Homologation created successfully", {
      ...context,
      homogId: homog.id,
    });

    return homog;
  } catch (error) {
    logger.error("Failed to create homologation", error, context);
    throw error;
  }
}
```

**Logs estruturados (JSON):**
```json
{
  "timestamp": "2024-08-03T19:30:45.123Z",
  "level": "info",
  "message": "Creating homologation",
  "userId": "123",
  "userName": "John Doe",
  "modelId": 5,
  "tireCount": 4
}

{
  "timestamp": "2024-08-03T19:30:45.456Z",
  "level": "info",
  "message": "Create homologation in database completed",
  "duration": 312,
  "userId": "123"
}
```

---

## Exemplo 7: Testar Performance

### Load Test com k6

```bash
# Instalar k6
npm install -D k6

# Executar test
k6 run scripts/load-test.ts --vus 50 --duration 5m

# Com custom URL
k6 run scripts/load-test.ts --vus 100 --duration 10m -e BASE_URL=https://staging.example.com
```

**Interpretar resultados:**

```
     http_req_duration: avg=245ms, p(90)=512ms, p(95)=612ms, p(99)=1.2s
     http_reqs: 1234.5/s
     http_req_failed: 0.1%
```

- P95: 612ms - 95% de requests responderam em < 612ms ✓
- Req/s: 1234.5 - suporta 1200+ requisições por segundo ✓
- Fail rate: 0.1% - taxa de erro aceitável ✓

### Validar Cache Headers

```bash
# Curl com verbose
curl -i -H "Accept-Encoding: gzip" https://api.example.com/api/fabricantes

# Expected response headers:
# HTTP/2 200
# content-encoding: br (ou gzip)
# cache-control: public, max-age=86400, s-maxage=604800
# x-cache: HIT (segunda requisição)
```

### Monitor Em Tempo Real

```bash
# Ver logs estruturados
tail -f /var/log/app.log | jq '.[] | select(.level == "error")'

# CloudWatch
aws logs tail /aws/lambda/homologapneu --follow

# Datadog/New Relic
# Dashboard mostra P50, P95, P99 em tempo real
```

---

## Checklist de Implementação

Para cada rota otimizar:

- [ ] Adicionar cache se GET de dados estáticos
- [ ] Adicionar Idempotency-Key handling se POST/PUT
- [ ] Adicionar logging estruturado
- [ ] Adicionar response timing headers
- [ ] Adicionar Cache-Control headers
- [ ] Testar com load test (k6)
- [ ] Validar cache headers com curl
- [ ] Documentar em comentário de rota
- [ ] Adicionar ao PERFORMANCE_GUIDE.md

---

## Próximos Passos

1. **Implementar em rotas críticas primeiro:**
   - `/api/dashboard`
   - `/api/fabricantes`
   - `/api/homologacoes`

2. **Testar performance:**
   - Antes: baseline
   - Depois: medir ganho
   - Esperar: 50-80% melhora

3. **Monitorar em produção:**
   - Cache hit rates
   - Response times
   - Error rates

4. **Iterar:**
   - Ajustar TTLs conforme uso real
   - Aumentar limits conforme crescimento
   - Adicionar mais índices se necessário
