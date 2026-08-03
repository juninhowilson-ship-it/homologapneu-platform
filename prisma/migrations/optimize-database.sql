-- ===================================================================
-- Otimizações de Performance para HomologaPneu
-- ===================================================================
-- Executar com: psql $DATABASE_URL < prisma/migrations/optimize-database.sql
-- ===================================================================

-- 1. MATERIALIZED VIEW: Contagem de Homologações por Fabricante
-- Usada no dashboard e filtros — atualizada via REFRESH MATERIALIZED VIEW
-- ===================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS homog_count_by_manufacturer AS
SELECT
  m.id as manufacturer_id,
  m.name as manufacturer_name,
  m."normalizedName" as normalized_name,
  COUNT(DISTINCT h.id) as total_homologations,
  COUNT(DISTINCT h."vehicleModelId") as total_models,
  COUNT(DISTINCT h."vehicleGenerationId") as total_generations,
  COUNT(DISTINCT tm.id) as total_tire_manufacturers,
  MAX(h."createdAt") as last_update
FROM
  "Manufacturer" m
LEFT JOIN
  "VehicleModel" vm ON m.id = vm."manufacturerId"
LEFT JOIN
  "VehicleGeneration" vg ON vm.id = vg."modelId"
LEFT JOIN
  "Homologation" h ON vg.id = h."vehicleGenerationId"
LEFT JOIN
  "HomologationTire" ht ON h.id = ht."homologationId"
LEFT JOIN
  "TireManufacturer" tm ON ht."tireManufacturerId" = tm.id
GROUP BY
  m.id, m.name, m."normalizedName"
ORDER BY
  total_homologations DESC;

-- Índice para a materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_homog_count_manufacturer_id
  ON homog_count_by_manufacturer(manufacturer_id);

-- ===================================================================
-- 2. MATERIALIZED VIEW: Estatísticas de Pneus
-- ===================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS tire_statistics AS
SELECT
  tm.id as tire_manufacturer_id,
  tm.name as tire_manufacturer_name,
  COUNT(DISTINCT t.id) as total_tires,
  COUNT(DISTINCT tf.id) as total_families,
  COUNT(DISTINCT ht."homologationId") as total_homologations,
  COUNT(DISTINCT ht."homologationId"::TEXT || '-' || h."vehicleGenerationId"::TEXT) as total_vehicle_applications,
  ROUND(AVG(t."maxLoadCapacity")::NUMERIC, 2) as avg_load_capacity,
  MAX(t."createdAt") as last_update
FROM
  "TireManufacturer" tm
LEFT JOIN
  "TireFamily" tf ON tm.id = tf."manufacturerId"
LEFT JOIN
  "Tire" t ON tf.id = t."familyId"
LEFT JOIN
  "HomologationTire" ht ON t.id = ht."tireId"
LEFT JOIN
  "Homologation" h ON ht."homologationId" = h.id
GROUP BY
  tm.id, tm.name
ORDER BY
  total_homologations DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tire_statistics_id
  ON tire_statistics(tire_manufacturer_id);

-- ===================================================================
-- 3. ÍNDICES para queries críticas
-- ===================================================================

-- Homologações: busca por fabricante e status
CREATE INDEX IF NOT EXISTS idx_homologation_manufacturer_status
  ON "Homologation"("vehicleGenerationId", "createdAt" DESC);

