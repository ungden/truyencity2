-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0136: Ranked novels function for mobile rankings screen
--
-- Returns novels sorted by view_count, bookmark_count, etc.
-- Replaces the broken client-side fallback to updated_at ordering.
-- ═══════════════════════════════════════════════════════════════════════════

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
    CASE
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
