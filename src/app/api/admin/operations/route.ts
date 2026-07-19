/**
 * Admin Operations API (Phase 23 S6)
 *
 * One-stop admin endpoint for common ops:
 *  - resume_cron / pause_cron
 *  - rewrite_recent (bulk reset N most recent novels)
 *  - test_one_chapter (force write 1 chapter for a specific project)
 *  - pause_novel / resume_novel
 *  - status (cron states + active counts + budget)
 *
 * Auth: isAuthorizedAdmin (admin user OR Bearer CRON_SECRET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { evaluateChapterQuality, evaluateWindowQuality } from '@/services/story-engine/quality/quality-contract';

export const maxDuration = 800;
export const dynamic = 'force-dynamic';

function parseStatuses(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const statuses = raw.map(String).map((item) => item.trim()).filter(Boolean);
    return statuses.length > 0 ? statuses : ['active', 'paused'];
  }
  if (typeof raw === 'string') {
    const statuses = raw.split(',').map((item) => item.trim()).filter(Boolean);
    return statuses.length > 0 ? statuses : ['active', 'paused'];
  }
  return ['active', 'paused'];
}

async function getStatus() {
  const supabase = getSupabaseAdmin();

  // Cron status read via direct SELECT on cron.job (requires service_role).
  // PostgREST doesn't expose cron schema by default — caller can use Supabase MCP
  // or pg_cron jobid query via a stored function. For now we omit cron status from
  // API response and rely on logs / MCP for cron management.
  const cronStatus: Array<{ jobname: string; schedule: string; active: boolean }> = [];

  const { count: activeCount } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: pausedCount } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paused');

  // Last 24h chapters written
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: chapters24h } = await supabase
    .from('chapters')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dayAgo);

  // Failed memory tasks pending
  const { count: failedTasksPending } = await supabase
    .from('failed_memory_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Budget
  const { checkMonthlyBudget } = await import('@/services/story-engine/utils/budget-guard');
  const budget = await checkMonthlyBudget();

  return {
    crons: cronStatus,
    novels: { active: activeCount || 0, paused: pausedCount || 0 },
    chapters_24h: chapters24h || 0,
    failed_tasks_pending: failedTasksPending || 0,
    budget,
  };
}

/**
 * List novels currently in trouble: auto-paused (circuit breaker / cost cap), or
 * active but logging consecutive failures today. Each row includes the last
 * error message so the user can fix the root cause without SQL.
 */
async function getStuckNovels(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const dayStartUtc = new Date();
  dayStartUtc.setUTCHours(0, 0, 0, 0);
  const todayIso = dayStartUtc.toISOString();

  // Auto-paused projects (circuit breaker or cost cap fired).
  const { data: pausedRows } = await supabase
    .from('ai_story_projects')
    .select('id,status,pause_reason,paused_at,current_chapter,total_planned_chapters,novel_id,novels(title)')
    .not('paused_at', 'is', null)
    .order('paused_at', { ascending: false })
    .limit(50);

  // Active projects with retry_count > 0 today (failing but not yet paused).
  const vnDate = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: failingQuotas } = await supabase
    .from('project_daily_quotas')
    .select('project_id,retry_count,last_error,updated_at,vn_date')
    .eq('vn_date', vnDate)
    .gt('retry_count', 0)
    .order('retry_count', { ascending: false })
    .limit(50);

  const failingProjectIds = (failingQuotas || []).map(q => q.project_id);
  const { data: failingProjects } = failingProjectIds.length
    ? await supabase
        .from('ai_story_projects')
        .select('id,status,current_chapter,total_planned_chapters,novel_id,novels(title)')
        .in('id', failingProjectIds)
    : { data: [] };
  const projectMap = new Map((failingProjects || []).map(p => [p.id, p]));

  // Cost-spike projects: top 5 by today's cost (helps spot near-cap novels).
  const { data: costRows } = await supabase
    .from('cost_tracking')
    .select('project_id,cost')
    .gte('created_at', todayIso);
  const costByProject = new Map<string, number>();
  for (const row of costRows || []) {
    costByProject.set(row.project_id, (costByProject.get(row.project_id) || 0) + (Number(row.cost) || 0));
  }
  const topCost = Array.from(costByProject.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    auto_paused: (pausedRows || []).map(p => {
      const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
      return {
        project_id: p.id,
        title: (novel as { title?: string } | null)?.title || '?',
        pause_reason: p.pause_reason,
        paused_at: p.paused_at,
        progress: `${p.current_chapter || 0} / ${p.total_planned_chapters || 0}`,
        cost_today_usd: Number((costByProject.get(p.id) || 0).toFixed(4)),
      };
    }),
    failing_today: (failingQuotas || []).map(q => {
      const proj = projectMap.get(q.project_id);
      const novel = proj ? (Array.isArray(proj.novels) ? proj.novels[0] : proj.novels) : null;
      return {
        project_id: q.project_id,
        title: (novel as { title?: string } | null)?.title || '?',
        retry_count: q.retry_count,
        last_error: q.last_error,
        last_attempt: q.updated_at,
        progress: proj ? `${proj.current_chapter || 0} / ${proj.total_planned_chapters || 0}` : '?',
        status: proj?.status || '?',
        cost_today_usd: Number((costByProject.get(q.project_id) || 0).toFixed(4)),
      };
    }),
    top_cost_today: topCost.map(([id, cost]) => ({
      project_id: id,
      cost_today_usd: Number(cost.toFixed(4)),
    })),
  };
}

