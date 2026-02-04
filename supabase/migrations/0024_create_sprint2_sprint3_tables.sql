-- =============================================
-- STORY FACTORY - Sprint 2 & 3 Quality Systems
-- Migration: 0024_create_sprint2_sprint3_tables.sql
-- 
-- Creates tables for:
-- 1. Character Depth Profiles (villain motivation, NPC distinctiveness)
-- 2. Romance Progressions (relationship milestones)
-- 3. Battle Records (tactical variety, enemy scaling)
-- 4. Character Voices (dialogue distinctiveness)
-- =============================================

-- =============================================
-- 1. CHARACTER DEPTH PROFILES
-- Tracks character depth, motivation, growth arcs
-- =============================================
CREATE TABLE IF NOT EXISTS character_depth_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- protagonist, deuteragonist, antagonist, mentor, love_interest, ally, rival, comic_relief, minor, extra
  
  -- Core Motivation
  primary_motivation TEXT NOT NULL, -- power, revenge, protection, love, freedom, knowledge, wealth, recognition, survival, redemption, duty, justice, family
  secondary_motivations TEXT[] DEFAULT '{}',
  backstory TEXT,
  dark_secret TEXT,
  flaw TEXT,
  strength TEXT,
  
  -- Personality
  personality_traits TEXT[] DEFAULT '{}', -- brave, cautious, cunning, honest, loyal, etc.
  speech_pattern JSONB DEFAULT '{"formality": "neutral", "verbosity": "normal", "quirks": []}'::jsonb,
  distinctive_features JSONB DEFAULT '{"appearance": [], "mannerisms": [], "habits": [], "beliefs": []}'::jsonb,
  
  -- Character Arc
  character_arc JSONB DEFAULT '{"startingState": "", "currentState": "", "targetEndState": "", "milestones": [], "growthScore": 0}'::jsonb,
  
  -- Villain Profile (optional, for antagonists)
  villain_profile JSONB, -- {motivationDepth, sympatheticElements, redeemableQualities, threatLevel}
  
  -- Tracking
  first_appearance INTEGER,
  last_appearance INTEGER,
  chapter_appearances INTEGER[] DEFAULT '{}',
  total_scene_time DECIMAL DEFAULT 0, -- Estimated % of screen time
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, name)
);

-- Indexes for character depth
CREATE INDEX IF NOT EXISTS idx_character_depth_project ON character_depth_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_character_depth_role ON character_depth_profiles(project_id, role);
CREATE INDEX IF NOT EXISTS idx_character_depth_growth ON character_depth_profiles(project_id, ((character_arc->>'growthScore')::integer));

-- =============================================
-- 2. ROMANCE PROGRESSIONS
-- Tracks romantic relationship development
-- =============================================
CREATE TABLE IF NOT EXISTS romance_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  
  -- Characters
  character1 TEXT NOT NULL,
  character2 TEXT NOT NULL,
  
  -- Current State
  current_stage TEXT NOT NULL DEFAULT 'stranger', -- stranger, acquaintance, friend, close_friend, rival, enemy, nemesis, crush, dating, committed, married
  stage_history JSONB DEFAULT '[]'::jsonb, -- [{stage, chapter, trigger}]
  
  -- Milestones
  first_meeting INTEGER,
  first_positive_interaction INTEGER,
  first_conflict INTEGER,
  first_romantic_moment INTEGER,
  confession INTEGER,
  
  -- Chemistry
  shared_experiences TEXT[] DEFAULT '{}',
  conflicts TEXT[] DEFAULT '{}',
  romantic_moments TEXT[] DEFAULT '{}',
  
  -- Pacing
  progression_speed TEXT DEFAULT 'medium', -- slow_burn, medium, fast
  chapters_in_current_stage INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'developing', -- developing, established, stalled, ended
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, character1, character2)
);

-- Indexes for romance
CREATE INDEX IF NOT EXISTS idx_romance_project ON romance_progressions(project_id);
CREATE INDEX IF NOT EXISTS idx_romance_status ON romance_progressions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_romance_characters ON romance_progressions(project_id, character1, character2);

