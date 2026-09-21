-- Migration 0149: Modern Narrative Metadata for Story Engine v2
ALTER TABLE public.ai_story_projects
  ADD COLUMN IF NOT EXISTS sub_genres TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS mc_archetype TEXT,
  ADD COLUMN IF NOT EXISTS anti_tropes TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS style_directives JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.ai_story_projects.sub_genres IS
  'Optional secondary genres for genre blending. Example: primary genre=do-thi with sub_genres=[trong-sinh, kinh-doanh]. Engine blends genreConventions + dopamine pools across all genres.';

COMMENT ON COLUMN public.ai_story_projects.mc_archetype IS
  'MC archetype beyond default power-fantasy. Values: power_fantasy (default, leveling-grinding hero), intelligent (Qixia-style, wins by knowledge/psychology), pragmatic (calculated, risk-averse), coward_smart (weak but cunning), family_pillar (multi-gen gia-toc focus), career_driven (su nghiep focus, common for dai-nu-chu ngon-tinh). NULL = engine picks default per genre.';

COMMENT ON COLUMN public.ai_story_projects.anti_tropes IS
  'Anti-trope flags - engine injects explicit prohibition prompts when set. Values: no_system, no_harem, no_invincible, no_face_slap, no_rebirth_advantage, no_misery_porn, no_secret_identity, no_tournament, no_cliffhanger_mandate. Modern hits 2024-2026 explicitly market with these flags.';

COMMENT ON COLUMN public.ai_story_projects.style_directives IS
  'JSONB: target_chapter_length_override, cliffhanger_density (low/medium/high), sub_arc_length (5-10), critic_strictness (lite/normal/strict), variant_id';

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_anti_tropes
  ON public.ai_story_projects USING GIN (anti_tropes)
  WHERE array_length(anti_tropes, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_ai_story_projects_mc_archetype
  ON public.ai_story_projects (mc_archetype)
  WHERE mc_archetype IS NOT NULL;

-- Sub-arc structure on arc_plans
ALTER TABLE public.arc_plans
  ADD COLUMN IF NOT EXISTS sub_arcs JSONB DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.arc_plans.sub_arcs IS
  'Hyperpop sub-arc structure (2024-2026 standard). Array of: sub_arc_number, start_chapter, end_chapter, theme, mini_payoff. Each sub-arc 5-10 chuong resolve tu than.';;
