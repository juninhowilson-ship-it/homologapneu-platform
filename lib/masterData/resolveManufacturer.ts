import type { PrismaClient } from "@prisma/client";
import { normalizeLookupKey } from "./normalizeName";

type PrismaLike = Pick<PrismaClient, "manufacturer" | "searchAlias">;

export type ManufacturerMatch = {
  id: number;
  matchedVia: "normalizedName" | "alias";
};

/**
 * Resolve um Manufacturer existente por nome — normalizedName primeiro,
 * depois SearchAlias (entityType=MANUFACTURER, ex.: "VW"→Volkswagen já
 * curado manualmente). Nunca cria; nunca adivinha um apelido novo.
 */
export async function resolveManufacturerId(
  db: PrismaLike,
  rawName: string
): Promise<ManufacturerMatch | null> {
  const normalizedName = normalizeLookupKey(rawName);

  const direct = await db.manufacturer.findUnique({
    where: { normalizedName },
    select: { id: true },
  });
  if (direct) return { id: direct.id, matchedVia: "normalizedName" };

  const alias = await db.searchAlias.findFirst({
    where: { entityType: "MANUFACTURER", alias: normalizedName },
    select: { entityId: true },
  });
  if (alias) return { id: alias.entityId, matchedVia: "alias" };

  return null;
}
