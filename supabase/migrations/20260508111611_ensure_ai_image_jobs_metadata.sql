-- Ensure live databases created before migration 0026 gained the metadata column.
ALTER TABLE public.ai_image_jobs
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ai_image_jobs.metadata IS
  'Provider/runtime metadata for generated image jobs, including codex_image_tool automation runs.';