-- =============================================
-- 3. BATTLE RECORDS
-- Tracks battle variety and tactical patterns
-- =============================================
CREATE TABLE IF NOT EXISTS battle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  
  -- Battle Details
  battle_type TEXT NOT NULL, -- duel, group_fight, ambush, defense, siege, tournament, assassination, chase, escape, boss_fight, minion_wave, surprise_attack
  tactical_approach TEXT NOT NULL, -- brute_force, outsmart, attrition, hit_and_run, environmental, teamwork, sacrifice_play, bluff, counter_attack, overwhelming, defensive, trap
  outcome TEXT NOT NULL, -- clean_victory, pyrrhic_victory, narrow_escape, strategic_retreat, interrupted, draw, defeat_recovery, total_defeat
  
  -- Participants
  protagonist_power_level TEXT,
  enemy_power_level TEXT,
  enemy_type TEXT, -- young_master, demon_beast, assassin, etc.
  
  -- Elements Used
  elements_used TEXT[] DEFAULT '{}', -- skill_clash, weapon_exchange, formation_break, power_reveal, technique_counter, environmental_use, item_usage, reinforcement_arrival, betrayal, breakthrough_during_battle, hidden_card, sacrifice
  
  -- Pacing
  word_count INTEGER,
  duration TEXT, -- brief, medium, extended (in-story duration)
  
  -- Quality
  variety_score INTEGER, -- 0-100
  issues TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for battles