/**
 * P4.3: Regression audit — sample recent chapters across active novels and check for
 * known drift patterns. Surfaces issues per-project with score 0-100 so user spots
 * regressions ngay khi chúng xuất hiện thay vì chờ user phát hiện.
 *
 * Patterns checked per chapter:
 *   - <MC>/<LOVE>/<CITY> placeholder literal leaks (voice anchor escape)
 *   - MC name absent (suggests 100% name drift)
 *   - "xu" / "nguyên" digit-currency on VN-set genres
 *
 * Score: 100 - (10 * issues_found_per_sample)
 */
async function runRegressionAudit(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: { sampleSize?: number; perProjectChapters?: number; status?: string | string[] },
) {
  const sampleSize = Math.min(50, Math.max(5, body.sampleSize || 20));
  const perProjectChapters = Math.min(10, Math.max(1, body.perProjectChapters || 3));
  const statuses = parseStatuses(body.status);

  const { data: projects } = await supabase
    .from('ai_story_projects')
    .select('id,status,main_character,genre,world_description,novel_id,target_chapter_length,style_directives,novels(title)')
    .in('status', statuses)
    .gt('current_chapter', 0)
    .order('updated_at', { ascending: false })
    .limit(sampleSize);

  if (!projects?.length) return { audited: 0, statuses, results: [] };

  const results: Array<{
    project_id: string;
    title: string;
    genre: string | null;
    chapters_sampled: number;
    issues: Array<{ chapter: number; issues: string[] }>;
    score: number;
    verdicts: Record<string, number>;
  }> = [];

  for (const p of projects) {
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const novelId = p.novel_id;
    const { data: chapters } = await supabase
      .from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: false })
      .limit(perProjectChapters);

    const chapterIssues: Array<{ chapter: number; issues: string[] }> = [];
    let totalScore = 0;
    const verdicts: Record<string, number> = { pass: 0, revise: 0, block: 0 };

    for (const ch of chapters || []) {
      const report = evaluateChapterQuality(ch.content || '', {
        title: ch.title,
        protagonistName: p.main_character,
        targetWords: p.target_chapter_length || 2200,
        minWords: 1800,
        genre: p.genre,
        worldDescription: p.world_description,
      });
      totalScore += report.score;
      verdicts[report.verdict] = (verdicts[report.verdict] || 0) + 1;
      const issues = report.issues.map((issue) => `${issue.code}:${issue.severity}`);

      if (issues.length > 0) {
        chapterIssues.push({ chapter: ch.chapter_number, issues });
      }
    }

    const score = chapters?.length ? Math.round(totalScore / chapters.length) : 0;
    results.push({
      project_id: p.id,
      title: (novel as { title?: string } | null)?.title || '?',
      genre: p.genre,
      chapters_sampled: chapters?.length || 0,
      issues: chapterIssues,
      score,
      verdicts,
    });
  }

  // Sort by score ascending — worst first
  results.sort((a, b) => a.score - b.score);

  const overall = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 100;

  return {
    audited: results.length,
    statuses,
    overall_score: overall,
    results,
  };
}

/**
 * V1: Surface quality trends from quality_trends table — most recent snapshot per project,
 * sorted by alert level (critical first).
 */
