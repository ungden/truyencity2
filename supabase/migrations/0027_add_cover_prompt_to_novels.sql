-- ============================================================================
-- Migration 0027: Add cover_prompt column to novels table
-- Stores the AI-generated cover prompt for each novel so that cover generation
-- can reuse the tailored prompt instead of building a generic one.
-- ============================================================================

ALTER TABLE public.novels ADD COLUMN IF NOT EXISTS cover_prompt text;

COMMENT ON COLUMN public.novels.cover_prompt IS 'AI-generated English prompt for cover image generation via Gemini Image';
