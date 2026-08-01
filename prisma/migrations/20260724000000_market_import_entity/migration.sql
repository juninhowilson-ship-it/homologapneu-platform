-- database/import/markets precisa de um ImportEntity proprio para gerar
-- ImportBatch (log de importacao) -- nenhum valor existente cobre Market.

-- AlterEnum
ALTER TYPE "ImportEntity" ADD VALUE 'MERCADOS';