async function getQualityTrends(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: trends } = await supabase
    .from('quality_trends')
    .select('*,ai_story_projects(novel_id,novels(title))')
    .order('snapshot_date', { ascending: false })
    .limit(200);

  // Dedupe to most-recent per project
  const seen = new Set<string>();
  const latest: Array<Record<string, unknown>> = [];
  for (const t of trends || []) {
    if (seen.has(t.project_id)) continue;
    seen.add(t.project_id);
    const proj = (t as { ai_story_projects?: { novels?: { title?: string } | { title?: string }[] } }).ai_story_projects;
    const novel = Array.isArray(proj?.novels) ? proj?.novels[0] : proj?.novels;
    latest.push({
      project_id: t.project_id,
      title: (novel as { title?: string } | undefined)?.title || '?',
      snapshot_date: t.snapshot_date,
      current_chapter: t.current_chapter,
      early_avg: t.early_avg_score,
      recent_avg: t.recent_avg_score,
      drift: t.drift,
      alert_level: t.alert_level,
      critical_issues_total: t.critical_issues_total,
    });
  }

  const order = { critical: 0, warn: 1, watch: 2, ok: 3 };
  latest.sort((a, b) =>
    (order[a.alert_level as keyof typeof order] ?? 4) - (order[b.alert_level as keyof typeof order] ?? 4));

  const counts: Record<string, number> = {};
  for (const t of latest) {
    const lvl = t.alert_level as string;
    counts[lvl] = (counts[lvl] || 0) + 1;
  }

  return { count: latest.length, alerts: counts, trends: latest };
}

/**
 * V4: Supreme goals dashboard data. For each active novel, derive 5 traffic lights
 * from existing signals.
 */
