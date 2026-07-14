-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('MARKETPLACE', 'FABRICANTE_PNEU', 'MONTADORA', 'MANUAL', 'CATALOGO_OE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('EVIDENCIA', 'APLICACAO_COMERCIAL', 'HOMOLOGACAO_VALIDADA');

-- CreateTable
CREATE TABLE "tire_vehicle_applications" (
    "id" SERIAL NOT NULL,
    "tireManufacturerName" TEXT NOT NULL,
    "tireModel" TEXT NOT NULL,
    "tireSize" TEXT NOT NULL,
    "vehicleManufacturerName" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleVersion" TEXT,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'EVIDENCIA',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastConfirmedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_vehicle_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_evidences" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "tireManufacturerName" TEXT NOT NULL,
    "tireModel" TEXT NOT NULL,
    "tireSize" TEXT NOT NULL,
    "vehicleManufacturerName" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleVersion" TEXT,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sourceConfidence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homologation_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tire_vehicle_applications_status_idx" ON "tire_vehicle_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tire_vehicle_applications_tireManufacturerName_tireModel_ti_key" ON "tire_vehicle_applications"("tireManufacturerName", "tireModel", "tireSize", "vehicleManufacturerName", "vehicleModel", "vehicleVersion", "yearStart", "yearEnd");

-- CreateIndex
CREATE INDEX "homologation_evidences_applicationId_idx" ON "homologation_evidences"("applicationId");

-- CreateIndex
CREATE INDEX "homologation_evidences_sourceType_idx" ON "homologation_evidences"("sourceType");

-- AddForeignKey
ALTER TABLE "homologation_evidences" ADD CONSTRAINT "homologation_evidences_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "tire_vehicle_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
