-- The original table was created by a legacy short-version migration that was
-- never recorded in the linked project's timestamp history. Keep this
-- canonical migration self-contained so a fresh database can replay it.
CREATE TABLE IF NOT EXISTS public.character_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  character_name text NOT NULL,
  knowledge_type text NOT NULL CHECK (knowledge_type IN (
    'secret', 'relationship', 'event', 'location', 'ability', 'plan', 'identity'
  )),
  knowledge text NOT NULL,
  source_character text,
  is_secret boolean NOT NULL DEFAULT false,
  revealed_to text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_knowledge_project
  ON public.character_knowledge(project_id, character_name, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_character_knowledge_secrets
  ON public.character_knowledge(project_id, is_secret) WHERE is_secret = true;

ALTER TABLE public.character_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS character_knowledge_service_all ON public.character_knowledge;
CREATE POLICY character_knowledge_service_all ON public.character_knowledge
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.character_knowledge FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.character_knowledge TO service_role;

ALTER TABLE character_knowledge
  ADD COLUMN IF NOT EXISTS causal_chain TEXT[] DEFAULT '{}';

COMMENT ON COLUMN character_knowledge.causal_chain IS
  'Phase N.1 (2026-05-12): DOME-inspired causal chain tracking WHY char knows fact. Entries: ["event:ch.50_uchiha_reveal", "char:Itachi_told_MC", "scene:cave_meeting"]. Used by context-assembler to surface relevant past events when current chapter references this knowledge.';
