/**
 * Quality Overhaul 1.5 — quality circuit breaker.
 *
 * quality_trends already classifies per-novel drift (ok/watch/warn/critical)
 * but nothing acted on it: a novel could ship critical-drift chapters for
 * weeks before anyone noticed. The breaker trips when a project is 'critical'
 * on TWO consecutive snapshots (one bad day = noise; two = trend).
 *
 * Modes via env QUALITY_CIRCUIT_BREAKER:
 *  - 'shadow' (default): log + enqueue admin_review_queue row only. NO pause.
 *    Initial rollout mode — the previous over-aggressive gate incident
 *    (commit 1f69d2b) auto-paused 2/3 of production; never again without
 *    a human reviewing the queue first.
 *  - 'enforce': additionally set style_directives.quality_hold=true; the
 *    write-chapters cron skips held projects. Admin Resume button clears it.
 *  - 'off': disabled entirely.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueAdminReview } from './admin-review-queue';

export type BreakerMode = 'shadow' | 'enforce' | 'off';

export function getBreakerMode(): BreakerMode {
  const raw = (process.env.QUALITY_CIRCUIT_BREAKER || 'shadow').toLowerCase();
  if (raw === 'enforce') return 'enforce';
  if (raw === 'off') return 'off';
  return 'shadow';
}

/** Pure trip decision — exported for unit tests. */
export function shouldTripBreaker(
  currentLevel: string,
  previousLevel: string | null | undefined,
): boolean {
  return currentLevel === 'critical' && previousLevel === 'critical';
}

export interface BreakerTrendInput {
  project_id: string;
  novel_id: string | null;
  alert_level: string;
  current_chapter: number;
  drift: number | null;
  recent_avg_score: number | null;
  snapshot_date: string;
}

export interface BreakerResult {
  mode: BreakerMode;
  evaluated: number;
  tripped: number;
  held: number;
}

export async function applyCircuitBreaker(
  supabase: SupabaseClient,
  trends: BreakerTrendInput[],
): Promise<BreakerResult> {
  const mode = getBreakerMode();
  const result: BreakerResult = { mode, evaluated: 0, tripped: 0, held: 0 };
  if (mode === 'off') return result;

  const criticals = trends.filter(t => t.alert_level === 'critical');
  for (const trend of criticals) {
    result.evaluated++;
    try {
      // Previous snapshot strictly before today's.
      const { data: prev } = await supabase
        .from('quality_trends')
        .select('alert_level, snapshot_date')
        .eq('project_id', trend.project_id)
        .lt('snapshot_date', trend.snapshot_date)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shouldTripBreaker(trend.alert_level, prev?.alert_level)) continue;
      result.tripped++;

      console.error(
        `[CircuitBreaker:${mode}] project ${trend.project_id} critical 2 consecutive snapshots ` +
        `(drift=${trend.drift}, recent_avg=${trend.recent_avg_score}, ch.${trend.current_chapter})`,
      );

      await enqueueAdminReview({
        projectId: trend.project_id,
        novelId: trend.novel_id,
        chapterNumber: trend.current_chapter,
        reason: 'quality_circuit_breaker',
        detail: {
          mode,
          drift: trend.drift,
          recent_avg_score: trend.recent_avg_score,
          snapshot_date: trend.snapshot_date,
        },
      });

      if (mode === 'enforce') {
        const { data: project } = await supabase
          .from('ai_story_projects')
          .select('style_directives')
          .eq('id', trend.project_id)
          .maybeSingle();
        const directives = (project?.style_directives as Record<string, unknown> | null) || {};
        if (directives.quality_hold === true) continue; // already held
        const { error } = await supabase
          .from('ai_story_projects')
          .update({
            style_directives: { ...directives, quality_hold: true },
            updated_at: new Date().toISOString(),
          })
          .eq('id', trend.project_id);
        if (error) {
          console.error(`[CircuitBreaker] failed to set quality_hold for ${trend.project_id}: ${error.message}`);
        } else {
          result.held++;
        }
      }
    } catch (e) {
      console.warn(`[CircuitBreaker] evaluation failed for ${trend.project_id}:`, e instanceof Error ? e.message : String(e));
    }
  }
  return result;
}
