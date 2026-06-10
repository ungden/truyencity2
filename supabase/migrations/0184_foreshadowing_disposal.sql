-- Quality Overhaul 2.2 — foreshadowing 2-step disposal.
-- Hints >30 chapters past payoff deadline used to flip straight to
-- 'abandoned' silently: no closing line ever written, the dangling thread
-- just vanished from context ("what was that scar about?"). New flow:
-- 'disposing' status → the Architect gets a one-time directive to write a
-- 1-2 sentence soft close → after 3 more chapters flip to 'abandoned' +
-- admin_review_queue row so abandonment is never invisible.

ALTER TABLE public.foreshadowing_plans
  DROP CONSTRAINT IF EXISTS foreshadowing_plans_status_check;

ALTER TABLE public.foreshadowing_plans
  ADD CONSTRAINT foreshadowing_plans_status_check
  CHECK (status IN ('planned', 'planted', 'developing', 'disposing', 'paid_off', 'abandoned'));

ALTER TABLE public.foreshadowing_plans
  ADD COLUMN IF NOT EXISTS disposing_since_chapter int;

COMMENT ON COLUMN public.foreshadowing_plans.disposing_since_chapter IS
  'Chapter at which 2-step disposal started; abandoned after +3 chapters.';
