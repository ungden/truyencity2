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

export const maxDuration = 60;
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

async function setCronActive(active: boolean) {
  // Cron management requires direct SQL via cron.alter_job. Not exposed via PostgREST.
  // Operator must use Supabase SQL editor / MCP. This endpoint is informational only.
  return {
    success: false,
    info: `Cron pause/resume requires direct SQL. Run: SELECT cron.alter_job(jobid, active := ${active}) FROM cron.job WHERE jobname IN ('write-chapters-cron','daily-spawn-cron','daily-rotate-cron','memory-replay-cron');`,
  };
}

export async function POST(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  const auth = await isAuthorizedAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getStatus());
}
