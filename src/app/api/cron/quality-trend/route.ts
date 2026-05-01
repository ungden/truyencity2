/**
 * Quality Trend Cron — V1 of supreme goals verification.
 *
 * Runs daily 00:30 VN. For each active novel with current_chapter ≥ 30:
 *  - early_window: avg(overall_score) of chapters 1..30
 *  - recent_window: avg(overall_score) of last 30 chapters
 *  - drift = recent_avg - early_avg
 *  - alert_level: ok (drift ≥ -0.5) / watch (-1.0) / warn (-1.5) / critical (-2.0+ or recent < 5)
 *
 * Persists to quality_trends table — admin UI surfaces alert_level=warn|critical.
 *
 * Triggered by pg_cron job + admin manual invoke.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const EARLY_WINDOW_SIZE = 30;
const RECENT_WINDOW_SIZE = 30;
const MIN_CHAPTERS_FOR_TREND = 30; // skip novels too short to have meaningful trend

function classifyAlert(drift: number, recentAvg: number): 'ok' | 'watch' | 'warn' | 'critical' {
  if (recentAvg < 4.5) return 'critical';
  if (drift <= -2.0) return 'critical';
  if (drift <= -1.5) return 'warn';
  if (drift <= -1.0) return 'watch';
  return 'ok';
}

interface TrendRow {
  project_id: string;
  novel_id: string | null;
  snapshot_date: string;
  current_chapter: number;
  early_window_chapters: number;
  early_avg_score: number | null;
  recent_window_chapters: number;
  recent_avg_score: number | null;
  drift: number | null;
  critical_issues_total: number;
  guardian_issues_total: number;
  alert_level: 'ok' | 'watch' | 'warn' | 'critical';
  meta: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch active novels with enough chapters for meaningful trend
  const { data: projects, error: projErr } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id,current_chapter')
    .in('status', ['active', 'paused'])
    .gte('current_chapter', MIN_CHAPTERS_FOR_TREND);

  if (projErr) {
    return NextResponse.json({ success: false, error: projErr.message }, { status: 500 });
  }

  const trends: TrendRow[] = [];
  let processed = 0;
  let skipped = 0;

  for (const p of projects || []) {
    const currentCh = p.current_chapter || 0;

    // Early window: first 30 chapters with quality_metrics
    const { data: earlyMetrics } = await supabase
      .from('quality_metrics')
      .select('overall_score,contradictions_critical,guardian_issues_critical')
      .eq('project_id', p.id)
      .gte('chapter_number', 1)
      .lte('chapter_number', EARLY_WINDOW_SIZE)
      .order('chapter_number', { ascending: true });

    const recentStart = Math.max(EARLY_WINDOW_SIZE + 1, currentCh - RECENT_WINDOW_SIZE + 1);
    const { data: recentMetrics } = await supabase
      .from('quality_metrics')
      .select('overall_score,contradictions_critical,guardian_issues_critical')
      .eq('project_id', p.id)
      .gte('chapter_number', recentStart)
      .lte('chapter_number', currentCh);

    if (!earlyMetrics?.length || !recentMetrics?.length) {
      skipped++;
      continue;
    }

    const earlyAvg = earlyMetrics.reduce((s, m) => s + (m.overall_score || 0), 0) / earlyMetrics.length;
    const recentAvg = recentMetrics.reduce((s, m) => s + (m.overall_score || 0), 0) / recentMetrics.length;
    const drift = Number((recentAvg - earlyAvg).toFixed(2));

    const criticalTotal = (earlyMetrics.concat(recentMetrics))
      .reduce((s, m) => s + (m.contradictions_critical || 0), 0);
    const guardianTotal = (earlyMetrics.concat(recentMetrics))
      .reduce((s, m) => s + (m.guardian_issues_critical || 0), 0);

    const alertLevel = classifyAlert(drift, recentAvg);

    // Phase 29 Feature 1: 10-chapter meta-diagnosis. Runs when chapter is on
    // a 10-chapter boundary OR when the trend is flagged. Per-chapter Critic
    // can't catch arc-level issues like "MC won 4 fights in a row" or "cast
    // member missing for 12 chapters" — this fills that gap.
    let diagnosisMeta: Record<string, unknown> | null = null;
    const shouldDiagnose = currentCh % 10 === 0 || alertLevel !== 'ok';
    if (shouldDiagnose) {
      try {
        const { diagnoseRecent10Chapters } = await import('@/services/story-engine/quality/chapter-diagnosis');
        const { DEFAULT_CONFIG } = await import('@/services/story-engine/types');
        const diagnosis = await diagnoseRecent10Chapters(p.id, currentCh, DEFAULT_CONFIG);
        if (diagnosis) {
          diagnosisMeta = diagnosis as unknown as Record<string, unknown>;
        }
      } catch (e) {
        console.warn(`[quality-trend cron] diagnosis failed for ${p.id}:`, e instanceof Error ? e.message : String(e));
      }
    }

    trends.push({
      project_id: p.id,
      novel_id: p.novel_id,
      snapshot_date: today,
      current_chapter: currentCh,
      early_window_chapters: earlyMetrics.length,
      early_avg_score: Number(earlyAvg.toFixed(2)),
      recent_window_chapters: recentMetrics.length,
      recent_avg_score: Number(recentAvg.toFixed(2)),
      drift,
      critical_issues_total: criticalTotal,
      guardian_issues_total: guardianTotal,
      alert_level: alertLevel,
      meta: {
        recent_window_start: recentStart,
        recent_window_end: currentCh,
        ...(diagnosisMeta ? { diagnosis: diagnosisMeta } : {}),
      },
    });
    processed++;
  }

  // Upsert all trends in one go (unique on project_id + snapshot_date)
  if (trends.length > 0) {
    const { error: upsertErr } = await supabase
      .from('quality_trends')
      .upsert(trends, { onConflict: 'project_id,snapshot_date' });
    if (upsertErr) {
      return NextResponse.json({ success: false, error: upsertErr.message, processed, skipped }, { status: 500 });
    }
  }

  const alertCounts = trends.reduce((acc, t) => {
    acc[t.alert_level] = (acc[t.alert_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Phase 28 TIER 3.1: Auto-revise outlines for projects in critical drift.
  // Runs AFTER trend snapshot is persisted so revision trigger detection sees
  // today's snapshot. Expensive AI work — done sequentially to control cost.
  let revisionStats = { scanned: 0, triggered: 0, revised: 0 };
  try {
    const { scanAndReviseDriftedProjects } = await import('@/services/story-engine/pipeline/outline-reviser');
    const { DEFAULT_CONFIG } = await import('@/services/story-engine/types');
    revisionStats = await scanAndReviseDriftedProjects({ ...DEFAULT_CONFIG, model: 'deepseek-v4-flash' });
  } catch (e) {
    console.warn('[quality-trend cron] outline auto-revision scan threw:', e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    success: true,
    processed,
    skipped,
    alerts: alertCounts,
    snapshot_date: today,
    outline_revision: revisionStats,
  });
}
