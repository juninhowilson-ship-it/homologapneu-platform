-- Fase 10 (Performance): remove 3 índices redundantes encontrados na
-- auditoria completa do schema — cada um é um prefixo exato de um
-- @@unique composto já existente na mesma tabela, que o Postgres já usa
-- para satisfazer buscas pela coluna isolada (nenhuma capacidade de
-- consulta é perdida; só reduz espaço em disco e custo de escrita).
-- DROP INDEX nunca remove dado, apenas a estrutura de acesso.
DROP INDEX "homologation_revisions_homologationId_idx";

DROP INDEX "official_sources_manufacturerName_idx";

DROP INDEX "vehicle_pressure_readings_homologationId_idx";
