-- AlterTable
ALTER TABLE "homologation_tires" ADD COLUMN     "oeCodeId" INTEGER;

-- AlterTable
ALTER TABLE "homologation_wheels" ADD COLUMN     "oeCodeId" INTEGER;

-- CreateTable
CREATE TABLE "oe_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleManufacturerId" INTEGER NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oe_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oe_codes_vehicleManufacturerId_idx" ON "oe_codes"("vehicleManufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "oe_codes_vehicleManufacturerId_code_key" ON "oe_codes"("vehicleManufacturerId", "code");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "document_uploads_uploadedById_idx" ON "document_uploads"("uploadedById");

-- CreateIndex
CREATE INDEX "homologation_candidates_reviewedById_idx" ON "homologation_candidates"("reviewedById");

-- CreateIndex
CREATE INDEX "homologation_tires_oeCodeId_idx" ON "homologation_tires"("oeCodeId");

-- CreateIndex
CREATE INDEX "homologation_wheels_oeCodeId_idx" ON "homologation_wheels"("oeCodeId");

-- CreateIndex
CREATE INDEX "import_batches_userId_idx" ON "import_batches"("userId");

-- CreateIndex
CREATE INDEX "tires_tireFamilyId_idx" ON "tires"("tireFamilyId");

-- CreateIndex
CREATE INDEX "vehicle_versions_generationId_idx" ON "vehicle_versions"("generationId");

-- CreateIndex
CREATE INDEX "vehicle_versions_engineId_idx" ON "vehicle_versions"("engineId");

-- CreateIndex
CREATE INDEX "vehicle_versions_transmissionId_idx" ON "vehicle_versions"("transmissionId");

-- AddForeignKey
ALTER TABLE "oe_codes" ADD CONSTRAINT "oe_codes_vehicleManufacturerId_fkey" FOREIGN KEY ("vehicleManufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_tires" ADD CONSTRAINT "homologation_tires_oeCodeId_fkey" FOREIGN KEY ("oeCodeId") REFERENCES "oe_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_wheels" ADD CONSTRAINT "homologation_wheels_oeCodeId_fkey" FOREIGN KEY ("oeCodeId") REFERENCES "oe_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
