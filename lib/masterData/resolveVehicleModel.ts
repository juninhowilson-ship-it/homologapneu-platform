import type { PrismaClient } from "@prisma/client";
import { normalizeLookupKey } from "./normalizeName";

/**
 * Subconjunto do PrismaClient necessário aqui — permite chamar esta função
 * tanto com o singleton guardado por server-only (repositories/veiculos.ts)
 * quanto com um `new PrismaClient()` avulso de script (scripts/lib/
 * fipeCatalog.ts, prisma/seed.ts), sem duplicar a lógica de resolução em
 * cada lugar (mesma causa raiz do bug real encontrado nesta etapa: dois
 * caminhos de código diferentes faziam duas comparações "quase iguais",
 * nenhuma cobrindo acento — "Mégane"/"Megane" coexistiam por isso).
 */
type PrismaLike = Pick<PrismaClient, "vehicleModel" | "searchAlias">;

export type VehicleModelMatch = {
  id: number;
  matchedVia: "normalizedName" | "alias";
};

/**
 * Resolve um VehicleModel existente por nome — primeiro por
 * normalizedName (rápido, indexado), depois por SearchAlias
 * (entityType=VEHICLE_MODEL) para apelidos já curados manualmente (ex.:
 * "Corola"→Corolla). Nunca cria; nunca adivinha um apelido novo.
 */
export async function resolveVehicleModelId(
  db: PrismaLike,
  manufacturerId: number,
  rawName: string
): Promise<VehicleModelMatch | null> {
  const normalizedName = normalizeLookupKey(rawName);

  const direct = await db.vehicleModel.findUnique({
    where: { manufacturerId_normalizedName: { manufacturerId, normalizedName } },
    select: { id: true },
  });
  if (direct) return { id: direct.id, matchedVia: "normalizedName" };

  const alias = await db.searchAlias.findFirst({
    where: { entityType: "VEHICLE_MODEL", alias: normalizedName },
    select: { entityId: true },
  });
  if (alias) {
    const aliased = await db.vehicleModel.findFirst({
      where: { id: alias.entityId, manufacturerId },
      select: { id: true },
    });
    if (aliased) return { id: aliased.id, matchedVia: "alias" };
  }

  return null;
}

/**
 * find-or-create canônico de VehicleModel — único caminho que deve criar
 * uma linha nova nesta tabela em toda a base de código (app e scripts).
 */
export async function findOrCreateVehicleModelId(
  db: PrismaLike,
  manufacturerId: number,
  rawName: string
): Promise<number> {
  const resolved = await resolveVehicleModelId(db, manufacturerId, rawName);
  if (resolved) return resolved.id;

  const created = await db.vehicleModel.create({
    data: {
      manufacturerId,
      name: rawName,
      normalizedName: normalizeLookupKey(rawName),
    },
    select: { id: true },
  });
  return created.id;
}
