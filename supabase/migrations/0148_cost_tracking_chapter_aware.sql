-- Migration 0148: per-chapter cost tracking + novel-level rollup RPCs
--
-- Adds chapter_number to cost_tracking so each AI call can be attributed to
-- the chapter that triggered it. Existing rows stay NULL (legacy).
-- Adds two RPCs for the admin UI:
--   - get_chapter_costs(project_id) → cost per chapter for a project
--   - get_novel_costs() → total cost per novel (all-time aggregate)

-- ── 1. Add chapter_number column ───────────────────────────────────────────
ALTER TABLE cost_tracking
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_cost_tracking_chapter
  ON cost_tracking(project_id, chapter_number)
  WHERE chapter_number IS NOT NULL;

COMMENT ON COLUMN cost_tracking.chapter_number IS
  'Chapter being written when this call was made. NULL for outline/bible/synopsis tasks not tied to one chapter, or legacy rows from before 2026-04-25.';

-- ── 2. Per-chapter cost RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_chapter_costs(p_project_id UUID)
RETURNS TABLE (
  chapter_number INTEGER,
  total_cost NUMERIC,
  input_tokens BIGINT,
  output_tokens BIGINT,
  call_count BIGINT,
  models JSONB,
  tasks JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ct.chapter_number,
    SUM(ct.cost)::NUMERIC AS total_cost,
    SUM(ct.input_tokens)::BIGINT AS input_tokens,
    SUM(ct.output_tokens)::BIGINT AS output_tokens,
    COUNT(*)::BIGINT AS call_count,
    jsonb_object_agg(ct.model, model_cost) AS models,
    jsonb_object_agg(ct.task, task_cost) AS tasks
  FROM cost_tracking ct
  CROSS JOIN LATERAL (
    SELECT SUM(c2.cost) AS model_cost
    FROM cost_tracking c2
    WHERE c2.project_id = ct.project_id
      AND c2.chapter_number = ct.chapter_number
      AND c2.model = ct.model
  ) model_agg
  CROSS JOIN LATERAL (
    SELECT SUM(c3.cost) AS task_cost
    FROM cost_tracking c3
    WHERE c3.project_id = ct.project_id
      AND c3.chapter_number = ct.chapter_number
      AND c3.task = ct.task
  ) task_agg
  WHERE ct.project_id = p_project_id
    AND ct.chapter_number IS NOT NULL
  GROUP BY ct.chapter_number
  ORDER BY ct.chapter_number;
$$;

GRANT EXECUTE ON FUNCTION get_chapter_costs(UUID) TO authenticated, service_role;

-- ── 3. Per-novel cost rollup RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_novel_costs(p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS TABLE (
  project_id UUID,
  novel_id UUID,
  novel_title TEXT,
  current_chapter INTEGER,
  total_cost NUMERIC,
  input_tokens BIGINT,
  output_tokens BIGINT,
  call_count BIGINT,
  cost_per_chapter NUMERIC,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS project_id,
    p.novel_id,
    n.title::TEXT AS novel_title,
    p.current_chapter,
    COALESCE(SUM(ct.cost), 0)::NUMERIC AS total_cost,
    COALESCE(SUM(ct.input_tokens), 0)::BIGINT AS input_tokens,
    COALESCE(SUM(ct.output_tokens), 0)::BIGINT AS output_tokens,
    COUNT(ct.id)::BIGINT AS call_count,
    CASE
      WHEN p.current_chapter > 0 THEN (COALESCE(SUM(ct.cost), 0) / p.current_chapter)::NUMERIC
      ELSE 0::NUMERIC
    END AS cost_per_chapter,
    p.status::TEXT
  FROM ai_story_projects p
  JOIN novels n ON n.id = p.novel_id
  LEFT JOIN cost_tracking ct ON ct.project_id = p.id
  GROUP BY p.id, p.novel_id, n.title, p.current_chapter, p.status
  ORDER BY total_cost DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_novel_costs(INT, INT) TO authenticated, service_role;

-- ── 4. Single novel cost detail (with task breakdown) ──────────────────────
CREATE OR REPLACE FUNCTION get_novel_cost_detail(p_project_id UUID)
RETURNS TABLE (
  task TEXT,
  model TEXT,
  call_count BIGINT,
  input_tokens BIGINT,
  output_tokens BIGINT,
  total_cost NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ct.task::TEXT,
    ct.model::TEXT,
    COUNT(*)::BIGINT AS call_count,
    SUM(ct.input_tokens)::BIGINT AS input_tokens,
    SUM(ct.output_tokens)::BIGINT AS output_tokens,
    SUM(ct.cost)::NUMERIC AS total_cost
  FROM cost_tracking ct
  WHERE ct.project_id = p_project_id
  GROUP BY ct.task, ct.model
  ORDER BY total_cost DESC;
$$;

GRANT EXECUTE ON FUNCTION get_novel_cost_detail(UUID) TO authenticated, service_role;
