-- CreateEnum
CREATE TYPE "RecallSeverity" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('ABERTO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('APROVADO', 'REJEITADO', 'SOLICITADO_REVISAO', 'REABERTO');

-- CreateEnum
CREATE TYPE "EquivalenceType" AS ENUM ('MESMA_ESPECIFICACAO', 'INDICE_SUPERIOR_COMPATIVEL', 'MEDIDA_ALTERNATIVA_OFICIAL');

-- CreateEnum
CREATE TYPE "PressureCondition" AS ENUM ('VAZIO', 'CARGA_PARCIAL', 'CARGA_TOTAL', 'ALTA_VELOCIDADE');

-- AlterEnum
ALTER TYPE "AxlePosition" ADD VALUE 'ESTEPE';

-- NOTA: prisma migrate diff detectou "audit_logs_legacy" (backup legado,
-- intencionalmente fora do schema.prisma) como tabela "extra" e gerou
-- DROP CONSTRAINT/DROP TABLE para ela. REMOVIDO MANUALMENTE aqui — nunca
-- apagar essa tabela (mesmo risco identificado e evitado antes nesta
-- sessão, na Fase de Expansão de Fontes Oficiais).

-- AlterTable
ALTER TABLE "homologations" ADD COLUMN     "marketId" INTEGER,
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "yearEnd" INTEGER,
ADD COLUMN     "yearStart" INTEGER;

-- AlterTable
ALTER TABLE "tires" ADD COLUMN     "tireModelId" INTEGER;

-- AlterTable
ALTER TABLE "wheels" ADD COLUMN     "wheelBrandId" INTEGER;

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_models" (
    "id" SERIAL NOT NULL,
    "tireManufacturerId" INTEGER NOT NULL,
    "tireFamilyId" INTEGER,
    "name" TEXT NOT NULL,
    "category" "TireCategory",
    "segment" "TireSegment",
    "season" "TireSeason",
    "type" "TireType",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheel_brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wheel_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recalls" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "vehicleVersionId" INTEGER,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "affectedYearStart" INTEGER,
    "affectedYearEnd" INTEGER,
    "severity" "RecallSeverity",
    "status" "RecallStatus" NOT NULL DEFAULT 'ABERTO',
    "publishedAt" TIMESTAMP(3),
    "source" TEXT,
    "sourceUrl" TEXT,
    "documentUploadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_bulletins" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "vehicleVersionId" INTEGER,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "publishedAt" TIMESTAMP(3),
    "source" TEXT,
    "sourceUrl" TEXT,
    "documentUploadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_bulletins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_pages" (
    "id" SERIAL NOT NULL,
    "documentUploadId" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT,
    "ocrConfidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_history" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "action" "ReviewAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equivalence_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "toleranceLoadIndex" INTEGER,
    "toleranceSpeedIndex" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equivalence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_equivalences" (
    "id" SERIAL NOT NULL,
    "tireId" INTEGER NOT NULL,
    "equivalentTireId" INTEGER NOT NULL,
    "ruleId" INTEGER,
    "type" "EquivalenceType",
    "source" TEXT,
    "sourceUrl" TEXT,
    "confidence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_equivalences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_pressure_readings" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "condition" "PressureCondition" NOT NULL,
    "axlePosition" "AxlePosition" NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_pressure_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_isoCode_key" ON "countries"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "markets_code_key" ON "markets"("code");

-- CreateIndex
CREATE INDEX "markets_countryId_idx" ON "markets"("countryId");

-- CreateIndex
CREATE INDEX "tire_models_tireFamilyId_idx" ON "tire_models"("tireFamilyId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_models_tireManufacturerId_name_key" ON "tire_models"("tireManufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "wheel_brands_name_key" ON "wheel_brands"("name");

-- CreateIndex
CREATE INDEX "recalls_vehicleVersionId_idx" ON "recalls"("vehicleVersionId");

-- CreateIndex
CREATE INDEX "recalls_status_idx" ON "recalls"("status");

-- CreateIndex
CREATE INDEX "recalls_documentUploadId_idx" ON "recalls"("documentUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "recalls_manufacturerId_code_key" ON "recalls"("manufacturerId", "code");

-- CreateIndex
CREATE INDEX "technical_bulletins_vehicleVersionId_idx" ON "technical_bulletins"("vehicleVersionId");

-- CreateIndex
CREATE INDEX "technical_bulletins_documentUploadId_idx" ON "technical_bulletins"("documentUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "technical_bulletins_manufacturerId_code_key" ON "technical_bulletins"("manufacturerId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "document_pages_documentUploadId_pageNumber_key" ON "document_pages"("documentUploadId", "pageNumber");

-- CreateIndex
CREATE INDEX "review_history_candidateId_idx" ON "review_history"("candidateId");

-- CreateIndex
CREATE INDEX "review_history_reviewedById_idx" ON "review_history"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "equivalence_rules_name_key" ON "equivalence_rules"("name");

-- CreateIndex
CREATE INDEX "tire_equivalences_equivalentTireId_idx" ON "tire_equivalences"("equivalentTireId");

-- CreateIndex
CREATE INDEX "tire_equivalences_ruleId_idx" ON "tire_equivalences"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_equivalences_tireId_equivalentTireId_key" ON "tire_equivalences"("tireId", "equivalentTireId");

-- CreateIndex
CREATE INDEX "vehicle_pressure_readings_homologationId_idx" ON "vehicle_pressure_readings"("homologationId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_pressure_readings_homologationId_condition_axlePosi_key" ON "vehicle_pressure_readings"("homologationId", "condition", "axlePosition", "source");

-- CreateIndex
CREATE INDEX "homologations_yearStart_yearEnd_idx" ON "homologations"("yearStart", "yearEnd");

-- CreateIndex
CREATE INDEX "homologations_marketId_idx" ON "homologations"("marketId");

-- CreateIndex
CREATE INDEX "homologations_reviewedById_idx" ON "homologations"("reviewedById");

-- CreateIndex
CREATE INDEX "homologations_confidence_idx" ON "homologations"("confidence");

-- CreateIndex
CREATE INDEX "homologations_vehicleVersionId_validationStatus_idx" ON "homologations"("vehicleVersionId", "validationStatus");

-- CreateIndex
CREATE INDEX "tires_tireModelId_idx" ON "tires"("tireModelId");

-- CreateIndex
CREATE INDEX "tires_model_idx" ON "tires"("model");

-- CreateIndex
CREATE INDEX "vehicle_versions_name_idx" ON "vehicle_versions"("name");

-- CreateIndex
CREATE INDEX "wheels_wheelBrandId_idx" ON "wheels"("wheelBrandId");

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_tireModelId_fkey" FOREIGN KEY ("tireModelId") REFERENCES "tire_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologations" ADD CONSTRAINT "homologations_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologations" ADD CONSTRAINT "homologations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheels" ADD CONSTRAINT "wheels_wheelBrandId_fkey" FOREIGN KEY ("wheelBrandId") REFERENCES "wheel_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_models" ADD CONSTRAINT "tire_models_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_models" ADD CONSTRAINT "tire_models_tireFamilyId_fkey" FOREIGN KEY ("tireFamilyId") REFERENCES "tire_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_bulletins" ADD CONSTRAINT "technical_bulletins_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_bulletins" ADD CONSTRAINT "technical_bulletins_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_bulletins" ADD CONSTRAINT "technical_bulletins_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "homologation_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_equivalences" ADD CONSTRAINT "tire_equivalences_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_equivalences" ADD CONSTRAINT "tire_equivalences_equivalentTireId_fkey" FOREIGN KEY ("equivalentTireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_equivalences" ADD CONSTRAINT "tire_equivalences_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "equivalence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_pressure_readings" ADD CONSTRAINT "vehicle_pressure_readings_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill aditivo: yearStart/yearEnd nunca existiram antes; preenchidos
-- a partir do valor já existente em "year" (nenhuma coluna/linha existente
-- é alterada ou removida, só as duas colunas novas passam a ter valor em
-- vez de ficar NULL).
UPDATE "homologations" SET "yearStart" = "year", "yearEnd" = "year" WHERE "yearStart" IS NULL;

