-- Phase S (2026-05-15): extend setup_stage CHECK constraint to allow new
-- canon_spawn + foundation_review stages introduced by setup pipeline v3.
ALTER TABLE ai_story_projects DROP CONSTRAINT IF EXISTS ai_story_projects_setup_stage_check;
ALTER TABLE ai_story_projects
  ADD CONSTRAINT ai_story_projects_setup_stage_check
  CHECK (setup_stage = ANY (ARRAY[
    'idea'::text,
    'world'::text,
    'character'::text,
    'description'::text,
    'master_outline'::text,
    'story_outline'::text,
    'canon_spawn'::text,
    'arc_plan'::text,
    'foundation_review'::text,
    'ready_to_write'::text,
    'writing'::text,
    'completed'::text
  ]));;
