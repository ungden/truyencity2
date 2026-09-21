BEGIN;
SET lock_timeout = '5s';
ALTER TABLE public.serial_runs
  ADD COLUMN IF NOT EXISTS draft_artifact jsonb;
COMMENT ON COLUMN public.serial_runs.draft_artifact IS
  'Private chapter prose and rejected extraction/review evidence kept when a run pauses without deleting its cycle.';
COMMIT;
