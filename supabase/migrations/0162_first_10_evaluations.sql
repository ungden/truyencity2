-- 0162: First-10 chapter evaluation — Phase 25 quality gate.
-- After ch.10 is written, evaluate the opening 10 chapters against 5 dimensions:
-- USP clarity, hook strength, payoff cadence, core loop establishment, genre fidelity.
-- Verdict (pass/marginal/fail) + concrete issues persist for admin dashboard.
-- Failed/marginal first-10 results signal that the outline may need regeneration.

CREATE TABLE IF NOT EXISTS public.first_10_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
  evaluated_at_chapter INTEGER NOT NULL DEFAULT 10,
  -- 5 rubric dimensions, each 1-10
  usp_clarity INTEGER CHECK (usp_clarity BETWEEN 1 AND 10),
  hook_strength INTEGER CHECK (hook_strength BETWEEN 1 AND 10),
  payoff_cadence INTEGER CHECK (payoff_cadence BETWEEN 1 AND 10),
  core_loop INTEGER CHECK (core_loop BETWEEN 1 AND 10),
  genre_fidelity INTEGER CHECK (genre_fidelity BETWEEN 1 AND 10),
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'marginal', 'fail')),
  issues JSONB DEFAULT '[]'::JSONB,
  recommendations JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One evaluation per project (the eval runs once when ch.10 is reached).
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_first_10_evaluations_verdict
  ON public.first_10_evaluations(verdict, created_at DESC)
  WHERE verdict IN ('marginal', 'fail');

CREATE INDEX IF NOT EXISTS idx_first_10_evaluations_project
  ON public.first_10_evaluations(project_id);

ALTER TABLE public.first_10_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.first_10_evaluations
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.first_10_evaluations IS
  'Phase 25: first-10-chapter quality gate. AI evaluates opening against USP/hook/payoff/loop/genre rubric after ch.10. Marginal/fail verdicts signal outline regeneration needed.';
