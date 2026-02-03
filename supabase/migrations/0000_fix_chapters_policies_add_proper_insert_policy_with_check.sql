-- Drop the incomplete policy
DROP POLICY IF EXISTS "chapters_insert_by_project_owner" ON chapters;

-- Add policy for admin to insert chapters
CREATE POLICY "chapters_admin_insert" ON chapters 
FOR INSERT TO authenticated 
WITH CHECK (get_user_role() = 'admin');

-- Add policy for project owners to insert chapters
CREATE POLICY "chapters_project_owner_insert" ON chapters 
FOR INSERT TO authenticated 
WITH CHECK (
  novel_id IN (
    SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
  )
);

-- Add policy for admin to update chapters
CREATE POLICY "chapters_admin_update" ON chapters 
FOR UPDATE TO authenticated 
USING (get_user_role() = 'admin');

-- Add policy for project owners to update chapters
CREATE POLICY "chapters_project_owner_update" ON chapters 
FOR UPDATE TO authenticated 
USING (
  novel_id IN (
    SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
  )
);

-- Add policy for admin to delete chapters
CREATE POLICY "chapters_admin_delete" ON chapters 
FOR DELETE TO authenticated 
USING (get_user_role() = 'admin');

-- Add policy for project owners to delete chapters
CREATE POLICY "chapters_project_owner_delete" ON chapters 
FOR DELETE TO authenticated 
USING (
  novel_id IN (
    SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
  )
);