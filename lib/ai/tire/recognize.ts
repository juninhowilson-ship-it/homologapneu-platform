import "server-only";
import { prisma } from "@/lib/prisma";
import type { ExtractedMeasure } from "@/lib/ai/document/extractMeasures";

export type RecognizedTire = {
  measure: ExtractedMeasure;
  tireManufacturerId: number | null;
  tireManufacturerName: string | null;
  tireId: number | null;
  tireModel: string | null;
  /** true quando a medida já existe cadastrada em Tire (com o mesmo
   * fabricante reconhecido no texto) — eleva a confiança, mas a ausência
   * não descarta o achado (pode ser um pneu novo real, ainda não cadastrado). */
  matchedInDatabase: boolean;
};

function containsWord(text: string, word: string): boolean {
  if (word.length < 2) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/** Reconhece pneu (medida + fabricante + modelo, quando o texto permitir)
 * cruzando as medidas já extraídas (extractMeasures) com o cadastro
 * existente de TireManufacturer/Tire — leitura apenas. Uma medida sem
 * fabricante/modelo reconhecido ainda vira um RecognizedTire (só com os
 * campos de banco null), pois a medida em si já é um dado real do
 * documento. */
export async function recognizeTires(
  text: string,
  measures: ExtractedMeasure[]
): Promise<RecognizedTire[]> {
  if (measures.length === 0) return [];

  const manufacturers = await prisma.tireManufacturer.findMany({
    select: { id: true, name: true },
  });
  const manufacturersEncontrados = manufacturers.filter((m) => containsWord(text, m.name));

  const resultados: RecognizedTire[] = [];

  for (const measure of measures) {
    if (manufacturersEncontrados.length === 0) {
      resultados.push({
        measure,
        tireManufacturerId: null,
        tireManufacturerName: null,
        tireId: null,
        tireModel: null,
        matchedInDatabase: false,
      });
      continue;
    }

    let encontrouNoBanco = false;
    for (const manufacturer of manufacturersEncontrados) {
      const tire = await prisma.tire.findFirst({
        where: {
          tireManufacturerId: manufacturer.id,
          width: measure.width,
          profile: measure.profile,
          rim: measure.rim,
        },
        select: { id: true, model: true },
      });

      resultados.push({
        measure,
        tireManufacturerId: manufacturer.id,
        tireManufacturerName: manufacturer.name,
        tireId: tire?.id ?? null,
        tireModel: tire?.model ?? null,
        matchedInDatabase: tire !== null,
      });
      if (tire) encontrouNoBanco = true;
    }

    if (!encontrouNoBanco && manufacturersEncontrados.length === 0) {
      resultados.push({
        measure,
        tireManufacturerId: null,
        tireManufacturerName: null,
        tireId: null,
        tireModel: null,
        matchedInDatabase: false,
      });
    }
  }

  return resultados;
}
