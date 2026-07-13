/*
  Warnings:

  - You are about to drop the `vehicles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `engine` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `homologations` table. All the data in the column will be lost.
  - Added the required column `vehicleVersionId` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `manufacturers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "vehicles_manufacturerId_model_version_engine_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "vehicles";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicle_models_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicle_generations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleModelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicle_generations_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fuel" TEXT NOT NULL,
    "power" TEXT,
    "turbo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "transmissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "gears" INTEGER,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "vehicle_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleModelId" INTEGER NOT NULL,
    "generationId" INTEGER,
    "engineId" INTEGER NOT NULL,
    "transmissionId" INTEGER,
    "name" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "segment" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" TEXT NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" DATETIME,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicle_versions_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vehicle_versions_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "vehicle_generations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vehicle_versions_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vehicle_versions_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "transmissions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleVersionId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_images_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tire_families" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tireManufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tire_families_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "homologation_documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "homologationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homologation_documents_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSANDO',
    "userId" INTEGER,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "rolledBackAt" DATETIME,
    CONSTRAINT "import_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "importBatchId" INTEGER NOT NULL,
    "rowNumber" INTEGER,
    "message" TEXT NOT NULL,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_errors_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER,
    "importBatchId" INTEGER,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_homologations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "vehicleVersionId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" DATETIME,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homologations_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_homologations" ("code", "createdAt", "id", "notes", "updatedAt", "year") SELECT "code", "createdAt", "id", "notes", "updatedAt", "year" FROM "homologations";
DROP TABLE "homologations";
ALTER TABLE "new_homologations" RENAME TO "homologations";
CREATE INDEX "homologations_vehicleVersionId_idx" ON "homologations"("vehicleVersionId");
CREATE INDEX "homologations_validationStatus_idx" ON "homologations"("validationStatus");
CREATE UNIQUE INDEX "homologations_vehicleVersionId_code_key" ON "homologations"("vehicleVersionId", "code");
CREATE TABLE "new_manufacturers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" TEXT NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_manufacturers" ("id", "name") SELECT "id", "name" FROM "manufacturers";
DROP TABLE "manufacturers";
ALTER TABLE "new_manufacturers" RENAME TO "manufacturers";
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");
CREATE TABLE "new_tire_manufacturers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" TEXT NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_tire_manufacturers" ("country", "createdAt", "id", "isActive", "logoUrl", "name", "notes", "updatedAt", "website") SELECT "country", "createdAt", "id", "isActive", "logoUrl", "name", "notes", "updatedAt", "website" FROM "tire_manufacturers";
DROP TABLE "tire_manufacturers";
ALTER TABLE "new_tire_manufacturers" RENAME TO "tire_manufacturers";
CREATE UNIQUE INDEX "tire_manufacturers_name_key" ON "tire_manufacturers"("name");
CREATE TABLE "new_tires" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tireManufacturerId" INTEGER NOT NULL,
    "tireFamilyId" INTEGER,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "profile" INTEGER NOT NULL,
    "rim" INTEGER NOT NULL,
    "loadIndex" TEXT NOT NULL,
    "speedIndex" TEXT NOT NULL,
    "runFlat" BOOLEAN NOT NULL DEFAULT false,
    "xl" BOOLEAN NOT NULL DEFAULT false,
    "seal" BOOLEAN NOT NULL DEFAULT false,
    "tubeless" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'RADIAL',
    "category" TEXT NOT NULL,
    "segment" TEXT,
    "ean" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" TEXT NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" DATETIME,
    "confidence" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tires_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tires_tireFamilyId_fkey" FOREIGN KEY ("tireFamilyId") REFERENCES "tire_families" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tires" ("brand", "category", "createdAt", "description", "ean", "id", "imageUrl", "isActive", "loadIndex", "model", "profile", "rim", "runFlat", "seal", "segment", "size", "speedIndex", "tireManufacturerId", "tubeless", "updatedAt", "width", "xl") SELECT "brand", "category", "createdAt", "description", "ean", "id", "imageUrl", "isActive", "loadIndex", "model", "profile", "rim", "runFlat", "seal", "segment", "size", "speedIndex", "tireManufacturerId", "tubeless", "updatedAt", "width", "xl" FROM "tires";
DROP TABLE "tires";
ALTER TABLE "new_tires" RENAME TO "tires";
CREATE UNIQUE INDEX "tires_ean_key" ON "tires"("ean");
CREATE INDEX "tires_tireManufacturerId_idx" ON "tires"("tireManufacturerId");
CREATE INDEX "tires_size_idx" ON "tires"("size");
CREATE INDEX "tires_category_idx" ON "tires"("category");
CREATE INDEX "tires_validationStatus_idx" ON "tires"("validationStatus");
CREATE UNIQUE INDEX "tires_tireManufacturerId_model_size_key" ON "tires"("tireManufacturerId", "model", "size");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "vehicle_models_manufacturerId_idx" ON "vehicle_models"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_manufacturerId_name_key" ON "vehicle_models"("manufacturerId", "name");

-- CreateIndex
CREATE INDEX "vehicle_generations_vehicleModelId_idx" ON "vehicle_generations"("vehicleModelId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_generations_vehicleModelId_name_key" ON "vehicle_generations"("vehicleModelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "engines_name_fuel_power_key" ON "engines"("name", "fuel", "power");

-- CreateIndex
CREATE UNIQUE INDEX "transmissions_type_gears_description_key" ON "transmissions"("type", "gears", "description");

-- CreateIndex
CREATE INDEX "vehicle_versions_vehicleModelId_idx" ON "vehicle_versions"("vehicleModelId");

-- CreateIndex
CREATE INDEX "vehicle_versions_category_idx" ON "vehicle_versions"("category");

-- CreateIndex
CREATE INDEX "vehicle_versions_yearStart_yearEnd_idx" ON "vehicle_versions"("yearStart", "yearEnd");

-- CreateIndex
CREATE INDEX "vehicle_versions_validationStatus_idx" ON "vehicle_versions"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_versions_vehicleModelId_name_engineId_key" ON "vehicle_versions"("vehicleModelId", "name", "engineId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_images_vehicleVersionId_type_key" ON "vehicle_images"("vehicleVersionId", "type");

-- CreateIndex
CREATE INDEX "tire_families_tireManufacturerId_idx" ON "tire_families"("tireManufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_families_tireManufacturerId_name_key" ON "tire_families"("tireManufacturerId", "name");

-- CreateIndex
CREATE INDEX "homologation_documents_homologationId_idx" ON "homologation_documents"("homologationId");

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

-- CreateIndex
CREATE INDEX "import_batches_entity_idx" ON "import_batches"("entity");

-- CreateIndex
CREATE INDEX "import_errors_importBatchId_idx" ON "import_errors"("importBatchId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_importBatchId_idx" ON "audit_logs"("importBatchId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "homologation_tires_tireId_idx" ON "homologation_tires"("tireId");
