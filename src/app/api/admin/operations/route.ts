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

export const maxDuration = 800;
export const dynamic = 'force-dynamic';

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
  body: { sampleSize?: number; perProjectChapters?: number },
) {
  const sampleSize = Math.min(50, Math.max(5, body.sampleSize || 20));
  const perProjectChapters = Math.min(10, Math.max(1, body.perProjectChapters || 3));

  const { data: projects } = await supabase
    .from('ai_story_projects')
    .select('id,main_character,genre,world_description,novel_id,novels(title)')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(sampleSize);

  if (!projects?.length) return { audited: 0, results: [] };

  const results: Array<{
    project_id: string;
    title: string;
    genre: string | null;
    chapters_sampled: number;
    issues: Array<{ chapter: number; issues: string[] }>;
    score: number;
  }> = [];

  for (const p of projects) {
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const novelId = p.novel_id;
    const { data: chapters } = await supabase
      .from('chapters')
      .select('chapter_number,content')
      .eq('novel_id', novelId)
      .order('chapter_number', { ascending: false })
      .limit(perProjectChapters);

    const chapterIssues: Array<{ chapter: number; issues: string[] }> = [];
    let totalIssues = 0;

    for (const ch of chapters || []) {
      const issues: string[] = [];
      const c = ch.content || '';

      const placeholders = c.match(/<(MC|LOVE|CITY|COMPANY|NUMBER|TITLE|SKILL)>/g);
      if (placeholders) issues.push(`placeholder_leak:${[...new Set(placeholders)].join(',')}`);

      const expectedMC = (p.main_character || '').trim();
      if (expectedMC && expectedMC.length >= 2) {
        if (!c.includes(expectedMC)) {
          const tokens = expectedMC.split(/\s+/).filter((t: string) => t.length >= 2);
          const tokenFound = tokens.some((t: string) => c.includes(t));
          if (!tokenFound) issues.push(`mc_name_absent:${expectedMC}`);
        }
      }

      const isVnSet = ['do-thi', 'quan-truong'].includes(p.genre || '') ||
        /Đại Nam|Phượng Đô|Hải Long Đô|Sài Gòn|Hà Nội|Việt Nam/i.test(p.world_description || '');
      if (isVnSet) {
        const xuLeak = c.match(/\d[\d.,]*\s*xu\b/);
        if (xuLeak) issues.push(`xu_leak:${xuLeak[0].slice(0, 30)}`);
        const nguyenLeak = c.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu))/);
        if (nguyenLeak) issues.push(`nguyen_leak:${nguyenLeak[0].slice(0, 30)}`);
      }

      if (issues.length > 0) {
        chapterIssues.push({ chapter: ch.chapter_number, issues });
        totalIssues += issues.length;
      }
    }

    const score = Math.max(0, 100 - 10 * totalIssues);
    results.push({
      project_id: p.id,
      title: (novel as { title?: string } | null)?.title || '?',
      genre: p.genre,
      chapters_sampled: chapters?.length || 0,
      issues: chapterIssues,
      score,
    });
  }

  // Sort by score ascending — worst first
  results.sort((a, b) => a.score - b.score);

  const overall = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 100;

  return {
    audited: results.length,
    overall_score: overall,
    results,
  };
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
      return NextResponse.json(await runRegressionAudit(supabase, body as { sampleSize?: number; perProjectChapters?: number }));

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
      const { error } = await supabase
        .from('ai_story_projects')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', projectId);
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
    }

    case 'test_one_chapter': {
      const projectId = body.projectId as string;
      if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
      const { writeOneChapter } = await import('@/services/story-engine/pipeline/orchestrator');
      try {
        const result = await writeOneChapter({ projectId });
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

    default:
      return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getStatus());
}
