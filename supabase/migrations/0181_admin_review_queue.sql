-- Quality Overhaul 1.4 — admin review queue.
-- Degraded-content recovery paths (golden chapter fallback, revise-pass
-- failure, unfixed high-risk contradictions, circuit breaker, abandoned
-- foreshadowing) previously surfaced only as console.warn lines that nobody
-- read. This table gives them a visible, SLA-trackable queue on /admin/quality.

CREATE TABLE IF NOT EXISTS public.admin_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_number int,
  reason text NOT NULL CHECK (reason IN (
    'golden_fallback',
    'revise_pass_failed',
    'major_contradiction_unfixed',
    'quality_circuit_breaker',
    'foreshadowing_abandoned'
  )),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status
  ON public.admin_review_queue (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_review_queue_project
  ON public.admin_review_queue (project_id, created_at DESC);

ALTER TABLE public.admin_review_queue ENABLE ROW LEVEL SECURITY;

-- Service role only (admin APIs use the service client; no anon/user access).
DROP POLICY IF EXISTS admin_review_queue_service_all ON public.admin_review_queue;
CREATE POLICY admin_review_queue_service_all ON public.admin_review_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
