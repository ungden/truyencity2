-- ============================================================================
-- Migration 0130: Quality Module Tables (Qidian Master Level)
--
-- Creates 6 tables for the new quality modules:
-- 1. foreshadowing_plans — long-range hint planning across arcs
-- 2. character_arcs — character development tracking with signature traits
-- 3. arc_pacing_blueprints — per-arc pacing mood blueprints
-- 4. voice_fingerprints — narrative style fingerprint & drift detection
-- 5. mc_power_states — MC power state tracking with anti-plot-armor
-- 6. location_bibles — world map & location bible generation
-- ============================================================================

-- ============================================================================
-- 1. FORESHADOWING PLANS — long-range hint planning (50-500 chapters apart)
-- ============================================================================

CREATE TABLE IF NOT EXISTS foreshadowing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  hint_id TEXT NOT NULL,
  hint_text TEXT NOT NULL,
  hint_type TEXT NOT NULL CHECK (hint_type IN ('dialogue', 'object', 'event', 'character_behavior', 'environmental')),
  plant_chapter INT NOT NULL,
  payoff_chapter INT NOT NULL,
  payoff_description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'planted', 'developing', 'paid_off', 'abandoned')),
  arc_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, hint_id)
);

CREATE INDEX IF NOT EXISTS idx_foreshadowing_project_status
  ON foreshadowing_plans(project_id, status);

CREATE INDEX IF NOT EXISTS idx_foreshadowing_plant_chapter
  ON foreshadowing_plans(project_id, plant_chapter);

CREATE INDEX IF NOT EXISTS idx_foreshadowing_payoff_chapter
  ON foreshadowing_plans(project_id, payoff_chapter);

-- ============================================================================
-- 2. CHARACTER ARCS — character development tracking with signature traits
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('protagonist', 'rival', 'mentor', 'love_interest', 'ally', 'villain', 'comic_relief', 'recurring_npc')),
  internal_conflict TEXT,
  arc_phases JSONB DEFAULT '[]'::jsonb,
  signature_traits JSONB DEFAULT '{}'::jsonb,
  relationship_with_mc TEXT,
  current_phase TEXT,
  appearance_count INT NOT NULL DEFAULT 0,
  last_seen_chapter INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_arcs_project
  ON character_arcs(project_id, character_name);

-- ============================================================================
-- 3. ARC PACING BLUEPRINTS — per-arc pacing mood blueprints
-- ============================================================================

CREATE TABLE IF NOT EXISTS arc_pacing_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  arc_number INT NOT NULL,
  blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, arc_number)
);

CREATE INDEX IF NOT EXISTS idx_pacing_blueprints_project
  ON arc_pacing_blueprints(project_id, arc_number);

-- ============================================================================
-- 4. VOICE FINGERPRINTS — narrative style fingerprint & drift detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_fingerprints (
  project_id UUID PRIMARY KEY REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  fingerprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_chapters INT[] DEFAULT '{}',
  anti_patterns TEXT[] DEFAULT '{}',
  last_updated_chapter INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. MC POWER STATES — MC power state tracking with anti-plot-armor
-- ============================================================================

CREATE TABLE IF NOT EXISTS mc_power_states (
  project_id UUID PRIMARY KEY REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  power_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated_chapter INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. LOCATION BIBLES — world map & location bible generation
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_bibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_bible JSONB,
  arc_range INT[] NOT NULL DEFAULT '{}',
  explored BOOLEAN NOT NULL DEFAULT FALSE,
  mysteries JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, location_name)
);

CREATE INDEX IF NOT EXISTS idx_location_bibles_project
  ON location_bibles(project_id, explored);

CREATE INDEX IF NOT EXISTS idx_location_bibles_arc_range
  ON location_bibles(project_id, arc_range);

-- ============================================================================
-- RLS: Enable Row Level Security (service_role bypasses, anon blocked)
-- ============================================================================

ALTER TABLE foreshadowing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE arc_pacing_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_power_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_bibles ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by server-side API routes)
DO $$ BEGIN
  CREATE POLICY "service_role_full_foreshadowing" ON foreshadowing_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_character_arcs" ON character_arcs FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_pacing_blueprints" ON arc_pacing_blueprints FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_voice_fingerprints" ON voice_fingerprints FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_mc_power_states" ON mc_power_states FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_location_bibles" ON location_bibles FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
