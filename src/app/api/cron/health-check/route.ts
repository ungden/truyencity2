/**
 * Daily Health Check Cron
 * 
 * Runs once per day at 06:00 UTC (13:00 Vietnam time).
 * Scans the entire system and saves results to health_checks table.
 * Also accessible manually from the admin panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/integrations/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return authHeader === `Bearer ${cronSecret}`;
}

async function isAuthorizedAdmin(request: NextRequest): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// ========== INDIVIDUAL CHECKS ==========

type CheckResult = {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: number | string;
};

async function checkChapterProduction(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { chaptersLast24h: number; chaptersLastHour: number }> {
  const now = new Date();
  const h1 = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [last1h, last24h] = await Promise.all([
    supabase.from('chapters').select('id', { count: 'exact', head: true }).gte('created_at', h1),
    supabase.from('chapters').select('id', { count: 'exact', head: true }).gte('created_at', h24),
  ]);

  const ch1h = last1h.count ?? 0;
  const ch24h = last24h.count ?? 0;

  let status: CheckResult['status'] = 'pass';
  let message = `${ch24h} chapters/24h, ${ch1h} chapters/last hour`;

  if (ch1h === 0) {
    status = 'fail';
    message = `Factory STOPPED — 0 chapters in the last hour (24h total: ${ch24h})`;
  } else if (ch1h < 100) {
    status = 'warn';
    message = `Factory slow — only ${ch1h} chapters/hr (expected ~360). 24h total: ${ch24h}`;
  }

  return { name: 'Chapter Production', status, message, value: ch24h, chaptersLast24h: ch24h, chaptersLastHour: ch1h };
}

async function checkStuckNovels(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { stuckCount: number }> {
  const { count } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('current_chapter', 0);

  const stuck = count ?? 0;
  let status: CheckResult['status'] = 'pass';
  let message = `${stuck} novels at chapter 0`;

  if (stuck > 20) {
    status = 'fail';
    message = `${stuck} novels stuck at chapter 0 — factory init may be broken`;
  } else if (stuck > 5) {
    status = 'warn';
    message = `${stuck} novels still at chapter 0 — init queue backlog`;
  }

  return { name: 'Stuck Novels (ch=0)', status, message, value: stuck, stuckCount: stuck };
}

async function checkActiveProjects(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { activeCount: number; completedCount: number }> {
  const [active, completed] = await Promise.all([
    supabase.from('ai_story_projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('ai_story_projects').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ]);

  const a = active.count ?? 0;
  const c = completed.count ?? 0;
  let status: CheckResult['status'] = 'pass';
  let message = `${a} active, ${c} completed`;

  if (a === 0) {
    status = 'fail';
    message = `No active projects — factory has nothing to write!`;
  } else if (a < 100) {
    status = 'warn';
    message = `Only ${a} active projects (${c} completed) — running low`;
  }

  return { name: 'Active Projects', status, message, value: a, activeCount: a, completedCount: c };
}

async function checkTotalChapters(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { totalChapters: number }> {
  const { count } = await supabase
    .from('chapters')
    .select('id', { count: 'exact', head: true });

  const total = count ?? 0;
  return {
    name: 'Total Chapters',
    status: 'pass',
    message: `${total.toLocaleString()} chapters in database`,
    value: total,
    totalChapters: total,
  };
}

async function checkCoverStatus(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { withCover: number; withoutCover: number }> {
  const [total, noCover] = await Promise.all([
    supabase.from('novels').select('id', { count: 'exact', head: true }),
    supabase.from('novels').select('id', { count: 'exact', head: true }).is('cover_url', null),
  ]);

  const totalN = total.count ?? 0;
  const missing = noCover.count ?? 0;
  const hasCover = totalN - missing;

  let status: CheckResult['status'] = 'pass';
  let message = `${hasCover}/${totalN} novels have covers`;

  if (missing > 5) {
    status = 'warn';
    message = `${missing} novels missing covers (${hasCover}/${totalN} have them)`;
  }

  return { name: 'Cover Images', status, message, value: `${hasCover}/${totalN}`, withCover: hasCover, withoutCover: missing };
}

async function checkCronHeartbeat(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { staleCount: number }> {
  // Projects not touched in >30 minutes means cron may be dead
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gt('current_chapter', 0)
    .lt('updated_at', thirtyMinAgo);

  // Also get total active with ch > 0
  const { count: totalActive } = await supabase
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gt('current_chapter', 0);

  const stale = count ?? 0;
  const total = totalActive ?? 0;
  const fresh = total - stale;

  let status: CheckResult['status'] = 'pass';
  let message = `${fresh}/${total} projects touched in last 30min`;

  if (fresh === 0 && total > 0) {
    status = 'fail';
    message = `Cron DEAD — 0/${total} projects touched in 30min`;
  } else if (stale > total * 0.8) {
    status = 'warn';
    message = `Cron slow — only ${fresh}/${total} projects touched in 30min`;
  }

  return { name: 'Cron Heartbeat', status, message, value: `${fresh}/${total}`, staleCount: stale };
}

async function checkWordQuality(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { avgWords: number }> {
  // Sample 20 recent chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('content')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!chapters || chapters.length === 0) {
    return { name: 'Word Quality', status: 'warn', message: 'No chapters to sample', value: 0, avgWords: 0 };
  }

  const wordCounts = chapters.map(ch => (ch.content || '').split(/\s+/).length);
  const avg = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
  const under2500 = wordCounts.filter(w => w < 2500).length;

  let status: CheckResult['status'] = 'pass';
  let message = `Avg ${avg} words/chapter (${under2500}/${chapters.length} under 2500)`;

  if (avg < 2000) {
    status = 'fail';
    message = `Low quality — avg only ${avg} words (target: 2500+)`;
  } else if (avg < 2500) {
    status = 'warn';
    message = `Below target — avg ${avg} words (target: 2500+)`;
  }

  return { name: 'Word Quality', status, message, value: avg, avgWords: avg };
}

async function checkNovelDistribution(supabase: ReturnType<typeof getSupabase>): Promise<CheckResult & { topNovel: number; avgChapters: number }> {
  const { data: projects } = await supabase
    .from('ai_story_projects')
    .select('current_chapter')
    .eq('status', 'active');

  if (!projects || projects.length === 0) {
    return { name: 'Novel Distribution', status: 'warn', message: 'No active projects', value: 0, topNovel: 0, avgChapters: 0 };
  }

  const chapters = projects.map(p => p.current_chapter || 0);
  const max = Math.max(...chapters);
  const avg = Math.round(chapters.reduce((a, b) => a + b, 0) / chapters.length);

  return {
    name: 'Novel Distribution',
    status: 'pass',
    message: `Top novel: ${max} chapters, avg: ${avg} chapters across ${projects.length} novels`,
    value: avg,
    topNovel: max,
    avgChapters: avg,
  };
}

// ========== MAIN HANDLER ==========

export async function GET(request: NextRequest) {
  // Allow cron Bearer auth OR authenticated admin users
  const isCron = verifyCronAuth(request);
  const isManual = request.nextUrl.searchParams.get('manual') === 'true';
  if (!isCron && !(isManual && await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = getSupabase();

  try {
    // Run all checks in parallel
    const [
      production,
      stuck,
      activeProjects,
      totalChapters,
      covers,
      heartbeat,
      quality,
      distribution,
    ] = await Promise.all([
      checkChapterProduction(supabase),
      checkStuckNovels(supabase),
      checkActiveProjects(supabase),
      checkTotalChapters(supabase),
      checkCoverStatus(supabase),
      checkCronHeartbeat(supabase),
      checkWordQuality(supabase),
      checkNovelDistribution(supabase),
    ]);

    const checks: CheckResult[] = [
      production, stuck, activeProjects, totalChapters,
      covers, heartbeat, quality, distribution,
    ];

    // Calculate overall score
    const weights = { pass: 100, warn: 50, fail: 0 };
    const score = Math.round(
      checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length
    );

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (checks.some(c => c.status === 'fail')) overallStatus = 'critical';
    else if (checks.some(c => c.status === 'warn')) overallStatus = 'warning';

    const durationMs = Date.now() - startTime;

    // Build metrics object
    const metrics = {
      chaptersLast24h: production.chaptersLast24h,
      chaptersLastHour: production.chaptersLastHour,
      totalChapters: totalChapters.totalChapters,
      activeProjects: activeProjects.activeCount,
      completedProjects: activeProjects.completedCount,
      stuckNovels: stuck.stuckCount,
      coversComplete: covers.withCover,
      coversMissing: covers.withoutCover,
      avgWordsPerChapter: quality.avgWords,
      topNovelChapters: distribution.topNovel,
      avgChaptersPerNovel: distribution.avgChapters,
      cronStaleProjects: heartbeat.staleCount,
    };

    // Build summary
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const summary = overallStatus === 'healthy'
      ? `All ${checks.length} checks passed. ${production.chaptersLast24h} chapters in 24h, ${activeProjects.activeCount} active novels.`
      : `${failCount} failures, ${warnCount} warnings out of ${checks.length} checks.`;

    // Save to database
    const { error: saveError } = await supabase
      .from('health_checks')
      .insert({
        status: overallStatus,
        score,
        metrics,
        checks: checks.map(c => ({ name: c.name, status: c.status, message: c.message })),
        summary,
        duration_ms: durationMs,
      });

    if (saveError) {
      console.error('[HealthCheck] Failed to save:', saveError.message);
    }

    // Alert on critical status via webhook (Discord/Slack/generic)
    if (overallStatus === 'critical') {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          const failedChecks = checks.filter(c => c.status === 'fail').map(c => `${c.name}: ${c.message}`);
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🚨 **TruyenCity CRITICAL** (score: ${score}/100)\n${failedChecks.join('\n')}\n\nChapters 24h: ${metrics.chaptersLast24h} | Active: ${metrics.activeProjects} | Stuck: ${metrics.stuckNovels}`,
            }),
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // Alert failure is non-fatal
        }
      }
    }

    return NextResponse.json({
      status: overallStatus,
      score,
      summary,
      metrics,
      checks: checks.map(c => ({ name: c.name, status: c.status, message: c.message })),
      durationMs,
      savedToDb: !saveError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'critical', error: message }, { status: 500 });
  }
}
