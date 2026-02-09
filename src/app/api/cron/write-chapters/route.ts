/**
 * Supabase pg_cron Target: Write Chapters
 * 
 * Called by Supabase pg_cron + pg_net every 5 minutes.
 * 
 * Two-tier processing:
 *   Tier 1 (RESUME): Projects with current_chapter > 0
 *     - Pick up to 20 projects, write 1 chapter each in PARALLEL
 *     - Fast: ~30-60s per project (uses dummy arcs, skips planning)
 *     - Per-project timeout: 120s to prevent one slow project from blocking the batch
 *   
 *   Tier 2 (INIT): Projects with current_chapter = 0
 *     - Pick only 1 new project, plan story + arcs + write Ch.1
 *     - Slow: ~2-5 minutes (full Gemini planning pipeline)
 * 
 * Both tiers run in parallel via Promise.allSettled.
 * Designed for ~5,700+ chapters/day throughput (20 projects * 288 cron ticks/day).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { StoryRunner } from '@/services/story-writing-factory/runner';
import type { FactoryConfig, RunnerConfig, GenreType } from '@/services/story-writing-factory/types';

// CONFIGURATION
const RESUME_BATCH_SIZE = 30;  // Tier 1: resume projects (fast) — 30 * 288 ticks/day = 8,640 slots/day
const INIT_BATCH_SIZE = 5;     // Tier 2: new projects needing full plan (slow) — bumped from 1 to clear 33 stuck novels faster
const PROJECT_TIMEOUT_MS = 120_000; // 120s per-project timeout — prevents 1 slow project from blocking the batch

export const maxDuration = 300; // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic';

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

// Shared type for project row
type ProjectRow = {
  id: string;
  main_character: string | null;
  genre: string | null;
  status: string;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  world_description: string | null;
  writing_style: string | null;
  temperature: number | null;
  target_chapter_length: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  novels: any;
};

type RunResult = {
  id: string;
  title: string;
  tier: 'resume' | 'init';
  success: boolean;
  error?: string;
  rotatedProjectId?: string | null;
};

/**
 * Auto-rotate: When a novel completes, activate a paused novel from the same author.
 * Returns the newly activated project ID, or null if none available.
 */
