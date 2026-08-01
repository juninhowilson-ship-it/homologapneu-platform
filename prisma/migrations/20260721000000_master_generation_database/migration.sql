-- Master Data Layer (Etapa 2 — Master Generation Database)
-- normalizedName em VehicleGeneration, mesma estrategia de
-- Manufacturer/VehicleModel (Etapa 1) — chave de deduplicacao calculada
-- por normalizeLookupKey (lib/masterData/normalizeName.ts). Tabela
-- vehicle_generations estava vazia (0 linhas) no momento desta migration,
-- portanto sem necessidade de merge/backfill previo de duplicatas.
--
-- SearchAliasEntityType ganha VEHICLE_GENERATION, mesmo padrao de
-- VEHICLE_MODEL (Etapa 1) — escopado por vehicleModelId via entityId.

-- AlterEnum
ALTER TYPE "SearchAliasEntityType" ADD VALUE 'VEHICLE_GENERATION';

-- DropIndex
DROP INDEX "vehicle_generations_vehicleModelId_name_key";

-- AlterTable
ALTER TABLE "vehicle_generations" ADD COLUMN "normalizedName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "vehicle_generations_name_idx" ON "vehicle_generations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_generations_vehicleModelId_normalizedName_key" ON "vehicle_generations"("vehicleModelId", "normalizedName");
