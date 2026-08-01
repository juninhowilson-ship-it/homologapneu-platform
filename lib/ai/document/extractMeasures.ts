import "server-only";

export type ExtractedMeasure = {
  raw: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string | null;
  speedIndex: string | null;
  runFlat: boolean;
  xl: boolean;
  seal: boolean;
};

/// Medida de pneu no padrão ETRTO: "205/55R16 91V", "205/55 R16", "205/55ZR16 91Y XL".
/// Índice de carga/velocidade e sufixos (RUNFLAT/XL/SEAL) são opcionais e
/// só entram no resultado quando realmente aparecem no texto — nunca inferidos.
const MEASURE_REGEX =
  /\b(\d{3})\/(\d{2})\s?Z?R\s?(\d{2})(?:\s+(\d{2,3})([A-Z]))?\b/g;

export function extractMeasures(text: string): ExtractedMeasure[] {
  const encontradas: ExtractedMeasure[] = [];
  const upper = text.toUpperCase();

  for (const match of upper.matchAll(MEASURE_REGEX)) {
    const [raw, width, profile, rim, loadIndex, speedIndex] = match;
    const inicio = match.index ?? 0;
    const janela = upper.slice(inicio, inicio + raw.length + 40);

    encontradas.push({
      raw: raw.trim(),
      width: Number(width),
      profile: Number(profile),
      rim: Number(rim),
      loadIndex: loadIndex ?? null,
      speedIndex: speedIndex ?? null,
      runFlat: /\bRUN\s?FLAT\b|\bRFT\b|\bROF\b/.test(janela),
      xl: /\bXL\b|\bREINF(ORCED)?\b/.test(janela),
      seal: /\bSEAL\b|\bSELANTE\b/.test(janela),
    });
  }

  return encontradas;
}
