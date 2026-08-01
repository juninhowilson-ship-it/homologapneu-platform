-- CreateEnum
CREATE TYPE "EvidenceOutcome" AS ENUM ('CONFIRMA', 'CONTRADIZ', 'NEUTRO');

-- CreateEnum
CREATE TYPE "ReasonCategory" AS ENUM ('DESCONTINUACAO', 'RECALL', 'ATUALIZACAO_HOMOLOGACAO', 'CORRECAO_CADASTRAL', 'MUDANCA_REGULATORIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "CacheProvider" AS ENUM ('FIPE', 'SENATRAN', 'INMETRO', 'CRAWLER', 'OCR', 'OUTRO');

-- CreateEnum
CREATE TYPE "SearchAliasEntityType" AS ENUM ('MANUFACTURER', 'VEHICLE_MODEL', 'TIRE_MANUFACTURER', 'TIRE_MODEL');

-- CreateEnum
CREATE TYPE "StatisticsMetric" AS ENUM ('COBERTURA_FABRICANTE', 'QUALIDADE_EXTRACAO', 'HOMOLOGACOES_TOTAL', 'PNEUS_TOTAL', 'VEICULOS_COMPLETOS', 'VERSOES_COMPLETAS', 'DOCUMENTOS_PROCESSADOS', 'CANDIDATOS_PENDENTES');

-- NOTA: prisma migrate diff detectou "audit_logs_legacy" (backup legado,
-- intencionalmente fora do schema.prisma) como tabela "extra" e gerou
-- DROP CONSTRAINT/DROP TABLE para ela. REMOVIDO MANUALMENTE aqui — nunca
-- apagar essa tabela (mesmo risco identificado e evitado nas duas fases
-- anteriores desta sessão).

-- AlterTable
ALTER TABLE "ai_jobs" ADD COLUMN     "aiModelId" INTEGER,
ADD COLUMN     "aiPromptId" INTEGER;

-- AlterTable
ALTER TABLE "document_uploads" ADD COLUMN     "previousVersionId" INTEGER,
ADD COLUMN     "versionChangeNotes" TEXT;

-- AlterTable
ALTER TABLE "homologation_evidences" ADD COLUMN     "documentUploadId" INTEGER,
ADD COLUMN     "outcome" "EvidenceOutcome";

-- AlterTable
ALTER TABLE "tire_equivalences" ADD COLUMN     "reviewedById" INTEGER;

-- CreateTable
CREATE TABLE "reason_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "category" "ReasonCategory" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reason_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replacement_history" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "previousTireId" INTEGER,
    "newTireId" INTEGER,
    "previousWheelId" INTEGER,
    "newWheelId" INTEGER,
    "reasonCodeId" INTEGER,
    "reviewedById" INTEGER,
    "source" TEXT,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replacement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheel_equivalences" (
    "id" SERIAL NOT NULL,
    "wheelId" INTEGER NOT NULL,
    "equivalentWheelId" INTEGER NOT NULL,
    "ruleId" INTEGER,
    "type" "EquivalenceType",
    "source" TEXT,
    "sourceUrl" TEXT,
    "confidence" INTEGER,
    "reviewedById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wheel_equivalences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_revisions" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "marketId" INTEGER,
    "validationStatus" "ValidationStatus" NOT NULL,
    "confidence" INTEGER,
    "notes" TEXT,
    "changedById" INTEGER,
    "changeReason" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homologation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_cache" (
    "id" SERIAL NOT NULL,
    "provider" "CacheProvider" NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "etag" TEXT,
    "lastModified" TEXT,
    "contentHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_token_usage" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsdCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_aliases" (
    "id" SERIAL NOT NULL,
    "entityType" "SearchAliasEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics_snapshots" (
    "id" SERIAL NOT NULL,
    "metric" "StatisticsMetric" NOT NULL,
    "dimension" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statistics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reason_codes_code_key" ON "reason_codes"("code");

-- CreateIndex
CREATE INDEX "replacement_history_homologationId_idx" ON "replacement_history"("homologationId");

-- CreateIndex
CREATE INDEX "replacement_history_reasonCodeId_idx" ON "replacement_history"("reasonCodeId");

-- CreateIndex
CREATE INDEX "replacement_history_previousTireId_idx" ON "replacement_history"("previousTireId");

-- CreateIndex
CREATE INDEX "replacement_history_newTireId_idx" ON "replacement_history"("newTireId");

-- CreateIndex
CREATE INDEX "replacement_history_previousWheelId_idx" ON "replacement_history"("previousWheelId");

-- CreateIndex
CREATE INDEX "replacement_history_newWheelId_idx" ON "replacement_history"("newWheelId");

-- CreateIndex
CREATE INDEX "replacement_history_reviewedById_idx" ON "replacement_history"("reviewedById");

-- CreateIndex
CREATE INDEX "wheel_equivalences_equivalentWheelId_idx" ON "wheel_equivalences"("equivalentWheelId");

-- CreateIndex
CREATE INDEX "wheel_equivalences_ruleId_idx" ON "wheel_equivalences"("ruleId");

-- CreateIndex
CREATE INDEX "wheel_equivalences_reviewedById_idx" ON "wheel_equivalences"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "wheel_equivalences_wheelId_equivalentWheelId_key" ON "wheel_equivalences"("wheelId", "equivalentWheelId");

-- CreateIndex
CREATE INDEX "homologation_revisions_homologationId_idx" ON "homologation_revisions"("homologationId");

-- CreateIndex
CREATE INDEX "homologation_revisions_changedById_idx" ON "homologation_revisions"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "homologation_revisions_homologationId_revisionNumber_key" ON "homologation_revisions"("homologationId", "revisionNumber");

-- CreateIndex
CREATE INDEX "external_cache_expiresAt_idx" ON "external_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "external_cache_provider_cacheKey_key" ON "external_cache"("provider", "cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_name_version_key" ON "ai_models"("provider", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_name_version_key" ON "ai_prompts"("name", "version");

-- CreateIndex
CREATE INDEX "ai_token_usage_jobId_idx" ON "ai_token_usage"("jobId");

-- CreateIndex
CREATE INDEX "search_aliases_alias_idx" ON "search_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "search_aliases_entityType_entityId_alias_key" ON "search_aliases"("entityType", "entityId", "alias");

-- CreateIndex
CREATE INDEX "statistics_snapshots_metric_dimension_computedAt_idx" ON "statistics_snapshots"("metric", "dimension", "computedAt");

-- CreateIndex
CREATE INDEX "ai_jobs_aiModelId_idx" ON "ai_jobs"("aiModelId");

-- CreateIndex
CREATE INDEX "ai_jobs_aiPromptId_idx" ON "ai_jobs"("aiPromptId");

-- CreateIndex
CREATE INDEX "document_uploads_previousVersionId_idx" ON "document_uploads"("previousVersionId");

-- CreateIndex
CREATE INDEX "homologation_evidences_documentUploadId_idx" ON "homologation_evidences"("documentUploadId");

-- CreateIndex
CREATE INDEX "tire_equivalences_reviewedById_idx" ON "tire_equivalences"("reviewedById");

-- CreateIndex
CREATE INDEX "tires_tireManufacturerId_category_idx" ON "tires"("tireManufacturerId", "category");

-- AddForeignKey
ALTER TABLE "homologation_evidences" ADD CONSTRAINT "homologation_evidences_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_aiPromptId_fkey" FOREIGN KEY ("aiPromptId") REFERENCES "ai_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_equivalences" ADD CONSTRAINT "tire_equivalences_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_previousTireId_fkey" FOREIGN KEY ("previousTireId") REFERENCES "tires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_newTireId_fkey" FOREIGN KEY ("newTireId") REFERENCES "tires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_previousWheelId_fkey" FOREIGN KEY ("previousWheelId") REFERENCES "wheels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_newWheelId_fkey" FOREIGN KEY ("newWheelId") REFERENCES "wheels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_reasonCodeId_fkey" FOREIGN KEY ("reasonCodeId") REFERENCES "reason_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replacement_history" ADD CONSTRAINT "replacement_history_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_equivalences" ADD CONSTRAINT "wheel_equivalences_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "wheels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_equivalences" ADD CONSTRAINT "wheel_equivalences_equivalentWheelId_fkey" FOREIGN KEY ("equivalentWheelId") REFERENCES "wheels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_equivalences" ADD CONSTRAINT "wheel_equivalences_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "equivalence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wheel_equivalences" ADD CONSTRAINT "wheel_equivalences_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_revisions" ADD CONSTRAINT "homologation_revisions_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_revisions" ADD CONSTRAINT "homologation_revisions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fase 8 (Pesquisa): índices GIN de full-text search nativo do Postgres —
-- Prisma não tem sintaxe declarativa para "USING GIN (to_tsvector(...))"
-- em schema.prisma, por isso não aparecem como @@index (mesmo caso já
-- documentado no comentário de DocumentUpload.fileHash, para o índice
-- único parcial). Resolve "busca extremamente rápida" (Fase 10) sem
-- duplicar texto pesquisável em outra tabela (o que violaria a regra de
-- não duplicar dado): o índice é derivado da própria coluna, não uma
-- cópia dela.
CREATE INDEX IF NOT EXISTS "manufacturers_name_fts_idx" ON "manufacturers" USING GIN (to_tsvector('portuguese', "name"));
CREATE INDEX IF NOT EXISTS "vehicle_models_name_fts_idx" ON "vehicle_models" USING GIN (to_tsvector('portuguese', "name"));
CREATE INDEX IF NOT EXISTS "tires_model_fts_idx" ON "tires" USING GIN (to_tsvector('portuguese', "model"));
CREATE INDEX IF NOT EXISTS "tires_brand_fts_idx" ON "tires" USING GIN (to_tsvector('portuguese', "brand"));

