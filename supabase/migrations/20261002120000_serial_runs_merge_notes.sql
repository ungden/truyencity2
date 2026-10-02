-- Extractor entries the deterministic merge set aside (unknown id, not the next rank,
-- a move to a place outside the kernel). They were reported only in the cron tick's HTTP
-- response, so a rank-up the merge dropped left no trace; the Bible then fed the old rank
-- back to the Writer for chapters. Keeping them on the run makes a silent desync visible.
ALTER TABLE public.serial_runs ADD COLUMN IF NOT EXISTS merge_notes text[];
