import "server-only";

/// Códigos "Original Equipment" (OE) declarados por montadoras para um pneu
/// homologado — heurística por rótulo (não há padrão universal de formato),
/// procurando o token alfanumérico logo após um rótulo conhecido
/// ("OE", "Código OE", "P/N", "Part Number"). Nunca inventa um código sem
/// rótulo explícito no texto.
const LABELED_CODE_REGEX =
  /\b(?:C[oó]digo\s+OE|OE|P\/N|PN|Part\s*Number)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-]{4,19})\b/gi;

export function extractOeCodes(text: string): string[] {
  const codigos = new Set<string>();
  for (const match of text.matchAll(LABELED_CODE_REGEX)) {
    const codigo = match[1]?.toUpperCase().trim();
    if (codigo) codigos.add(codigo);
  }
  return [...codigos];
}
