-- Busca Inteligente: fuzzy, accent-insensitive, ranked search over the
-- curated Homologation domain (Manufacturer/VehicleModel/VehicleVersion/
-- Engine/Tire/TireManufacturer + SearchAlias). Deliberately does NOT touch
-- ManufacturerApplication/TireVehicleApplication — that raw pre-curadoria
-- catalog layer hasn't been human-reviewed yet (see comments on those
-- models in schema.prisma) and should never surface as a search result.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() isn't marked IMMUTABLE by Postgres (it depends on the search
-- path resolving the dictionary), so it can't be used directly in an index
-- expression or a STABLE function. This wrapper pins the dictionary and is
-- safe to mark IMMUTABLE.
CREATE OR REPLACE FUNCTION busca_normalizar(texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(public.unaccent(coalesce(texto, '')));
$$;

CREATE INDEX IF NOT EXISTS idx_manufacturers_name_trgm ON manufacturers USING gin (busca_normalizar(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_name_trgm ON vehicle_models USING gin (busca_normalizar(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicle_versions_name_trgm ON vehicle_versions USING gin (busca_normalizar(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_engines_name_trgm ON engines USING gin (busca_normalizar(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tire_manufacturers_name_trgm ON tire_manufacturers USING gin (busca_normalizar(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tires_size_trgm ON tires USING gin (busca_normalizar(size) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tires_model_trgm ON tires USING gin (busca_normalizar(model) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_homologations_code_trgm ON homologations USING gin (busca_normalizar(code) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_aliases_alias_trgm ON search_aliases USING gin (busca_normalizar(alias) gin_trgm_ops);

CREATE OR REPLACE FUNCTION busca_inteligente(termo text, limite integer DEFAULT 100)
RETURNS TABLE("homologationId" integer, score real)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH termo_norm AS (
    SELECT busca_normalizar(termo) AS t
  ),
  alias_score AS (
    SELECT sa."entityType" AS entity_type, sa."entityId" AS entity_id,
           max(similarity(busca_normalizar(sa.alias), termo_norm.t)) AS sim
    FROM search_aliases sa, termo_norm
    WHERE termo_norm.t <> '' AND busca_normalizar(sa.alias) % termo_norm.t
    GROUP BY sa."entityType", sa."entityId"
  ),
  tire_score AS (
    SELECT ht."homologationId" AS homologation_id,
           max(GREATEST(
             similarity(busca_normalizar(ti.size), termo_norm.t),
             similarity(busca_normalizar(ti.model), termo_norm.t),
             similarity(busca_normalizar(tm.name), termo_norm.t),
             coalesce(als.sim, 0)
           )) AS sim
    FROM homologation_tires ht
    JOIN tires ti ON ti.id = ht."tireId"
    JOIN tire_manufacturers tm ON tm.id = ti."tireManufacturerId"
    CROSS JOIN termo_norm
    LEFT JOIN alias_score als ON als.entity_type = 'TIRE_MANUFACTURER' AND als.entity_id = tm.id
    GROUP BY ht."homologationId"
  ),
  scored AS (
    SELECT h.id AS homologation_id,
           GREATEST(
             similarity(busca_normalizar(h.code), termo_norm.t),
             similarity(busca_normalizar(m.name), termo_norm.t),
             similarity(busca_normalizar(vmo.name), termo_norm.t),
             similarity(busca_normalizar(vv.name), termo_norm.t),
             similarity(busca_normalizar(e.name), termo_norm.t),
             coalesce(alias_m.sim, 0),
             coalesce(alias_vm.sim, 0),
             coalesce(ts.sim, 0)
           )::real AS score,
           h."updatedAt" AS updated_at,
           termo_norm.t AS termo
    FROM homologations h
    JOIN vehicle_versions vv ON vv.id = h."vehicleVersionId"
    JOIN vehicle_models vmo ON vmo.id = vv."vehicleModelId"
    JOIN manufacturers m ON m.id = vmo."manufacturerId"
    JOIN engines e ON e.id = vv."engineId"
    CROSS JOIN termo_norm
    LEFT JOIN tire_score ts ON ts.homologation_id = h.id
    LEFT JOIN alias_score alias_m ON alias_m.entity_type = 'MANUFACTURER' AND alias_m.entity_id = m.id
    LEFT JOIN alias_score alias_vm ON alias_vm.entity_type = 'VEHICLE_MODEL' AND alias_vm.entity_id = vmo.id
    WHERE h."deletedAt" IS NULL
  )
  SELECT homologation_id AS "homologationId", score
  FROM scored
  WHERE termo = '' OR score > 0.15
  ORDER BY score DESC, updated_at DESC
  LIMIT limite;
$$;
