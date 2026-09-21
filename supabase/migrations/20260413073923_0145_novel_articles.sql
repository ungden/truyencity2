-- Novel promotional articles for marketing content
CREATE TABLE IF NOT EXISTS novel_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  article_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  platform_hint TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_novel_articles_novel_id ON novel_articles(novel_id);

ALTER TABLE novel_articles ENABLE ROW LEVEL SECURITY;;