async function getSupremeGoalsStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: { status?: string | string[]; perProjectChapters?: number } = {},
) {
  const statuses = parseStatuses(body.status);
  const perProjectChapters = Math.min(10, Math.max(3, body.perProjectChapters || 5));
  const { data: projects } = await supabase
    .from('ai_story_projects')
    .select('id,status,novel_id,genre,main_character,world_description,current_chapter,total_planned_chapters,target_chapter_length,style_directives,novels(title)')
    .in('status', statuses)
    .gt('current_chapter', 0)
    .order('updated_at', { ascending: false });

  if (!projects?.length) return { count: 0, statuses, projects: [] };

  // Bulk fetch latest quality_trends + failed_memory_tasks counts
  const projectIds = projects.map(p => p.id);
  const { data: trends } = await supabase
    .from('quality_trends')
    .select('project_id,alert_level,drift,recent_avg_score,critical_issues_total')
    .in('project_id', projectIds)
    .order('snapshot_date', { ascending: false });
  const trendByProject = new Map<string, { alert: string; drift: number | null; recent: number | null; criticals: number }>();
  for (const t of trends || []) {
    if (trendByProject.has(t.project_id)) continue; // first match = most recent due to order
    trendByProject.set(t.project_id, {
      alert: t.alert_level,
      drift: t.drift,
      recent: t.recent_avg_score,
      criticals: t.critical_issues_total || 0,
    });
  }

  const { data: failedTasks } = await supabase
    .from('failed_memory_tasks')
    .select('project_id')
    .in('project_id', projectIds)
    .eq('status', 'pending');
  const failedByProject = new Map<string, number>();
  for (const f of failedTasks || []) {
    failedByProject.set(f.project_id, (failedByProject.get(f.project_id) || 0) + 1);
  }

  // Bulk fetch open plot threads
  const { data: threads } = await supabase
    .from('plot_threads')
    .select('project_id,status')
    .in('project_id', projectIds);
  const threadStats = new Map<string, { open: number; resolved: number }>();
  for (const t of threads || []) {
    const cur = threadStats.get(t.project_id) || { open: 0, resolved: 0 };
    if (t.status === 'open') cur.open++;
    else if (t.status === 'resolved') cur.resolved++;
    threadStats.set(t.project_id, cur);
  }

  function gradeFromAlert(alert: string): 'green' | 'yellow' | 'red' {
    if (alert === 'critical' || alert === 'warn') return 'red';
    if (alert === 'watch') return 'yellow';
    return 'green';
  }

  const result = await Promise.all(projects.map(async (p) => {
    const trend = trendByProject.get(p.id);
    const failedCount = failedByProject.get(p.id) || 0;
    const tStats = threadStats.get(p.id) || { open: 0, resolved: 0 };
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const total = p.total_planned_chapters || 1000;
    const current = p.current_chapter || 0;
    const progressPct = Math.round((current / total) * 100);

    const { data: chapters } = await supabase
      .from('chapters')
      .select('chapter_number,title,content')
      .eq('novel_id', p.novel_id)
      .order('chapter_number', { ascending: false })
      .limit(perProjectChapters);
    const windowQuality = evaluateWindowQuality(
      p.id,
      (chapters || []).slice().reverse().map((chapter) => ({
        chapterNumber: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content || '',
      })),
      {
        protagonistName: p.main_character,
        targetWords: p.target_chapter_length || 2200,
        minWords: 1800,
        genre: p.genre,
        worldDescription: p.world_description,
      },
    );

    const combineGrade = (...grades: Array<'green' | 'yellow' | 'red'>): 'green' | 'yellow' | 'red' => {
      if (grades.includes('red')) return 'red';
      if (grades.includes('yellow')) return 'yellow';
      return 'green';
    };

    // Goal 1: Coherence — latest chapter text + trend alert + failed task count + open thread ratio
    const openRatio = tStats.open + tStats.resolved > 0
      ? tStats.open / (tStats.open + tStats.resolved)
      : 1;
    let historicalCoherence: 'green' | 'yellow' | 'red';
    if (failedCount > 5 || (trend && trend.alert === 'critical')) historicalCoherence = 'red';
    else if (failedCount > 2 || openRatio > 0.7 || (trend && trend.alert === 'warn')) historicalCoherence = 'yellow';
    else historicalCoherence = 'green';
    const coherence = combineGrade(historicalCoherence, windowQuality.supremeGoals.coherence);

    // Goal 2: Character consistency — based on critical_issues_total in trend
    let historicalChar: 'green' | 'yellow' | 'red';
    const crits = trend?.criticals || 0;
    if (crits > 5) historicalChar = 'red';
    else if (crits > 1) historicalChar = 'yellow';
    else historicalChar = 'green';
    const charConsist = combineGrade(historicalChar, windowQuality.supremeGoals.character_consistency);

    // Goal 3: Directional plot — derived from open vs resolved thread ratio + chapter progress
    let historicalDirectional: 'green' | 'yellow' | 'red';
    if (current < 20) historicalDirectional = 'green'; // too early to judge
    else if (openRatio > 0.8) historicalDirectional = 'red'; // nothing resolves
    else if (openRatio > 0.6) historicalDirectional = 'yellow';
    else historicalDirectional = 'green';
    const directional = combineGrade(historicalDirectional, windowQuality.supremeGoals.directional_plot);

    // Goal 4: Ending readiness — progress % + status
    let ending: 'green' | 'yellow' | 'red';
    if (progressPct >= 100) ending = 'green';
    else if (progressPct >= 80) ending = 'yellow';
    else ending = 'green'; // not yet at ending phase, OK

    // Goal 5: Uniform quality — directly from trend alert level
    const uniform: 'green' | 'yellow' | 'red' = combineGrade(trend ? gradeFromAlert(trend.alert) : 'green', windowQuality.supremeGoals.uniform_quality);

    return {
      project_id: p.id,
      title: (novel as { title?: string } | null)?.title || '?',
      status: p.status,
      current_chapter: current,
      total_planned_chapters: total,
      progress_pct: progressPct,
      goals: { coherence, charConsist, directional, ending, uniform },
      signals: {
        failed_tasks: failedCount,
        open_threads: tStats.open,
        resolved_threads: tStats.resolved,
        trend_drift: trend?.drift || null,
        trend_recent_avg: trend?.recent || null,
        trend_alert: trend?.alert || 'no_data',
        quality_score: windowQuality.trend.averageScore,
        quality_pass_rate: windowQuality.trend.passRate,
        quality_revise: windowQuality.trend.reviseCount,
        quality_block: windowQuality.trend.blockCount,
        codex_manual: p.style_directives?.codex_manual_pipeline === true,
        codex_automation: p.style_directives?.codex_automation_pipeline === true,
        genre_knowledge_pack: p.style_directives?.genre_knowledge_pack_version || null,
        genre_knowledge_primary: p.style_directives?.genre_knowledge_primary || p.genre || null,
        knowledge_alignment: p.style_directives?.knowledge_alignment || null,
        benchmark_families: p.style_directives?.genre_knowledge_benchmark_families || [],
      },
    };
  }));

  // Aggregate counts per goal
  const aggregate = { coherence: { green: 0, yellow: 0, red: 0 }, charConsist: { green: 0, yellow: 0, red: 0 }, directional: { green: 0, yellow: 0, red: 0 }, ending: { green: 0, yellow: 0, red: 0 }, uniform: { green: 0, yellow: 0, red: 0 } };
  for (const r of result) {
    for (const k of Object.keys(aggregate) as (keyof typeof aggregate)[]) {
      const lvl = r.goals[k];
      aggregate[k][lvl]++;
    }
  }

  return { count: result.length, statuses, aggregate, projects: result };
}