-- Homologações: busca por data
CREATE INDEX IF NOT EXISTS idx_homologation_created_date
  ON "Homologation"("createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- Homologações: busca por validação
CREATE INDEX IF NOT EXISTS idx_homologation_validation_status
  ON "Homologation"("validationStatus", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- Candidatos de curadoria: status
CREATE INDEX IF NOT EXISTS idx_homologation_candidate_status
  ON "HomologationCandidate"("status", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- Documentos: busca por homologação
CREATE INDEX IF NOT EXISTS idx_homolog_document_homolog
  ON "HomologationDocument"("homologationId", "createdAt" DESC);

-- Pneus: busca por fabricante
CREATE INDEX IF NOT EXISTS idx_tire_manufacturer_name
  ON "Tire"("familyId")
  INCLUDE("id", "size");

-- Modelos de veículo: busca por fabricante
CREATE INDEX IF NOT EXISTS idx_vehicle_model_normalized
  ON "VehicleModel"("manufacturerId", "normalizedName");

-- Gerações de veículos: busca por modelo
CREATE INDEX IF NOT EXISTS idx_vehicle_generation_model
  ON "VehicleGeneration"("modelId", "startYear" DESC);

-- Usuários: busca por email
CREATE INDEX IF NOT EXISTS idx_user_email
  ON "User"("email")
  WHERE "deletedAt" IS NULL;

-- ===================================================================
-- 4. ÍNDICES para JOIN de mesas relacionadas (performance em queries complexas)
-- ===================================================================

-- Homologação <-> Pneu <-> TireManufacturer
CREATE INDEX IF NOT EXISTS idx_homologation_tire_join
  ON "HomologationTire"("homologationId", "tireId");

-- Homologação <-> Roda
CREATE INDEX IF NOT EXISTS idx_homologation_wheel_join
  ON "HomologationWheel"("homologationId", "wheelId");

-- VehicleGeneration <-> Homologation (chave estrangeira)
CREATE INDEX IF NOT EXISTS idx_vehicle_generation_homologation
  ON "VehicleGeneration"("id")
  INCLUDE("startYear", "endYear");

-- ===================================================================
-- 5. PARTICIONAMENTO (COMENTADO - implementar se base crescer >50GB)
-- ===================================================================
-- ALTER TABLE "Homologation" SET (
--   fillfactor = 70  -- Espaço para UPDATE/DELETE sem VACUUM
-- );
--
-- ALTER TABLE "HomologationDocument" SET (
--   fillfactor = 70
-- );

-- ===================================================================
-- 6. CONFIGURAÇÃO PARA PERFORMANCE
-- ===================================================================

-- Aumentar work_mem para queries complexas
-- Executar como superuser: ALTER SYSTEM SET work_mem = '256MB';

-- Aumentar shared_buffers
-- Executar como superuser: ALTER SYSTEM SET shared_buffers = '1GB';

-- ===================================================================
-- 7. MAINTENANCE SCRIPTS
-- ===================================================================
-- Executar manualmente ou via cron job (exemplo: postgresql-autovacuum.sh)

-- Analyze para estatísticas das tabelas (executar diariamente)
-- ANALYZE;

-- Reindex se table fica fragmentada (executar semanalmente)
-- REINDEX INDEX CONCURRENTLY idx_homog_count_manufacturer_id;

-- Vacuum para limpar dead rows (executar diariamente ou conforme AUTOVACUUM)
-- VACUUM ANALYZE "Homologation";

-- ===================================================================
-- 8. FUNÇÃO PARA REFRESH DE MATERIALIZED VIEWS (Com Lock Mínimo)
-- ===================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Usar CONCURRENTLY para minimizar locks em readers
  -- Requer unique index (já criado acima)
  REFRESH MATERIALIZED VIEW CONCURRENTLY homog_count_by_manufacturer;
  REFRESH MATERIALIZED VIEW CONCURRENTLY tire_statistics;

  -- Log
  RAISE NOTICE 'Materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 9. TRIGGER PARA AUTO-REFRESH DE MATERIALIZED VIEWS
-- (COMENTADO - implementar se muitas writes em Homologation)
-- ===================================================================
-- CREATE OR REPLACE FUNCTION trigger_refresh_homog_views()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Executar refresh em background (não bloqueia INSERT)
--   PERFORM refresh_materialized_views();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_refresh_views_after_homolog
--   AFTER INSERT OR UPDATE OR DELETE
--   ON "Homologation"
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION trigger_refresh_homog_views();

-- ===================================================================
-- 10. VALIDAÇÃO E TESTES
-- ===================================================================

-- Verificar se materialized views foram criadas
SELECT matviewname FROM pg_matviews
WHERE matviewname LIKE 'homog_%' OR matviewname LIKE 'tire_%';

-- Ver plano de execução de query crítica
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Homologation"
-- WHERE "vehicleGenerationId" = 1
-- ORDER BY "createdAt" DESC LIMIT 20;

-- Ver tamanho de índices (para monitorar crescimento)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
