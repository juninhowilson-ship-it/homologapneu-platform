/*
  Warnings:

  - Added the required column `engine` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalSize` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `homologations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brand` to the `tires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `tires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile` to the `tires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rim` to the `tires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tires` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `tires` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_homologations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tireId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "originalSize" TEXT NOT NULL,
    "optionalSize" TEXT,
    "runFlat" BOOLEAN NOT NULL DEFAULT false,
    "xl" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homologations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "homologations_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_homologations" ("code", "id", "tireId", "vehicleId") SELECT "code", "id", "tireId", "vehicleId" FROM "homologations";
DROP TABLE "homologations";
ALTER TABLE "new_homologations" RENAME TO "homologations";
CREATE UNIQUE INDEX "homologations_vehicleId_tireId_code_key" ON "homologations"("vehicleId", "tireId", "code");
CREATE TABLE "new_tires" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tireManufacturerId" INTEGER NOT NULL,
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
    "category" TEXT NOT NULL,
    "segment" TEXT,
    "ean" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tires_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tires" ("id", "loadIndex", "model", "runFlat", "size", "speedIndex", "tireManufacturerId", "xl") SELECT "id", "loadIndex", "model", "runFlat", "size", "speedIndex", "tireManufacturerId", "xl" FROM "tires";
DROP TABLE "tires";
ALTER TABLE "new_tires" RENAME TO "tires";
CREATE UNIQUE INDEX "tires_ean_key" ON "tires"("ean");
CREATE UNIQUE INDEX "tires_tireManufacturerId_model_size_key" ON "tires"("tireManufacturerId", "model", "size");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
