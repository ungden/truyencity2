-- Quality Overhaul 2.3/2.4/2.6 — long-range memory enrichment.
--
-- 2.3 RAG lore anchors: temporal decay buries foundational lore (origin
--     story, MC secret, golden finger rules) by ch.500 — chunks from ch.1-5
--     score near zero against recent-history chunks. Anchor chunks get 2
--     reserved retrieval slots with NO temporal decay.
-- 2.4 Plot-thread callbacks: dedup was silently merging a deliberate ch.800
--     callback into a resolved ch.200 thread. Revived threads now keep their
--     lineage (revived_from / revived_at_chapter).
-- 2.6 Volume summary deterministic facts: LLM prose summaries accumulate
--     errors over 40+ volumes; `facts` holds state-table-derived truth
--     (deaths, realm-ups, threads resolved) that cannot drift.

-- ── 2.3 anchors ─────────────────────────────────────────────────────────────

ALTER TABLE public.story_memory_chunks
  ADD COLUMN IF NOT EXISTS is_anchor boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_story_memory_chunks_anchor
  ON public.story_memory_chunks (project_id, chapter_number)
  WHERE is_anchor;

-- Anchor-only vector match: same shape as match_story_chunks but restricted
-- to is_anchor=true and NO threshold floor (anchors must always be reachable).
CREATE OR REPLACE FUNCTION match_anchor_chunks(
  query_embedding vector(768),
  match_project_id UUID,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  chapter_number INT,
  chunk_type TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    smc.id,
    smc.project_id,
    smc.chapter_number,
    smc.chunk_type,
    smc.content,
    smc.metadata,
    1 - (smc.embedding <=> query_embedding) AS similarity
  FROM story_memory_chunks smc
  WHERE smc.project_id = match_project_id
    AND smc.is_anchor
    AND smc.embedding IS NOT NULL
  ORDER BY smc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── 2.4 plot-thread callback lineage ────────────────────────────────────────

ALTER TABLE public.plot_threads
  ADD COLUMN IF NOT EXISTS revived_from uuid,
  ADD COLUMN IF NOT EXISTS revived_at_chapter int;

COMMENT ON COLUMN public.plot_threads.revived_at_chapter IS
  'Chapter at which a resolved/legacy thread was reactivated as an intentional callback.';

-- ── 2.5 voice drift escalation ──────────────────────────────────────────────

ALTER TABLE public.voice_fingerprints
  ADD COLUMN IF NOT EXISTS consecutive_drift_count int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.voice_fingerprints.consecutive_drift_count IS
  'Consecutive fingerprint refreshes with multi-dimension drift; ≥2 switches getVoiceContext into corrective mode.';

-- ── 2.6 volume summary deterministic facts ──────────────────────────────────

ALTER TABLE public.volume_summaries
  ADD COLUMN IF NOT EXISTS facts jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volume_summaries.facts IS
  'Deterministic facts computed from state tables for the volume range: deaths, realm_ups, threads_resolved, key_items. Cannot drift, unlike LLM prose.';
