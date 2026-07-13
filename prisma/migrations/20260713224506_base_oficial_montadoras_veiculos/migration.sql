-- CreateEnum
CREATE TYPE "DrivetrainType" AS ENUM ('DIANTEIRA', 'TRASEIRA', 'INTEGRAL');

-- AlterTable
ALTER TABLE "engines" ADD COLUMN     "torque" TEXT;

-- AlterTable
ALTER TABLE "manufacturers" ADD COLUMN     "automotiveGroupId" INTEGER,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "marketEndDate" TIMESTAMP(3),
ADD COLUMN     "marketStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehicle_versions" ADD COLUMN     "doors" INTEGER,
ADD COLUMN     "drivetrain" "DrivetrainType",
ADD COLUMN     "internalCode" TEXT,
ADD COLUMN     "manufactureYearEnd" INTEGER,
ADD COLUMN     "manufactureYearStart" INTEGER,
ADD COLUMN     "platformId" INTEGER,
ADD COLUMN     "regulatoryCategory" TEXT;

-- CreateTable
CREATE TABLE "automotive_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automotive_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" SERIAL NOT NULL,
    "vehicleVersionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automotive_groups_name_key" ON "automotive_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");

-- CreateIndex
CREATE INDEX "vehicle_documents_vehicleVersionId_idx" ON "vehicle_documents"("vehicleVersionId");

-- CreateIndex
CREATE INDEX "manufacturers_automotiveGroupId_idx" ON "manufacturers"("automotiveGroupId");

-- CreateIndex
CREATE INDEX "vehicle_versions_platformId_idx" ON "vehicle_versions"("platformId");

-- AddForeignKey
ALTER TABLE "manufacturers" ADD CONSTRAINT "manufacturers_automotiveGroupId_fkey" FOREIGN KEY ("automotiveGroupId") REFERENCES "automotive_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_versions" ADD CONSTRAINT "vehicle_versions_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
