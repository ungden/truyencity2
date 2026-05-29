-- Track 2b (2026-05-29): hide low-coherence legacy novels from reader surfaces.
--
-- The đại-thần setup quality machinery (canon + foundation review) only ever
-- reached ~5 of the 354 chapter-writing novels. The other ~349 were mass-spawned
-- via ContentSeeder with a thin world_description and never ran the foundation
-- gate. Track 2a retro-scored them read-only; Track 2b hides the worst-scoring
-- ones from discovery surfaces (home, browse, ranking, genre/author pages, search)
-- WITHOUT deleting them — they stay reachable by direct slug/id link.
--
-- `hidden=true` is set by scripts/hide-low-coherence.ts based on the persisted
-- style_directives.retro_foundation_score totalScore distribution.

ALTER TABLE novels
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Discovery queries all filter `hidden=false`; index the visible-novel subset
-- ordered by recency (the common ORDER BY updated_at DESC on list pages).
CREATE INDEX IF NOT EXISTS idx_novels_visible_updated
  ON novels (updated_at DESC)
  WHERE hidden = false;

COMMENT ON COLUMN novels.hidden IS
  'Track 2b (2026-05-29): when true, the novel is excluded from reader discovery surfaces (home/browse/ranking/genre/author/search) but stays reachable by direct link. Set by scripts/hide-low-coherence.ts from retro_foundation_score.';
