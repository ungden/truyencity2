-- ============================================================================
-- Migration 0120: Story Memory Tables for Continuous Story Memory System
-- 
-- Creates:
-- 1. character_states — per-chapter character state snapshots
-- 2. story_memory_chunks — RAG vector search (pgvector) for semantic context
-- ============================================================================

-- ============================================================================
-- 1. CHARACTER STATES — per-chapter character state tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  character_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'dead', 'missing', 'unknown')),
  power_level TEXT,           -- e.g. "Luyện Khí tầng 3", "Kim Đan kỳ"
  power_realm_index INT,      -- numeric for comparison (higher = stronger)
  location TEXT,              -- current location
  relationships JSONB DEFAULT '[]'::jsonb,  -- [{name, relation, affinity}]
  notes TEXT,                 -- free-form notes (injuries, goals, secrets)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, chapter_number, character_name)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_character_states_project 
  ON character_states(project_id, character_name, chapter_number DESC);

CREATE INDEX IF NOT EXISTS idx_character_states_latest 
  ON character_states(project_id, chapter_number DESC);

-- ============================================================================
-- 2. STORY MEMORY CHUNKS — RAG vector search for semantic context retrieval
-- ============================================================================

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS story_memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('scene', 'character_event', 'world_detail', 'key_event', 'plot_point')),
  content TEXT NOT NULL,
  embedding vector(768),      -- Gemini text-embedding-004 dimension
  metadata JSONB DEFAULT '{}'::jsonb,  -- {characters: [], location: string, event_type: string, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest neighbor search
-- Lists = sqrt(expected_rows). Start with 100 for up to ~10K chunks.
CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding 
  ON story_memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_project 
  ON story_memory_chunks(project_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_type 
  ON story_memory_chunks(project_id, chunk_type);

-- ============================================================================
-- 3. RPC function for vector similarity search
-- ============================================================================

CREATE OR REPLACE FUNCTION match_story_chunks(
  query_embedding vector(768),
  match_project_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  chapter_number INT,
  chunk_type TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    smc.id,
    smc.project_id,
    smc.chapter_number,
    smc.chunk_type,
    smc.content,
    smc.metadata,
    1 - (smc.embedding <=> query_embedding) AS similarity
  FROM story_memory_chunks smc
  WHERE smc.project_id = match_project_id
    AND smc.embedding IS NOT NULL
    AND 1 - (smc.embedding <=> query_embedding) > match_threshold
  ORDER BY smc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
