import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/auth/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getVietnamDayBounds } from '@/lib/utils/vietnam-time';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DAILY_SPAWN_TARGET = 20;
const DAILY_CHAPTER_QUOTA = 20;

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const now = new Date();
    const { vnDate, startIso: vnStartIso, endIso: vnEndIso } = getVietnamDayBounds(now);
    const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const dayStartMs = new Date(vnStartIso).getTime();
    const dayEndMs = new Date(vnEndIso).getTime();
    const nowMs = now.getTime();
    const hoursElapsedToday = Math.max(0.01, (nowMs - dayStartMs) / (60 * 60 * 1000));
    const hoursRemainingToday = Math.max(0, (dayEndMs - nowMs) / (60 * 60 * 1000));

    const [
      activeProjectsRes,
      pausedProjectsRes,
      newNovelsTodayRes,
      newProjectsTodayRes,
      chaptersTodayRes,
      chaptersTodayRowsRes,
      chaptersLast24hRes,
      healthChecksLast4hRes,
      latestHealthRes,
      activeProjectNovelIdsRes,
      recentSpawnProjectsRes,
      recentChaptersRes,
      quotaRowsRes,
    ] = await Promise.all([
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
      supabase.from('novels').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('novel_id').gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('*', { count: 'exact', head: true }).gte('created_at', last24hIso),
      supabase.from('health_checks').select('*', { count: 'exact', head: true }).gte('created_at', last24hIso),
      supabase
        .from('health_checks')
        .select('id, status, score, created_at, summary')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('ai_story_projects').select('novel_id').eq('status', 'active'),
      supabase
        .from('ai_story_projects')
        .select('id, novel_id, created_at, status, current_chapter, genre, main_character')
        .gte('created_at', vnStartIso)
        .lt('created_at', vnEndIso)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('chapters')
        .select('novel_id, chapter_number, created_at')
        .gte('created_at', vnStartIso)
        .lt('created_at', vnEndIso)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('project_daily_quotas')
        .select('project_id, target_chapters, written_chapters, status')
        .eq('vn_date', vnDate),
    ]);

    const errors = [
      activeProjectsRes.error,
      pausedProjectsRes.error,
      newNovelsTodayRes.error,
      newProjectsTodayRes.error,
      chaptersTodayRes.error,
      chaptersTodayRowsRes.error,
      chaptersLast24hRes.error,
      healthChecksLast4hRes.error,
      latestHealthRes.error,
      activeProjectNovelIdsRes.error,
      recentSpawnProjectsRes.error,
      recentChaptersRes.error,
      quotaRowsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message || 'Failed to fetch report data' }, { status: 500 });
    }

    const activeNovelIds = (activeProjectNovelIdsRes.data || [])
      .map((r) => r.novel_id)
      .filter(Boolean);

    const chapterCountsMap = new Map<string, number>();
    for (const row of chaptersTodayRowsRes.data || []) {
      chapterCountsMap.set(row.novel_id, (chapterCountsMap.get(row.novel_id) || 0) + 1);
    }

    const storiesOverQuota: string[] = [];
    let storiesAtQuota = 0;
    let storiesBelowQuota = 0;

    for (const novelId of activeNovelIds) {
      const written = chapterCountsMap.get(novelId) || 0;
      if (written > DAILY_CHAPTER_QUOTA) {
        storiesOverQuota.push(novelId);
      } else if (written === DAILY_CHAPTER_QUOTA) {
        storiesAtQuota++;
      } else {
        storiesBelowQuota++;
      }
    }

    const novelIdsToResolve = [
      ...new Set([
        ...storiesOverQuota,
        ...(recentSpawnProjectsRes.data || []).map((r) => r.novel_id),
        ...(recentChaptersRes.data || []).map((r) => r.novel_id),
      ]),
    ];

    const { data: novelsMeta } = novelIdsToResolve.length > 0
      ? await supabase.from('novels').select('id, title').in('id', novelIdsToResolve)
      : { data: [] as Array<{ id: string; title: string }> };

    const titleByNovelId = new Map((novelsMeta || []).map((n) => [n.id, n.title]));

    const quotaViolations = storiesOverQuota
      .map((novelId) => ({
        novelId,
        title: titleByNovelId.get(novelId) || 'Unknown title',
        chaptersToday: chapterCountsMap.get(novelId) || 0,
      }))
      .sort((a, b) => b.chaptersToday - a.chaptersToday)
      .slice(0, 20);

    const recentSpawns = (recentSpawnProjectsRes.data || []).map((row) => ({
      projectId: row.id,
      novelId: row.novel_id,
      title: titleByNovelId.get(row.novel_id) || 'Unknown title',
      createdAt: row.created_at,
      status: row.status,
      currentChapter: row.current_chapter || 0,
      genre: row.genre || '',
      mainCharacter: row.main_character || '',
    }));

    const recentWrites = (recentChaptersRes.data || []).map((row) => ({
      novelId: row.novel_id,
      title: titleByNovelId.get(row.novel_id) || 'Unknown title',
      chapterNumber: row.chapter_number,
      createdAt: row.created_at,
    }));

    const activeProjects = activeProjectsRes.count || 0;
    const chaptersToday = chaptersTodayRes.count || 0;
    const latestHealthAt = latestHealthRes.data?.created_at || null;
    const healthStaleMinutes = latestHealthAt
      ? Math.floor((now.getTime() - new Date(latestHealthAt).getTime()) / 60000)
      : null;
    const healthAlertLevel = healthStaleMinutes === null
      ? 'critical'
      : healthStaleMinutes > 360
        ? 'critical'
        : healthStaleMinutes > 120
          ? 'warn'
          : 'ok';

    const quotaRows = quotaRowsRes.data || [];
    const quotaTargetTotal = quotaRows.reduce((sum, row) => sum + (row.target_chapters || DAILY_CHAPTER_QUOTA), 0);
    const quotaWrittenTotal = quotaRows.reduce((sum, row) => sum + (row.written_chapters || 0), 0);
    const quotaCompletionPct = quotaTargetTotal > 0
      ? Number(((quotaWrittenTotal / quotaTargetTotal) * 100).toFixed(2))
      : 0;

    const currentWriteRatePerHour = Number((quotaWrittenTotal / hoursElapsedToday).toFixed(2));
    const remainingChaptersToQuota = Math.max(0, quotaTargetTotal - quotaWrittenTotal);
    const requiredWriteRatePerHour = hoursRemainingToday > 0
      ? Number((remainingChaptersToQuota / hoursRemainingToday).toFixed(2))
      : 0;

    const projectedEndOfDayWritten = Math.min(
      quotaTargetTotal,
      Math.round(quotaWrittenTotal + currentWriteRatePerHour * hoursRemainingToday),
    );
    const projectedEndOfDayCompletionPct = quotaTargetTotal > 0
      ? Number(((projectedEndOfDayWritten / quotaTargetTotal) * 100).toFixed(2))
      : 0;

    let forecastStatus: 'on_track' | 'at_risk' | 'off_track' = 'on_track';
    if (quotaTargetTotal > 0) {
      if (projectedEndOfDayCompletionPct < 90) {
        forecastStatus = 'off_track';
      } else if (projectedEndOfDayCompletionPct < 98) {
        forecastStatus = 'at_risk';
      }
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      window: {
        vnDayStart: vnStartIso,
        vnDayEnd: vnEndIso,
        last24hStart: last24hIso,
      },
      config: {
        dailySpawnTarget: DAILY_SPAWN_TARGET,
        dailyChapterQuota: DAILY_CHAPTER_QUOTA,
        vnDate,
      },
      summary: {
        newNovelsToday: newNovelsTodayRes.count || 0,
        newProjectsToday: newProjectsTodayRes.count || 0,
        activeProjects,
        pausedProjects: pausedProjectsRes.count || 0,
        chaptersToday,
        chaptersLast24h: chaptersLast24hRes.count || 0,
        healthChecksLast24h: healthChecksLast4hRes.count || 0,
        latestHealthAt,
        latestHealthStatus: latestHealthRes.data?.status || null,
        latestHealthScore: latestHealthRes.data?.score ?? null,
        healthStaleMinutes,
        healthAlertLevel,
        avgChaptersPerActiveToday: activeProjects > 0
          ? Number((chaptersToday / activeProjects).toFixed(2))
          : 0,
        storiesAtQuota,
        storiesBelowQuota,
        storiesOverQuota: storiesOverQuota.length,
        quotaTargetTotal,
        quotaWrittenTotal,
        quotaCompletionPct,
        hoursElapsedToday: Number(hoursElapsedToday.toFixed(2)),
        hoursRemainingToday: Number(hoursRemainingToday.toFixed(2)),
        currentWriteRatePerHour,
        requiredWriteRatePerHour,
        projectedEndOfDayWritten,
        projectedEndOfDayCompletionPct,
        forecastStatus,
      },
      quotaViolations,
      recentSpawns,
      recentWrites,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
