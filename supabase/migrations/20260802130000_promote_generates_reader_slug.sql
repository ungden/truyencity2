-- Novels are seeded with a placeholder slug (factory-<slot>-<timestamp>) before the
-- Concept Lab has produced a title. Promotion is the moment a novel becomes
-- reader-facing — the URL should carry the title, not the seed artifact.
SET lock_timeout = '5s';

-- Deterministic Vietnamese slugifier: strips diacritics (including đ/Đ), lowercases,
-- collapses everything else to single hyphens.
CREATE OR REPLACE FUNCTION public.vn_slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    lower(translate(input,
      'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    )),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

REVOKE ALL ON FUNCTION public.vn_slugify(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vn_slugify(text) TO service_role;

-- Promotion now regenerates the slug from the final title, keeping uniqueness with a
-- numeric suffix. Everything else is identical to 20260731120000's definition.
CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project public.ai_story_projects;
  cover text;
  latest_review_status text;
  latest_review_release text;
  setup_digest text;
  novel_title text;
  base_slug text;
  new_slug text;
  suffix integer := 1;
BEGIN
  SELECT * INTO job FROM public.story_factory_jobs WHERE id = p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;
  IF job.launch_pack_digest IS NULL THEN
    RAISE EXCEPTION 'FACTORY_CANARY_PROVENANCE_REQUIRED';
  END IF;

  SELECT * INTO project FROM public.ai_story_projects WHERE id = job.project_id;
  IF project.engine_release IS DISTINCT FROM p_engine_release THEN
    RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH';
  END IF;

  SELECT output_artifact->>'launchPackDigest' INTO setup_digest
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'setup'
    AND status = 'passed'
    AND error_code IS NULL
    AND engine_release = p_engine_release
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF setup_digest IS DISTINCT FROM job.launch_pack_digest THEN
    RAISE EXCEPTION 'FACTORY_LAUNCH_PACK_DIGEST_MISMATCH';
  END IF;

  SELECT status, engine_release INTO latest_review_status, latest_review_release
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'window_review'
    AND chapter_number = 10
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;
  IF latest_review_status IS DISTINCT FROM 'passed'
    OR latest_review_release IS DISTINCT FROM p_engine_release
  THEN
    RAISE EXCEPTION 'FACTORY_LATEST_WINDOW_REVIEW_REQUIRED';
  END IF;

  SELECT cover_url, title INTO cover, novel_title FROM public.novels WHERE id = job.novel_id;
  IF cover IS NULL OR length(trim(cover)) = 0 THEN RAISE EXCEPTION 'FACTORY_COVER_REQUIRED'; END IF;

  base_slug := public.vn_slugify(novel_title);
  IF base_slug IS NULL OR length(base_slug) < 3 THEN
    base_slug := 'truyen-' || substr(job.novel_id::text, 1, 8);
  END IF;
  new_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.novels WHERE slug = new_slug AND id <> job.novel_id) AND suffix < 50 LOOP
    suffix := suffix + 1;
    new_slug := base_slug || '-' || suffix;
  END LOOP;

  UPDATE public.novels
  SET hidden = false, status = 'Đang ra', slug = new_slug, updated_at = now()
  WHERE id = job.novel_id;
  UPDATE public.story_factory_jobs SET execution_mode = 'production', updated_at = now() WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'jobId', p_job_id,
    'executionMode', 'production',
    'visible', true,
    'slug', new_slug,
    'launchPackDigest', job.launch_pack_digest,
    'reviewRelease', latest_review_release
  );
END $$;

REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;

-- The one novel promoted before this migration keeps living at a seed slug; move it
-- onto its title slug the same way future promotions will.
UPDATE public.novels
SET slug = public.vn_slugify(title), updated_at = now()
WHERE slug = 'factory-dt-01-1785583542892'
  AND NOT EXISTS (SELECT 1 FROM public.novels other WHERE other.slug = public.vn_slugify(novels.title) AND other.id <> novels.id);
