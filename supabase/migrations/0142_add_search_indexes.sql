-- GIN index for genres array filtering (search, genre pages)
CREATE INDEX IF NOT EXISTS idx_novels_genres_gin ON novels USING GIN(genres);

-- Trigram indexes for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_novels_title_trgm ON novels USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_novels_author_trgm ON novels USING GIN(author gin_trgm_ops);
