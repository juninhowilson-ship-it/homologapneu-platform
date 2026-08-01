-- CreateEnum
CREATE TYPE "TireSeason" AS ENUM ('VERAO', 'INVERNO', 'QUATRO_ESTACOES');

-- CreateEnum
CREATE TYPE "AxlePosition" AS ENUM ('DIANTEIRO', 'TRASEIRO', 'AMBOS');

-- AlterEnum
ALTER TYPE "HomologationTireRole" ADD VALUE 'SUBSTITUTO';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "documentUploadId" INTEGER;

-- AlterTable
ALTER TABLE "document_uploads" ADD COLUMN     "documentVersion" TEXT,
ADD COLUMN     "language" TEXT;

-- AlterTable
ALTER TABLE "engines" ADD COLUMN     "displacement" TEXT;

-- AlterTable
ALTER TABLE "homologation_candidates" ADD COLUMN     "coordinates" TEXT,
ADD COLUMN     "page" INTEGER,
ADD COLUMN     "textPosition" INTEGER;

-- AlterTable
ALTER TABLE "homologation_documents" ADD COLUMN     "documentUploadId" INTEGER;

-- AlterTable
ALTER TABLE "homologation_evidences" ADD COLUMN     "coordinates" TEXT,
ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "extractionConfidence" INTEGER,
ADD COLUMN     "page" INTEGER,
ADD COLUMN     "textPosition" INTEGER;

-- AlterTable
ALTER TABLE "homologation_tires" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "position" "AxlePosition" NOT NULL DEFAULT 'AMBOS',
ADD COLUMN     "restrictions" TEXT;

-- AlterTable
ALTER TABLE "homologation_wheels" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "position" "AxlePosition" NOT NULL DEFAULT 'AMBOS',
ADD COLUMN     "restrictions" TEXT;

-- AlterTable
ALTER TABLE "homologations" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "validFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "manufacturers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tire_manufacturers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tires" ADD COLUMN     "countryOfOrigin" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "season" "TireSeason",
ADD COLUMN     "weight" INTEGER;

-- AlterTable
ALTER TABLE "vehicle_generations" ADD COLUMN     "code" TEXT,
ADD COLUMN     "facelift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformId" INTEGER;

-- AlterTable
ALTER TABLE "vehicle_models" ADD COLUMN     "category" "VehicleCategory",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "internalCode" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "productionEndYear" INTEGER,
ADD COLUMN     "productionStartYear" INTEGER,
ADD COLUMN     "segment" "VehicleSegment";

-- AlterTable
ALTER TABLE "vehicle_versions" ADD COLUMN     "cargoCapacity" INTEGER,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "fuelTankCapacity" INTEGER;

-- AlterTable
ALTER TABLE "wheels" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "material" TEXT,
ADD COLUMN     "tighteningTorque" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_documentUploadId_idx" ON "audit_logs"("documentUploadId");

-- CreateIndex
CREATE INDEX "homologation_documents_documentUploadId_idx" ON "homologation_documents"("documentUploadId");

-- CreateIndex
CREATE INDEX "homologations_year_idx" ON "homologations"("year");

-- CreateIndex
CREATE INDEX "manufacturers_country_idx" ON "manufacturers"("country");

-- CreateIndex
CREATE INDEX "tire_manufacturers_country_idx" ON "tire_manufacturers"("country");

-- CreateIndex
CREATE INDEX "tires_season_idx" ON "tires"("season");

-- CreateIndex
CREATE INDEX "vehicle_generations_platformId_idx" ON "vehicle_generations"("platformId");

-- CreateIndex
CREATE INDEX "vehicle_models_name_idx" ON "vehicle_models"("name");

-- AddForeignKey
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_documents" ADD CONSTRAINT "homologation_documents_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
