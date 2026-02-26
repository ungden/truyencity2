-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0134: Remove ghost pg_cron jobs
--
-- ai-editor-scan and ai-editor-rewrite route handlers were deleted in
-- Phase 8 dead code cleanup. The cron jobs still fire every 10min/daily
-- hitting 404s. Remove them.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Unschedule ghost jobs (idempotent — no error if already gone)
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'ai-editor-scan-cron',
    'ai-editor-rewrite-cron'
  );

  RAISE NOTICE 'Removed 2 ghost pg_cron jobs: ai-editor-scan-cron, ai-editor-rewrite-cron';
END;
$$;
