/*
  Warnings:

  - You are about to drop the column `year` on the `vehicles` table. All the data in the column will be lost.
  - Added the required column `category` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fuel` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearEnd` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearStart` to the `vehicles` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "manufacturerId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "engine" TEXT NOT NULL,
    "power" TEXT,
    "fuel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "segment" TEXT,
    "country" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("engine", "id", "manufacturerId", "model") SELECT "engine", "id", "manufacturerId", "model" FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE UNIQUE INDEX "vehicles_manufacturerId_model_version_engine_key" ON "vehicles"("manufacturerId", "model", "version", "engine");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
