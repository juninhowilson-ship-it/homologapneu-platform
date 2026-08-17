-- Busca por medida de pneu: correspondência exata em vez de trigrama.
-- Antes, similarity('205/55r16','205/55r17') ~ 0.7 fazia uma busca por medida
-- retornar 72 homologações das quais só 8 calçavam a medida pedida — o
-- resultado certo se perdia no ruído e a consulta ficava lenta.

CREATE OR REPLACE FUNCTION public.busca_medida_chave(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $function$
  -- Extrai a tripla largura/perfil/aro de uma medida de pneu, tolerando as
  -- formas que o usuário digita ("205 55 16", "205/55 R16", "2055516") e os
  -- sufixos reais do catálogo (C de carga, Z de velocidade, aro .5 de
  -- caminhão). Devolve NULL quando o texto não é uma medida — inclusive
  -- quando há outras letras (ex.: "F-250 2016" é veículo, não medida).
  SELECT m[1] || '/' || m[2] || 'R' || m[3]
  FROM regexp_match(
    upper(coalesce(txt, '')),
    '([0-9]{3})[[:space:]]*[/x-]?[[:space:]]*([0-9]{2})[[:space:]]*[ZR/-]*[[:space:]]*([0-9]{2}(\.5)?)'
  ) AS m
  WHERE upper(coalesce(txt, '')) !~ '[ABDEFGHIJKLMNOPQSTUVWY]';
$function$;

CREATE OR REPLACE FUNCTION public.busca_inteligente(termo text, limite integer DEFAULT 100)
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
           termo_norm.t AS termo,
           termo_norm.medida AS medida,
           coalesce(ts.sim, 0)::real AS tire_sim
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
  WHERE termo = ''
     OR (medida IS NOT NULL AND tire_sim >= 1.0)
     OR (medida IS NULL AND score > 0.15)
  ORDER BY score DESC, updated_at DESC
  LIMIT limite;
$function$;
