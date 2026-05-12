-- Enhanced per-novel cost RPC that also returns engagement metrics
-- (reads / bookmarks / rating) so the admin can judge whether a novel's
-- AI cost is paying off via reader engagement.
--
-- Replaces the use of `get_novel_costs` in /api/admin/cost-tracking/novels.
-- Original `get_novel_costs` kept for backward compatibility with any
-- callers — search results say only one caller, but safer to keep.

CREATE OR REPLACE FUNCTION public.get_novel_costs_with_engagement(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  project_id uuid,
  novel_id uuid,
  novel_title text,
  current_chapter integer,
  total_cost numeric,
  input_tokens bigint,
  output_tokens bigint,
  call_count bigint,
  cost_per_chapter numeric,
  status text,
  -- Engagement
  total_reads bigint,
  reads_last_7d bigint,
  bookmark_count bigint,
  rating_avg numeric,
  rating_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
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
    p.status::TEXT,
    -- Engagement subqueries (one per novel)
    COALESCE((SELECT COUNT(*) FROM chapter_reads cr WHERE cr.novel_id = n.id), 0)::BIGINT AS total_reads,
    COALESCE((SELECT COUNT(*) FROM chapter_reads cr WHERE cr.novel_id = n.id AND cr.read_at > now() - INTERVAL '7 days'), 0)::BIGINT AS reads_last_7d,
    COALESCE((SELECT COUNT(*) FROM bookmarks b WHERE b.novel_id = n.id), 0)::BIGINT AS bookmark_count,
    COALESCE((SELECT AVG(r.score)::NUMERIC(3, 2) FROM ratings r WHERE r.novel_id = n.id), 0) AS rating_avg,
    COALESCE((SELECT COUNT(*) FROM ratings r WHERE r.novel_id = n.id), 0)::BIGINT AS rating_count
  FROM ai_story_projects p
  JOIN novels n ON n.id = p.novel_id
  LEFT JOIN cost_tracking ct ON ct.project_id = p.id
  GROUP BY p.id, p.novel_id, n.id, n.title, p.current_chapter, p.status
  ORDER BY total_cost DESC
  LIMIT p_limit OFFSET p_offset;
$function$;
