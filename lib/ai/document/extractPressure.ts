import "server-only";

export type ExtractedPressure = {
  raw: string;
  value: number;
  unit: "psi" | "bar" | "kpa";
};

const PRESSURE_REGEX = /\b(\d{1,3}(?:[.,]\d)?)\s*(psi|bar|kpa|lbs?\/pol²?)\b/gi;

function normalizeUnit(unidade: string): "psi" | "bar" | "kpa" {
  const lower = unidade.toLowerCase();
  if (lower.startsWith("bar")) return "bar";
  if (lower.startsWith("kpa")) return "kpa";
  return "psi";
}

export function extractPressures(text: string): ExtractedPressure[] {
  const encontradas: ExtractedPressure[] = [];
  for (const match of text.matchAll(PRESSURE_REGEX)) {
    const [raw, valorTexto, unidade] = match;
    encontradas.push({
      raw: raw.trim(),
      value: Number(valorTexto.replace(",", ".")),
      unit: normalizeUnit(unidade),
    });
  }
  return encontradas;
}