async function autoRotate(
  completedNovelId: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string | null> {
  try {
    // Find the author of the completed novel
    const { data: novel } = await supabase
      .from('novels')
      .select('ai_author_id')
      .eq('id', completedNovelId)
      .single();

    if (!novel?.ai_author_id) return null;

    // Find a paused project from the same author
    const { data: pausedNovels } = await supabase
      .from('novels')
      .select('id')
      .eq('ai_author_id', novel.ai_author_id)
      .neq('id', completedNovelId);

    if (!pausedNovels || pausedNovels.length === 0) return null;

    const novelIds = pausedNovels.map(n => n.id);

    const { data: pausedProjects } = await supabase
      .from('ai_story_projects')
      .select('id')
      .in('novel_id', novelIds)
      .eq('status', 'paused')
      .limit(1);

    if (!pausedProjects || pausedProjects.length === 0) return null;

    const projectToActivate = pausedProjects[0].id;

    const { error } = await supabase
      .from('ai_story_projects')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', projectToActivate);

    if (error) {
      console.error(`[AutoRotate] Failed to activate ${projectToActivate}:`, error.message);
      return null;
    }

    console.log(`[AutoRotate] Novel ${completedNovelId.slice(0, 8)} completed → Activated ${projectToActivate.slice(0, 8)}`);
    return projectToActivate;
  } catch (error) {
    console.error('[AutoRotate] Error:', error);
    return null;
  }
}

/**
 * Create a runner, set callbacks, execute 1 chapter.
 */
async function writeOneChapter(
  project: ProjectRow,
  geminiKey: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tier: 'resume' | 'init'
): Promise<RunResult> {
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  if (!novel?.id) throw new Error('No novel linked');

  const aiService = new AIProviderService({ gemini: geminiKey });
  const currentCh = project.current_chapter || 0;

  // ====== PRE-WRITE COMPLETION CHECK ======
  // If current_chapter already reached/exceeded total_planned_chapters,
  // check if we should mark completed WITHOUT writing another chapter.
  // This handles the edge case where a project reached its target but
  // the completion logic didn't trigger (e.g., not at arc boundary last time).
  const targetCh = project.total_planned_chapters || 200;
  if (currentCh >= targetCh) {
    const CHAPTERS_PER_ARC_CHECK = 20;
    const isArcBoundary = currentCh % CHAPTERS_PER_ARC_CHECK === 0;
    const isExactTarget = currentCh === targetCh;
    const hardStop = targetCh + CHAPTERS_PER_ARC_CHECK;

    if (isArcBoundary || isExactTarget || currentCh >= hardStop) {
      // Complete immediately — no need to write more
      await supabase.from('ai_story_projects')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', project.id);

      const rotatedProjectId = await autoRotate(novel.id, supabase);
      console.log(`[WriteChapter] ${project.id.slice(0, 8)} PRE-WRITE COMPLETE at ch.${currentCh} (target=${targetCh}, arcBoundary=${isArcBoundary}, exactTarget=${isExactTarget})`);

      return {
        id: project.id,
        title: novel.title,
        tier,
        success: true,
        error: undefined,
        rotatedProjectId,
      };
    }
    // else: in grace period, not at boundary — fall through to write 1 more chapter toward arc boundary
  }

  const factoryConfig: Partial<FactoryConfig> = {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    temperature: project.temperature || 1.0,
    maxTokens: 8192,
    targetWordCount: project.target_chapter_length || 2500,
    genre: (project.genre || 'tien-hiep') as GenreType,
    minQualityScore: 5,
    maxRetries: tier === 'init' ? 3 : 1, // More retries for init (planning is flaky)
    use3AgentWorkflow: true,
  };

  const runnerConfig: Partial<RunnerConfig> = {
    delayBetweenChapters: 100,
    delayBetweenArcs: 100,
    maxChapterRetries: tier === 'init' ? 2 : 1,
    autoSaveEnabled: false,
    minQualityToProgress: 4,
    pauseOnError: false,
  };

  const runner = new StoryRunner(factoryConfig, runnerConfig, aiService);

  runner.setCallbacks({
    onChapterCompleted: async (chNum, result) => {
      if (result.data) {
        await supabase.from('chapters').upsert({
          novel_id: novel.id,
          chapter_number: chNum,
          title: result.data.title,
          content: result.data.content,
        }, { onConflict: 'novel_id,chapter_number' });

        await supabase.from('ai_story_projects').update({
          current_chapter: chNum,
          updated_at: new Date().toISOString(),
        }).eq('id', project.id);
      }
    },
    onError: (e) => console.error(`[${tier}][${project.id.slice(0, 8)}] Error: ${e}`),
  });

  const result = await runner.run({
    title: novel.title,
    protagonistName: project.main_character || 'MC',
    genre: (project.genre || 'tien-hiep') as GenreType,
    premise: project.world_description || novel.title,
    targetChapters: project.total_planned_chapters || 200,
    chaptersPerArc: 20,
    projectId: project.id,
    chaptersToWrite: 1,
    currentChapter: currentCh,  // 0 for init (full plan), >0 for resume (dummy arcs)
  });

  // ====== SOFT ENDING LOGIC ======
  // total_planned_chapters is a SOFT TARGET, not a hard cutoff.
  // The story should finish at a natural arc boundary, not mid-arc.
  //
  // Phase 1: chapter < target - 20       → normal writing
  // Phase 2: target - 20 ≤ chapter < target → "approaching finale" (handled by runner/planner)
  // Phase 3: target ≤ chapter < target + 20 → grace period: keep writing until arc boundary
  // Phase 4: chapter ≥ target + 20         → hard stop (safety net)

  const CHAPTERS_PER_ARC = 20;
  const GRACE_BUFFER = CHAPTERS_PER_ARC; // Allow up to 1 extra arc to finish properly
  const nextCh = currentCh + 1;
  const targetChapters = project.total_planned_chapters || 200;
  const hardStop = targetChapters + GRACE_BUFFER;
  let rotatedProjectId: string | null = null;

  // Check if we should complete the story
  let shouldComplete = false;

  if (nextCh >= hardStop) {
    // Phase 4: Hard stop — safety net, prevent infinite writing
    shouldComplete = true;
    console.log(`[WriteChapter] ${project.id.slice(0, 8)} HARD STOP at ch.${nextCh} (target=${targetChapters}, hard=${hardStop})`);
  } else if (nextCh >= targetChapters) {
    // Phase 3: Grace period — only complete at arc boundary (every 20 chapters)
    // Also complete if we've exactly hit the target (covers small novels where target isn't a multiple of arc size)
    const isArcBoundary = nextCh % CHAPTERS_PER_ARC === 0;
    const isExactTarget = nextCh === targetChapters;
    if (isArcBoundary || isExactTarget) {
      shouldComplete = true;
      console.log(`[WriteChapter] ${project.id.slice(0, 8)} CLEAN FINISH at ch.${nextCh} (target=${targetChapters}, arcBoundary=${isArcBoundary}, exactTarget=${isExactTarget})`);
    } else {
      // Not at arc boundary — continue writing to finish the current arc
      console.log(`[WriteChapter] ${project.id.slice(0, 8)} Grace period: ch.${nextCh}/${targetChapters}, waiting for arc boundary (next: ${Math.ceil(nextCh / CHAPTERS_PER_ARC) * CHAPTERS_PER_ARC})`);
    }
  }

  if (shouldComplete) {
    await supabase.from('ai_story_projects')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', project.id);

    // AUTO-ROTATE: Activate a paused novel from the same author
    rotatedProjectId = await autoRotate(novel.id, supabase);
  }

  return {
    id: project.id,
    title: novel.title,
    tier,
    success: result.success,
    error: result.error,
    rotatedProjectId,
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // ====== DISTRIBUTED LOCK: Skip projects claimed in the last 4 minutes ======
    // This prevents concurrent cron invocations from processing the same projects.
    // Each invocation only picks projects whose updated_at is older than 4 minutes,
    // then immediately bumps updated_at to "claim" them.
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();

    const [resumeQuery, initQuery] = await Promise.all([
      // Tier 1: Resume projects (current_chapter > 0, not claimed recently)
      supabase
        .from('ai_story_projects')
        .select(`
          id, main_character, genre, status,
          current_chapter, total_planned_chapters,
          world_description, writing_style, temperature,
          target_chapter_length,
          novels!ai_story_projects_novel_id_fkey (id, title)
        `)
        .eq('status', 'active')
        .gt('current_chapter', 0)
        .lt('updated_at', fourMinutesAgo)
        .order('updated_at', { ascending: true })
        .limit(RESUME_BATCH_SIZE),

      // Tier 2: Init projects (current_chapter = 0, not claimed recently)
      supabase
        .from('ai_story_projects')
        .select(`
          id, main_character, genre, status,
          current_chapter, total_planned_chapters,
          world_description, writing_style, temperature,
          target_chapter_length,
          novels!ai_story_projects_novel_id_fkey (id, title)
        `)
        .eq('status', 'active')
        .eq('current_chapter', 0)
        .lt('updated_at', fourMinutesAgo)
        .order('created_at', { ascending: true }) // Oldest new project first
        .limit(INIT_BATCH_SIZE),
    ]);

    if (resumeQuery.error) throw resumeQuery.error;
    if (initQuery.error) throw initQuery.error;

    // Filter resume projects: include grace period (current >= total but < hardStop)
    // so soft-ending logic can complete them at arc boundaries.
    const GRACE_BUFFER_FILTER = 20; // Must match GRACE_BUFFER in writeOneChapter
    const resumeProjects = (resumeQuery.data || []).filter(p => {
      const total = p.total_planned_chapters || 200;
      const current = p.current_chapter || 0;
      const hardStop = total + GRACE_BUFFER_FILTER;
      return current < hardStop && p.novels;
    }) as ProjectRow[];

    const initProjects = (initQuery.data || []).filter(p => p.novels) as ProjectRow[];

    const totalProjects = resumeProjects.length + initProjects.length;

    if (totalProjects === 0) {
      return NextResponse.json({ success: true, message: 'No projects to process' });
    }

    // Claim projects by bumping updated_at to now (distributed lock).
    // Concurrent invocations will skip these because of the .lt('updated_at', fourMinutesAgo) guard.
    const allIds = [...resumeProjects, ...initProjects].map(p => p.id);
    await supabase
      .from('ai_story_projects')
      .update({ updated_at: new Date().toISOString() })
      .in('id', allIds);

    console.log(`[Cron] Processing ${resumeProjects.length} resume + ${initProjects.length} init projects...`);

    // ====== EXECUTE BOTH TIERS IN PARALLEL ======

    // Helper: wrap a promise with a timeout to prevent one slow project from blocking the batch
    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
      ]);

    const allPromises = [
      // Tier 1: All resume projects in parallel (with per-project timeout)
      ...resumeProjects.map(p =>
        withTimeout(
          writeOneChapter(p, geminiKey, supabase, 'resume'),
          PROJECT_TIMEOUT_MS,
          { id: p.id, title: '?', tier: 'resume' as const, success: false, error: `Timeout after ${PROJECT_TIMEOUT_MS / 1000}s` }
        ).catch(err => ({
            id: p.id,
            title: '?',
            tier: 'resume' as const,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }))
      ),
      // Tier 2: Init projects (usually just 1, longer timeout: 4 min for full planning)
      ...initProjects.map(p =>
        withTimeout(
          writeOneChapter(p, geminiKey, supabase, 'init'),
          240_000, // 4 min for init (full planning pipeline)
          { id: p.id, title: '?', tier: 'init' as const, success: false, error: 'Timeout after 240s' }
        ).catch(err => ({
            id: p.id,
            title: '?',
            tier: 'init' as const,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }))
      ),
    ];

    const results = await Promise.allSettled(allPromises);

    const summary: RunResult[] = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { id: '?', title: '?', tier: 'resume' as const, success: false, error: r.reason?.message || 'Unknown' }
    );

    const resumeSuccess = summary.filter(r => r.tier === 'resume' && r.success).length;
    const initSuccess = summary.filter(r => r.tier === 'init' && r.success).length;
    const rotations = summary.filter(r => r.rotatedProjectId).length;
    const duration = (Date.now() - startTime) / 1000;

    console.log(`[Cron] Done in ${duration.toFixed(1)}s. Resume: ${resumeSuccess}/${resumeProjects.length}, Init: ${initSuccess}/${initProjects.length}, Rotations: ${rotations}`);

    return NextResponse.json({
      success: true,
      processed: totalProjects,
      resumeCount: resumeProjects.length,
      resumeSuccess,
      initCount: initProjects.length,
      initSuccess,
      rotations,
      durationSeconds: Math.round(duration),
      results: summary,
    });

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
