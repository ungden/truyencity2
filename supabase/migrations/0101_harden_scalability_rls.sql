-- Migration: Harden RLS for scalability tables
-- Restrict read/write from public to authenticated/service role only.

-- ============================================================================
-- plot_threads
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read access to plot_threads" ON plot_threads;
DROP POLICY IF EXISTS "Allow authenticated users to manage plot_threads" ON plot_threads;

CREATE POLICY "Authenticated can read plot_threads"
  ON plot_threads FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Service role can manage plot_threads"
  ON plot_threads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- volume_summaries
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read access to volume_summaries" ON volume_summaries;
DROP POLICY IF EXISTS "Allow authenticated users to manage volume_summaries" ON volume_summaries;

CREATE POLICY "Authenticated can read volume_summaries"
  ON volume_summaries FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Service role can manage volume_summaries"
  ON volume_summaries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- world_rules_index
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read access to world_rules_index" ON world_rules_index;
DROP POLICY IF EXISTS "Allow authenticated users to manage world_rules_index" ON world_rules_index;

CREATE POLICY "Authenticated can read world_rules_index"
  ON world_rules_index FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Service role can manage world_rules_index"
  ON world_rules_index FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- milestone_validations
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read access to milestone_validations" ON milestone_validations;
DROP POLICY IF EXISTS "Allow authenticated users to manage milestone_validations" ON milestone_validations;

CREATE POLICY "Authenticated can read milestone_validations"
  ON milestone_validations FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Service role can manage milestone_validations"
  ON milestone_validations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
