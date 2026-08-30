-- Durable, idempotent outbox for operator-only Story Factory email alerts.
-- Service role is the sole writer/reader; there are intentionally no client
-- policies because these messages may contain internal error evidence.
CREATE TABLE public.story_factory_operator_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  event_kind text NOT NULL CHECK (event_kind IN ('terminal_block', 'stalled_cron', 'cron_failure')),
  title text NOT NULL,
  message text NOT NULL,
  job_id uuid REFERENCES public.story_factory_jobs(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.story_factory_runs(id) ON DELETE SET NULL,
  stage text,
  chapter_number integer,
  error_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX story_factory_operator_alerts_delivery_idx
  ON public.story_factory_operator_alerts (status, next_attempt_at, created_at)
  WHERE status = 'pending';

ALTER TABLE public.story_factory_operator_alerts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.story_factory_operator_alerts IS
  'Private outbox for idempotent Story Factory operator email alerts.';
