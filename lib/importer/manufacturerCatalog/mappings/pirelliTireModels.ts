import type { TireCategory } from "@prisma/client";

/**
 * Dicionário de códigos internos de padrão/linha da Pirelli (coluna
 * DESCRIÇÃO do catálogo real "Pirelli Tabela de Aplicação e Homologação
 * Abril - 2026.xlsx") → nome comercial real + categoria do pneu.
 *
 * Pesquisado em fontes confiáveis (pirelli.com/pirelli.com.br, ANIP,
 * Automotive Business, retailers como Excelsior/Gilson Pneus) antes de
 * cadastrar qualquer TireModel — nunca adivinhado. Categoria (TireCategory)
 * também vem da própria descrição oficial de cada linha nas fontes
 * pesquisadas (ex.: Scorpion é "focada em SUVs e crossovers", P Zero é
 * "para dirigir esportivamente"), não é uma suposição própria.
 *
 * Códigos de baixíssima frequência que não tiveram confirmação sólida em
 * fonte confiável (P7Blue, Carrier, S-MUD, S-STR, W-CITA, F.S/T, P 6,
 * TROFEORace, P Zero Asimmetrico/Nero, variantes CORSA L/R, etc.) foram
 * deliberadamente deixados de fora — decisão do usuário: ficam pendentes
 * de revisão humana em vez de arriscar um nome errado (~29 produtos).
 */
export type PirelliTireModelInfo = {
  tireModelName: string;
  category: TireCategory;
};

const PIRELLI_TIRE_MODELS: Record<string, PirelliTireModelInfo> = {
  "P ZERO": { tireModelName: "P Zero", category: "ESPORTIVO" },
  "P-ZERO": { tireModelName: "P Zero", category: "ESPORTIVO" },
  ROSSO: { tireModelName: "P Zero Rosso", category: "ESPORTIVO" },
  PCORSA: { tireModelName: "P Zero Corsa System", category: "ESPORTIVO" },

  P7CINT: { tireModelName: "Cinturato P7", category: "PASSEIO" },
  "P7-CNT": { tireModelName: "Cinturato P7", category: "PASSEIO" },
  P1CINT: { tireModelName: "Cinturato P1", category: "PASSEIO" },
  P4CINT: { tireModelName: "Cinturato P4", category: "PASSEIO" },

  SCORPN: { tireModelName: "Scorpion", category: "SUV" },
  "S-VEAS": { tireModelName: "Scorpion Verde All Season", category: "SUV" },
  "S-VERD": { tireModelName: "Scorpion Verde", category: "SUV" },
  "S-ATR": { tireModelName: "Scorpion ATR", category: "SUV" },
  "S-HT": { tireModelName: "Scorpion HT", category: "SUV" },
  "S-A/T+": { tireModelName: "Scorpion All Terrain Plus", category: "SUV" },
  SZROAS: { tireModelName: "Scorpion Zero Asimmetrico", category: "SUV" },
  "S-ZERO": { tireModelName: "Scorpion Zero", category: "SUV" },
  "S-MTR": { tireModelName: "Scorpion MTR", category: "SUV" },

  P400EV: { tireModelName: "P400 Evo", category: "PASSEIO" },
  PWRGY: { tireModelName: "Powergy", category: "PASSEIO" },
  "F.EVO": { tireModelName: "Formula Evo", category: "PASSEIO" },

  CHRONO: { tireModelName: "Chrono", category: "COMERCIAL" },
};

const SIZE_INDEX_PREFIX =
  /^P?(LT)?\d{2,3}\/\d{2}(ZR|R)\d{2}C?\s*(\(?\d{2,3}[A-Z]\)?)(\(\d{2,3}[A-Z]\))?\s*(XL)?\s*/i;

/** Reduz a descrição bruta ao código-núcleo do padrão, removendo tamanho,
 * índices e marcas decorativas de fitment OE (ex.: "(KS)", "(AO)", "wl",
 * "ncs", "r-f", "s-i") — mesma lógica usada para levantar a lista de
 * códigos distintos que foi pesquisada. */
export function corePirelliFamilyCode(descricaoRaw: string): string {
  let s = descricaoRaw.replace(SIZE_INDEX_PREFIX, "").trim();
  s = s.replace(/^r-f\s?/i, "");
  s = s.replace(/^s-i\s?/i, "");
  s = s.replace(/\bwl\b/gi, "");
  s = s.replace(/\bXL\b/gi, "");
  s = s.replace(/\bncs\b/gi, "");
  s = s.replace(/\belt\b/gi, "");
  s = s.replace(/§/g, "");
  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s.toUpperCase();
}

/** Retorna o modelo comercial confirmado para uma descrição de produto da
 * Pirelli, ou `null` quando o código não está no dicionário confirmado
 * (nunca inventa um nome — fica pendente de revisão humana). */
export function resolvePirelliTireModel(
  descricaoRaw: string
): PirelliTireModelInfo | null {
  const codigo = corePirelliFamilyCode(descricaoRaw);
  return PIRELLI_TIRE_MODELS[codigo] ?? null;
}
