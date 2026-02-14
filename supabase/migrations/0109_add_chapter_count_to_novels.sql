-- Add denormalized chapter_count column to novels table
-- This avoids expensive JOIN/subquery for counting chapters on every list query

-- Step 1: Add column with default 0
ALTER TABLE novels ADD COLUMN IF NOT EXISTS chapter_count integer NOT NULL DEFAULT 0;

-- Step 2: Populate from actual data
UPDATE novels SET chapter_count = (
  SELECT count(*)::integer FROM chapters WHERE chapters.novel_id = novels.id
);

-- Step 3: Create trigger function to keep it in sync
CREATE OR REPLACE FUNCTION update_novel_chapter_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE novels SET chapter_count = chapter_count + 1 WHERE id = NEW.novel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE novels SET chapter_count = GREATEST(chapter_count - 1, 0) WHERE id = OLD.novel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on chapters table
DROP TRIGGER IF EXISTS trg_update_novel_chapter_count ON chapters;
CREATE TRIGGER trg_update_novel_chapter_count
  AFTER INSERT OR DELETE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_novel_chapter_count();

-- Step 5: Index for sorting by chapter_count
CREATE INDEX IF NOT EXISTS idx_novels_chapter_count ON novels(chapter_count DESC);
