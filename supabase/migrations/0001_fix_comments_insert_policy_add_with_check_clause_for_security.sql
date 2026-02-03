-- Drop existing incomplete policy
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;

-- Recreate with proper WITH CHECK
CREATE POLICY "comments_insert_policy" ON comments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);