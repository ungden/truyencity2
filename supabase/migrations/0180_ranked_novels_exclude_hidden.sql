-- Track 2/4 follow-up (2026-05-29): exclude hidden novels from the rankings RPC.
--
-- get_ranked_novels (migration 0136) powers the mobile Rankings tab. It ranked
-- ALL novels regardless of novels.hidden, so the 31 low-coherence novels hidden
-- by Track 2b (200-396 chapters each → high chapter/view counts) would still
-- surface at the top of "Hot"/"Chapters" rankings. The web ranking page already
-- filters hidden at its base query; this brings the RPC to parity.
--
-- Pure CREATE OR REPLACE — identical body to 0136 plus `AND n.hidden = false`.
-- Idempotent; no schema change.

CREATE OR REPLACE FUNCTION get_ranked_novels(
  p_sort_by TEXT DEFAULT 'views', -- 'views', 'bookmarks', 'rating', 'latest', 'completed'
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  author TEXT,
  cover_url TEXT,
  genres TEXT[],
  status TEXT,
  ai_author_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  chapter_count INTEGER,
  view_count BIGINT,
  bookmark_count BIGINT,
  rating_avg FLOAT,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.author,
    n.cover_url,
    n.genres,
    n.status,
    n.ai_author_id,
    n.created_at,
    n.updated_at,
    COALESCE(n.chapter_count, 0)::INTEGER as chapter_count,
    COALESCE(cr.cnt, 0) as view_count,
    COALESCE(bk.cnt, 0) as bookmark_count,
    COALESCE(ROUND(rt.avg_score::NUMERIC, 2)::FLOAT, 0) as rating_avg,
    COALESCE(rt.cnt, 0) as rating_count
  FROM novels n
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as cnt FROM chapter_reads WHERE chapter_reads.novel_id = n.id
  ) cr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as cnt FROM bookmarks WHERE bookmarks.novel_id = n.id
  ) bk ON true
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(score)::NUMERIC, 2) as avg_score, COUNT(*) as cnt
    FROM ratings WHERE ratings.novel_id = n.id
  ) rt ON true
  WHERE
    n.hidden = false
    AND CASE
      WHEN p_sort_by = 'completed' THEN n.status = 'completed'
      ELSE TRUE
    END
  ORDER BY
    CASE p_sort_by
      WHEN 'views' THEN cr.cnt
      WHEN 'bookmarks' THEN bk.cnt
      WHEN 'rating' THEN rt.avg_score
      ELSE NULL
    END DESC NULLS LAST,
    CASE p_sort_by
      WHEN 'latest' THEN EXTRACT(EPOCH FROM n.created_at)
      WHEN 'completed' THEN EXTRACT(EPOCH FROM n.updated_at)
      ELSE NULL
    END DESC NULLS LAST,
    n.updated_at DESC -- secondary sort
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
