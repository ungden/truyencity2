/**
 * Quality Overhaul 1.4 — admin review queue writer.
 *
 * Degraded-content recovery paths (golden chapter fallback, revise-pass
 * failure, unfixed high-risk contradictions, circuit breaker hits, abandoned
 * foreshadowing) used to vanish into console.warn. Every such event now
 * lands a row in admin_review_queue, surfaced on /admin/quality with an SLA
 * highlight for rows pending >48h.
 *
 * Non-fatal by design: enqueue failures are logged and swallowed — the
 * pipeline never breaks because the review queue is unavailable.
 */

import { getSupabase } from '../utils/supabase';

export type ReviewReason =
  | 'golden_fallback'
  | 'revise_pass_failed'
  | 'major_contradiction_unfixed'
  | 'quality_circuit_breaker'
  | 'foreshadowing_abandoned'
  | 'story_rule_violation';

export interface ReviewQueueEntry {
  projectId: string;
  novelId?: string | null;
  chapterNumber?: number | null;
  reason: ReviewReason;
  detail?: Record<string, unknown>;
}

export async function enqueueAdminReview(entry: ReviewQueueEntry): Promise<void> {
  try {
    const db = getSupabase();
    // Dedup: skip if an identical pending row already exists (cron retries
    // and repeated circuit-breaker runs would otherwise spam the queue).
    let dedupQuery = db
      .from('admin_review_queue')
      .select('id')
      .eq('project_id', entry.projectId)
      .eq('reason', entry.reason)
      .eq('status', 'pending');
    dedupQuery = entry.chapterNumber != null
      ? dedupQuery.eq('chapter_number', entry.chapterNumber)
      : dedupQuery.is('chapter_number', null);
    const { data: existing } = await dedupQuery.limit(1).maybeSingle();
    if (existing) return;

    const { error } = await db.from('admin_review_queue').insert({
      project_id: entry.projectId,
      novel_id: entry.novelId ?? null,
      chapter_number: entry.chapterNumber ?? null,
      reason: entry.reason,
      detail: entry.detail ?? {},
    });
    if (error) {
      console.warn(`[AdminReviewQueue] insert failed (${entry.reason}):`, error.message);
    }
  } catch (e) {
    console.warn(`[AdminReviewQueue] enqueue threw (${entry.reason}):`, e instanceof Error ? e.message : String(e));
  }
}
