-- ============================================================================
-- STORY EMBEDDINGS & CONSISTENCY TRACKING
-- For RAG-based context retrieval and consistency checking
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- STORY EMBEDDINGS TABLE - For semantic search/RAG
-- ============================================================================
CREATE TABLE IF NOT EXISTS story_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- Content info
  chapter_number INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('chapter_summary', 'key_event', 'character_moment', 'world_detail', 'dialogue')),
  content TEXT NOT NULL,

  -- Metadata for filtering
  characters_involved TEXT[] DEFAULT ARRAY[]::TEXT[],
  location TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

  -- Vector embedding (1536 dimensions for OpenAI ada-002 / 768 for smaller models)
  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_story_embeddings_vector ON story_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_story_embeddings_project ON story_embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_story_embeddings_chapter ON story_embeddings(project_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_story_embeddings_type ON story_embeddings(project_id, content_type);

-- ============================================================================
-- CHARACTER TRACKER TABLE - For consistency checking
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- Character info
  character_name TEXT NOT NULL,
  role TEXT DEFAULT 'supporting' CHECK (role IN ('protagonist', 'antagonist', 'supporting', 'minor')),

  -- Static traits (shouldn't change)
  static_traits JSONB DEFAULT '[]'::jsonb, -- [{trait: "loyal", established_chapter: 1}]

  -- Dynamic state (changes over time)
  current_state JSONB DEFAULT '{}'::jsonb, -- {cultivation_level, location, health, mood}

  -- Relationships
  relationships JSONB DEFAULT '[]'::jsonb, -- [{target: "MC", type: "ally", affinity: 80, since_chapter: 1}]

  -- Appearance tracking
  first_appearance INTEGER NOT NULL,
  last_appearance INTEGER,
  appearance_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'dead', 'missing', 'unknown')),

  -- Embedding for semantic matching
  description_embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_character_tracker_project ON character_tracker(project_id);
CREATE INDEX IF NOT EXISTS idx_character_tracker_name ON character_tracker(project_id, character_name);

-- ============================================================================
-- POWER PROGRESSION TABLE - Track cultivation/power levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS power_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,

  -- Progression event
  chapter_number INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('breakthrough', 'skill_learned', 'item_acquired', 'power_loss', 'transformation')),

  -- Before/After state
  previous_level TEXT,
  new_level TEXT,
  previous_realm TEXT,
  new_realm TEXT,

  -- Details
  description TEXT NOT NULL,
  catalyst TEXT, -- What caused the change
  consequences TEXT[], -- Side effects

  -- Validation
  is_consistent BOOLEAN DEFAULT true, -- Flag if this seems inconsistent
  inconsistency_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_progression_project ON power_progression(project_id);
CREATE INDEX IF NOT EXISTS idx_power_progression_character ON power_progression(project_id, character_name);
CREATE INDEX IF NOT EXISTS idx_power_progression_chapter ON power_progression(project_id, chapter_number);

-- ============================================================================
-- WORLD STATE TABLE - Track world/setting changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS world_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- State category
  category TEXT NOT NULL CHECK (category IN ('location', 'faction', 'item', 'rule', 'event')),
  name TEXT NOT NULL,

  -- State details
  current_state JSONB NOT NULL, -- Flexible storage for different categories
  state_history JSONB DEFAULT '[]'::jsonb, -- [{chapter: 1, state: {...}, reason: "..."}]

  -- Tracking
  first_mentioned INTEGER NOT NULL,
  last_updated INTEGER,

  -- Embedding for semantic search
  description_embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, category, name)
);

CREATE INDEX IF NOT EXISTS idx_world_state_project ON world_state(project_id);
CREATE INDEX IF NOT EXISTS idx_world_state_category ON world_state(project_id, category);

