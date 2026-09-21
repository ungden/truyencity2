ALTER TABLE novels
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_novels_visible_updated
  ON novels (updated_at DESC)
  WHERE hidden = false;

COMMENT ON COLUMN novels.hidden IS
  'Track 2b (2026-05-29): when true, the novel is excluded from reader discovery surfaces (home/browse/ranking/genre/author/search) but stays reachable by direct link. Set by scripts/hide-low-coherence.ts from retro_foundation_score.';;
