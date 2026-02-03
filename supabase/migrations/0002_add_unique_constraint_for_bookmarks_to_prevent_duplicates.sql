-- Add unique constraint to prevent duplicate bookmarks
ALTER TABLE bookmarks 
DROP CONSTRAINT IF EXISTS bookmarks_user_novel_unique;

ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_user_novel_unique 
UNIQUE (user_id, novel_id);