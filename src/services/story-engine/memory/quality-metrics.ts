/**
 * Story Engine v2 — Quality Metrics (Phase 22 Stage 2 Q8)
 *
 * Records per-chapter quality scores so we can:
 * - Detect quality regressions over time
 * - Correlate metrics with reader retention
 * - A/B test pipeline changes objectively
 * - Surface low-quality chapters for manual review
 *
 * Non-fatal: write failure doesn't block chapter shipping.
 */

import { getSupabase } from '../utils/supabase';

export interface QualityMetricsInput {
  projectId: string;
  novelId: string;
  chapterNumber: number;
  // Critic
  overallScore?: number | null;
  dopamineScore?: number | null;
  pacingScore?: number | null;
  endingHookScore?: number | null;
  wordCount?: number | null;
  wordRatio?: number | null;
  // Continuity
  contradictionsCritical?: number;
  contradictionsWarning?: number;
  guardianIssuesCritical?: number;
  guardianIssuesMajor?: number;
  guardianIssuesModerate?: number;
  // Recovery
  rewritesAttempted?: number;
  autoRevised?: boolean;
  // Pipeline
  contextSizeChars?: number;
  writerEvidenceChars?: number;
  meta?: Record<string, unknown>;
}

export async function recordQualityMetrics(input: QualityMetricsInput): Promise<void> {
  try {
    const db = getSupabase();
    const { error } = await db.from('quality_metrics').upsert({
      project_id: input.projectId,
      novel_id: input.novelId,
      chapter_number: input.chapterNumber,
      overall_score: input.overallScore ?? null,
      dopamine_score: input.dopamineScore ?? null,
      pacing_score: input.pacingScore ?? null,
      ending_hook_score: input.endingHookScore ?? null,
      word_count: input.wordCount ?? null,
      word_ratio: input.wordRatio ?? null,
      contradictions_critical: input.contradictionsCritical ?? 0,
      contradictions_warning: input.contradictionsWarning ?? 0,
      guardian_issues_critical: input.guardianIssuesCritical ?? 0,
      guardian_issues_major: input.guardianIssuesMajor ?? 0,
      guardian_issues_moderate: input.guardianIssuesModerate ?? 0,
      rewrites_attempted: input.rewritesAttempted ?? 0,
      auto_revised: input.autoRevised ?? false,
      context_size_chars: input.contextSizeChars ?? null,
      writer_evidence_chars: input.writerEvidenceChars ?? null,
      meta: input.meta ?? {},
    }, { onConflict: 'project_id,chapter_number' });

    if (error) {
      console.warn(`[QualityMetrics] Save failed for ch.${input.chapterNumber}: ${error.message}`);
    }
  } catch (e) {
    console.warn('[QualityMetrics] Unexpected error:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Surface chapters with concerning quality for review.
 * Used by audit dashboards.
 */
export async function getLowQualityChapters(
  projectId: string,
  options: { minOverall?: number; lookback?: number } = {},
): Promise<Array<{ chapter_number: number; overall_score: number; issues_total: number }>> {
  const db = getSupabase();
  const { data } = await db
    .from('quality_metrics')
    .select('chapter_number,overall_score,contradictions_critical,guardian_issues_critical,guardian_issues_major')
    .eq('project_id', projectId)
    .or(`overall_score.lt.${options.minOverall ?? 6},guardian_issues_critical.gt.0,contradictions_critical.gt.0`)
    .order('chapter_number', { ascending: false })
    .limit(options.lookback ?? 50);

  return (data || []).map(r => ({
    chapter_number: r.chapter_number,
    overall_score: r.overall_score,
    issues_total: (r.contradictions_critical || 0) + (r.guardian_issues_critical || 0) + (r.guardian_issues_major || 0),
  }));
}