CREATE INDEX IF NOT EXISTS idx_battle_project_chapter ON battle_records(project_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_battle_type ON battle_records(project_id, battle_type);
CREATE INDEX IF NOT EXISTS idx_battle_variety_score ON battle_records(project_id, variety_score);

-- =============================================
-- 4. ENEMY SCALING
-- Tracks power gap consistency
-- =============================================
CREATE TABLE IF NOT EXISTS enemy_scaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  
  enemy_name TEXT NOT NULL,
  enemy_power_level TEXT NOT NULL,
  protagonist_power_level TEXT NOT NULL,
  power_gap INTEGER NOT NULL, -- -10 to +10 (negative = weaker, positive = stronger)
  outcome_logic TEXT, -- Why the outcome made sense
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enemy_scaling_project ON enemy_scaling(project_id, chapter_number);

-- =============================================
-- 5. CHARACTER VOICES
-- Stores voice profiles for dialogue consistency
-- =============================================
CREATE TABLE IF NOT EXISTS character_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  
  -- Voice Profile
  voice_profile JSONB NOT NULL, -- {vocabulary, phrasePatternsm catchphrases, formality, emotionality}
  
  -- Samples
  sample_dialogues TEXT[] DEFAULT '{}',
  
  -- Stats
  total_dialogues_analyzed INTEGER DEFAULT 0,
  last_updated_chapter INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_voices_project ON character_voices(project_id);

-- =============================================
-- 6. WRITING STYLE ANALYTICS
-- Stores style analysis history for improvement tracking
-- =============================================
CREATE TABLE IF NOT EXISTS writing_style_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  
  -- Scores
  overall_score INTEGER,
  weak_verb_score INTEGER,
  adverb_score INTEGER,
  show_dont_tell_score INTEGER,
  purple_prose_score INTEGER,
  passive_voice_score INTEGER,
  sentence_variety_score INTEGER,
  
  -- Detected Issues
  issues JSONB DEFAULT '[]'::jsonb,
  suggestions TEXT[] DEFAULT '{}',
  
  -- Detailed Metrics
  weak_verbs JSONB DEFAULT '[]'::jsonb,
  adverb_overuse JSONB DEFAULT '[]'::jsonb,
  tell_instances JSONB DEFAULT '[]'::jsonb,
  exposition_dumps JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_style_analytics_project ON writing_style_analytics(project_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_style_analytics_score ON writing_style_analytics(project_id, overall_score);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get characters needing development
CREATE OR REPLACE FUNCTION get_characters_needing_development(p_project_id UUID, p_current_chapter INTEGER)
RETURNS TABLE(
  character_name TEXT,
  role TEXT,
  growth_score INTEGER,
  chapters_since_growth INTEGER,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cdp.name,
    cdp.role,
    (cdp.character_arc->>'growthScore')::INTEGER,
    p_current_chapter - COALESCE(cdp.last_appearance, cdp.first_appearance),
    CASE 
      WHEN cdp.role = 'protagonist' AND p_current_chapter - COALESCE(cdp.last_appearance, cdp.first_appearance) > 30 THEN 'high'
      WHEN cdp.role IN ('antagonist', 'love_interest') AND (cdp.character_arc->>'growthScore')::INTEGER < 30 THEN 'high'
      WHEN p_current_chapter - COALESCE(cdp.last_appearance, cdp.first_appearance) > 50 THEN 'medium'
      ELSE 'low'
    END
  FROM character_depth_profiles cdp
  WHERE cdp.project_id = p_project_id
    AND cdp.role NOT IN ('minor', 'extra')
  ORDER BY 
    CASE 
      WHEN cdp.role = 'protagonist' THEN 0
      WHEN cdp.role = 'antagonist' THEN 1
      WHEN cdp.role = 'love_interest' THEN 2
      ELSE 3
    END,
    p_current_chapter - COALESCE(cdp.last_appearance, cdp.first_appearance) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get battle variety report
CREATE OR REPLACE FUNCTION get_battle_variety_report(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalBattles', COUNT(*),
    'avgVarietyScore', ROUND(AVG(variety_score), 1),
    'typeDistribution', (
      SELECT jsonb_object_agg(battle_type, cnt)
      FROM (
        SELECT battle_type, COUNT(*) as cnt
        FROM battle_records
        WHERE project_id = p_project_id
        GROUP BY battle_type
      ) sub
    ),
    'outcomeDistribution', (
      SELECT jsonb_object_agg(outcome, cnt)
      FROM (
        SELECT outcome, COUNT(*) as cnt
        FROM battle_records
        WHERE project_id = p_project_id
        GROUP BY outcome
      ) sub
    ),
    'mcWinRate', ROUND(
      100.0 * COUNT(*) FILTER (WHERE outcome IN ('clean_victory', 'pyrrhic_victory')) / NULLIF(COUNT(*), 0),
      1
    )
  ) INTO v_result
  FROM battle_records
  WHERE project_id = p_project_id;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check romance stall
CREATE OR REPLACE FUNCTION check_romance_stalls(p_project_id UUID, p_current_chapter INTEGER)
RETURNS TABLE(
  character1 TEXT,
  character2 TEXT,
  current_stage TEXT,
  chapters_stalled INTEGER,
  suggestion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.character1,
    rp.character2,
    rp.current_stage,
    p_current_chapter - (rp.stage_history->-1->>'chapter')::INTEGER as chapters_stalled,
    'Romance giữa ' || rp.character1 || ' và ' || rp.character2 || ' đã stall. Cần interaction hoặc development.'
  FROM romance_progressions rp
  WHERE rp.project_id = p_project_id
    AND rp.status = 'developing'
    AND p_current_chapter - (rp.stage_history->-1->>'chapter')::INTEGER > 
        CASE rp.progression_speed
          WHEN 'slow_burn' THEN 100
          WHEN 'medium' THEN 50
          ELSE 25
        END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get writing style trends
CREATE OR REPLACE FUNCTION get_writing_style_trends(p_project_id UUID, p_last_n_chapters INTEGER DEFAULT 20)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'avgOverallScore', ROUND(AVG(overall_score), 1),
    'avgShowDontTellScore', ROUND(AVG(show_dont_tell_score), 1),
    'avgWeakVerbScore', ROUND(AVG(weak_verb_score), 1),
    'avgSentenceVarietyScore', ROUND(AVG(sentence_variety_score), 1),
    'trend', CASE 
      WHEN AVG(CASE WHEN chapter_number > (SELECT MAX(chapter_number) - 5 FROM writing_style_analytics WHERE project_id = p_project_id) THEN overall_score END) >
           AVG(CASE WHEN chapter_number <= (SELECT MAX(chapter_number) - 5 FROM writing_style_analytics WHERE project_id = p_project_id) THEN overall_score END)
      THEN 'improving'
      ELSE 'declining'
    END,
    'commonIssues', (
      SELECT jsonb_agg(issue_type)
      FROM (
        SELECT (jsonb_array_elements(issues)->>'type') as issue_type, COUNT(*) as cnt
        FROM writing_style_analytics
        WHERE project_id = p_project_id
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
    )
  ) INTO v_result
  FROM (
    SELECT *
    FROM writing_style_analytics
    WHERE project_id = p_project_id
    ORDER BY chapter_number DESC
    LIMIT p_last_n_chapters
  ) recent;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE character_depth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE romance_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE enemy_scaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_style_analytics ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "Service role bypass for character_depth_profiles" ON character_depth_profiles
  FOR ALL TO service_role USING (true);
  
CREATE POLICY "Service role bypass for romance_progressions" ON romance_progressions
  FOR ALL TO service_role USING (true);
  
CREATE POLICY "Service role bypass for battle_records" ON battle_records
  FOR ALL TO service_role USING (true);
  
CREATE POLICY "Service role bypass for enemy_scaling" ON enemy_scaling
  FOR ALL TO service_role USING (true);
  
CREATE POLICY "Service role bypass for character_voices" ON character_voices
  FOR ALL TO service_role USING (true);
  
CREATE POLICY "Service role bypass for writing_style_analytics" ON writing_style_analytics
  FOR ALL TO service_role USING (true);

-- Admin access
CREATE POLICY "Admins have full access to character_depth_profiles" ON character_depth_profiles
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to romance_progressions" ON romance_progressions
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to battle_records" ON battle_records
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to enemy_scaling" ON enemy_scaling
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to character_voices" ON character_voices
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to writing_style_analytics" ON writing_style_analytics
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =============================================
-- TRIGGERS
-- =============================================

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps
CREATE TRIGGER update_character_depth_updated_at
  BEFORE UPDATE ON character_depth_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_romance_progressions_updated_at
  BEFORE UPDATE ON romance_progressions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_voices_updated_at
  BEFORE UPDATE ON character_voices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