async function setCronActive(active: boolean) {
  // Cron management requires direct SQL via cron.alter_job. Not exposed via PostgREST.
  // Operator must use Supabase SQL editor / MCP. This endpoint is informational only.
  return {
    success: false,
    info: `Cron pause/resume requires direct SQL. Run: SELECT cron.alter_job(jobid, active := ${active}) FROM cron.job WHERE jobname IN ('write-chapters-cron','daily-spawn-cron','daily-rotate-cron','memory-replay-cron');`,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { action?: string; [k: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const action = body.action;
  if (!action) return NextResponse.json({ error: 'action_required' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  switch (action) {
    case 'status':
      return NextResponse.json(await getStatus());

    case 'stuck_novels':
      return NextResponse.json(await getStuckNovels(supabase));

    case 'regression_audit':
      return NextResponse.json(await runRegressionAudit(supabase, body as { sampleSize?: number; perProjectChapters?: number; status?: string | string[] }));

    case 'quality_trends':
      return NextResponse.json(await getQualityTrends(supabase));

    case 'supreme_goals':
      return NextResponse.json(await getSupremeGoalsStatus(supabase, body as { status?: string | string[]; perProjectChapters?: number }));

    case 'pause_cron':
      return NextResponse.json(await setCronActive(false));

    case 'resume_cron':
      return NextResponse.json(await setCronActive(true));

    case 'pause_novel': {
      const projectId = body.projectId as string;
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
      const { error } = await supabase
        .from('ai_story_projects')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', projectId);
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
    }

    case 'resume_novel': {
      const projectId = body.projectId as string;
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
      const { data: project } = await supabase
        .from('ai_story_projects')
        .select('pause_reason,style_directives')
        .eq('id', projectId)
        .maybeSingle();
      if (project?.pause_reason?.startsWith('legacy_archived_')) {
        return NextResponse.json({ error: 'legacy_archived_project_cannot_resume' }, { status: 409 });
      }
      if ((project?.style_directives as { pipeline_version?: string } | null)?.pipeline_version === 'flagship_v3') {
        return NextResponse.json({ error: 'flagship_v3_project_must_stay_paused_use_factory_job' }, { status: 409 });
      }
      const { error } = await supabase
        .from('ai_story_projects')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', projectId);
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
    }

    case 'test_one_chapter': {
      const projectId = body.projectId as string;
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
      const { data: project } = await supabase
        .from('ai_story_projects')
        .select('pause_reason,style_directives')
        .eq('id', projectId)
        .maybeSingle();
      if (project?.pause_reason?.startsWith('legacy_archived_')) {
        return NextResponse.json({ error: 'legacy_archived_project_cannot_write' }, { status: 409 });
      }
      if ((project?.style_directives as { pipeline_version?: string } | null)?.pipeline_version === 'flagship_v3') {
        return NextResponse.json({ error: 'flagship_v3_factory_entrypoint_required' }, { status: 409 });
      }
      const { writeChapterForProject } = await import('@/services/story-engine');
      try {
        const result = await writeChapterForProject({ projectId });
        return NextResponse.json({ success: true, result });
      } catch (e) {
        return NextResponse.json({
          success: false,
          error: e instanceof Error ? e.message : String(e),
        }, { status: 500 });
      }
    }

    case 'rewrite_recent': {
      const limit = Math.min(50, Math.max(1, parseInt(String(body.limit || 10), 10)));
      // Inline the same logic as scripts/rewrite-recent-10.ts but server-side
      const { data: targets } = await supabase
        .from('ai_story_projects')
        .select('id,novel_id')
        .in('status', ['active', 'paused'])
        .or('pause_reason.is.null,pause_reason.not.like.legacy_archived_*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!targets?.length) return NextResponse.json({ error: 'no_targets' }, { status: 400 });

      const projectIds = targets.map(t => t.id);
      const novelIds = targets.map(t => t.novel_id);

      // Pause first
      await supabase.from('ai_story_projects').update({ status: 'paused' }).in('id', projectIds);

      // Wipe memory + chapters
      const memoryTables = [
        'chapter_summaries', 'story_synopsis', 'arc_plans', 'character_states',
        'story_memory_chunks', 'plot_threads', 'world_rules_index', 'beat_usage',
        'volume_summaries', 'foreshadowing_plans', 'character_arcs',
        'character_signature_traits', 'pacing_blueprints', 'voice_fingerprints',
        'mc_power_states', 'world_locations', 'location_bibles',
        'character_knowledge', 'character_relationships',
        'character_bibles', 'location_timeline', 'quality_metrics',
        'failed_memory_tasks',
        'project_daily_quotas',  // 2026-04-30 fix: cron skips novels with completed quotas
      ];
      for (const tbl of memoryTables) {
        await supabase.from(tbl).delete().in('project_id', projectIds);
      }
      await supabase.from('chapters').delete().in('novel_id', novelIds);

      // Reset state — orchestrator self-healing (S1) will regen outlines on first write
      await supabase
        .from('ai_story_projects')
        .update({
          total_planned_chapters: 1000,
          master_outline: null,
          story_outline: null,
          story_bible: null,
          current_chapter: 0,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .in('id', projectIds);

      return NextResponse.json({
        success: true,
        wiped: projectIds.length,
        projectIds,
        message: 'Outlines will auto-regen on first write tick (S1 self-healing).',
      });
    }

    case 'approve_arc': {
      const projectId = body.projectId as string;
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

      // Load current project state
      const { data: proj } = await supabase
        .from('ai_story_projects')
        .select('id,status,pause_reason,setup_stage')
        .eq('id', projectId)
        .maybeSingle();

      if (!proj) return NextResponse.json({ error: 'project_not_found' }, { status: 404 });
      if (!proj.pause_reason?.startsWith('awaiting_arc_approval')) {
        return NextResponse.json({
          error: 'not_awaiting_approval',
          current_pause_reason: proj.pause_reason,
        }, { status: 400 });
      }

      // Two paths: setup pipeline vs runtime
      if (proj.setup_stage === 'arc_approval') {
        // Setup pipeline: advance stage to foundation_review
        const { error } = await supabase
          .from('ai_story_projects')
          .update({
            setup_stage: 'foundation_review',
            setup_stage_updated_at: new Date().toISOString(),
            setup_stage_error: null,
            setup_stage_attempts: 0,
            status: 'active',
            pause_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, path: 'setup_pipeline', next_stage: 'foundation_review' });
      } else {
        // Runtime: just resume the project
        const { error } = await supabase
          .from('ai_story_projects')
          .update({
            status: 'active',
            pause_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, path: 'runtime', resumed: true });
      }
    }

    case 'list_pending_approvals': {
      const { data: pending } = await supabase
        .from('ai_story_projects')
        .select('id,status,pause_reason,paused_at,current_chapter,total_planned_chapters,setup_stage,novel_id,novels(title)')
        .eq('status', 'paused')
        .ilike('pause_reason', 'awaiting_arc_approval%')
        .order('paused_at', { ascending: false });

      if (!pending?.length) return NextResponse.json({ count: 0, approvals: [] });

      // Enrich with arc plan data
      const enriched = await Promise.all((pending || []).map(async (p) => {
        const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
        // Extract arc number from pause_reason (e.g., "awaiting_arc_approval:arc_2")
        const arcMatch = p.pause_reason?.match(/arc_(\d+)/);
        const arcNumber = arcMatch ? parseInt(arcMatch[1], 10) : 1;

        const { data: arcPlan } = await supabase
          .from('arc_plans')
          .select('arc_number,arc_theme,plan_text,chapter_briefs,created_at')
          .eq('project_id', p.id)
          .eq('arc_number', arcNumber)
          .maybeSingle();

        return {
          project_id: p.id,
          title: (novel as { title?: string } | null)?.title || '?',
          pause_reason: p.pause_reason,
          paused_at: p.paused_at,
          setup_stage: p.setup_stage,
          progress: `${p.current_chapter || 0} / ${p.total_planned_chapters || 0}`,
          arc_number: arcNumber,
          arc_plan: arcPlan ? {
            theme: arcPlan.arc_theme,
            plan_text: arcPlan.plan_text,
            chapter_briefs: arcPlan.chapter_briefs,
            created_at: arcPlan.created_at,
          } : null,
        };
      }));

      return NextResponse.json({ count: enriched.length, approvals: enriched });
    }

    default:
      return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getStatus());
}
