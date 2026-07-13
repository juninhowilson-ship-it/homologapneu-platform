import { createHash } from "node:crypto";

/**
 * Hash SHA-256 determinístico do conteúdo importado (linhas brutas já
 * normalizadas em texto), usado para rastreabilidade e para detectar
 * reimportações idênticas de uma mesma fonte.
 */
export function computeImportHash(rows: Record<string, string>[]): string {
  const normalized = JSON.stringify(rows);
  return createHash("sha256").update(normalized).digest("hex");
}
