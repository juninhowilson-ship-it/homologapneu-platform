-- Recorte por ano na busca: o produto passa a focar em veículos ainda
-- fabricados de 2020 em diante (decisão de escopo). O corte é por yearEnd
-- (fim de produção), não por lançamento, para manter em cena os modelos
-- lançados antes de 2020 que continuaram saindo de fábrica depois.
-- ano_minimo NULL mantém o comportamento antigo (tudo), usado pelo botão
-- "incluir anteriores" da tela de pesquisa.

DROP FUNCTION IF EXISTS public.busca_inteligente(text, integer);

CREATE OR REPLACE FUNCTION public.busca_inteligente(termo text, limite integer DEFAULT 100, ano_minimo integer DEFAULT NULL)
RETURNS TABLE("homologationId" integer, score real)
LANGUAGE sql
STABLE PARALLEL SAFE
SET search_path = public
AS $function$
  WITH termo_norm AS (
    SELECT busca_normalizar(termo) AS t, busca_medida_chave(termo) AS medida
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
             CASE WHEN termo_norm.medida IS NOT NULL
                    AND busca_medida_chave(ti.size) = termo_norm.medida
                  THEN 1.0::real ELSE 0::real END,
             CASE WHEN termo_norm.medida IS NULL
                  THEN similarity(busca_normalizar(ti.size), termo_norm.t)
                  ELSE 0::real END,
             similarity(busca_normalizar(ti.model), termo_norm.t),
             similarity(busca_normalizar(tm.name), termo_norm.t),
             coalesce(als.sim, 0)
           )) AS sim
    FROM homologation_tires ht
    JOIN tires ti ON ti.id = ht."tireId" AND ti."deletedAt" IS NULL
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
           termo_norm.t AS termo,
           termo_norm.medida AS medida,
           coalesce(ts.sim, 0)::real AS tire_sim,
           vv."yearEnd" AS ano_fim
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
  WHERE (ano_minimo IS NULL OR ano_fim >= ano_minimo)
    AND (termo = ''
      OR (medida IS NOT NULL AND tire_sim >= 1.0)
      OR (medida IS NULL AND score > 0.15))
  ORDER BY score DESC, updated_at DESC
  LIMIT limite;
$function$;
