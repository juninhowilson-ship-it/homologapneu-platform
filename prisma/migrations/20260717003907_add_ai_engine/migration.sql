-- CreateEnum
CREATE TYPE "AiJobQueue" AS ENUM ('DOCUMENT_ANALYSIS');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'ERRO', 'AGUARDANDO_RETRY');

-- CreateEnum
CREATE TYPE "AiSuggestionType" AS ENUM ('VEHICLE', 'TIRE', 'HOMOLOGATION', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AiSuggestionStatus" AS ENUM ('PENDENTE', 'ALTA_CONFIANCA', 'BAIXA_CONFIANCA', 'CONFLITO', 'DUPLICADO', 'REVISADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "AiConflictType" AS ENUM ('MEDIDA_DIFERENTE', 'PRESSAO_CONFLITANTE', 'VERSAO_INCOMPATIVEL', 'CODIGO_OE_DUPLICADO', 'DOCUMENTO_ANTIGO', 'FABRICANTE_DIFERENTE');

-- CreateEnum
CREATE TYPE "AiConflictSeverity" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "AiConflictStatus" AS ENUM ('ABERTO', 'RESOLVIDO', 'IGNORADO');

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" SERIAL NOT NULL,
    "queue" "AiJobQueue" NOT NULL DEFAULT 'DOCUMENT_ANALYSIS',
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDENTE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "extractedText" TEXT,
    "result" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "error" TEXT,
    "log" TEXT,
    "requestedByIdRaw" INTEGER,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "type" "AiSuggestionType" NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'PENDENTE',
    "payload" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "rawSnippet" TEXT,
    "page" INTEGER,
    "reviewedByIdRaw" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conflicts" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "type" "AiConflictType" NOT NULL,
    "severity" "AiConflictSeverity" NOT NULL DEFAULT 'MEDIA',
    "status" "AiConflictStatus" NOT NULL DEFAULT 'ABERTO',
    "description" TEXT NOT NULL,
    "suggestionIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedByIdRaw" INTEGER,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ai_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_processing_logs" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "actorIdRaw" INTEGER,
    "actorLabel" TEXT NOT NULL DEFAULT 'sistema',
    "documentName" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "averageConfidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_jobs_queue_status_idx" ON "ai_jobs"("queue", "status");

-- CreateIndex
CREATE INDEX "ai_jobs_fileHash_idx" ON "ai_jobs"("fileHash");

-- CreateIndex
CREATE INDEX "ai_suggestions_jobId_idx" ON "ai_suggestions"("jobId");

-- CreateIndex
CREATE INDEX "ai_suggestions_status_idx" ON "ai_suggestions"("status");

-- CreateIndex
CREATE INDEX "ai_suggestions_type_idx" ON "ai_suggestions"("type");

-- CreateIndex
CREATE INDEX "ai_conflicts_jobId_idx" ON "ai_conflicts"("jobId");

-- CreateIndex
CREATE INDEX "ai_conflicts_status_idx" ON "ai_conflicts"("status");

-- CreateIndex
CREATE INDEX "ai_conflicts_type_idx" ON "ai_conflicts"("type");

-- CreateIndex
CREATE INDEX "ai_processing_logs_jobId_idx" ON "ai_processing_logs"("jobId");

-- CreateIndex
CREATE INDEX "ai_processing_logs_createdAt_idx" ON "ai_processing_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conflicts" ADD CONSTRAINT "ai_conflicts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_logs" ADD CONSTRAINT "ai_processing_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
