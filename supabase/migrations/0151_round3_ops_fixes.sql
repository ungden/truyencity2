-- Migration 0151: Round 3 Ops Fixes
--
-- 1. chapters.quality_score — store Critic overallScore for reader quality badge
-- 2. reading_progress.last_sync_platform — bidirectional web<->mobile sync hint
-- 3. Cost analytics view — token cost breakdown per task/project/day
-- 4. RAG conservative archival function — purge chunks > 800 chapters old

-- ── 1. Chapter quality score ──

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC;

COMMENT ON COLUMN public.chapters.quality_score IS
  'Critic overallScore (1-10) — populated post-write. NULL for legacy chapters or failed Critic runs.';

CREATE INDEX IF NOT EXISTS idx_chapters_quality_score
  ON public.chapters (novel_id, quality_score)
  WHERE quality_score IS NOT NULL;

-- ── 2. Reading progress last_sync_platform ──

ALTER TABLE public.reading_progress
  ADD COLUMN IF NOT EXISTS last_sync_platform TEXT;

COMMENT ON COLUMN public.reading_progress.last_sync_platform IS
  'web | mobile | api — which platform last updated this row. Used for bidirectional cross-platform sync.';

-- ── 3. Cost analytics view ──

CREATE OR REPLACE VIEW public.cost_tracking_daily AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS vn_date,
  task,
  model,
  COUNT(*) AS calls,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  ROUND(SUM(cost)::numeric, 4) AS total_cost_usd,
  ROUND((SUM(cost) / NULLIF(COUNT(*), 0))::numeric, 6) AS avg_cost_per_call_usd,
  ROUND((SUM(input_tokens) / NULLIF(COUNT(*), 0))::numeric, 0) AS avg_input_tokens,
  ROUND((SUM(output_tokens) / NULLIF(COUNT(*), 0))::numeric, 0) AS avg_output_tokens
FROM public.cost_tracking
GROUP BY 1, 2, 3
ORDER BY 1 DESC, total_cost_usd DESC;

COMMENT ON VIEW public.cost_tracking_daily IS
  'Daily cost breakdown per task+model. Use to identify expensive tasks (architect/writer/critic) and trends.';

-- Per-project cost view (top consumers)
CREATE OR REPLACE VIEW public.cost_tracking_per_project AS
SELECT
  ct.project_id,
  n.title AS novel_title,
  asp.genre,
  asp.current_chapter,
  COUNT(*) AS total_calls,
  ROUND(SUM(ct.cost)::numeric, 4) AS total_cost_usd,
  ROUND((SUM(ct.cost) / NULLIF(asp.current_chapter, 0))::numeric, 4) AS cost_per_chapter_usd,
  MIN(ct.created_at) AS first_call,
  MAX(ct.created_at) AS last_call
FROM public.cost_tracking ct
LEFT JOIN public.ai_story_projects asp ON asp.id = ct.project_id
LEFT JOIN public.novels n ON n.id = asp.novel_id
GROUP BY ct.project_id, n.title, asp.genre, asp.current_chapter
ORDER BY total_cost_usd DESC;

COMMENT ON VIEW public.cost_tracking_per_project IS
  'Cost per project sorted by total spend. Identify expensive novels (high chapter count or high retry rate).';

-- ── 4. RAG conservative archival ──
-- Archive chunks that are > 800 chapters older than the project's current chapter.
-- Ultra-old chunks rarely retrieved by RAG (semantic similarity decays); story bible
-- captures their lore. Hard-delete to reclaim vector index space.

CREATE OR REPLACE FUNCTION public.archive_old_rag_chunks(
  p_chapter_buffer INT DEFAULT 800,
  p_dry_run BOOLEAN DEFAULT false
) RETURNS TABLE(project_id UUID, archived_count BIGINT) AS $$
DECLARE
  rec RECORD;
  archived BIGINT;
BEGIN
  -- For each project with current_chapter > buffer, delete chunks older than (current - buffer)
  FOR rec IN
    SELECT asp.id, asp.current_chapter
    FROM public.ai_story_projects asp
    WHERE asp.current_chapter > p_chapter_buffer
  LOOP
    IF p_dry_run THEN
      SELECT COUNT(*) INTO archived
      FROM public.story_memory_chunks
      WHERE project_id = rec.id AND chapter_number < (rec.current_chapter - p_chapter_buffer);
    ELSE
      DELETE FROM public.story_memory_chunks
      WHERE project_id = rec.id AND chapter_number < (rec.current_chapter - p_chapter_buffer);
      GET DIAGNOSTICS archived = ROW_COUNT;
    END IF;

    IF archived > 0 THEN
      RETURN QUERY SELECT rec.id, archived;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.archive_old_rag_chunks IS
  'Conservative RAG archival: deletes story_memory_chunks older than current_chapter - 800. Story bible covers lore for these chapters. Run weekly via pg_cron.';

-- ── 5. Backfill novels.genres with ai_story_projects.sub_genres ──
-- Existing reset projects have sub_genres on ai_story_projects but novels.genres
-- only has primary genre. Backfill so search filter finds sub-genre matches.

UPDATE public.novels n
SET genres = (
  SELECT array_agg(DISTINCT g)
  FROM unnest(n.genres || asp.sub_genres) AS g
  WHERE g IS NOT NULL AND g != ''
)
FROM public.ai_story_projects asp
WHERE asp.novel_id = n.id
  AND asp.sub_genres IS NOT NULL
  AND array_length(asp.sub_genres, 1) > 0;

-- ── 6. RAG archival schedule ──
-- Schedule weekly archival via pg_cron (if extension installed). Idempotent guard.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing schedule (idempotent)
    PERFORM cron.unschedule('rag-archive-weekly') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'rag-archive-weekly'
    );
    -- Schedule: every Sunday 03:00 UTC = 10:00 VN (low traffic)
    PERFORM cron.schedule('rag-archive-weekly', '0 3 * * 0', $cron$
      SELECT public.archive_old_rag_chunks(800, false);
    $cron$);
  END IF;
END $$;
