-- ============================================================================
-- Migration 0026: Create ai_image_jobs table
-- Tracks image generation jobs (cover art) via Gemini / external providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_image_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id    uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  prompt      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result_url  text,
  error_message text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for polling: find pending/running jobs
CREATE INDEX IF NOT EXISTS idx_ai_image_jobs_status
  ON public.ai_image_jobs(status)
  WHERE status IN ('pending', 'running');

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_ai_image_jobs_user_id
  ON public.ai_image_jobs(user_id);

-- Index for novel lookups
CREATE INDEX IF NOT EXISTS idx_ai_image_jobs_novel_id
  ON public.ai_image_jobs(novel_id)
  WHERE novel_id IS NOT NULL;

-- Auto-update updated_at on row change
CREATE TRIGGER set_ai_image_jobs_updated_at
  BEFORE UPDATE ON public.ai_image_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.ai_image_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own jobs
CREATE POLICY "Users can view own image jobs"
  ON public.ai_image_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create image jobs"
  ON public.ai_image_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (edge functions) can do everything via service key (bypasses RLS)
-- No explicit policy needed for service role
