-- =============================================================================
-- Migration 0031: Security Hardening
-- 1. Enable RLS on 4 tables missing it (health_checks, embedding_cache, cost_tracking, qc_results)
-- 2. Restrict 10 tables from "any authenticated" to "admin only" for writes
-- 3. Fix consume_chapter_credit to use auth.uid() instead of accepting arbitrary p_user_id
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Enable RLS + add admin-only policies on 4 unprotected tables
-- These tables are internal/admin-only — no regular user should access them.
-- ─────────────────────────────────────────────────────────────────────────────

-- health_checks: system health monitoring (admin read-only, service_role writes)
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_checks_admin_select"
  ON health_checks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No INSERT/UPDATE/DELETE policy for authenticated users.
-- Only service_role (which bypasses RLS) can write.

-- embedding_cache: AI embedding cache (admin-only access via client)
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embedding_cache_admin_all"
  ON embedding_cache FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- cost_tracking: AI cost tracking (admin-only access via client)
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_tracking_admin_all"
  ON cost_tracking FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- qc_results: AI quality check results (admin-only access via client)
ALTER TABLE qc_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qc_results_admin_all"
  ON qc_results FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Restrict 10 tables from "any authenticated" to "admin only" for writes
-- Keep public SELECT where it existed, but restrict INSERT/UPDATE/DELETE to admins.
-- ─────────────────────────────────────────────────────────────────────────────

-- Group A: plot_arcs, planned_twists, character_arcs, hierarchical_summaries
-- Currently have: public SELECT + authenticated ALL
-- Target: public SELECT + admin-only ALL (for writes)

-- Drop old overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to manage plot_arcs" ON plot_arcs;
DROP POLICY IF EXISTS "Allow authenticated users to manage planned_twists" ON planned_twists;
DROP POLICY IF EXISTS "Allow authenticated users to manage character_arcs" ON character_arcs;
DROP POLICY IF EXISTS "Allow authenticated users to manage hierarchical_summaries" ON hierarchical_summaries;

-- Create admin-only write policies (public SELECT policies remain unchanged)
CREATE POLICY "plot_arcs_admin_write"
  ON plot_arcs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "planned_twists_admin_write"
  ON planned_twists FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "character_arcs_admin_write"
  ON character_arcs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "hierarchical_summaries_admin_write"
  ON hierarchical_summaries FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Group B: story_embeddings, character_tracker, power_progression,
--          world_state, consistency_issues, beat_usage
-- Currently have: authenticated ALL
-- Target: admin-only ALL

DROP POLICY IF EXISTS "story_embeddings_all" ON story_embeddings;
DROP POLICY IF EXISTS "character_tracker_all" ON character_tracker;
DROP POLICY IF EXISTS "power_progression_all" ON power_progression;
DROP POLICY IF EXISTS "world_state_all" ON world_state;
DROP POLICY IF EXISTS "consistency_issues_all" ON consistency_issues;
DROP POLICY IF EXISTS "beat_usage_all" ON beat_usage;

CREATE POLICY "story_embeddings_admin_all"
  ON story_embeddings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "character_tracker_admin_all"
  ON character_tracker FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "power_progression_admin_all"
  ON power_progression FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "world_state_admin_all"
  ON world_state FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "consistency_issues_admin_all"
  ON consistency_issues FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "beat_usage_admin_all"
  ON beat_usage FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Fix consume_chapter_credit to use auth.uid() instead of p_user_id
-- This prevents any user from draining another user's credits via RPC.
-- The function remains SECURITY DEFINER so it can update user_credits.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION consume_chapter_credit(
  p_chapter_id UUID DEFAULT NULL,
  p_words_count INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_can_write JSONB;
  v_new_daily_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Always use the authenticated user's ID, never accept it as a parameter
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'not_authenticated');
  END IF;

  -- Check if user can write
  v_can_write := can_user_write_chapter(v_user_id);

  IF NOT (v_can_write->>'allowed')::boolean THEN
    RETURN v_can_write;
  END IF;

  -- Update daily usage
  UPDATE user_credits
  SET
    daily_used = CASE
      WHEN daily_reset_at < NOW() - INTERVAL '24 hours' THEN 1
      ELSE daily_used + 1
    END,
    daily_reset_at = CASE
      WHEN daily_reset_at < NOW() - INTERVAL '24 hours' THEN NOW()
      ELSE daily_reset_at
    END,
    lifetime_spent = lifetime_spent + 1,
    updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING daily_used, balance INTO v_new_daily_used, v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    v_user_id, 'credit_usage', -1, v_new_balance,
    'chapter', p_chapter_id,
    'Viết chương mới (' || COALESCE(p_words_count, 0) || ' từ)'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'daily_used', v_new_daily_used,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
