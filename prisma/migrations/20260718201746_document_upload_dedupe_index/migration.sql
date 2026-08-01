-- Impede duas linhas ATIVAS (não soft-deleted) com o mesmo SHA-256 —
-- fecha a corrida entre execuções concorrentes do crawler que checavam
-- "já existe?" quase ao mesmo tempo. Linhas soft-deleted (duplicatas
-- historicas já resolvidas) continuam podendo compartilhar o hash.
CREATE UNIQUE INDEX "document_uploads_fileHash_active_key"
  ON "document_uploads" ("fileHash")
  WHERE "deletedAt" IS NULL;
