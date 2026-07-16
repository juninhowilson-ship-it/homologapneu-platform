import "server-only";

/**
 * Limitador de tentativas em memória, best-effort — mitiga força bruta no
 * login em uma mesma instância "quente" (Vercel/serverless não garante
 * memória compartilhada entre instâncias, então isso NÃO substitui um
 * rate limit distribuído de verdade, ex.: Upstash/Vercel Firewall, para
 * proteção robusta em produção com múltiplas instâncias).
 */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_KEYS = 5000;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function limparExpirados(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Retorna true se `key` (ex.: IP + rota) excedeu o limite na janela atual. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  limparExpirados(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_ATTEMPTS;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
