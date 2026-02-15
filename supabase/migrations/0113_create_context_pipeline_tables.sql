-- Context Pipeline Tables for Long-Form Novel Quality
-- Provides 4-layer context: Story Bible → Rolling Synopsis → Full Chapters → Arc Plan
-- Solves: context amnesia between cron runs, repetitive openings/titles, plot drift

-- ═══════════════════════════════════════════════════════════════════
-- 1. chapter_summaries — AI-generated summary after each chapter
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chapter_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  opening_sentence TEXT,
  mc_state TEXT,
  cliffhanger TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapter_summaries_project_chapter
  ON chapter_summaries(project_id, chapter_number DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 2. story_synopsis — Rolling synopsis, 1 row per project, overwrite
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS story_synopsis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  synopsis_text TEXT NOT NULL,
  mc_current_state TEXT,
  active_allies TEXT[] DEFAULT '{}',
  active_enemies TEXT[] DEFAULT '{}',
  open_threads TEXT[] DEFAULT '{}',
  last_updated_chapter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. arc_plans — AI-generated arc plan per 20-chapter arc
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS arc_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ai_story_projects(id) ON DELETE CASCADE,
  arc_number INTEGER NOT NULL,
  start_chapter INTEGER NOT NULL,
  end_chapter INTEGER NOT NULL,
  arc_theme TEXT,
  plan_text TEXT NOT NULL,
  chapter_briefs JSONB,
  threads_to_advance TEXT[] DEFAULT '{}',
  threads_to_resolve TEXT[] DEFAULT '{}',
  new_threads TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, arc_number)
);

CREATE INDEX IF NOT EXISTS idx_arc_plans_project_arc
  ON arc_plans(project_id, arc_number DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Add story_bible column to ai_story_projects
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE ai_story_projects
  ADD COLUMN IF NOT EXISTS story_bible TEXT;
