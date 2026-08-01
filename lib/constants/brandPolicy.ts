/**
 * Espelho de app (mesmo padrão de lib/constants/validacao.ts para
 * ValidationStatus) do enum Prisma BrandPolicy — mantido como array
 * simples para uso em componentes client sem depender de @prisma/client.
 *
 * Até 2026-07-22 este campo era TEXT livre (sem migração para mudar a
 * política); virou enum Prisma por decisão explícita do usuário — acrescentar
 * uma política nova agora exige migração (ver prisma/schema.prisma).
 */
export const BRAND_POLICIES = [
  "OEM_ONLY",
  "OEM_AND_APPLICATION",
  "APPLICATION_ONLY",
  "HISTORICAL_ONLY",
] as const;

export type BrandPolicy = (typeof BRAND_POLICIES)[number];

export const BRAND_POLICY_LABELS: Record<BrandPolicy, string> = {
  OEM_ONLY: "Somente OEM",
  OEM_AND_APPLICATION: "OEM + aplicação",
  APPLICATION_ONLY: "Somente aplicação",
  HISTORICAL_ONLY: "Somente histórico",
};

export const DEFAULT_BRAND_POLICY: BrandPolicy = "APPLICATION_ONLY";

export function isKnownBrandPolicy(value: string): value is BrandPolicy {
  return (BRAND_POLICIES as readonly string[]).includes(value);
}

/**
 * Matriz de permissão por política (regra explícita do usuário,
 * 2026-07-22): controla o que o importador de database/import/ pode
 * criar para uma marca, não é uma restrição de leitura/exibição.
 *
 *                          aplicação   homologação
 *   APPLICATION_ONLY          sim          não
 *   OEM_ONLY                  não          sim
 *   OEM_AND_APPLICATION       sim          sim
 *   HISTORICAL_ONLY           não          não
 */
export function policyAllowsApplication(policy: BrandPolicy): boolean {
  return policy === "APPLICATION_ONLY" || policy === "OEM_AND_APPLICATION";
}

export function policyAllowsHomologation(policy: BrandPolicy): boolean {
  return policy === "OEM_ONLY" || policy === "OEM_AND_APPLICATION";
}
