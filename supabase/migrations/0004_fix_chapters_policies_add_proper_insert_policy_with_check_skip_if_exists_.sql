-- Add policy for admin to insert chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_admin_insert'
  ) THEN
    CREATE POLICY "chapters_admin_insert" ON chapters 
    FOR INSERT TO authenticated 
    WITH CHECK (get_user_role() = 'admin');
  END IF;
END $$;

-- Add policy for project owners to insert chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_project_owner_insert'
  ) THEN
    CREATE POLICY "chapters_project_owner_insert" ON chapters 
    FOR INSERT TO authenticated 
    WITH CHECK (
      novel_id IN (
        SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Add policy for admin to update chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_admin_update'
  ) THEN
    CREATE POLICY "chapters_admin_update" ON chapters 
    FOR UPDATE TO authenticated 
    USING (get_user_role() = 'admin');
  END IF;
END $$;

-- Add policy for project owners to update chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_project_owner_update'
  ) THEN
    CREATE POLICY "chapters_project_owner_update" ON chapters 
    FOR UPDATE TO authenticated 
    USING (
      novel_id IN (
        SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Add policy for admin to delete chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_admin_delete'
  ) THEN
    CREATE POLICY "chapters_admin_delete" ON chapters 
    FOR DELETE TO authenticated 
    USING (get_user_role() = 'admin');
  END IF;
END $$;

-- Add policy for project owners to delete chapters (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'chapters_project_owner_delete'
  ) THEN
    CREATE POLICY "chapters_project_owner_delete" ON chapters 
    FOR DELETE TO authenticated 
    USING (
      novel_id IN (
        SELECT novel_id FROM ai_story_projects WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;