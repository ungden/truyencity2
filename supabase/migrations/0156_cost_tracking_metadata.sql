-- 0156_cost_tracking_metadata.sql — Add metadata JSONB to cost_tracking
--
-- Captures DeepSeek prompt_cache_hit_tokens (cache hit count) per call so we can
-- monitor cache effectiveness after Stage 4 prompt-caching enablement.

ALTER TABLE cost_tracking ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
