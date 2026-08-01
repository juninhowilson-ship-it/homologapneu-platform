-- Master Data Layer (Etapa 1 — Master Vehicle Database)
-- Introduz normalizedName (minusculas, sem acento, espacos colapsados) como
-- chave real de deduplicacao de Manufacturer e VehicleModel, substituindo
-- `name` (case/acento-sensivel), que ja permitia duplicatas reais na base
-- (4 pares encontrados e mesclados antes desta migration: "Zr-v"/"ZR-V",
-- "CITY"/"City", "WR-V"/"Wr-v", "Mégane"/"Megane").
--
-- Aplicada em 2 fases nesta sessao (coluna nullable -> merge de duplicatas
-- + backfill via script -> NOT NULL/UNIQUE), registrada aqui apenas com o
-- DDL final, no mesmo padrao das migrations anteriores deste projeto.

-- AlterTable
ALTER TABLE "manufacturers" ADD COLUMN "normalizedName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "vehicle_models" ADD COLUMN "normalizedName" TEXT NOT NULL;

-- DropIndex
DROP INDEX "manufacturers_name_key";

-- DropIndex
DROP INDEX "vehicle_models_manufacturerId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_normalizedName_key" ON "manufacturers"("normalizedName");

-- CreateIndex
CREATE INDEX "manufacturers_name_idx" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_manufacturerId_normalizedName_key" ON "vehicle_models"("manufacturerId", "normalizedName");
