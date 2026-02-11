import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/integrations/supabase/server';

export const dynamic = 'force-dynamic';

const DAILY_SPAWN_TARGET = 20;
const DAILY_CHAPTER_QUOTA = 20;

function getVietnamDayBounds(now: Date = new Date()): { startIso: string; endIso: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const [year, month, day] = dateStr.split('-').map(Number);
  const startUtc = new Date(Date.UTC(year, month - 1, day, -7, 0, 0));
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

async function isAuthorizedAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const { startIso: vnStartIso, endIso: vnEndIso } = getVietnamDayBounds(now);
    const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      activeProjectsRes,
      pausedProjectsRes,
      newNovelsTodayRes,
      newProjectsTodayRes,
      chaptersTodayRes,
      chaptersTodayRowsRes,
      chaptersLast24hRes,
      activeProjectNovelIdsRes,
      recentSpawnProjectsRes,
      recentChaptersRes,
    ] = await Promise.all([
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
      supabase.from('novels').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('ai_story_projects').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('*', { count: 'exact', head: true }).gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('novel_id').gte('created_at', vnStartIso).lt('created_at', vnEndIso),
      supabase.from('chapters').select('*', { count: 'exact', head: true }).gte('created_at', last24hIso),
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
    ]);

    const errors = [
      activeProjectsRes.error,
      pausedProjectsRes.error,
      newNovelsTodayRes.error,
      newProjectsTodayRes.error,
      chaptersTodayRes.error,
      chaptersTodayRowsRes.error,
      chaptersLast24hRes.error,
      activeProjectNovelIdsRes.error,
      recentSpawnProjectsRes.error,
      recentChaptersRes.error,
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
    const chaptersToday = (chaptersTodayRowsRes.data || []).length;

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
      },
      summary: {
        newNovelsToday: newNovelsTodayRes.count || 0,
        newProjectsToday: newProjectsTodayRes.count || 0,
        activeProjects,
        pausedProjects: pausedProjectsRes.count || 0,
        chaptersToday,
        chaptersLast24h: chaptersLast24hRes.count || 0,
        avgChaptersPerActiveToday: activeProjects > 0
          ? Number((chaptersToday / activeProjects).toFixed(2))
          : 0,
        storiesAtQuota,
        storiesBelowQuota,
        storiesOverQuota: storiesOverQuota.length,
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
