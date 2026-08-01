import "server-only";
import { prisma } from "@/lib/prisma";

export type RecognizedVehicle = {
  manufacturerId: number;
  manufacturerName: string;
  modelId: number | null;
  modelName: string | null;
  generationId: number | null;
  generationName: string | null;
  versionId: number | null;
  versionName: string | null;
  engineId: number | null;
  engineName: string | null;
  fuel: string | null;
  transmissionType: string | null;
  drivetrain: string | null;
  category: string | null;
};

function containsWord(text: string, word: string): boolean {
  if (word.length < 2) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/** Reconhece veículo (marca/modelo/geração/versão/motor/transmissão/tração/
 * categoria) cruzando o texto extraído do documento com o cadastro já
 * existente em Manufacturer/VehicleModel/VehicleGeneration/VehicleVersion —
 * leitura apenas, nunca cria nem infere um veículo que não esteja no texto.
 * Retorna uma lista (pode haver mais de um veículo mencionado no mesmo
 * documento), cada um com o nível de detalhe efetivamente reconhecido. */
export async function recognizeVehicles(text: string): Promise<RecognizedVehicle[]> {
  const manufacturers = await prisma.manufacturer.findMany({
    select: { id: true, name: true },
  });
  const manufacturersEncontrados = manufacturers.filter((m) => containsWord(text, m.name));
  if (manufacturersEncontrados.length === 0) return [];

  const resultados: RecognizedVehicle[] = [];

  for (const manufacturer of manufacturersEncontrados.slice(0, 10)) {
    const models = await prisma.vehicleModel.findMany({
      where: { manufacturerId: manufacturer.id },
      select: { id: true, name: true },
    });
    const modelsEncontrados = models.filter((m) => containsWord(text, m.name));

    if (modelsEncontrados.length === 0) {
      resultados.push({
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
        modelId: null,
        modelName: null,
        generationId: null,
        generationName: null,
        versionId: null,
        versionName: null,
        engineId: null,
        engineName: null,
        fuel: null,
        transmissionType: null,
        drivetrain: null,
        category: null,
      });
      continue;
    }

    for (const model of modelsEncontrados.slice(0, 10)) {
      const versions = await prisma.vehicleVersion.findMany({
        where: { vehicleModelId: model.id },
        select: {
          id: true,
          name: true,
          category: true,
          drivetrain: true,
          generation: { select: { id: true, name: true } },
          engine: { select: { id: true, name: true, fuel: true } },
          transmission: { select: { type: true } },
        },
      });
      const versionsEncontradas = versions.filter((v) => containsWord(text, v.name));

      if (versionsEncontradas.length === 0) {
        resultados.push({
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          modelId: model.id,
          modelName: model.name,
          generationId: null,
          generationName: null,
          versionId: null,
          versionName: null,
          engineId: null,
          engineName: null,
          fuel: null,
          transmissionType: null,
          drivetrain: null,
          category: null,
        });
        continue;
      }

      for (const version of versionsEncontradas.slice(0, 10)) {
        resultados.push({
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          modelId: model.id,
          modelName: model.name,
          generationId: version.generation?.id ?? null,
          generationName: version.generation?.name ?? null,
          versionId: version.id,
          versionName: version.name,
          engineId: version.engine?.id ?? null,
          engineName: version.engine?.name ?? null,
          fuel: version.engine?.fuel ?? null,
          transmissionType: version.transmission?.type ?? null,
          drivetrain: version.drivetrain,
          category: version.category,
        });
      }
    }
  }

  return resultados;
}
