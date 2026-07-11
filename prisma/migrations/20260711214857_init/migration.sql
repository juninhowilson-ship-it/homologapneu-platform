-- CreateTable
CREATE TABLE "manufacturers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "tire_manufacturers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "manufacturerId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "engine" TEXT NOT NULL,
    CONSTRAINT "vehicles_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tires" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tireManufacturerId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "loadIndex" TEXT NOT NULL,
    "speedIndex" TEXT NOT NULL,
    "runFlat" BOOLEAN NOT NULL DEFAULT false,
    "xl" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "tires_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "homologations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "tireId" INTEGER NOT NULL,
    CONSTRAINT "homologations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "homologations_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tire_manufacturers_name_key" ON "tire_manufacturers"("name");
