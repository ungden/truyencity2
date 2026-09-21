ALTER TABLE ai_story_projects DROP CONSTRAINT IF EXISTS chk_setup_stage;
ALTER TABLE ai_story_projects
  ADD CONSTRAINT chk_setup_stage
  CHECK (setup_stage = ANY (ARRAY[
    'idea'::text, 'world'::text, 'character'::text, 'description'::text,
    'master_outline'::text, 'story_outline'::text,
    'canon_spawn'::text, 'arc_plan'::text, 'foundation_review'::text,
    'ready_to_write'::text, 'writing'::text, 'completed'::text
  ]));;
