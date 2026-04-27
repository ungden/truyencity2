-- Migration 0149: Modern Narrative Metadata for Story Engine v2
--
-- Adds 4 optional fields to ai_story_projects to support 2024-2026 webnovel trends:
--   1. sub_genres        — Genre blending (e.g., do-thi + trong-sinh + kinh-doanh)
--   2. mc_archetype      — Intelligent MC variants beyond power-fantasy
--   3. anti_tropes       — Explicit anti-cliché flags (no_system, no_harem, no_invincible, etc.)
--   4. style_directives  — JSONB metadata: target_chapter_length_override, cliffhanger_density,
--                          variant_id, sub_arc_length, etc.
--
-- All fields are NULLABLE / default empty; existing projects continue to work without change.
-- Engine reads these at chapter generation time and adjusts prompts accordingly.

ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS sub_genres TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS mc_archetype TEXT,
  ADD COLUMN IF NOT EXISTS anti_tropes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS style_directives JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.ai_story_projects.sub_genres IS
  'Optional secondary genres for genre blending. Example: primary genre=do-thi with sub_genres=[trong-sinh, kinh-doanh]. Engine blends genreConventions + dopamine pools across all genres.';

COMMENT ON COLUMN public.ai_story_projects.mc_archetype IS
  'MC archetype beyond default power-fantasy. Values: power_fantasy (default, leveling-grinding hero), intelligent (Qixia-style, wins by knowledge/psychology), pragmatic (calculated, risk-averse), coward_smart (weak but cunning), family_pillar (multi-gen gia-toc focus), career_driven (sự nghiệp focus, common for 大女主 ngon-tinh). NULL = engine picks default per genre.';

COMMENT ON COLUMN public.ai_story_projects.anti_tropes IS
  'Anti-trope flags — engine injects explicit prohibition prompts when set. Values: no_system, no_harem, no_invincible, no_face_slap, no_rebirth_advantage, no_misery_porn, no_secret_identity, no_tournament, no_cliffhanger_mandate. Modern hits 2024-2026 explicitly market with these flags.';

COMMENT ON COLUMN public.ai_story_projects.style_directives IS
  'JSONB: { target_chapter_length_override?: number, cliffhanger_density?: "low"|"medium"|"high", sub_arc_length?: number (chapters per sub-arc, 5-10), critic_strictness?: "lite"|"normal"|"strict", variant_id?: string (e.g., "ngon-tinh:dai-nu-chu") }';

-- Helpful index for filtering anti-trope projects (rare but useful for analytics)
CREATE INDEX IF NOT EXISTS idx_ai_story_projects_anti_tropes
  ON public.ai_story_projects USING GIN (anti_tropes)
  WHERE array_length(anti_tropes, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_mc_archetype
  ON public.ai_story_projects (mc_archetype)
  WHERE mc_archetype IS NOT NULL;

-- ── Sub-arc structure on arc_plans ──
-- Modern hyperpop sub-arc (5-10 chương resolve) — chuẩn 2024-2026 micro-arc.
-- Mỗi major arc 20 chương gồm 2-4 sub-arcs có mini-payoff riêng.
ALTER TABLE public.arc_plans
  ADD COLUMN IF NOT EXISTS sub_arcs JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.arc_plans.sub_arcs IS
  'Hyperpop sub-arc structure (2024-2026 standard). Array of: { sub_arc_number, start_chapter, end_chapter, theme, mini_payoff }. Each sub-arc 5-10 chương resolve tự thân.';
