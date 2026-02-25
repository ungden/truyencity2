/**
 * Supabase pg_cron Target: Write Chapters
 * 
 * Called by Supabase pg_cron + pg_net every 5 minutes.
 * Uses Story Engine V2 exclusively for all tiers.
 * 
 * Three-tier processing:
 *   Tier 1 (RESUME): Projects with current_chapter > 0
 *     - Dynamic batch size (30-180), write 1 chapter each in PARALLEL
 *     - Per-project timeout: 180s
 *   
 *   Tier 2 (INIT-PREP): Projects with current_chapter = 0 AND no arc plan
 *     - Generate arc plan only (fast ~30-60s), no chapter write
 *     - Next cron tick picks them up as INIT-WRITE
 *     - Up to 20 projects per tick, timeout: 120s
 *   
 *   Tier 3 (INIT-WRITE): Projects with current_chapter = 0 AND arc plan exists
 *     - Write Ch.1 via V2 engine (arc plan already cached)
 *     - Up to 10 projects per tick, timeout: 240s
 * 
 * All tiers run in parallel with bounded, configurable concurrency (default 20).
 * Two-phase init prevents Vercel 300s timeout from killing arc plan + write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/cron-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getVietnamDayBounds } from '@/lib/utils/vietnam-time';

// Story Engine v2 — sole engine for all tiers (init + resume)
import { writeOneChapter as writeOneChapterV2 } from '@/services/story-engine';
import { generateArcPlan } from '@/services/story-engine/pipeline/context-assembler';
import type { GenreType, GeminiConfig } from '@/services/story-engine/types';
import { DEFAULT_CONFIG } from '@/services/story-engine/types';

// CONFIGURATION
function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DAILY_CHAPTER_QUOTA = 20; // Hard exact target per active novel per Vietnam day

const MIN_RESUME_BATCH_SIZE = clamp(parseIntEnv('WRITE_CHAPTERS_MIN_RESUME_BATCH', 30), 10, 300);
const MAX_RESUME_BATCH_SIZE = clamp(parseIntEnv('WRITE_CHAPTERS_MAX_RESUME_BATCH', 220), MIN_RESUME_BATCH_SIZE, 400);
const INIT_PREP_BATCH_SIZE = clamp(parseIntEnv('WRITE_CHAPTERS_INIT_PREP_BATCH', 20), 0, 100);   // Arc plan generation only (fast)
const INIT_WRITE_BATCH_SIZE = clamp(parseIntEnv('WRITE_CHAPTERS_INIT_WRITE_BATCH', 10), 0, 100);  // Chapter 1 writing (arc plan already exists)
const CANDIDATE_POOL_SIZE = clamp(parseIntEnv('WRITE_CHAPTERS_CANDIDATE_POOL', 1600), 200, 5000);
const PROJECT_TIMEOUT_MS = clamp(parseIntEnv('WRITE_CHAPTERS_RESUME_TIMEOUT_MS', 180_000), 30_000, 300_000);     // 180s per resume project
const INIT_PREP_TIMEOUT_MS = clamp(parseIntEnv('WRITE_CHAPTERS_INIT_PREP_TIMEOUT_MS', 120_000), 30_000, 300_000); // 120s for arc plan generation only
const INIT_WRITE_TIMEOUT_MS = clamp(parseIntEnv('WRITE_CHAPTERS_INIT_WRITE_TIMEOUT_MS', 240_000), 30_000, 300_000); // 240s for chapter 1 write (no arc plan gen)
const RUN_CONCURRENCY = clamp(parseIntEnv('WRITE_CHAPTERS_CONCURRENCY', 20), 1, 32); // Tier-3 Gemini is effectively unlimited; bottleneck is orchestration
const TICKS_PER_DAY = clamp(parseIntEnv('WRITE_CHAPTERS_TICKS_PER_DAY', 288), 60, 1440); // 5m cron => 288, 3m cron => 480
const OVERLOAD_RESUME_THRESHOLD = clamp(parseIntEnv('WRITE_CHAPTERS_OVERLOAD_RESUME_THRESHOLD', 120), 0, 2000);
const OVERLOAD_INIT_PREP_CAP = clamp(parseIntEnv('WRITE_CHAPTERS_OVERLOAD_INIT_PREP_CAP', 8), 0, 100);
const OVERLOAD_INIT_WRITE_CAP = clamp(parseIntEnv('WRITE_CHAPTERS_OVERLOAD_INIT_WRITE_CAP', 6), 0, 100);

export const maxDuration = 300; // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic';

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

async function executeWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const limit = Math.max(1, Math.min(concurrency, tasks.length));
  const results: T[] = new Array(tasks.length);
  // Atomic read-and-increment: cursor++ returns the old value and increments in one step.
  // Safe in JS single-threaded event loop — no await between read and increment.
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) break;
      results[i] = await tasks[i]();
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
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
  tier: 'resume' | 'init-prep' | 'init-write';
  success: boolean;
  error?: string;
  completionReason?: 'exact_target' | 'arc_boundary' | 'natural_ending' | 'hard_stop';
  chapterWritten?: boolean;
  arcPlanGenerated?: boolean;
};

function detectNaturalEnding(title?: string | null, content?: string | null): boolean {
  // Only check the LAST ~800 chars of content (the actual ending) + full title,
  // not mid-chapter achievements that happen to use ending vocabulary
  const lastParagraph = (content || '').slice(-800);
  const t = `${title || ''}\n${lastParagraph}`.toLowerCase();
  if (!t.trim()) return false;

  let score = 0;

  // Strong ending markers (explicit "story ended" signals)
  if (/hết truyện|hoàn truyện|toàn thư hoàn|đại kết cục|kết thúc thỏa mãn|epilogue/i.test(t)) score += 4;
  if (/nhiều năm sau|vài năm sau|hậu truyện|ngoại truyện/i.test(t)) score += 2;

  // Resolution markers (weaker — can appear mid-story as chapter-level events)
  if (/mọi chuyện đã kết thúc|cuối cùng cũng kết thúc|khép lại hành trình|khép lại một kỷ nguyên/i.test(t)) score += 2;
  // These can be chapter-level achievements, only score +1 each (was +2)
  if (/trật tự mới|thiên hạ thái bình|bình yên trở lại/i.test(t)) score += 1;
  if (/đăng cơ|xưng đế|phi thăng thành công/i.test(t)) score += 1;

  // Anti-signals: obvious continuation cliffhangers (heavy penalty)
  if (/to be continued|chưa xong|lần sau|chương sau|hồi sau sẽ rõ|một bí mật khác/i.test(t)) score -= 4;
  if (/cliffhanger|bầu không khí căng thẳng vẫn|cánh cửa vừa mở|chưa kết thúc/i.test(t)) score -= 3;
  if (/nhưng .{0,30}chưa|mới chỉ là bắt đầu|cuộc chiến .{0,20}thực sự/i.test(t)) score -= 2;

  // Require score >= 4 (same threshold but harder to reach due to weakened mid-story markers)
  return score >= 4;
}

async function ensureDailyQuotasForActiveProjects(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projects: Array<{ id: string }>,
  vnDate: string,
  dayStartIso: string,
  _dayEndIso: string,
  _now: Date
): Promise<void> {
  if (projects.length === 0) return;

  const dayStartMs = new Date(dayStartIso).getTime();

  // Spread 20 chapters evenly across 24h → 1 chapter every 72 minutes.
  // Each project gets a deterministic first-slot offset within [0, 72) minutes
  // from the start of the VN day, so they don't all fire at once.
  const cadenceMinutes = Math.floor(1440 / DAILY_CHAPTER_QUOTA); // 72 min

  const rows = projects.map((p) => {
    const seed = hashStringToInt(`${p.id}:${vnDate}`);
    const offsetMinutes = seed % cadenceMinutes;
    const nextDueMs = dayStartMs + offsetMinutes * 60 * 1000;
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

/**
 * Update quota IMMEDIATELY after a chapter is written or a task fails.
 * This runs inside each task, NOT at end of function, so it survives Vercel timeout.
 *
 * Attempts atomic SQL increment via Supabase RPC to prevent race conditions
 * when concurrent cron workers process the same project.
 * Falls back to non-atomic read-then-write if RPC function doesn't exist.
 */
