-- CreateEnum
CREATE TYPE "CrawlerDocumentCategory" AS ENUM ('MANUAL_PROPRIETARIO', 'BOLETIM_TECNICO', 'CATALOGO_PNEUS', 'TABELA_HOMOLOGACAO', 'PRESSAO_PNEUS', 'RODA_ARO', 'CATALOGO_TECNICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CrawlerSourceKind" AS ENUM ('HUB', 'DIRECT');

-- CreateEnum
CREATE TYPE "CrawlerSourceStatus" AS ENUM ('ATIVA', 'BLOQUEADA', 'PENDENTE', 'ERRO');

-- CreateEnum
CREATE TYPE "CrawlerRunTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CrawlerRunStatus" AS ENUM ('EXECUTANDO', 'CONCLUIDO', 'FALHOU');

-- AlterTable
ALTER TABLE "document_uploads" ADD COLUMN     "manufacturerName" TEXT,
ADD COLUMN     "ocrPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reliability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "homologation_candidates" ADD COLUMN     "engine" TEXT,
ADD COLUMN     "frontTirePressure" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "rearTirePressure" TEXT,
ADD COLUMN     "wheelSize" TEXT;

-- CreateTable
CREATE TABLE "crawler_sources" (
    "id" SERIAL NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "category" "CrawlerDocumentCategory" NOT NULL,
    "kind" "CrawlerSourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "robotsAllowed" BOOLEAN,
    "status" "CrawlerSourceStatus" NOT NULL DEFAULT 'PENDENTE',
    "lastVisitedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "contentHash" TEXT,
    "notes" TEXT,
    "documentsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawler_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawler_runs" (
    "id" SERIAL NOT NULL,
    "trigger" "CrawlerRunTrigger" NOT NULL,
    "status" "CrawlerRunStatus" NOT NULL DEFAULT 'EXECUTANDO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "sourcesChecked" INTEGER NOT NULL DEFAULT 0,
    "documentsFound" INTEGER NOT NULL DEFAULT 0,
    "documentsDownloaded" INTEGER NOT NULL DEFAULT 0,
    "documentsSkipped" INTEGER NOT NULL DEFAULT 0,
    "candidatesCreated" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "crawler_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawler_config" (
    "id" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MANUAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawler_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crawler_sources_url_key" ON "crawler_sources"("url");

-- CreateIndex
CREATE INDEX "crawler_sources_manufacturerName_idx" ON "crawler_sources"("manufacturerName");

-- CreateIndex
CREATE INDEX "crawler_sources_status_idx" ON "crawler_sources"("status");

-- CreateIndex
CREATE INDEX "crawler_runs_status_idx" ON "crawler_runs"("status");
