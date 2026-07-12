/*
  Warnings:

  - You are about to drop the column `optionalSize` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `originalSize` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `runFlat` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `tireId` on the `homologations` table. All the data in the column will be lost.
  - You are about to drop the column `xl` on the `homologations` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "homologation_tires" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "homologationId" INTEGER NOT NULL,
    "tireId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ORIGINAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "homologation_tires_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "homologation_tires_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_homologations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "homologations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_homologations" ("code", "createdAt", "engine", "id", "notes", "updatedAt", "vehicleId", "version", "year") SELECT "code", "createdAt", "engine", "id", "notes", "updatedAt", "vehicleId", "version", "year" FROM "homologations";
DROP TABLE "homologations";
ALTER TABLE "new_homologations" RENAME TO "homologations";
CREATE UNIQUE INDEX "homologations_vehicleId_code_key" ON "homologations"("vehicleId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "homologation_tires_homologationId_tireId_key" ON "homologation_tires"("homologationId", "tireId");
