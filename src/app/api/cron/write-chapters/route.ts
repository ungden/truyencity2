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
const MIN_RESUME_BATCH_SIZE = 30;
const MAX_RESUME_BATCH_SIZE = 180;
const INIT_BATCH_SIZE = 8;
const CANDIDATE_POOL_SIZE = 1200;
const PROJECT_TIMEOUT_MS = 120_000; // 120s per-project timeout — prevents 1 slow project from blocking the batch
const DAILY_CHAPTER_QUOTA = 20; // Hard exact target per active novel per Vietnam day

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

function getVietnamDayBounds(now: Date = new Date()): { vnDate: string; startIso: string; endIso: string } {
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
    vnDate: dateStr,
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

function hashStringToInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

type DailyQuotaRow = {
  project_id: string;
  vn_date: string;
  target_chapters: number;
  written_chapters: number;
  next_due_at: string | null;
  status: 'active' | 'completed' | 'failed';
  retry_count: number;
};

type RunResult = {
  id: string;
  title: string;
  tier: 'resume' | 'init';
  success: boolean;
  error?: string;
  completionReason?: 'exact_target' | 'arc_boundary' | 'natural_ending' | 'hard_stop';
  chapterWritten?: boolean;
};

function detectNaturalEnding(title?: string | null, content?: string | null): boolean {
  const t = `${title || ''}\n${content || ''}`.toLowerCase();
  if (!t.trim()) return false;

  let score = 0;

  // Strong ending markers
  if (/hết truyện|hoàn truyện|toàn thư hoàn|đại kết cục|kết thúc thỏa mãn|epilogue/i.test(t)) score += 4;
  if (/nhiều năm sau|vài năm sau|hậu truyện|ngoại truyện/i.test(t)) score += 2;

  // Resolution markers
  if (/mọi chuyện đã kết thúc|cuối cùng cũng kết thúc|khép lại hành trình|khép lại một kỷ nguyên/i.test(t)) score += 2;
  if (/trật tự mới|thiên hạ thái bình|bình yên trở lại|đăng cơ|xưng đế|phi thăng thành công/i.test(t)) score += 2;

  // Anti-signals: obvious continuation cliffhangers
  if (/to be continued|chưa xong|lần sau|chương sau|hồi sau sẽ rõ|một bí mật khác/i.test(t)) score -= 3;
  if (/cliffhanger|bầu không khí căng thẳng vẫn|màn đêm nuốt chửng|cánh cửa vừa mở/i.test(t)) score -= 2;

  return score >= 4;
}

async function ensureDailyQuotasForActiveProjects(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projects: Array<{ id: string }>,
  vnDate: string,
  dayStartIso: string,
  dayEndIso: string,
  now: Date
): Promise<void> {
  if (projects.length === 0) return;

  const dayStartMs = new Date(dayStartIso).getTime();
  const dayEndMs = new Date(dayEndIso).getTime();
  const nowMs = now.getTime();
  const minutesLeft = Math.max(1, Math.floor((dayEndMs - nowMs) / 60000));
  const spacing = clamp(Math.floor(minutesLeft / DAILY_CHAPTER_QUOTA), 5, 72);

  const rows = projects.map((p) => {
    const seed = hashStringToInt(`${p.id}:${vnDate}`);
    const offsetMinutes = seed % spacing;
    const nextDueMs = Math.max(dayStartMs, nowMs) + offsetMinutes * 60 * 1000;
    return {
      project_id: p.id,
      vn_date: vnDate,
      target_chapters: DAILY_CHAPTER_QUOTA,
      written_chapters: 0,
      status: 'active' as const,
      retry_count: 0,
      slot_seed: seed,
      next_due_at: new Date(nextDueMs).toISOString(),
    };
  });

  const { error } = await supabase
    .from('project_daily_quotas')
    .upsert(rows, { onConflict: 'project_id,vn_date', ignoreDuplicates: true });

  if (error) {
    throw new Error(`ensureDailyQuotasForActiveProjects failed: ${error.message}`);
  }
}

function computeDynamicResumeBatchSize(activeCount: number): number {
  // 288 ticks/day with 5-minute cron
  const requiredPerTick = Math.ceil((activeCount * DAILY_CHAPTER_QUOTA) / 288);
  const buffered = Math.ceil(requiredPerTick * 1.2);
  return clamp(buffered, MIN_RESUME_BATCH_SIZE, MAX_RESUME_BATCH_SIZE);
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

      return {
        id: project.id,
        title: novel.title,
        tier,
        success: true,
        error: undefined,
        completionReason: currentCh >= hardStop ? 'hard_stop' : isExactTarget ? 'exact_target' : 'arc_boundary',
        chapterWritten: false,
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
  let latestWrittenTitle: string | null = null;
  let latestWrittenContent: string | null = null;

  const runAttempt = async (overrides?: Partial<FactoryConfig>) => {
    let attemptWrote = false;
    const runner = new StoryRunner({ ...factoryConfig, ...overrides }, runnerConfig, aiService);

    runner.setCallbacks({
      onChapterCompleted: async (chNum, result) => {
        if (!result.data) return;

        latestWrittenTitle = result.data.title;
        latestWrittenContent = result.data.content;

        const upsertRes = await supabase.from('chapters').upsert({
          novel_id: novel.id,
          chapter_number: chNum,
          title: result.data.title,
          content: result.data.content,
        }, { onConflict: 'novel_id,chapter_number' });
        if (upsertRes.error) {
          throw new Error(`Chapter upsert failed: ${upsertRes.error.message}`);
        }

        const updateRes = await supabase.from('ai_story_projects').update({
          current_chapter: chNum,
          updated_at: new Date().toISOString(),
        }).eq('id', project.id);
        if (updateRes.error) {
          throw new Error(`Project progress update failed: ${updateRes.error.message}`);
        }

        attemptWrote = true;
      },
      onError: (e) => console.error(`[${tier}][${project.id.slice(0, 8)}] Error: ${e}`),
    });

    const runResult = await runner.run({
      title: novel.title,
      protagonistName: project.main_character || 'MC',
      genre: (project.genre || 'tien-hiep') as GenreType,
      premise: project.world_description || novel.title,
      targetChapters: project.total_planned_chapters || 200,
      chaptersPerArc: 20,
      projectId: project.id,
      chaptersToWrite: 1,
      currentChapter: currentCh,
    });

    return { runResult, attemptWrote };
  };

  let { runResult: result, attemptWrote: chapterWritten } = await runAttempt();

  // Fallback path: if first attempt produced no chapter, retry once with cheaper/simple workflow.
  if (!chapterWritten) {
    const fallback = await runAttempt({ use3AgentWorkflow: false, maxRetries: 0, maxTokens: 6144, temperature: 0.9 });
    if (fallback.attemptWrote) {
      chapterWritten = true;
      result = fallback.runResult;
    } else if (!result.success && fallback.runResult.success) {
      result = fallback.runResult;
    }
  }

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
  const hasNaturalEnding = detectNaturalEnding(latestWrittenTitle, latestWrittenContent);
  let completionReason: RunResult['completionReason'];

  // Check if we should complete the story
  let shouldComplete = false;

  if (nextCh >= hardStop) {
    // Phase 4: Hard stop — safety net, prevent infinite writing
    shouldComplete = true;
    completionReason = 'hard_stop';
  } else if (nextCh >= targetChapters) {
    // Phase 3: Grace period — only complete at arc boundary (every 20 chapters)
    // Also complete if we've exactly hit the target (covers small novels where target isn't a multiple of arc size)
    const isArcBoundary = nextCh % CHAPTERS_PER_ARC === 0;
    const isExactTarget = nextCh === targetChapters;
    if (isArcBoundary || isExactTarget) {
      shouldComplete = true;
      completionReason = isExactTarget ? 'exact_target' : 'arc_boundary';
    } else if (hasNaturalEnding) {
      // Semantic early finish in grace period: the chapter clearly closes the story
      shouldComplete = true;
      completionReason = 'natural_ending';
    } else {
      // Not at arc boundary — continue writing to finish the current arc
    }
  } else if (nextCh >= targetChapters - 5 && hasNaturalEnding) {
    // Close slightly before target when the narrative clearly ended naturally.
    shouldComplete = true;
    completionReason = 'natural_ending';
  }

  if (shouldComplete) {
    await supabase.from('ai_story_projects')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', project.id);
  }

  if (!chapterWritten && !completionReason) {
    return {
      id: project.id,
      title: novel.title,
      tier,
      success: false,
      error: result.error || 'No chapter written in this run',
      chapterWritten: false,
    };
  }

  return {
    id: project.id,
    title: novel.title,
    tier,
    success: result.success,
    error: result.error,
    completionReason,
    chapterWritten,
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

    const [activeCountQuery, activeForQuotaQuery, candidateQuery] = await Promise.all([
      supabase
        .from('ai_story_projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('ai_story_projects')
        .select('id')
        .eq('status', 'active')
        .limit(5000),
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
        .lt('updated_at', fourMinutesAgo)
        .order('updated_at', { ascending: true })
        .limit(CANDIDATE_POOL_SIZE),
    ]);

    if (activeCountQuery.error) throw activeCountQuery.error;
    if (candidateQuery.error) throw candidateQuery.error;
    if (activeForQuotaQuery.error) throw activeForQuotaQuery.error;

    const activeCount = activeCountQuery.count || 0;
    const dynamicResumeBatchSize = computeDynamicResumeBatchSize(activeCount);

    const rawCandidates = (candidateQuery.data || []) as ProjectRow[];

    // Filter candidates eligible for processing (respect soft-ending grace buffer)
    const GRACE_BUFFER_FILTER = 20;
    const allCandidates = rawCandidates.filter((p) => {
      const total = p.total_planned_chapters || 200;
      const current = p.current_chapter || 0;
      const hardStop = total + GRACE_BUFFER_FILTER;
      return current < hardStop && p.novels;
    });

    const now = new Date();
    const { vnDate, startIso, endIso } = getVietnamDayBounds(now);

    // Ensure every active candidate has today's quota row.
    await ensureDailyQuotasForActiveProjects(supabase, activeForQuotaQuery.data || [], vnDate, startIso, endIso, now);

    const projectIds = allCandidates.map((p) => p.id);
    let quotaRows: DailyQuotaRow[] = [];

    if (projectIds.length > 0) {
      const { data: quotas, error: quotasError } = await supabase
        .from('project_daily_quotas')
        .select('project_id,vn_date,target_chapters,written_chapters,next_due_at,status,retry_count')
        .in('project_id', projectIds)
        .eq('vn_date', vnDate);

      if (quotasError) throw quotasError;
      quotaRows = (quotas || []) as DailyQuotaRow[];
    }

    const nowIso = now.toISOString();
    const dueQuotaByProject = new Map(
      quotaRows
        .filter((q) => q.status !== 'completed' && q.written_chapters < q.target_chapters && (!!q.next_due_at ? q.next_due_at <= nowIso : true))
        .map((q) => [q.project_id, q])
    );

    const dueCandidates = allCandidates.filter((p) => dueQuotaByProject.has(p.id));
    const sortedDue = [...dueCandidates].sort((a, b) => {
      const qa = dueQuotaByProject.get(a.id)!;
      const qb = dueQuotaByProject.get(b.id)!;
      if (qa.written_chapters !== qb.written_chapters) return qa.written_chapters - qb.written_chapters;
      const da = qa.next_due_at || '';
      const db = qb.next_due_at || '';
      return da.localeCompare(db);
    });

    const resumeCandidates = sortedDue.filter((p) => (p.current_chapter || 0) > 0);
    const initCandidates = sortedDue.filter((p) => (p.current_chapter || 0) === 0);

    const filteredResumeProjects = resumeCandidates.slice(0, dynamicResumeBatchSize);
    const filteredInitProjects = initCandidates.slice(0, INIT_BATCH_SIZE);

    const totalProjects = filteredResumeProjects.length + filteredInitProjects.length;
    const skippedDueToQuota = allCandidates.length - dueCandidates.length;

    if (totalProjects === 0) {
      return NextResponse.json({
        success: true,
        message: skippedDueToQuota > 0
          ? `No projects due now (quota complete for ${skippedDueToQuota} candidates)`
          : 'No projects due now',
        skippedDueToQuota,
        activeCount,
        dueCandidates: dueCandidates.length,
      });
    }

    // Claim projects by bumping updated_at to now (distributed lock).
    // Concurrent invocations will skip these because of the .lt('updated_at', fourMinutesAgo) guard.
    const allIds = [...filteredResumeProjects, ...filteredInitProjects].map(p => p.id);
    await supabase
      .from('ai_story_projects')
      .update({ updated_at: new Date().toISOString() })
      .in('id', allIds);

    // ====== EXECUTE BOTH TIERS IN PARALLEL ======

    // Helper: wrap a promise with a timeout to prevent one slow project from blocking the batch
    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
      ]);

    const allPromises = [
      // Tier 1: All resume projects in parallel (with per-project timeout)
      ...filteredResumeProjects.map(p =>
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
      ...filteredInitProjects.map(p =>
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

    const quotaByProject = new Map(quotaRows.map((q) => [q.project_id, q]));
    const quotaUpdates = summary
      .filter((r) => r.id !== '?' && r.chapterWritten)
      .map(async (r) => {
        const q = quotaByProject.get(r.id);
        if (!q) return;

        const nowTick = new Date();
        const written = Math.min(q.target_chapters, q.written_chapters + 1);
        const remaining = Math.max(0, q.target_chapters - written);

        let status: DailyQuotaRow['status'] = 'active';
        let nextDueAt: string | null = q.next_due_at;

        if (remaining <= 0) {
          status = 'completed';
          nextDueAt = null;
        } else {
          const endMs = new Date(endIso).getTime();
          const nowMs = nowTick.getTime();
          const minutesLeft = Math.max(5, Math.floor((endMs - nowMs) / 60000));
          const cadence = clamp(Math.floor(minutesLeft / remaining), 5, 120);
          const jitter = (hashStringToInt(`${r.id}:${written}:${vnDate}`) % 11) - 5;
          const delayMinutes = Math.max(5, cadence + jitter);
          nextDueAt = new Date(nowMs + delayMinutes * 60 * 1000).toISOString();
        }

        await supabase
          .from('project_daily_quotas')
          .update({
            written_chapters: written,
            status,
            retry_count: 0,
            last_error: null,
            next_due_at: nextDueAt,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', r.id)
          .eq('vn_date', vnDate);
      });

    const failedUpdates = summary
      .filter((r) => r.id !== '?' && !r.success)
      .map(async (r) => {
        await supabase
          .from('project_daily_quotas')
          .update({
            retry_count: 1,
            last_error: (r.error || 'unknown').slice(0, 500),
            next_due_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', r.id)
          .eq('vn_date', vnDate);
      });

    await Promise.allSettled([...quotaUpdates, ...failedUpdates]);

    const resumeSuccess = summary.filter(r => r.tier === 'resume' && r.success).length;
    const initSuccess = summary.filter(r => r.tier === 'init' && r.success).length;
    const duration = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processed: totalProjects,
      activeCount,
      dynamicResumeBatchSize,
      dueCandidates: dueCandidates.length,
      resumeCount: filteredResumeProjects.length,
      resumeSuccess,
      initCount: filteredInitProjects.length,
      initSuccess,
      skippedDueToQuota,
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
