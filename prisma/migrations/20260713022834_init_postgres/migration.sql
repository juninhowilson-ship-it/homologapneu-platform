-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('VALIDADO', 'NECESSITA_VALIDACAO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('FLEX', 'GASOLINA', 'DIESEL', 'ELETRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('HATCH', 'SEDAN', 'SUV', 'PICAPE', 'PERUA', 'MINIVAN', 'COUPE');

-- CreateEnum
CREATE TYPE "VehicleSegment" AS ENUM ('POPULAR', 'MEDIO', 'PREMIUM', 'LUXO');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATICA', 'CVT', 'AUTOMATIZADA', 'DUPLA_EMBREAGEM');

-- CreateEnum
CREATE TYPE "VehicleImageType" AS ENUM ('PRINCIPAL', 'FRONTAL', 'TRASEIRA', 'LATERAL');

-- CreateEnum
CREATE TYPE "TireCategory" AS ENUM ('PASSEIO', 'SUV', 'CAMINHONETE', 'ESPORTIVO', 'INVERNO', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "TireSegment" AS ENUM ('POPULAR', 'MEDIO', 'PREMIUM', 'LUXO');

-- CreateEnum
CREATE TYPE "TireType" AS ENUM ('RADIAL', 'DIAGONAL');

-- CreateEnum
CREATE TYPE "HomologationTireRole" AS ENUM ('ORIGINAL', 'OPCIONAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USUARIO');

-- CreateEnum
CREATE TYPE "ImportFileType" AS ENUM ('CSV', 'XLSX', 'ODS', 'JSON', 'XML', 'PDF');

-- CreateEnum
CREATE TYPE "ImportEntity" AS ENUM ('MONTADORAS', 'VEICULOS', 'PNEUS', 'HOMOLOGACOES');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDO', 'CONCLUIDO_COM_ERROS', 'FALHOU', 'REVERTIDO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VALIDATE', 'IMPORT', 'ROLLBACK');

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_generations" (
    "id" SERIAL NOT NULL,
    "vehicleModelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engines" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fuel" "FuelType" NOT NULL,
    "power" TEXT,
    "turbo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transmissions" (
    "id" SERIAL NOT NULL,
    "type" "TransmissionType" NOT NULL,
    "gears" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transmissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_versions" (
    "id" SERIAL NOT NULL,
    "vehicleModelId" INTEGER NOT NULL,
    "generationId" INTEGER,
    "engineId" INTEGER NOT NULL,
    "transmissionId" INTEGER,
    "name" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "segment" "VehicleSegment",
    "country" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" SERIAL NOT NULL,
    "vehicleVersionId" INTEGER NOT NULL,
    "type" "VehicleImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tire_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_families" (
    "id" SERIAL NOT NULL,
    "tireManufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tires" (
    "id" SERIAL NOT NULL,
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
    "type" "TireType" NOT NULL DEFAULT 'RADIAL',
    "category" "TireCategory" NOT NULL,
    "segment" "TireSegment",
    "ean" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "vehicleVersionId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "source" TEXT,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homologations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_tires" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "tireId" INTEGER NOT NULL,
    "role" "HomologationTireRole" NOT NULL DEFAULT 'ORIGINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homologation_tires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_documents" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homologation_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USUARIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_logs" (
    "id" SERIAL NOT NULL,
    "resumo" TEXT NOT NULL,
    "veiculoBusca" TEXT,
    "pneuBusca" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "ImportFileType" NOT NULL,
    "entity" "ImportEntity" NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "userId" INTEGER,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" SERIAL NOT NULL,
    "importBatchId" INTEGER NOT NULL,
    "rowNumber" INTEGER,
    "message" TEXT NOT NULL,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" INTEGER,
    "importBatchId" INTEGER,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

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
CREATE UNIQUE INDEX "tire_manufacturers_name_key" ON "tire_manufacturers"("name");

-- CreateIndex
CREATE INDEX "tire_families_tireManufacturerId_idx" ON "tire_families"("tireManufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "tire_families_tireManufacturerId_name_key" ON "tire_families"("tireManufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tires_ean_key" ON "tires"("ean");

-- CreateIndex
CREATE INDEX "tires_tireManufacturerId_idx" ON "tires"("tireManufacturerId");

-- CreateIndex
CREATE INDEX "tires_size_idx" ON "tires"("size");

-- CreateIndex
CREATE INDEX "tires_category_idx" ON "tires"("category");

-- CreateIndex
CREATE INDEX "tires_validationStatus_idx" ON "tires"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "tires_tireManufacturerId_model_size_key" ON "tires"("tireManufacturerId", "model", "size");

-- CreateIndex
CREATE INDEX "homologations_vehicleVersionId_idx" ON "homologations"("vehicleVersionId");

-- CreateIndex
CREATE INDEX "homologations_validationStatus_idx" ON "homologations"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "homologations_vehicleVersionId_code_key" ON "homologations"("vehicleVersionId", "code");

-- CreateIndex
CREATE INDEX "homologation_tires_tireId_idx" ON "homologation_tires"("tireId");

-- CreateIndex
CREATE UNIQUE INDEX "homologation_tires_homologationId_tireId_key" ON "homologation_tires"("homologationId", "tireId");

-- CreateIndex
CREATE INDEX "homologation_documents_homologationId_idx" ON "homologation_documents"("homologationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "search_logs_createdAt_idx" ON "search_logs"("createdAt");

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

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_versions" ADD CONSTRAINT "vehicle_versions_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_versions" ADD CONSTRAINT "vehicle_versions_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "vehicle_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_versions" ADD CONSTRAINT "vehicle_versions_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "engines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_versions" ADD CONSTRAINT "vehicle_versions_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "transmissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_families" ADD CONSTRAINT "tire_families_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_tireFamilyId_fkey" FOREIGN KEY ("tireFamilyId") REFERENCES "tire_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologations" ADD CONSTRAINT "homologations_vehicleVersionId_fkey" FOREIGN KEY ("vehicleVersionId") REFERENCES "vehicle_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_tires" ADD CONSTRAINT "homologation_tires_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_tires" ADD CONSTRAINT "homologation_tires_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_documents" ADD CONSTRAINT "homologation_documents_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
