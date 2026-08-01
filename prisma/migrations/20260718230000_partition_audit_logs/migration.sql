-- Particionamento nativo do Postgres para audit_logs (tabela que mais
-- cresce no Banco Mestre) por ano de "createdAt". Nunca apaga dados: a
-- tabela antiga é preservada como "audit_logs_legacy" (não removida nesta
-- migration — descarte manual só depois de confirmar em produção).

-- 1) Preserva a tabela atual intacta, só renomeada.
ALTER TABLE "audit_logs" RENAME TO "audit_logs_legacy";
ALTER TABLE "audit_logs_legacy" RENAME CONSTRAINT "audit_logs_pkey" TO "audit_logs_legacy_pkey";
ALTER TABLE "audit_logs_legacy" RENAME CONSTRAINT "audit_logs_documentUploadId_fkey" TO "audit_logs_legacy_documentUploadId_fkey";
ALTER TABLE "audit_logs_legacy" RENAME CONSTRAINT "audit_logs_importBatchId_fkey" TO "audit_logs_legacy_importBatchId_fkey";
ALTER TABLE "audit_logs_legacy" RENAME CONSTRAINT "audit_logs_userId_fkey" TO "audit_logs_legacy_userId_fkey";
ALTER INDEX "audit_logs_entity_entityId_idx" RENAME TO "audit_logs_legacy_entity_entityId_idx";
ALTER INDEX "audit_logs_importBatchId_idx" RENAME TO "audit_logs_legacy_importBatchId_idx";
ALTER INDEX "audit_logs_createdAt_idx" RENAME TO "audit_logs_legacy_createdAt_idx";
ALTER INDEX "audit_logs_documentUploadId_idx" RENAME TO "audit_logs_legacy_documentUploadId_idx";
ALTER INDEX "audit_logs_userId_idx" RENAME TO "audit_logs_legacy_userId_idx";

-- 2) Cria a tabela particionada nova, reaproveitando a MESMA sequence de id
-- (nunca reinicia o contador — evita colisão com os dados copiados abaixo).
-- Chave primária composta (id, createdAt): exigência do Postgres para
-- tabelas particionadas por RANGE — a coluna de partição precisa estar em
-- toda PK/unique constraint. "id" sozinho continua efetivamente único na
-- prática (mesma sequence, nunca duas linhas com o mesmo id).
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL DEFAULT nextval('audit_logs_id_seq'),
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" INTEGER,
    "importBatchId" INTEGER,
    "documentUploadId" INTEGER,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

ALTER SEQUENCE "audit_logs_id_seq" OWNED BY "audit_logs"."id";

-- 3) Partições anuais 2026-2032 + uma partição DEFAULT como rede de
-- segurança (nenhum INSERT falha por falta de partição para a data).
CREATE TABLE "audit_logs_2026" PARTITION OF "audit_logs" FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE "audit_logs_2027" PARTITION OF "audit_logs" FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE "audit_logs_2028" PARTITION OF "audit_logs" FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE "audit_logs_2029" PARTITION OF "audit_logs" FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
CREATE TABLE "audit_logs_2030" PARTITION OF "audit_logs" FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');
CREATE TABLE "audit_logs_2031" PARTITION OF "audit_logs" FOR VALUES FROM ('2031-01-01') TO ('2032-01-01');
CREATE TABLE "audit_logs_2032" PARTITION OF "audit_logs" FOR VALUES FROM ('2032-01-01') TO ('2033-01-01');
CREATE TABLE "audit_logs_default" PARTITION OF "audit_logs" DEFAULT;

-- 4) Índices no pai (Postgres propaga para cada partição automaticamente).
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs" ("entity", "entityId");
CREATE INDEX "audit_logs_importBatchId_idx" ON "audit_logs" ("importBatchId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" ("createdAt");
CREATE INDEX "audit_logs_documentUploadId_idx" ON "audit_logs" ("documentUploadId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" ("userId");

-- 5) Foreign keys, idênticas às da tabela original.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6) Copia todos os dados existentes (nada é perdido).
INSERT INTO "audit_logs" ("id", "entity", "entityId", "action", "userId", "importBatchId", "documentUploadId", "changes", "createdAt")
SELECT "id", "entity", "entityId", "action", "userId", "importBatchId", "documentUploadId", "changes", "createdAt" FROM "audit_logs_legacy";
