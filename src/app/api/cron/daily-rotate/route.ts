/**
 * Supabase pg_cron Target: Daily Novel Rotation
 *
 * Called once per day (midnight UTC) by Supabase pg_cron + pg_net.
 *
 * Logic:
 *   1. For authors with < 5 active novels: activate paused novels to reach 5
 *   2. Additionally activate 10 new novels (authors with fewest active first)
 *   3. Return stats
 *
 * This ensures a steady flow of new content being written daily.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // 1 minute max
export const dynamic = 'force-dynamic';

const TARGET_ACTIVE_PER_AUTHOR = 5;
const DAILY_EXPANSION = 20;

function getSupabaseAdmin() {
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

interface AuthorActiveCount {
  authorId: string;
  activeCount: number;
  pausedProjectIds: string[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // ====== STEP 1: Get all authors with their novel/project counts ======

    const { data: authors, error: authorsError } = await supabase
      .from('ai_authors')
      .select('id')
      .eq('status', 'active');

    if (authorsError) throw authorsError;
    if (!authors || authors.length === 0) {
      return NextResponse.json({ success: true, message: 'No active authors found' });
    }

    // For each author, count active projects and find paused ones
    const authorStats: AuthorActiveCount[] = [];

    // Process in batches of 50 authors
    for (let i = 0; i < authors.length; i += 50) {
      const batch = authors.slice(i, i + 50);
      const authorIds = batch.map(a => a.id);

      // Get novels for these authors
      const { data: novels } = await supabase
        .from('novels')
        .select('id, ai_author_id')
        .in('ai_author_id', authorIds);

      if (!novels) continue;

      // Group novels by author
      const novelsByAuthor = new Map<string, string[]>();
      for (const novel of novels) {
        if (!novel.ai_author_id) continue;
        const list = novelsByAuthor.get(novel.ai_author_id) || [];
        list.push(novel.id);
        novelsByAuthor.set(novel.ai_author_id, list);
      }

      // Get projects for all novels in this batch
      const allNovelIds = novels.map(n => n.id);
      if (allNovelIds.length === 0) continue;

      const { data: projects } = await supabase
        .from('ai_story_projects')
        .select('id, novel_id, status')
        .in('novel_id', allNovelIds);

      if (!projects) continue;

      // Build per-author stats
      for (const authorId of authorIds) {
        const authorNovelIds = new Set(novelsByAuthor.get(authorId) || []);
        const authorProjects = projects.filter(p => authorNovelIds.has(p.novel_id));

        const activeCount = authorProjects.filter(p => p.status === 'active').length;
        const pausedProjectIds = authorProjects
          .filter(p => p.status === 'paused')
          .map(p => p.id);

        authorStats.push({ authorId, activeCount, pausedProjectIds });
      }
    }

    // ====== STEP 2: Backfill - Authors with < TARGET active ======

    let backfilled = 0;
    const activateIds: string[] = [];

    for (const stat of authorStats) {
      if (stat.activeCount < TARGET_ACTIVE_PER_AUTHOR && stat.pausedProjectIds.length > 0) {
        const needed = TARGET_ACTIVE_PER_AUTHOR - stat.activeCount;
        const toActivate = stat.pausedProjectIds.slice(0, needed);
        activateIds.push(...toActivate);
        backfilled += toActivate.length;

        // Remove activated from available pool
        stat.pausedProjectIds = stat.pausedProjectIds.slice(needed);
        stat.activeCount += toActivate.length;
      }
    }

    // ====== STEP 3: Daily Expansion - Activate DAILY_EXPANSION more ======

    // Sort by activeCount ascending (authors with fewest active get priority)
    const sortedStats = [...authorStats]
      .filter(s => s.pausedProjectIds.length > 0)
      .sort((a, b) => a.activeCount - b.activeCount);

    let expanded = 0;
    for (const stat of sortedStats) {
      if (expanded >= DAILY_EXPANSION) break;
      if (stat.pausedProjectIds.length === 0) continue;

      const toActivate = stat.pausedProjectIds.slice(0, 1); // 1 per author for fairness
      activateIds.push(...toActivate);
      expanded += toActivate.length;

      stat.pausedProjectIds = stat.pausedProjectIds.slice(1);
      stat.activeCount += 1;
    }

    // If we haven't hit DAILY_EXPANSION, do another round
    if (expanded < DAILY_EXPANSION) {
      for (const stat of sortedStats) {
        if (expanded >= DAILY_EXPANSION) break;
        if (stat.pausedProjectIds.length === 0) continue;

        const remaining = Math.min(DAILY_EXPANSION - expanded, stat.pausedProjectIds.length);
        const toActivate = stat.pausedProjectIds.slice(0, remaining);
        activateIds.push(...toActivate);
        expanded += toActivate.length;
      }
    }

    // ====== STEP 4: Execute activations in batch ======

    let totalActivated = 0;

    if (activateIds.length > 0) {
      // Batch update in chunks of 100
      for (let i = 0; i < activateIds.length; i += 100) {
        const chunk = activateIds.slice(i, i + 100);
        const { error } = await supabase
          .from('ai_story_projects')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .in('id', chunk);

        if (error) {
          console.error(`[DailyRotate] Batch activate failed:`, error.message);
        } else {
          totalActivated += chunk.length;
        }
      }
    }

    // ====== STATS ======

    const totalActive = authorStats.reduce((sum, s) => sum + s.activeCount, 0);
    const totalPaused = authorStats.reduce((sum, s) => sum + s.pausedProjectIds.length, 0);
    const duration = (Date.now() - startTime) / 1000;

    console.log(
      `[DailyRotate] Done in ${duration.toFixed(1)}s. ` +
      `Backfilled: ${backfilled}, Expanded: ${expanded}, Total activated: ${totalActivated}. ` +
      `Active: ${totalActive}, Paused remaining: ${totalPaused}`
    );

    return NextResponse.json({
      success: true,
      totalAuthors: authors.length,
      totalActive,
      totalPaused,
      backfilled,
      expanded,
      totalActivated,
      durationSeconds: Math.round(duration),
    });
  } catch (error) {
    console.error('[DailyRotate] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
