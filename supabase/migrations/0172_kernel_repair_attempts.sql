-- Migration 0172: Track kernel-repair reset attempts to prevent infinite loops.
--
-- Background: When write-chapters cron pre-flight detects a project at
-- setup_stage in (ready_to_write, writing) with current_chapter=0 and missing
-- setupKernel, it resets the project back to setup_stage='idea' (so the setup
-- state machine re-runs IDEA stage to generate a fresh kernel). This reset
-- also zeros setup_stage_attempts. If IDEA stage keeps failing for that genre
-- + seed combination, the project re-cycles indefinitely:
--   ready_to_write → kernel-missing → reset to idea → idea fails 5× → paused
--   → audit/admin resumes → ready_to_write → kernel-missing → reset → ...
--
-- Counter caps at 3 resets. Beyond that, project is paused with a permanent
-- dead-letter reason that requires admin intervention.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS kernel_repair_attempts integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ai_story_projects.kernel_repair_attempts IS
  'Number of times write-chapters cron has reset this project for kernel repair. Caps at 3 → project marked dead with pause_reason setup_kernel_dead_letter.';
