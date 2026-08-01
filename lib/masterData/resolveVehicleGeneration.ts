import type { PrismaClient } from "@prisma/client";
import { normalizeLookupKey } from "./normalizeName";

/**
 * Mesmo padrão de lib/masterData/resolveVehicleModel.ts — subconjunto do
 * PrismaClient para funcionar tanto com o singleton guardado por
 * server-only quanto com um `new PrismaClient()` avulso de script.
 */
type PrismaLike = Pick<PrismaClient, "vehicleGeneration" | "searchAlias">;

export type VehicleGenerationMatch = {
  id: number;
  matchedVia: "normalizedName" | "alias";
};

/**
 * Resolve uma VehicleGeneration existente por nome — normalizedName
 * primeiro (indexado, escopado por vehicleModelId), depois SearchAlias
 * (entityType=VEHICLE_GENERATION, ex.: "3ª geração"→"E170" já curado
 * manualmente). Nunca cria; nunca adivinha um apelido novo.
 */
export async function resolveVehicleGenerationId(
  db: PrismaLike,
  vehicleModelId: number,
  rawName: string
): Promise<VehicleGenerationMatch | null> {
  const normalizedName = normalizeLookupKey(rawName);

  const direct = await db.vehicleGeneration.findUnique({
    where: { vehicleModelId_normalizedName: { vehicleModelId, normalizedName } },
    select: { id: true },
  });
  if (direct) return { id: direct.id, matchedVia: "normalizedName" };

  const alias = await db.searchAlias.findFirst({
    where: { entityType: "VEHICLE_GENERATION", alias: normalizedName },
    select: { entityId: true },
  });
  if (alias) {
    const aliased = await db.vehicleGeneration.findFirst({
      where: { id: alias.entityId, vehicleModelId },
      select: { id: true },
    });
    if (aliased) return { id: aliased.id, matchedVia: "alias" };
  }

  return null;
}

/**
 * find-or-create canônico de VehicleGeneration — único caminho que deve
 * criar uma linha nova nesta tabela em toda a base de código. yearStart/
 * yearEnd só são usados na criação (uma geração já existente nunca tem
 * suas datas sobrescritas por uma importação posterior — mesmo raciocínio
 * de findOrCreateEngine preservar o registro já curado).
 */
export async function findOrCreateVehicleGenerationId(
  db: PrismaLike,
  vehicleModelId: number,
  rawName: string,
  yearStart: number,
  yearEnd: number | null
): Promise<number> {
  const resolved = await resolveVehicleGenerationId(db, vehicleModelId, rawName);
  if (resolved) return resolved.id;

  const created = await db.vehicleGeneration.create({
    data: {
      vehicleModelId,
      name: rawName,
      normalizedName: normalizeLookupKey(rawName),
      yearStart,
      yearEnd,
    },
    select: { id: true },
  });
  return created.id;
}
