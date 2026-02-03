-- Index for reading_progress queries
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_novel 
ON reading_progress(user_id, novel_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read 
ON reading_progress(last_read DESC);

-- Index for reading_sessions queries
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_novel 
ON reading_sessions(user_id, novel_id);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_started_at 
ON reading_sessions(started_at DESC);

-- Index for chapter_reads queries
CREATE INDEX IF NOT EXISTS idx_chapter_reads_user_novel 
ON chapter_reads(user_id, novel_id);

CREATE INDEX IF NOT EXISTS idx_chapter_reads_read_at 
ON chapter_reads(read_at DESC);

-- Index for comments queries
CREATE INDEX IF NOT EXISTS idx_comments_novel_status 
ON comments(novel_id, status);

CREATE INDEX IF NOT EXISTS idx_comments_chapter_status 
ON comments(chapter_id, status);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id 
ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Index for ai_writing_jobs queries
CREATE INDEX IF NOT EXISTS idx_ai_writing_jobs_project_status 
ON ai_writing_jobs(project_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_writing_jobs_user_created 
ON ai_writing_jobs(user_id, created_at DESC);

-- Index for genre_topics queries
CREATE INDEX IF NOT EXISTS idx_genre_topics_genre_status 
ON genre_topics(genre_id, status);

CREATE INDEX IF NOT EXISTS idx_genre_topics_display_order 
ON genre_topics(display_order, popularity_score DESC);

-- Index for novels queries
CREATE INDEX IF NOT EXISTS idx_novels_updated_at 
ON novels(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_novels_genres 
ON novels USING GIN(genres);

-- Index for chapters queries
CREATE INDEX IF NOT EXISTS idx_chapters_novel_number 
ON chapters(novel_id, chapter_number);