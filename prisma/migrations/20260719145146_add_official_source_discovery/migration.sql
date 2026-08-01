-- CreateEnum
CREATE TYPE "OfficialSourceType" AS ENUM ('SITE_INSTITUCIONAL', 'PORTAL_PROPRIETARIO', 'BIBLIOTECA_MANUAIS', 'CATALOGO_TECNICO', 'PORTAL_SERVICOS', 'PORTAL_PECAS', 'PORTAL_RECALLS', 'PDF_PUBLICO', 'DADOS_FIPE', 'DADOS_UNECE', 'DADOS_INMETRO', 'OUTRA');

-- CreateEnum
CREATE TYPE "OfficialSourceStatus" AS ENUM ('ATIVA', 'PENDENTE', 'BLOQUEADA', 'REMOVIDA');

-- CreateTable
CREATE TABLE "official_sources" (
    "id" SERIAL NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "type" "OfficialSourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "OfficialSourceStatus" NOT NULL DEFAULT 'PENDENTE',
    "lastValidatedAt" TIMESTAMP(3),
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "blockReason" TEXT,
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "notes" TEXT,
    "crawlerSourceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "official_sources_manufacturerName_idx" ON "official_sources"("manufacturerName");

-- CreateIndex
CREATE INDEX "official_sources_status_idx" ON "official_sources"("status");

-- CreateIndex
CREATE UNIQUE INDEX "official_sources_manufacturerName_type_url_key" ON "official_sources"("manufacturerName", "type", "url");

-- AddForeignKey
ALTER TABLE "official_sources" ADD CONSTRAINT "official_sources_crawlerSourceId_fkey" FOREIGN KEY ("crawlerSourceId") REFERENCES "crawler_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
