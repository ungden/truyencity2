-- First, we need to check if there's existing data and convert it
-- Drop foreign key constraints first
ALTER TABLE reading_progress 
DROP CONSTRAINT IF EXISTS reading_progress_novel_id_fkey;

ALTER TABLE reading_progress 
DROP CONSTRAINT IF EXISTS reading_progress_chapter_id_fkey;

-- Change column type from text to uuid
ALTER TABLE reading_progress 
ALTER COLUMN novel_id TYPE uuid USING novel_id::uuid;

ALTER TABLE reading_progress 
ALTER COLUMN chapter_id TYPE uuid USING chapter_id::uuid;

-- Now add foreign keys with CASCADE
ALTER TABLE reading_progress 
ADD CONSTRAINT reading_progress_novel_id_fkey 
FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE;

ALTER TABLE reading_progress 
ADD CONSTRAINT reading_progress_chapter_id_fkey 
FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL;