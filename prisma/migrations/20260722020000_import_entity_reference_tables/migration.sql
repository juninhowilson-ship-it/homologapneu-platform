-- database/import/{countries,technologies,oe_codes,applications}
-- precisam de um ImportEntity próprio para gerar ImportBatch (log de
-- importação) — nenhum dos valores existentes cobre essas 4 entidades.

-- AlterEnum
ALTER TYPE "ImportEntity" ADD VALUE 'PAISES';
ALTER TYPE "ImportEntity" ADD VALUE 'TECNOLOGIAS';
ALTER TYPE "ImportEntity" ADD VALUE 'CODIGOS_OE';
ALTER TYPE "ImportEntity" ADD VALUE 'APLICACOES';
