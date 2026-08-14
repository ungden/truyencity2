-- A provider timeout is not a quality verdict and must not revoke the last
-- conclusive smoke approval. Only a passed or content-blocked smoke can change
-- the release/route decision; infra_blocked runs remain visible for operations.
CREATE OR REPLACE FUNCTION public.story_factory_release_is_approved(
  p_benchmark_id uuid,
  p_engine_release text,
  p_model_routes jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT smoke.status = 'passed'
      AND smoke.error_code IS NULL
      AND COALESCE((smoke.output_artifact->>'chaptersCompleted')::integer, 0) >= 5
      AND COALESCE((smoke.output_artifact->>'criticalContinuityViolations')::integer, -1) = 0
    FROM public.story_factory_runs smoke
    WHERE smoke.kind = 'smoke'
      AND smoke.status IN ('passed', 'blocked')
      AND smoke.engine_release = p_engine_release
      AND smoke.model_routes->'route'->>'writer' = p_model_routes->>'writer'
      AND smoke.model_routes->'route'->>'editor' = p_model_routes->>'editor'
      AND smoke.model_routes->'route'->>'planner' = p_model_routes->>'planner'
      AND smoke.model_routes->'route'->>'planJudge' = p_model_routes->>'planJudge'
      AND smoke.model_routes->'route'->>'routeVersion' = p_model_routes->>'routeVersion'
    ORDER BY smoke.finished_at DESC NULLS LAST, smoke.started_at DESC
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) TO service_role;
