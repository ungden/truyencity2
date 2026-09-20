-- Keep every public editorial replacement recoverable and apply a reviewed batch
-- only while its serial job is explicitly paused.
BEGIN;

SET lock_timeout = '5s';

CREATE TABLE public.serial_chapter_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_novel_id uuid NOT NULL REFERENCES public.serial_novels(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  old_title text NOT NULL,
  old_content text NOT NULL,
  new_title text NOT NULL,
  new_content text NOT NULL,
  reason text NOT NULL,
  direction jsonb NOT NULL DEFAULT '[]'::jsonb,
  review jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL,
  prompt_version text NOT NULL,
  usage jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, revision_number)
);

CREATE INDEX idx_serial_chapter_revisions_story
  ON public.serial_chapter_revisions(serial_novel_id, chapter_number, revision_number DESC);

ALTER TABLE public.serial_chapter_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.serial_chapter_revisions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.serial_chapter_revisions TO service_role;
CREATE POLICY serial_chapter_revisions_service_only
  ON public.serial_chapter_revisions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.apply_serial_editorial_revisions(
  p_serial_novel_id uuid,
  p_revisions jsonb,
  p_reason text,
  p_model text,
  p_prompt_version text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_serial public.serial_novels;
  v_job public.serial_jobs;
  v_chapter public.chapters;
  v_item jsonb;
  v_revision_number integer;
  v_applied integer := 0;
BEGIN
  IF jsonb_typeof(p_revisions) IS DISTINCT FROM 'array' OR jsonb_array_length(p_revisions) = 0 THEN
    RAISE EXCEPTION 'SERIAL_EDITORIAL_REVISIONS_EMPTY';
  END IF;

  SELECT * INTO v_serial FROM public.serial_novels
  WHERE id = p_serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_NOVEL_MISSING'; END IF;

  SELECT * INTO v_job FROM public.serial_jobs
  WHERE serial_novel_id = p_serial_novel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_JOB_MISSING'; END IF;
  IF v_job.status <> 'paused' OR v_job.lease_owner IS NOT NULL
     OR v_job.lease_token IS NOT NULL OR v_job.lease_until IS NOT NULL THEN
    RAISE EXCEPTION 'SERIAL_EDITORIAL_JOB_NOT_PAUSED';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_revisions)
  LOOP
    SELECT * INTO v_chapter FROM public.chapters
    WHERE id = (v_item->>'chapterId')::uuid
      AND novel_id = v_serial.novel_id
      AND chapter_number = (v_item->>'chapterNumber')::integer
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'SERIAL_EDITORIAL_CHAPTER_MISSING'; END IF;
    IF v_chapter.title IS DISTINCT FROM v_item->>'oldTitle'
       OR v_chapter.content IS DISTINCT FROM v_item->>'oldContent' THEN
      RAISE EXCEPTION 'SERIAL_EDITORIAL_SOURCE_CHANGED_AT_CHAPTER_%', v_chapter.chapter_number;
    END IF;
    IF length(trim(COALESCE(v_item->>'newTitle', ''))) < 3
       OR length(trim(COALESCE(v_item->>'newContent', ''))) < 1000 THEN
      RAISE EXCEPTION 'SERIAL_EDITORIAL_REVISION_INVALID_AT_CHAPTER_%', v_chapter.chapter_number;
    END IF;

    SELECT COALESCE(max(revision_number), 0) + 1 INTO v_revision_number
    FROM public.serial_chapter_revisions WHERE chapter_id = v_chapter.id;

    INSERT INTO public.serial_chapter_revisions (
      serial_novel_id, novel_id, chapter_id, chapter_number, revision_number,
      old_title, old_content, new_title, new_content, reason, direction, review,
      model, prompt_version, usage, cost_usd
    ) VALUES (
      p_serial_novel_id, v_serial.novel_id, v_chapter.id, v_chapter.chapter_number,
      v_revision_number, v_chapter.title, v_chapter.content,
      v_item->>'newTitle', v_item->>'newContent', p_reason,
      COALESCE(v_item->'direction', '[]'::jsonb), COALESCE(v_item->'review', '{}'::jsonb),
      p_model, p_prompt_version, COALESCE(v_item->'usage', '[]'::jsonb),
      COALESCE((v_item->>'costUsd')::numeric, 0)
    );

    UPDATE public.chapters SET
      title = v_item->>'newTitle', content = v_item->>'newContent', updated_at = now()
    WHERE id = v_chapter.id;
    v_applied := v_applied + 1;
  END LOOP;

  UPDATE public.serial_novels SET prompt_version = p_prompt_version, updated_at = now()
  WHERE id = p_serial_novel_id;

  RETURN jsonb_build_object('applied', v_applied, 'serialNovelId', p_serial_novel_id);
END $$;

REVOKE ALL ON FUNCTION public.apply_serial_editorial_revisions(uuid,jsonb,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_serial_editorial_revisions(uuid,jsonb,text,text,text)
  TO service_role;

COMMIT;
