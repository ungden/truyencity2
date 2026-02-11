-- Migration 0032: Add total_chapters column to novels table
-- Purpose: Avoid slow chapters(count) aggregate query that causes timeout
-- Root cause: chapters(count) with offset/limit causes 500 timeout on browse page

-- Step 1: Add total_chapters column
ALTER TABLE novels 
ADD COLUMN IF NOT EXISTS total_chapters INTEGER NOT NULL DEFAULT 0;

-- Step 2: Populate with current counts (one-time backfill)
UPDATE novels n
SET total_chapters = (
  SELECT COUNT(*) 
  FROM chapters c 
  WHERE c.novel_id = n.id
);

-- Step 3: Create function to update total_chapters
CREATE OR REPLACE FUNCTION update_novel_total_chapters()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE novels 
    SET total_chapters = total_chapters + 1,
        updated_at = NOW()
    WHERE id = NEW.novel_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE novels 
    SET total_chapters = GREATEST(total_chapters - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.novel_id;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle novel_id change (rare but possible)
    IF NEW.novel_id != OLD.novel_id THEN
      UPDATE novels 
      SET total_chapters = GREATEST(total_chapters - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.novel_id;
      
      UPDATE novels 
      SET total_chapters = total_chapters + 1,
          updated_at = NOW()
      WHERE id = NEW.novel_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS trigger_update_novel_total_chapters ON chapters;

CREATE TRIGGER trigger_update_novel_total_chapters
AFTER INSERT OR UPDATE OR DELETE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_novel_total_chapters();

-- Step 5: Add index on total_chapters for sorting
CREATE INDEX IF NOT EXISTS idx_novels_total_chapters 
ON novels(total_chapters DESC);

-- Step 6: Add comment
COMMENT ON COLUMN novels.total_chapters IS 'Denormalized chapter count - auto-updated by trigger. Avoids slow chapters(count) aggregate.';
