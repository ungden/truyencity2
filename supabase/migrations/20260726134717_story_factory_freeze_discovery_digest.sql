-- The 20-chapter run must consume the exact frozen launch packs and plans that
-- produced the four-brief Writer discovery corpus.
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
  SELECT EXISTS (
    SELECT 1
    FROM public.story_factory_runs benchmark
    JOIN public.story_factory_runs writer_validation
      ON writer_validation.id::text = benchmark.output_artifact->'manifest'->>'writerBakeoffRunId'
    JOIN public.story_factory_runs sequential_validation
      ON sequential_validation.id::text = benchmark.output_artifact->'manifest'->>'sequentialRunId'
    WHERE benchmark.id = p_benchmark_id
      AND benchmark.kind = 'benchmark'
      AND benchmark.status = 'passed'
      AND benchmark.error_code IS NULL
      AND benchmark.engine_release = p_engine_release
      AND benchmark.benchmark_protocol_version = 'story-factory-validation-v4-causal-reader'
      AND benchmark.output_artifact->'manifest'->>'passed' = 'true'
      AND benchmark.model_routes->'route'->>'planner' = p_model_routes->>'planner'
      AND benchmark.model_routes->'route'->>'planJudge' = p_model_routes->>'planJudge'
      AND benchmark.model_routes->'route'->>'writer' = p_model_routes->>'writer'
      AND benchmark.model_routes->'route'->>'editor' = p_model_routes->>'editor'
      AND benchmark.model_routes->'route'->>'routeVersion' = p_model_routes->>'routeVersion'
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'samplesCompleted')::integer, 0) = 20
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'firstPassPublishRate')::numeric, 0) >= 0.85
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'finalPublishRate')::numeric, 0) = 1
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'criticalContinuityViolations')::integer, -1) = 0
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'desireToReadNext')::numeric, 0) >= 0.75
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'medianAllInCostUsd')::numeric, 999) <= 0.25
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'maxAllInCostUsd')::numeric, 999) <= 0.50
      AND COALESCE((benchmark.output_artifact->'manifest'->'metrics'->>'totalCostUsd')::numeric, 999) <= 50
      AND writer_validation.kind = 'benchmark'
      AND writer_validation.status = 'passed'
      AND writer_validation.error_code IS NULL
      AND writer_validation.engine_release = p_engine_release
      AND writer_validation.benchmark_protocol_version = 'story-factory-writer-bakeoff-v3-causal-qualified'
      AND writer_validation.output_artifact->'topTwoWriters' ? (p_model_routes->>'writer')
      AND writer_validation.output_artifact->>'corpusDigest'
        = benchmark.output_artifact->'manifest'->>'writerCorpusDigest'
      AND COALESCE((writer_validation.input_artifact->>'allPlansPassed')::boolean, false)
      AND COALESCE((writer_validation.input_artifact->>'allCausalPlansPassed')::boolean, false)
      AND sequential_validation.kind = 'benchmark'
      AND sequential_validation.status = 'passed'
      AND sequential_validation.error_code IS NULL
      AND sequential_validation.engine_release = p_engine_release
      AND sequential_validation.benchmark_protocol_version = 'story-factory-sequential-survival-v2-causal-continuity'
      AND sequential_validation.output_artifact->>'corpusDigest'
        = benchmark.output_artifact->'manifest'->>'corpusDigest'
      AND sequential_validation.output_artifact->>'sourceDiscoveryDigest'
        = writer_validation.input_artifact->>'sourceDiscoveryDigest'
      AND sequential_validation.model_routes->'route'->>'writer' = p_model_routes->>'writer'
  );
$$;

REVOKE ALL ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.story_factory_release_is_approved(uuid, text, jsonb) TO service_role;
