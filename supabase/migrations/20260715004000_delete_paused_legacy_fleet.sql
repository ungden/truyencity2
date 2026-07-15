-- Retire the frozen legacy fleet permanently.
-- Scope is intentionally exact: paused projects without pipeline_version
-- flagship_v2. Flagship projects and any active/non-paused project are never
-- touched. Deleting the novel root cascades its chapters and project ledgers.
DO $$
DECLARE
  v_legacy_projects integer;
  v_flagship_overlap integer;
BEGIN
  -- Cascading through chapter versions, reads and memory ledgers can exceed
  -- the hosted default timeout. This migration is an explicit operator action
  -- and must finish atomically rather than silently leaving a partial fleet.
  SET LOCAL statement_timeout = 0;

  SELECT COUNT(*) INTO v_legacy_projects
  FROM public.ai_story_projects
  WHERE status = 'paused'
    AND COALESCE(style_directives->>'pipeline_version', '') <> 'flagship_v2';

  SELECT COUNT(*) INTO v_flagship_overlap
  FROM (
    SELECT novel_id
    FROM public.ai_story_projects
    GROUP BY novel_id
    HAVING BOOL_OR(status = 'paused' AND COALESCE(style_directives->>'pipeline_version', '') <> 'flagship_v2')
       AND BOOL_OR(style_directives->>'pipeline_version' = 'flagship_v2')
  ) shared;

  IF v_flagship_overlap <> 0 THEN
    RAISE EXCEPTION 'LEGACY_DELETE_FLAGSHIP_OVERLAP: % novels', v_flagship_overlap;
  END IF;

  DELETE FROM public.novels n
  WHERE n.id IN (
    SELECT p.novel_id
    FROM public.ai_story_projects p
    WHERE p.status = 'paused'
      AND COALESCE(p.style_directives->>'pipeline_version', '') <> 'flagship_v2'
  );

  RAISE NOTICE 'Deleted % paused legacy projects and their novel roots', v_legacy_projects;
END;
$$;
