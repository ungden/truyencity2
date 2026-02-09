-- ============================================================
-- Migration 0030: Create ratings table + novel stats functions
-- ============================================================

-- 1. RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, novel_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ratings_novel_id ON ratings(novel_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_novel_score ON ratings(novel_id, score);

-- RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings
CREATE POLICY "ratings_select_all" ON ratings
  FOR SELECT USING (true);

-- Authenticated users can insert their own ratings
CREATE POLICY "ratings_insert_own" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "ratings_update_own" ON ratings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "ratings_delete_own" ON ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_ratings_updated_at();


-- 2. NOVEL STATS FUNCTION
-- Returns aggregated stats for a single novel
-- ============================================================
CREATE OR REPLACE FUNCTION get_novel_stats(p_novel_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'view_count', COALESCE(cr.cnt, 0),
    'bookmark_count', COALESCE(bk.cnt, 0),
    'rating_avg', COALESCE(rt.avg_score, 0),
    'rating_count', COALESCE(rt.cnt, 0),
    'comment_count', COALESCE(cm.cnt, 0),
    'chapter_count', COALESCE(ch.cnt, 0)
  ) INTO result
  FROM (SELECT 1) dummy
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM chapter_reads WHERE novel_id = p_novel_id
  ) cr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM bookmarks WHERE novel_id = p_novel_id
  ) bk ON true
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(score)::NUMERIC, 2)::FLOAT as avg_score, COUNT(*)::INT as cnt FROM ratings WHERE novel_id = p_novel_id
  ) rt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM comments WHERE novel_id = p_novel_id AND status = 'approved'
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM chapters WHERE novel_id = p_novel_id
  ) ch ON true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;


-- 3. BATCH NOVEL STATS for listing pages
-- Returns stats for multiple novels at once (avoids N+1)
-- ============================================================
CREATE OR REPLACE FUNCTION get_novels_with_stats(p_novel_ids UUID[])
RETURNS TABLE (
  novel_id UUID,
  view_count INT,
  bookmark_count INT,
  rating_avg FLOAT,
  rating_count INT,
  comment_count INT,
  chapter_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id as novel_id,
    COALESCE(cr.cnt, 0)::INT as view_count,
    COALESCE(bk.cnt, 0)::INT as bookmark_count,
    COALESCE(ROUND(rt.avg_score::NUMERIC, 2)::FLOAT, 0) as rating_avg,
    COALESCE(rt.cnt, 0)::INT as rating_count,
    COALESCE(cm.cnt, 0)::INT as comment_count,
    COALESCE(ch.cnt, 0)::INT as chapter_count
  FROM unnest(p_novel_ids) AS n(id)
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM chapter_reads WHERE chapter_reads.novel_id = n.id
  ) cr ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM bookmarks WHERE bookmarks.novel_id = n.id
  ) bk ON true
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(score)::NUMERIC, 2) as avg_score, COUNT(*)::INT as cnt FROM ratings WHERE ratings.novel_id = n.id
  ) rt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM comments WHERE comments.novel_id = n.id AND comments.status = 'approved'
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT as cnt FROM chapters WHERE chapters.novel_id = n.id
  ) ch ON true;
END;
$$ LANGUAGE plpgsql STABLE;


-- 4. TOP NOVELS BY VIEWS (for ranking page - hot tab)
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_novels_by_views(p_days INT DEFAULT 7, p_limit INT DEFAULT 50)
RETURNS TABLE (
  novel_id UUID,
  view_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT cr.novel_id, COUNT(*) as view_count
  FROM chapter_reads cr
  WHERE cr.read_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY cr.novel_id
  ORDER BY view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;


-- 5. TOP NOVELS BY RATING
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_novels_by_rating(p_min_ratings INT DEFAULT 3, p_limit INT DEFAULT 50)
RETURNS TABLE (
  novel_id UUID,
  rating_avg FLOAT,
  rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.novel_id, ROUND(AVG(r.score)::NUMERIC, 2)::FLOAT as rating_avg, COUNT(*) as rating_count
  FROM ratings r
  GROUP BY r.novel_id
  HAVING COUNT(*) >= p_min_ratings
  ORDER BY rating_avg DESC, rating_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;


-- 6. TOP NOVELS BY BOOKMARKS
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_novels_by_bookmarks(p_limit INT DEFAULT 50)
RETURNS TABLE (
  novel_id UUID,
  bookmark_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.novel_id, COUNT(*) as bookmark_count
  FROM bookmarks b
  GROUP BY b.novel_id
  ORDER BY bookmark_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
