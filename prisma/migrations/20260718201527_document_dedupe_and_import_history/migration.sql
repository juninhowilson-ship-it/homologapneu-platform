-- CreateEnum
CREATE TYPE "ImportHistoryStatus" AS ENUM ('EXECUTANDO', 'CONCLUIDO', 'FALHOU', 'PAUSADO');

-- AlterTable
ALTER TABLE "document_uploads" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "duplicateOfId" INTEGER;

-- CreateTable
CREATE TABLE "import_history" (
    "id" SERIAL NOT NULL,
    "manufacturerName" TEXT NOT NULL,
    "status" "ImportHistoryStatus" NOT NULL DEFAULT 'EXECUTANDO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "documentsFound" INTEGER NOT NULL DEFAULT 0,
    "documentsDownloaded" INTEGER NOT NULL DEFAULT 0,
    "documentsProcessed" INTEGER NOT NULL DEFAULT 0,
    "homologationsCreated" INTEGER NOT NULL DEFAULT 0,
    "tiresCreated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMs" INTEGER,
    "lastStage" TEXT,
    "log" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_history_manufacturerName_idx" ON "import_history"("manufacturerName");

-- CreateIndex
CREATE INDEX "import_history_status_idx" ON "import_history"("status");

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
