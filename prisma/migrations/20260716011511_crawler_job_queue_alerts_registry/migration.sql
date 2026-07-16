-- CreateEnum
CREATE TYPE "CrawlerJobQueue" AS ENUM ('DOWNLOAD', 'OCR', 'PARSING', 'CURADORIA');

-- CreateEnum
CREATE TYPE "CrawlerJobStatus" AS ENUM ('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'ERRO', 'AGUARDANDO_RETRY');

-- AlterTable
ALTER TABLE "crawler_config" ADD COLUMN     "stopRequested" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "crawler_sources" ADD COLUMN     "etag" TEXT,
ADD COLUMN     "httpLastModified" TEXT;

-- CreateTable
CREATE TABLE "crawler_jobs" (
    "id" SERIAL NOT NULL,
    "queue" "CrawlerJobQueue" NOT NULL,
    "status" "CrawlerJobStatus" NOT NULL DEFAULT 'PENDENTE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "log" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawler_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawler_alerts" (
    "id" SERIAL NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "manufacturerName" TEXT,
    "previousDocumentUploadId" INTEGER,
    "newDocumentUploadId" INTEGER NOT NULL,
    "previousHash" TEXT,
    "newHash" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawler_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawler_jobs_queue_status_priority_idx" ON "crawler_jobs"("queue", "status", "priority");

-- CreateIndex
CREATE INDEX "crawler_jobs_nextAttemptAt_idx" ON "crawler_jobs"("nextAttemptAt");

-- CreateIndex
CREATE INDEX "crawler_alerts_acknowledged_idx" ON "crawler_alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "crawler_alerts_sourceUrl_idx" ON "crawler_alerts"("sourceUrl");
