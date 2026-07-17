BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_flagship_v3_staged_fail_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.flagship_v3_status = 'staged' THEN
    NEW.style_directives := COALESCE(NEW.style_directives, '{}'::jsonb) || jsonb_build_object(
      'pipeline_version', 'flagship_v3',
      'publication_mode', 'offline_only',
      'factory_enabled', false
    );
    NEW.pause_reason := 'flagship_v3_staged_offline';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flagship_v3_staged_fail_closed ON public.ai_story_projects;
CREATE TRIGGER trg_flagship_v3_staged_fail_closed
BEFORE INSERT OR UPDATE OF flagship_v3_status, style_directives
ON public.ai_story_projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_flagship_v3_staged_fail_closed();

UPDATE public.ai_story_projects
SET style_directives = COALESCE(style_directives, '{}'::jsonb) || jsonb_build_object(
      'pipeline_version', 'flagship_v3',
      'publication_mode', 'offline_only',
      'factory_enabled', false
    ),
    pause_reason = 'flagship_v3_staged_offline',
    updated_at = now()
WHERE flagship_v3_status = 'staged';

REVOKE ALL ON FUNCTION public.enforce_flagship_v3_staged_fail_closed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_flagship_v3_staged_fail_closed() TO service_role;

COMMIT;
