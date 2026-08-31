-- Immutable, per-response Gemini ledger.  This deliberately does not reuse the
-- retired cost_tracking table: a response row is the source of truth for daily
-- accounting, retry reconciliation, and price-snapshot audits.
CREATE TABLE IF NOT EXISTS public.gemini_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'gemini' CHECK (provider = 'gemini'),
  model text NOT NULL,
  model_version text,
  operation text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  source_key text NOT NULL UNIQUE,
  project_id uuid REFERENCES public.ai_story_projects(id) ON DELETE SET NULL,
  novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'blocked', 'failed')),
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  cached_input_tokens integer NOT NULL DEFAULT 0 CHECK (cached_input_tokens >= 0),
  candidate_tokens integer NOT NULL DEFAULT 0 CHECK (candidate_tokens >= 0),
  candidate_text_tokens integer NOT NULL DEFAULT 0 CHECK (candidate_text_tokens >= 0),
  candidate_image_tokens integer NOT NULL DEFAULT 0 CHECK (candidate_image_tokens >= 0),
  thinking_tokens integer NOT NULL DEFAULT 0 CHECK (thinking_tokens >= 0),
  tool_use_prompt_tokens integer NOT NULL DEFAULT 0 CHECK (tool_use_prompt_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  grounding_search_queries integer NOT NULL DEFAULT 0 CHECK (grounding_search_queries >= 0),
  token_cost_usd numeric(14, 8),
  grounding_cost_upper_usd numeric(14, 8) NOT NULL DEFAULT 0 CHECK (grounding_cost_upper_usd >= 0),
  price_status text NOT NULL CHECK (price_status IN ('priced', 'unpriced')),
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gemini_usage_events_observed_at_idx
  ON public.gemini_usage_events (observed_at DESC);

CREATE INDEX IF NOT EXISTS gemini_usage_events_project_observed_at_idx
  ON public.gemini_usage_events (project_id, observed_at DESC)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS gemini_usage_events_source_idx
  ON public.gemini_usage_events (source_type, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.gemini_usage_events ENABLE ROW LEVEL SECURITY;

-- Event rows are accounting records, never a public API surface. Server-side
-- admin routes use the service role; no user-level policy is intentionally added.
REVOKE ALL ON TABLE public.gemini_usage_events FROM anon, authenticated;

CREATE OR REPLACE VIEW public.gemini_usage_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', observed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS vn_date,
  model,
  operation,
  price_status,
  count(*)::bigint AS calls,
  sum(prompt_tokens)::bigint AS prompt_tokens,
  sum(cached_input_tokens)::bigint AS cached_input_tokens,
  sum(candidate_tokens)::bigint AS candidate_tokens,
  sum(candidate_text_tokens)::bigint AS candidate_text_tokens,
  sum(candidate_image_tokens)::bigint AS candidate_image_tokens,
  sum(thinking_tokens)::bigint AS thinking_tokens,
  sum(tool_use_prompt_tokens)::bigint AS tool_use_prompt_tokens,
  sum(total_tokens)::bigint AS total_tokens,
  sum(grounding_search_queries)::bigint AS grounding_search_queries,
  coalesce(sum(token_cost_usd), 0)::numeric(14, 8) AS token_cost_usd,
  sum(grounding_cost_upper_usd)::numeric(14, 8) AS grounding_cost_upper_usd
FROM public.gemini_usage_events
GROUP BY 1, 2, 3, 4;

REVOKE ALL ON TABLE public.gemini_usage_daily FROM anon, authenticated;
GRANT SELECT ON TABLE public.gemini_usage_events, public.gemini_usage_daily TO service_role;

COMMENT ON TABLE public.gemini_usage_events IS
  'One immutable, deduplicated Gemini API response per row. Usage counters come from Gemini usageMetadata; price is a versioned list-price estimate, not a provider invoice.';

COMMENT ON VIEW public.gemini_usage_daily IS
  'Vietnam-day Gemini token/accounting aggregate. token_cost_usd excludes cache storage and the shared monthly free allowance for Search grounding; grounding_cost_upper_usd is the worst-case incremental Search amount.';
