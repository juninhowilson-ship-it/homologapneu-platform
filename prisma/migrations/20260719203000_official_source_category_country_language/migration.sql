-- AlterEnum
ALTER TYPE "OfficialSourceType" ADD VALUE 'DADOS_SENATRAN';

-- CreateEnum
CREATE TYPE "OfficialSourceCategory" AS ENUM ('GOVERNAMENTAL', 'MANUAL_PROPRIETARIO', 'CATALOGO_TECNICO', 'PORTAL_PECAS', 'PORTAL_POSVENDA', 'RECALL', 'BIBLIOTECA_PDF', 'SITE_INSTITUCIONAL', 'FONTE_UNIVERSAL');

-- AlterTable
ALTER TABLE "official_sources" ADD COLUMN     "category" "OfficialSourceCategory",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "language" TEXT;

-- CreateIndex
CREATE INDEX "official_sources_category_idx" ON "official_sources"("category");