-- ============================================================================
-- CONSISTENCY ISSUES TABLE - Log detected inconsistencies
-- ============================================================================
CREATE TABLE IF NOT EXISTS consistency_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- Issue details
  chapter_number INTEGER NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('character_trait', 'power_level', 'timeline', 'world_rule', 'relationship', 'dead_character', 'location')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),

  -- Description
  description TEXT NOT NULL,
  expected_state TEXT,
  actual_state TEXT,

  -- References
  conflicting_chapters INTEGER[], -- Chapters that conflict
  affected_entities TEXT[], -- Characters/locations affected

  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'ignored', 'resolved', 'wontfix')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consistency_issues_project ON consistency_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_consistency_issues_status ON consistency_issues(project_id, status);
CREATE INDEX IF NOT EXISTS idx_consistency_issues_chapter ON consistency_issues(project_id, chapter_number);

-- ============================================================================
-- BEAT USAGE TABLE - Track dopamine/plot beats to avoid repetition
-- ============================================================================
CREATE TABLE IF NOT EXISTS beat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,

  -- Beat info
  chapter_number INTEGER NOT NULL,
  beat_type TEXT NOT NULL, -- 'face_slap', 'power_reveal', 'treasure_gain', etc.
  beat_subtype TEXT, -- More specific categorization

  -- Details
  description TEXT NOT NULL,
  intensity INTEGER DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  characters_involved TEXT[],

  -- Cooldown tracking
  cooldown_chapters INTEGER DEFAULT 5, -- How many chapters before this beat can be reused
  next_available_chapter INTEGER, -- Calculated: chapter_number + cooldown_chapters

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beat_usage_project ON beat_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_beat_usage_type ON beat_usage(project_id, beat_type);
CREATE INDEX IF NOT EXISTS idx_beat_usage_chapter ON beat_usage(project_id, chapter_number);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE story_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE beat_usage ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their data (via project ownership)
CREATE POLICY "story_embeddings_all" ON story_embeddings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "character_tracker_all" ON character_tracker FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "power_progression_all" ON power_progression FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "world_state_all" ON world_state FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "consistency_issues_all" ON consistency_issues FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "beat_usage_all" ON beat_usage FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search similar content using vector similarity
CREATE OR REPLACE FUNCTION search_story_context(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_content_types TEXT[] DEFAULT NULL,
  p_max_chapter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chapter_number INTEGER,
  content_type TEXT,
  content TEXT,
  characters_involved TEXT[],
  location TEXT,
  importance INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.chapter_number,
    se.content_type,
    se.content,
    se.characters_involved,
    se.location,
    se.importance,
    1 - (se.embedding <=> p_query_embedding) as similarity
  FROM story_embeddings se
  WHERE se.project_id = p_project_id
    AND (p_content_types IS NULL OR se.content_type = ANY(p_content_types))
    AND (p_max_chapter IS NULL OR se.chapter_number <= p_max_chapter)
    AND se.embedding IS NOT NULL
  ORDER BY se.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function to check if a beat can be used
CREATE OR REPLACE FUNCTION can_use_beat(
  p_project_id UUID,
  p_beat_type TEXT,
  p_current_chapter INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_usage INTEGER;
  v_cooldown INTEGER;
BEGIN
  SELECT chapter_number, cooldown_chapters
  INTO v_last_usage, v_cooldown
  FROM beat_usage
  WHERE project_id = p_project_id
    AND beat_type = p_beat_type
  ORDER BY chapter_number DESC
  LIMIT 1;

  IF v_last_usage IS NULL THEN
    RETURN true;
  END IF;

  RETURN p_current_chapter >= (v_last_usage + v_cooldown);
END;
$$;

-- Function to get character's current state
CREATE OR REPLACE FUNCTION get_character_state(
  p_project_id UUID,
  p_character_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'name', character_name,
    'role', role,
    'static_traits', static_traits,
    'current_state', current_state,
    'relationships', relationships,
    'status', status,
    'first_appearance', first_appearance,
    'last_appearance', last_appearance
  )
  INTO v_result
  FROM character_tracker
  WHERE project_id = p_project_id
    AND character_name = p_character_name;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Done!
