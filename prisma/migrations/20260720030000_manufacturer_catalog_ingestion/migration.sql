-- CreateEnum
CREATE TYPE "ManufacturerCatalogImportStatus" AS ENUM ('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'CONCLUIDO_COM_ERROS', 'FALHOU');

-- CreateEnum
CREATE TYPE "ManufacturerProductStatus" AS ENUM ('HOMOLOGADO', 'APLICACAO', 'PHASE_OUT', 'SUBSTITUTO', 'SEM_STATUS');

-- AlterEnum
ALTER TYPE "ImportEntity" ADD VALUE 'CATALOGO_FABRICANTE_PNEU';

-- NOTA: prisma migrate diff detectou "audit_logs_legacy" (backup legado,
-- intencionalmente fora do schema.prisma) como tabela "extra" e gerou
-- DROP CONSTRAINT/DROP TABLE para ela. REMOVIDO MANUALMENTE aqui — nunca
-- apagar essa tabela (mesmo risco já identificado e neutralizado em
-- todas as migrações anteriores desta sessão).

-- CreateTable
CREATE TABLE "manufacturer_catalogs" (
    "id" SERIAL NOT NULL,
    "tireManufacturerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_catalog_imports" (
    "id" SERIAL NOT NULL,
    "catalogId" INTEGER NOT NULL,
    "importBatchId" INTEGER,
    "fileName" TEXT NOT NULL,
    "fileType" "ImportFileType" NOT NULL,
    "status" "ManufacturerCatalogImportStatus" NOT NULL DEFAULT 'PENDENTE',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "manufacturer_catalog_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_catalog_rows" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" TEXT NOT NULL,
    "normalized" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturer_catalog_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_products" (
    "id" SERIAL NOT NULL,
    "catalogId" INTEGER NOT NULL,
    "rowId" INTEGER,
    "tireId" INTEGER,
    "medida" TEXT,
    "descricao" TEXT,
    "codigoInterno" TEXT,
    "rr" TEXT,
    "wet" TEXT,
    "noise" TEXT,
    "phaseOut" BOOLEAN NOT NULL DEFAULT false,
    "produtoSubstitutoId" INTEGER,
    "produtoEquivalenteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_applications" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "vehicleBrand" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "aplicacao" TEXT,
    "axlePosition" "AxlePosition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_homologations" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "status" "ManufacturerProductStatus" NOT NULL DEFAULT 'SEM_STATUS',
    "homologado" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturer_homologations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_evidences" (
    "id" SERIAL NOT NULL,
    "manufacturerHomologationId" INTEGER NOT NULL,
    "homologationEvidenceId" INTEGER,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturer_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_catalogs_tireManufacturerId_name_key" ON "manufacturer_catalogs"("tireManufacturerId", "name");

-- CreateIndex
CREATE INDEX "manufacturer_catalog_imports_catalogId_idx" ON "manufacturer_catalog_imports"("catalogId");

-- CreateIndex
CREATE INDEX "manufacturer_catalog_imports_importBatchId_idx" ON "manufacturer_catalog_imports"("importBatchId");

-- CreateIndex
CREATE INDEX "manufacturer_catalog_imports_status_idx" ON "manufacturer_catalog_imports"("status");

-- CreateIndex
CREATE INDEX "manufacturer_catalog_rows_importId_idx" ON "manufacturer_catalog_rows"("importId");

-- CreateIndex
CREATE INDEX "manufacturer_products_catalogId_idx" ON "manufacturer_products"("catalogId");

-- CreateIndex
CREATE INDEX "manufacturer_products_rowId_idx" ON "manufacturer_products"("rowId");

-- CreateIndex
CREATE INDEX "manufacturer_products_tireId_idx" ON "manufacturer_products"("tireId");

-- CreateIndex
CREATE INDEX "manufacturer_products_produtoSubstitutoId_idx" ON "manufacturer_products"("produtoSubstitutoId");

-- CreateIndex
CREATE INDEX "manufacturer_products_produtoEquivalenteId_idx" ON "manufacturer_products"("produtoEquivalenteId");

-- CreateIndex
CREATE INDEX "manufacturer_applications_productId_idx" ON "manufacturer_applications"("productId");

-- CreateIndex
CREATE INDEX "manufacturer_homologations_applicationId_idx" ON "manufacturer_homologations"("applicationId");

-- CreateIndex
CREATE INDEX "manufacturer_evidences_manufacturerHomologationId_idx" ON "manufacturer_evidences"("manufacturerHomologationId");

-- CreateIndex
CREATE INDEX "manufacturer_evidences_homologationEvidenceId_idx" ON "manufacturer_evidences"("homologationEvidenceId");

-- AddForeignKey
ALTER TABLE "manufacturer_catalogs" ADD CONSTRAINT "manufacturer_catalogs_tireManufacturerId_fkey" FOREIGN KEY ("tireManufacturerId") REFERENCES "tire_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_catalog_imports" ADD CONSTRAINT "manufacturer_catalog_imports_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "manufacturer_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_catalog_imports" ADD CONSTRAINT "manufacturer_catalog_imports_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_catalog_rows" ADD CONSTRAINT "manufacturer_catalog_rows_importId_fkey" FOREIGN KEY ("importId") REFERENCES "manufacturer_catalog_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "manufacturer_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "manufacturer_catalog_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_produtoSubstitutoId_fkey" FOREIGN KEY ("produtoSubstitutoId") REFERENCES "manufacturer_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_produtoEquivalenteId_fkey" FOREIGN KEY ("produtoEquivalenteId") REFERENCES "manufacturer_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_applications" ADD CONSTRAINT "manufacturer_applications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "manufacturer_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_homologations" ADD CONSTRAINT "manufacturer_homologations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "manufacturer_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_evidences" ADD CONSTRAINT "manufacturer_evidences_manufacturerHomologationId_fkey" FOREIGN KEY ("manufacturerHomologationId") REFERENCES "manufacturer_homologations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