async function updateQuotaAfterWrite(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
  vnDate: string,
  endIso: string,
): Promise<void> {
  // Try atomic increment first: written_chapters = LEAST(written_chapters + 1, target_chapters)
  // The RPC function `increment_quota_written` must be created in Supabase SQL editor.
  let written: number;
  let target: number;

  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('increment_quota_written', {
      p_project_id: projectId,
      p_vn_date: vnDate,
    });

    if (rpcErr) throw rpcErr;

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    written = row?.written_chapters ?? 1;
    target = row?.target_chapters ?? DAILY_CHAPTER_QUOTA;
  } catch {
    // Fallback: non-atomic read-then-write (works without RPC function)
    const { data: q } = await supabase
      .from('project_daily_quotas')
      .select('written_chapters,target_chapters')
      .eq('project_id', projectId)
      .eq('vn_date', vnDate)
      .maybeSingle();

    if (!q) return;

    written = Math.min(q.target_chapters, q.written_chapters + 1);
    target = q.target_chapters;

    // Non-atomic write of written_chapters (fallback only)
    await supabase
      .from('project_daily_quotas')
      .update({ written_chapters: written })
      .eq('project_id', projectId)
      .eq('vn_date', vnDate);
  }

  // Compute next_due_at and status (same logic for both paths)
  const remaining = Math.max(0, target - written);

  let status: 'active' | 'completed' = 'active';
  let nextDueAt: string | null = null;

  if (remaining <= 0) {
    status = 'completed';
  } else {
    const endMs = new Date(endIso).getTime();
    const nowMs = Date.now();
    const minutesLeft = Math.max(5, Math.floor((endMs - nowMs) / 60000));
    const cadence = clamp(Math.floor(minutesLeft / remaining), 5, 120);
    const jitter = (hashStringToInt(`${projectId}:${written}:${vnDate}`) % 11) - 5;
    const delayMinutes = Math.max(5, cadence + jitter);
    nextDueAt = new Date(nowMs + delayMinutes * 60 * 1000).toISOString();
  }

  await supabase
    .from('project_daily_quotas')
    .update({
      status,
      retry_count: 0,
      last_error: null,
      next_due_at: nextDueAt,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('vn_date', vnDate);
}

async function updateQuotaAfterError(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
  vnDate: string,
  errorMsg: string,
): Promise<void> {
  await supabase
    .from('project_daily_quotas')
    .update({
      retry_count: 1,
      last_error: errorMsg.slice(0, 500),
      next_due_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('vn_date', vnDate);
}

function computeDynamicResumeBatchSize(activeCount: number): number {
  const requiredPerTick = Math.ceil((activeCount * DAILY_CHAPTER_QUOTA) / TICKS_PER_DAY);
  const buffered = Math.ceil(requiredPerTick * 1.2);
  return clamp(buffered, MIN_RESUME_BATCH_SIZE, MAX_RESUME_BATCH_SIZE);
}

/**
 * INIT-PREP: Generate arc plan only for a project at chapter 0.
 * Fast (~30-60s), no chapter writing. Next tick picks it up for INIT-WRITE.
 */
async function prepareInitProject(
  project: ProjectRow,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  _vnDate: string,
  _endIso: string,
): Promise<RunResult> {
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  if (!novel?.id) throw new Error('No novel linked');

  const genre = (project.genre || 'tien-hiep') as GenreType;
  const protagonistName = project.main_character || 'Nhân vật chính';
  const totalPlanned = project.total_planned_chapters || 1000;
  const geminiConfig: GeminiConfig = {
    model: DEFAULT_CONFIG.model,
    temperature: 0.3,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };

  // Load story_outline for StoryVision injection
  const { data: projRow } = await supabase
    .from('ai_story_projects')
    .select('story_outline,story_bible,master_outline')
    .eq('id', project.id)
    .maybeSingle();

  let outlineSynopsis: string | undefined;
  let storyVision: { endingVision?: string; majorPlotPoints?: string[]; mainConflict?: string; endGoal?: string } | undefined;

  if (projRow?.story_outline) {
    const o = typeof projRow.story_outline === 'string' ? JSON.parse(projRow.story_outline) : projRow.story_outline;
    const parts: string[] = [];
    if (o.premise) parts.push(`Premise: ${o.premise}`);
    if (o.mainConflict) parts.push(`Xung đột: ${o.mainConflict}`);
    if (o.protagonist?.name) parts.push(`MC: ${o.protagonist.name} — ${o.protagonist.startingState || ''}`);
    if (o.endingVision) parts.push(`Kết cục: ${o.endingVision}`);
    outlineSynopsis = parts.join('\n');

    storyVision = {
      endingVision: o.endingVision,
      majorPlotPoints: o.majorPlotPoints,
      mainConflict: o.mainConflict,
      endGoal: o.endGoal,
    };
  }

  await generateArcPlan(
    project.id, 1, genre, protagonistName,
    outlineSynopsis || projRow?.master_outline || undefined,
    projRow?.story_bible || undefined,
    totalPlanned, geminiConfig, storyVision,
  );

  return {
    id: project.id,
    title: novel.title,
    tier: 'init-prep',
    success: true,
    chapterWritten: false,
    arcPlanGenerated: true,
  };
}

/**
 * Write one chapter for a project (resume or init-write).
 * For init-write, arc plan must already exist.
 * Updates quota IMMEDIATELY after success/failure (survives Vercel timeout).
 */
async function writeOneChapter(
  project: ProjectRow,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tier: 'resume' | 'init-write',
  vnDate: string,
  endIso: string,
): Promise<RunResult> {
  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  if (!novel?.id) throw new Error('No novel linked');

  const currentCh = project.current_chapter || 0;
  let latestWrittenTitle: string | null = null;
  let latestWrittenContent: string | null = null;

  // ====== PRE-WRITE COMPLETION CHECK ======
  const targetCh = project.total_planned_chapters || 200;
  if (currentCh >= targetCh) {
    const CHAPTERS_PER_ARC_CHECK = 20;
    const isArcBoundary = currentCh % CHAPTERS_PER_ARC_CHECK === 0;
    const isExactTarget = currentCh === targetCh;
    const hardStop = targetCh + CHAPTERS_PER_ARC_CHECK;

    if (isArcBoundary || isExactTarget || currentCh >= hardStop) {
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
  }

  // ====== STORY ENGINE V2 — sole engine for all tiers ======
  try {
    const v2Result = await writeOneChapterV2({
      projectId: project.id,
      temperature: project.temperature || undefined,
      targetWordCount: project.target_chapter_length || undefined,
    });

    // ====== QUOTA UPDATE — IMMEDIATELY after successful write ======
    try {
      await updateQuotaAfterWrite(supabase, project.id, vnDate, endIso);
    } catch { /* non-fatal: don't fail the chapter because of quota */ }

    latestWrittenTitle = v2Result.title;

    // Load content for natural ending detection
    try {
      const { data: ch } = await supabase.from('chapters')
        .select('content').eq('novel_id', novel.id)
        .eq('chapter_number', v2Result.chapterNumber).maybeSingle();
      latestWrittenContent = ch?.content || null;
    } catch { /* non-fatal */ }

    // ====== SOFT ENDING LOGIC ======
    const lastWrittenCh = v2Result.chapterNumber;
    const targetChapters = project.total_planned_chapters || 200;
    const CHAPTERS_PER_ARC = 20;
    const GRACE_BUFFER = CHAPTERS_PER_ARC;
    const hardStop = targetChapters + GRACE_BUFFER;
    const hasNaturalEnding = detectNaturalEnding(latestWrittenTitle, latestWrittenContent);
    let completionReason: RunResult['completionReason'];
    let shouldComplete = false;

    if (lastWrittenCh >= hardStop) {
      shouldComplete = true; completionReason = 'hard_stop';
    } else if (lastWrittenCh >= targetChapters) {
      const isArcBoundary = lastWrittenCh % CHAPTERS_PER_ARC === 0;
      const isExactTarget = lastWrittenCh === targetChapters;
      if (isArcBoundary || isExactTarget) {
        shouldComplete = true;
        completionReason = isExactTarget ? 'exact_target' : 'arc_boundary';
      } else if (hasNaturalEnding) {
        shouldComplete = true; completionReason = 'natural_ending';
      }
    } else if (lastWrittenCh >= targetChapters - 5 && hasNaturalEnding) {
      shouldComplete = true; completionReason = 'natural_ending';
    }

    if (shouldComplete) {
      await supabase.from('ai_story_projects')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', project.id);
    }

    return {
      id: project.id,
      title: novel.title,
      tier,
      success: true,
      completionReason,
      chapterWritten: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${tier}][${project.id.slice(0, 8)}] V2 engine failed:`, errorMsg);

    // ====== QUOTA ERROR — IMMEDIATELY after failure ======
    try {
      await updateQuotaAfterError(supabase, project.id, vnDate, errorMsg);
    } catch { /* non-fatal */ }

    return {
      id: project.id,
      title: novel.title,
      tier,
      success: false,
      error: errorMsg,
      chapterWritten: false,
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY missing' }, { status: 500 });
    }

  const supabase = getSupabaseAdmin();

  try {
    // ====== DISTRIBUTED LOCK: Skip projects claimed in the last 4 minutes ======
    // This prevents concurrent cron invocations from processing the same projects.
    // Each invocation only picks projects whose updated_at is older than 4 minutes,
    // then immediately bumps updated_at to "claim" them.
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();

    const [activeCountQuery, candidateQuery] = await Promise.all([
      supabase
        .from('ai_story_projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
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

    // Ensure only candidate pool projects have today's quota (lazy, not ALL 5000 active)
    // This reduces DB load ~288x/day compared to upserting for all active projects every tick.
    await ensureDailyQuotasForActiveProjects(supabase, allCandidates, vnDate, startIso, endIso, now);

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

    // ====== TWO-PHASE INIT: Split init candidates by arc plan existence ======
    // Phase 1 (init-prep): No arc plan → generate arc plan only (fast, ~30-60s)
    // Phase 2 (init-write): Arc plan exists → write chapter 1 (no arc plan gen needed)
    let initPrepCandidates: ProjectRow[] = [];
    let initWriteCandidates: ProjectRow[] = [];

    if (initCandidates.length > 0) {
      const initIds = initCandidates.map(p => p.id);
      const { data: arcRows } = await supabase
        .from('arc_plans')
        .select('project_id')
        .in('project_id', initIds)
        .eq('arc_number', 1);

      const hasArcPlan = new Set((arcRows || []).map((r: { project_id: string }) => r.project_id));
      initPrepCandidates = initCandidates.filter(p => !hasArcPlan.has(p.id));
      initWriteCandidates = initCandidates.filter(p => hasArcPlan.has(p.id));
    }

    const overloadMode = resumeCandidates.length >= OVERLOAD_RESUME_THRESHOLD;
    const effectiveInitPrepBatch = overloadMode
      ? Math.min(INIT_PREP_BATCH_SIZE, OVERLOAD_INIT_PREP_CAP)
      : INIT_PREP_BATCH_SIZE;
    const effectiveInitWriteBatch = overloadMode
      ? Math.min(INIT_WRITE_BATCH_SIZE, OVERLOAD_INIT_WRITE_CAP)
      : INIT_WRITE_BATCH_SIZE;

    const filteredResumeProjects = resumeCandidates.slice(0, dynamicResumeBatchSize);
    const filteredInitPrepProjects = initPrepCandidates.slice(0, effectiveInitPrepBatch);
    const filteredInitWriteProjects = initWriteCandidates.slice(0, effectiveInitWriteBatch);

    const totalProjects = filteredResumeProjects.length + filteredInitPrepProjects.length + filteredInitWriteProjects.length;
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

    // Atomic claim: only rows that are still older than fourMinutesAgo are claimed.
    const allIds = [...filteredResumeProjects, ...filteredInitPrepProjects, ...filteredInitWriteProjects].map(p => p.id);
    const claimTimestamp = new Date().toISOString();
    const { data: claimedRows, error: claimError } = await supabase
      .from('ai_story_projects')
      .update({ updated_at: claimTimestamp })
      .in('id', allIds)
      .lt('updated_at', fourMinutesAgo)
      .select('id');
    if (claimError) throw claimError;

    const claimedIds = new Set((claimedRows || []).map((r: { id: string }) => r.id));
    const claimedResumeProjects = filteredResumeProjects.filter(p => claimedIds.has(p.id));
    const claimedInitPrepProjects = filteredInitPrepProjects.filter(p => claimedIds.has(p.id));
    const claimedInitWriteProjects = filteredInitWriteProjects.filter(p => claimedIds.has(p.id));

    if (claimedIds.size < allIds.length) {
      console.log(`[Cron] Atomic claim ${claimedIds.size}/${allIds.length}; ${allIds.length - claimedIds.size} already claimed by another worker.`);
    }

    const claimedTotal = claimedResumeProjects.length + claimedInitPrepProjects.length + claimedInitWriteProjects.length;
    if (claimedTotal === 0) {
      return NextResponse.json({
        success: true,
        message: 'Candidates were due, but all were already claimed by another worker',
        activeCount,
        dueCandidates: dueCandidates.length,
      });
    }

    // ====== EXECUTE WITH BOUNDED CONCURRENCY ======

    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
      ]);

    const runTasks: Array<() => Promise<RunResult>> = [
      // Tier 1: Resume projects (write next chapter)
      ...claimedResumeProjects.map(p => async (): Promise<RunResult> =>
        withTimeout(
          writeOneChapter(p, supabase, 'resume', vnDate, endIso),
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
      // Tier 2: Init-prep projects (arc plan generation only, fast)
      ...claimedInitPrepProjects.map(p => async (): Promise<RunResult> =>
        withTimeout(
          prepareInitProject(p, supabase, vnDate, endIso),
          INIT_PREP_TIMEOUT_MS,
          { id: p.id, title: '?', tier: 'init-prep' as const, success: false, error: `Timeout after ${INIT_PREP_TIMEOUT_MS / 1000}s` }
        ).catch(err => ({
          id: p.id,
          title: '?',
          tier: 'init-prep' as const,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      ),
      // Tier 3: Init-write projects (arc plan exists, write ch.1)
      ...claimedInitWriteProjects.map(p => async (): Promise<RunResult> =>
        withTimeout(
          writeOneChapter(p, supabase, 'init-write', vnDate, endIso),
          INIT_WRITE_TIMEOUT_MS,
          { id: p.id, title: '?', tier: 'init-write' as const, success: false, error: `Timeout after ${INIT_WRITE_TIMEOUT_MS / 1000}s` }
        ).catch(err => ({
          id: p.id,
          title: '?',
          tier: 'init-write' as const,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      ),
    ];

    const summary: RunResult[] = await executeWithConcurrency(runTasks, RUN_CONCURRENCY);

    // Quota updates already happened inside each task (writeOneChapter / prepareInitProject).
    // No batch quota update needed here — survives Vercel timeout.

    const resumeSuccess = summary.filter(r => r.tier === 'resume' && r.success).length;
    const initPrepSuccess = summary.filter(r => r.tier === 'init-prep' && r.success).length;
    const initWriteSuccess = summary.filter(r => r.tier === 'init-write' && r.success).length;
    const duration = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      processed: claimedTotal,
      activeCount,
      dynamicResumeBatchSize,
      overloadMode,
      config: {
        runConcurrency: RUN_CONCURRENCY,
        minResumeBatch: MIN_RESUME_BATCH_SIZE,
        maxResumeBatch: MAX_RESUME_BATCH_SIZE,
        effectiveInitPrepBatch,
        effectiveInitWriteBatch,
        ticksPerDay: TICKS_PER_DAY,
        candidatePoolSize: CANDIDATE_POOL_SIZE,
      },
      runConcurrency: RUN_CONCURRENCY,
      timeoutSeconds: PROJECT_TIMEOUT_MS / 1000,
      dueCandidates: dueCandidates.length,
      resumeCount: claimedResumeProjects.length,
      resumeSuccess,
      initPrepCount: claimedInitPrepProjects.length,
      initPrepSuccess,
      initWriteCount: claimedInitWriteProjects.length,
      initWriteSuccess,
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
