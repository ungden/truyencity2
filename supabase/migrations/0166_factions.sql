-- 0166: Factions tracker — Phase 27 W2.5.
-- Tracks sects, gia tộc, corporations, political parties, ma giáo, etc.
-- Their power level + alliances + rivalries evolve across the novel.
-- Pre-Phase-27 problem: AI could randomly flip faction loyalties or invent
-- factions with no setup. Long-form political plots had no consistency check.

CREATE TABLE IF NOT EXISTS public.factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  faction_name TEXT NOT NULL,
  -- 'sect' (cultivation môn phái), 'clan' (gia tộc), 'corp' (do-thi tập đoàn),
  -- 'political' (đảng phái), 'underground' (ma giáo / tổ chức ngầm), 'guild',
  -- 'other'
  faction_type TEXT NOT NULL,
  -- Power level 0-100 (relative within story). MC's faction often starts low.
  power_level INTEGER DEFAULT 50,
  -- Description of faction's identity, values, methods.
  description TEXT,
  -- JSONB array of faction names this faction is allied with.
  alliances JSONB DEFAULT '[]'::JSONB,
  -- JSONB array of faction names this faction is rival with.
  rivalries JSONB DEFAULT '[]'::JSONB,
  -- Status: active, declining, fallen, hidden
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'declining', 'fallen', 'hidden')),
  first_seen_chapter INTEGER,
  last_active_chapter INTEGER,
  -- 0-100 importance for context-injection priority
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, faction_name)
);

CREATE INDEX IF NOT EXISTS idx_factions_project_active
  ON public.factions(project_id, status, last_active_chapter DESC);

CREATE INDEX IF NOT EXISTS idx_factions_project_importance
  ON public.factions(project_id, importance DESC);

ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.factions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.factions IS
  'Phase 27 W2.5: faction registry + power balance tracker. AI extracts faction-relevant events post-write. Tracks sects/clans/corps/political parties + alliances/rivalries over time.';
