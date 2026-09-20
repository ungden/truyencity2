-- Persist the four-chapter audit separately from the per-chapter reader verdict.
-- serial_runs is already RLS-protected and service-role-only.
BEGIN;

ALTER TABLE public.serial_runs
  ADD COLUMN IF NOT EXISTS opening_audit jsonb;

COMMENT ON COLUMN public.serial_runs.opening_audit IS
  'Cross-chapter audit performed before chapter four may enter human opening review.';

COMMIT;
