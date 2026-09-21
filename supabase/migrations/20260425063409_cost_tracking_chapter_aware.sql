-- Add chapter_number to cost_tracking and per-chapter / per-novel rollup RPCs

ALTER TABLE cost_tracking
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_cost_tracking_chapter
  ON cost_tracking(project_id, chapter_number)
  WHERE chapter_number IS NOT NULL;

COMMENT ON COLUMN cost_tracking.chapter_number IS
  'Chapter being written when this call was made. NULL for outline/bible/synopsis tasks not tied to one chapter, or legacy rows from before 2026-04-25.';

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
  WITH per_chapter AS (
    SELECT
      ct.chapter_number,
      SUM(ct.cost)::NUMERIC AS total_cost,
      SUM(ct.input_tokens)::BIGINT AS input_tokens,
      SUM(ct.output_tokens)::BIGINT AS output_tokens,
      COUNT(*)::BIGINT AS call_count
    FROM cost_tracking ct
    WHERE ct.project_id = p_project_id
      AND ct.chapter_number IS NOT NULL
    GROUP BY ct.chapter_number
  ),
  models_per_chapter AS (
    SELECT
      ct.chapter_number,
      jsonb_object_agg(ct.model, m_cost) AS models
    FROM (
      SELECT chapter_number, model, SUM(cost) AS m_cost
      FROM cost_tracking
      WHERE project_id = p_project_id
        AND chapter_number IS NOT NULL
      GROUP BY chapter_number, model
    ) ct
    GROUP BY ct.chapter_number
  ),
  tasks_per_chapter AS (
    SELECT
      ct.chapter_number,
      jsonb_object_agg(ct.task, t_cost) AS tasks
    FROM (
      SELECT chapter_number, task, SUM(cost) AS t_cost
      FROM cost_tracking
      WHERE project_id = p_project_id
        AND chapter_number IS NOT NULL
      GROUP BY chapter_number, task
    ) ct
    GROUP BY ct.chapter_number
  )
  SELECT
    pc.chapter_number,
    pc.total_cost,
    pc.input_tokens,
    pc.output_tokens,
    pc.call_count,
    mpc.models,
    tpc.tasks
  FROM per_chapter pc
  LEFT JOIN models_per_chapter mpc USING (chapter_number)
  LEFT JOIN tasks_per_chapter tpc USING (chapter_number)
  ORDER BY pc.chapter_number;
$$;

GRANT EXECUTE ON FUNCTION get_chapter_costs(UUID) TO authenticated, service_role;

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

GRANT EXECUTE ON FUNCTION get_novel_cost_detail(UUID) TO authenticated, service_role;;
