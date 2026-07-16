-- Enforce independent setup routes at the database boundary. The runtime also
-- validates this contract, but direct service-role staging must not bypass it.

CREATE OR REPLACE FUNCTION public.validate_flagship_v3_route_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_routes jsonb;
  v_generator_count integer;
  v_generator_distinct integer;
  v_judge_count integer;
  v_judge_distinct integer;
BEGIN
  IF NEW.flagship_v3_status IS NULL THEN RETURN NEW; END IF;
  v_routes := NEW.style_directives->'flagship_model_routes_v3';
  SELECT count(*), count(DISTINCT value)
    INTO v_generator_count, v_generator_distinct
  FROM jsonb_array_elements_text(COALESCE(v_routes->'setupGenerators', '[]'::jsonb));
  SELECT count(*), count(DISTINCT value)
    INTO v_judge_count, v_judge_distinct
  FROM jsonb_array_elements_text(COALESCE(v_routes->'setupJudges', '[]'::jsonb));
  IF v_generator_count <> 2 OR v_generator_distinct <> 2
     OR v_judge_count <> 3 OR v_judge_distinct <> 3
     OR length(trim(COALESCE(v_routes->>'openingSimulator',''))) < 3
     OR length(trim(COALESCE(v_routes->>'launchArchitect',''))) < 3
     OR length(trim(COALESCE(v_routes->>'planner',''))) < 3
     OR length(trim(COALESCE(v_routes->>'writer',''))) < 3
     OR length(trim(COALESCE(v_routes->>'editor',''))) < 3
     OR v_routes->>'writer' = v_routes->>'editor'
     OR length(trim(COALESCE(v_routes->>'routeVersion',''))) < 3
     OR COALESCE((v_routes->>'maxPublishedChapterCostUsd')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'FLAGSHIP_V3_ROUTE_CONTRACT_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_flagship_v3_route_contract ON public.ai_story_projects;
CREATE TRIGGER trg_validate_flagship_v3_route_contract
BEFORE INSERT OR UPDATE OF style_directives, flagship_v3_status
ON public.ai_story_projects
FOR EACH ROW EXECUTE FUNCTION public.validate_flagship_v3_route_contract();

REVOKE ALL ON FUNCTION public.validate_flagship_v3_route_contract() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_flagship_v3_route_contract() TO service_role;
