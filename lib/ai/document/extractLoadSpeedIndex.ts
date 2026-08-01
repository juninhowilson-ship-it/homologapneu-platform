import "server-only";
import { prisma } from "@/lib/prisma";

export type RecognizedLoadSpeedIndex = {
  loadIndex: string;
  speedIndex: string;
  /** true quando o par já existe cadastrado em LoadIndex/SpeedIndex (leitura
   * apenas) — eleva a confiança do reconhecimento, mas a ausência não
   * descarta o achado, só reduz a confiança (pode ser um código novo real). */
  knownInDatabase: boolean;
};

const INDEX_PAIR_REGEX = /\b(\d{2,3})([A-Z])\b/g;

// Letras usadas como índice de velocidade real (ETRTO) — filtra ruído como
// "16R" (aro) sendo capturado por engano fora do contexto de extractMeasures.
const VALID_SPEED_LETTERS = new Set([
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
  "B", "C", "D", "E", "F", "G", "J", "K", "L", "M", "N",
  "P", "Q", "R", "S", "T", "U", "H", "V", "W", "Y", "Z",
]);

/** Procura pares "índice de carga + índice de velocidade" (ex.: "91V") soltos
 * no texto (fora de uma medida completa) e cruza com as tabelas
 * LoadIndex/SpeedIndex já cadastradas (leitura apenas, nunca grava). */
export async function extractLoadSpeedIndexes(
  text: string
): Promise<RecognizedLoadSpeedIndex[]> {
  const candidatos = new Map<string, RecognizedLoadSpeedIndex>();

  for (const match of text.toUpperCase().matchAll(INDEX_PAIR_REGEX)) {
    const [, loadIndex, speedIndex] = match;
    if (!VALID_SPEED_LETTERS.has(speedIndex)) continue;
    const chave = `${loadIndex}${speedIndex}`;
    if (!candidatos.has(chave)) {
      candidatos.set(chave, { loadIndex, speedIndex, knownInDatabase: false });
    }
  }

  if (candidatos.size === 0) return [];

  const [loadIndexes, speedIndexes] = await Promise.all([
    prisma.loadIndex.findMany({
      where: { code: { in: [...candidatos.values()].map((c) => c.loadIndex) } },
      select: { code: true },
    }),
    prisma.speedIndex.findMany({
      where: { code: { in: [...candidatos.values()].map((c) => c.speedIndex) } },
      select: { code: true },
    }),
  ]);

  const loadKnown = new Set(loadIndexes.map((l) => l.code));
  const speedKnown = new Set(speedIndexes.map((s) => s.code));

  return [...candidatos.values()].map((c) => ({
    ...c,
    knownInDatabase: loadKnown.has(c.loadIndex) && speedKnown.has(c.speedIndex),
  }));
}
