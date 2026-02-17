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
import { summarizeChapter, generateSynopsis, generateArcPlan, generateStoryBible, refreshStoryBible, shouldBeFinaleArc } from '@/services/story-writing-factory/context-generators';
import { saveChapterSummary, ContextLoader, loadStoryOutline } from '@/services/story-writing-factory/context-loader';
import type { StoryVision } from '@/services/story-writing-factory/context-generators';

// Story Engine v2 — feature-flagged
import { writeOneChapter as writeOneChapterV2 } from '@/services/story-engine';

const USE_STORY_ENGINE_V2 = process.env.USE_STORY_ENGINE_V2 === 'true';

// CONFIGURATION
const MIN_RESUME_BATCH_SIZE = 30;
const MAX_RESUME_BATCH_SIZE = 180;
const INIT_BATCH_SIZE = 8;
const CANDIDATE_POOL_SIZE = 1200;
const PROJECT_TIMEOUT_MS = 180_000; // 180s per-project timeout for long-context chapters
const INIT_PROJECT_TIMEOUT_MS = 300_000;
const RUN_CONCURRENCY = 12; // Limit parallel pressure on model provider
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
  tier: 'resume' | 'init';
  success: boolean;
  error?: string;
  completionReason?: 'exact_target' | 'arc_boundary' | 'natural_ending' | 'hard_stop';
  chapterWritten?: boolean;
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

async function resolveChapterCursorPlan(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  novelId: string,
  currentCh: number,
): Promise<{
  runCurrentChapter: number;
  persistedCurrentChapter: number;
  nextChapter: number;
  reason?: 'ahead_of_db_max' | 'internal_gap';
}> {
  if (currentCh <= 0) {
    return { runCurrentChapter: 0, persistedCurrentChapter: 0, nextChapter: 1 };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select('chapter_number')
    .eq('novel_id', novelId)
    .lte('chapter_number', currentCh + 1)
    .order('chapter_number', { ascending: true });

  if (error) {
    return {
      runCurrentChapter: currentCh,
      persistedCurrentChapter: currentCh,
      nextChapter: currentCh + 1,
    };
  }

  const numbers = (data || []).map((r) => r.chapter_number as number);
  let expected = 1;
  for (const n of numbers) {
    if (n > expected) {
      return {
        runCurrentChapter: expected - 1,
        persistedCurrentChapter: currentCh,
        nextChapter: expected,
        reason: 'internal_gap',
      };
    }
    if (n === expected) expected++;
  }

  const maxExisting = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
  if (maxExisting < currentCh) {
    return {
      runCurrentChapter: maxExisting,
      persistedCurrentChapter: maxExisting,
      nextChapter: maxExisting + 1,
      reason: 'ahead_of_db_max',
    };
  }

  return {
    runCurrentChapter: currentCh,
    persistedCurrentChapter: currentCh,
    nextChapter: currentCh + 1,
  };
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
  let currentCh = project.current_chapter || 0;
  let runCurrentCh = currentCh;
  let persistedCurrentCh = currentCh;
  let internalGapBackfill = false;
  let latestWrittenTitle: string | null = null;
  let latestWrittenContent: string | null = null;
  let writtenChapterNumber: number | null = null;

  // ====== CHAPTER GAP CHECK ======
  // Canonicalize chapter cursor against real chapter rows.
  // - ahead_of_db_max: project cursor is ahead of DB max -> move persisted cursor backward.
  // - internal_gap: missing chapter inside range -> backfill missing chapter without lowering persisted cursor.
  if (currentCh > 0 && tier === 'resume') {
    const plan = await resolveChapterCursorPlan(supabase, novel.id, currentCh);
    runCurrentCh = plan.runCurrentChapter;
    persistedCurrentCh = plan.persistedCurrentChapter;
    internalGapBackfill = plan.reason === 'internal_gap';

    if (plan.reason === 'ahead_of_db_max' && persistedCurrentCh !== currentCh) {
      const from = currentCh;
      currentCh = persistedCurrentCh;
      console.warn(
        `[${tier}][${project.id.slice(0, 8)}] Gap detected (${plan.reason}): current_chapter=${from} -> ${currentCh}. Correcting before write.`
      );
      await supabase.from('ai_story_projects')
        .update({ current_chapter: currentCh })
        .eq('id', project.id);
    } else if (plan.reason === 'internal_gap') {
      console.warn(
        `[${tier}][${project.id.slice(0, 8)}] Internal chapter gap detected. Backfilling missing chapter ${plan.nextChapter} while keeping current_chapter=${persistedCurrentCh}.`
      );
    }
  }

  // ====== PRE-WRITE COMPLETION CHECK ======
  // If current_chapter already reached/exceeded total_planned_chapters,
  // check if we should mark completed WITHOUT writing another chapter.
  // This handles the edge case where a project reached its target but
  // the completion logic didn't trigger (e.g., not at arc boundary last time).
  const targetCh = project.total_planned_chapters || 200;
  if (currentCh >= targetCh && !internalGapBackfill) {
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

  // ====== STORY ENGINE V2 PATH ======
  if (USE_STORY_ENGINE_V2 && tier === 'resume') {
    try {
      const v2Result = await writeOneChapterV2({
        projectId: project.id,
        temperature: project.temperature || undefined,
        targetWordCount: project.target_chapter_length || undefined,
      });

      writtenChapterNumber = v2Result.chapterNumber;
      latestWrittenTitle = v2Result.title;

      // Load content for natural ending detection
      try {
        const { data: ch } = await supabase.from('chapters')
          .select('content').eq('novel_id', novel.id)
          .eq('chapter_number', v2Result.chapterNumber).maybeSingle();
        latestWrittenContent = ch?.content || null;
      } catch { /* non-fatal */ }

      // ====== SOFT ENDING (same logic as v1) ======
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
    } catch (v2Err) {
      console.error(`[${tier}][${project.id.slice(0, 8)}] V2 engine failed, falling through to V1:`,
        v2Err instanceof Error ? v2Err.message : String(v2Err));
      // Fall through to v1 path
    }
  }

  const factoryConfig: Partial<FactoryConfig> = {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    temperature: project.temperature || 1.0,
    maxTokens: 32768,
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

  const runAttempt = async (overrides?: Partial<FactoryConfig>) => {
    let attemptGenerated = false;
    let attemptPersisted = false;
    let persistError: string | undefined;
    const runner = new StoryRunner({ ...factoryConfig, ...overrides }, runnerConfig, aiService);

    runner.setCallbacks({
      onChapterCompleted: async (chNum, result) => {
        if (!result.data) return;

        attemptGenerated = true;
        writtenChapterNumber = chNum;

        latestWrittenTitle = result.data.title;
        latestWrittenContent = result.data.content;

        const upsertRes = await supabase.from('chapters').upsert({
          novel_id: novel.id,
          chapter_number: chNum,
          title: result.data.title,
          content: result.data.content,
        }, { onConflict: 'novel_id,chapter_number' });
        if (upsertRes.error) {
          persistError = `Chapter upsert failed: ${upsertRes.error.message}`;
          throw new Error(persistError);
        }

        const protagonistName = project.main_character || 'MC';
        const genre = (project.genre || 'tien-hiep') as GenreType;

        // ═══════════════════════════════════════════════════════════════
        // POST-WRITE PIPELINE (critical-first)
        // 1) CRITICAL: chapter summary must succeed before advancing cursor
        // 2) NON-CRITICAL: synopsis/arc-plan/bible refresh (best effort)
        // ═══════════════════════════════════════════════════════════════

        // 1) CRITICAL: Generate + save chapter summary with retries
        let summarySaved = false;
        let summaryErrMsg = 'unknown summary error';
        for (let summaryAttempt = 1; summaryAttempt <= 3; summaryAttempt++) {
          try {
            const summaryResult = await summarizeChapter(
              aiService, project.id, chNum, result.data.title, result.data.content, protagonistName,
            );
            await saveChapterSummary(
              project.id, chNum, result.data.title,
              summaryResult.summary, summaryResult.openingSentence,
              summaryResult.mcState, summaryResult.cliffhanger,
              { throwOnError: true },
            );
            summarySaved = true;
            break;
          } catch (summaryErr) {
            summaryErrMsg = summaryErr instanceof Error ? summaryErr.message : String(summaryErr);
            console.warn(
              `[${tier}][${project.id.slice(0, 8)}] Chapter ${chNum} summary attempt ${summaryAttempt}/3 failed: ${summaryErrMsg}`
            );
            if (summaryAttempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        }

        if (!summarySaved) {
          persistError = `Critical post-write failed: chapter summary not saved after retries (${summaryErrMsg})`;
          throw new Error(persistError);
        }

        // Advance project cursor ONLY after chapter + summary are both persisted
        const updateRes = await supabase.from('ai_story_projects').update({
          current_chapter: Math.max(persistedCurrentCh, chNum),
          updated_at: new Date().toISOString(),
        }).eq('id', project.id);
        if (updateRes.error) {
          persistError = `Project progress update failed: ${updateRes.error.message}`;
          throw new Error(persistError);
        }

        attemptPersisted = true;

        // 2) NON-CRITICAL: Arc boundary generators and bible maintenance
        try {
          // Synopsis: generate every 5 chapters (Phase 6: more frequent synopsis for better continuity)
          // Arc plan: generate every 20 chapters (arc structure unchanged)
          const ARC_SIZE = 20;
          const SYNOPSIS_INTERVAL = 5;
          const isSynopsisUpdate = chNum % SYNOPSIS_INTERVAL === 0;
          const isArcPlanUpdate = chNum % ARC_SIZE === 0;
          if (isSynopsisUpdate) {
            const completedArcNumber = Math.floor(chNum / ARC_SIZE);
            const nextArcNumber = completedArcNumber + 1;

            // Load context for synopsis generation
            const contextLoader = new ContextLoader(project.id, novel.id);
            const arcPayload = await contextLoader.load(chNum + 1);

            // For synopsis: use arc summaries at arc boundary, or recent summaries at 5-ch interval
            // At arc boundaries (every 20ch) we have full arc summaries.
            // At 5-ch intervals, we load the last 5 chapter summaries directly.
            let synopsisSummaries = arcPayload.arcChapterSummaries;
            if (!isArcPlanUpdate && synopsisSummaries.length === 0) {
              // Load last 5 chapter summaries for mini-synopsis update
              try {
                const sb = getSupabaseAdmin();
                const { data } = await sb
                  .from('chapter_summaries')
                  .select('chapter_number, title, summary, opening_sentence, mc_state, cliffhanger')
                  .eq('project_id', project.id)
                  .lte('chapter_number', chNum)
                  .gt('chapter_number', chNum - SYNOPSIS_INTERVAL)
                  .order('chapter_number', { ascending: true });
                if (data && data.length > 0) {
                  synopsisSummaries = (data as Array<{
                    chapter_number: number; title: string; summary: string;
                    opening_sentence: string | null; mc_state: string | null; cliffhanger: string | null;
                  }>).map(row => ({
                    chapterNumber: row.chapter_number,
                    title: row.title,
                    summary: row.summary,
                    openingSentence: row.opening_sentence,
                    mcState: row.mc_state,
                    cliffhanger: row.cliffhanger,
                  }));
                }
              } catch { /* non-fatal */ }
            }

            // Generate rolling synopsis from old synopsis + recent summaries
            await generateSynopsis(
              aiService, project.id, arcPayload.synopsis,
              synopsisSummaries, genre, protagonistName, chNum,
            );

            // Reload synopsis (just updated) for arc plan generation
            const updatedPayload = await contextLoader.load(chNum + 1);

            // Load story vision for directional coherence
            let storyVision: StoryVision | null = null;
            try {
              const savedOutline = await loadStoryOutline(project.id);
              if (savedOutline) {
                storyVision = {
                  endingVision: (savedOutline as Record<string, unknown>).endingVision as string | undefined,
                  majorPlotPoints: ((savedOutline as Record<string, unknown>).majorPlotPoints as Array<{ description?: string }> | undefined)
                    ?.map(p => typeof p === 'string' ? p : p.description || JSON.stringify(p)),
                  mainConflict: (savedOutline as Record<string, unknown>).mainConflict as string | undefined,
                  endGoal: ((savedOutline as Record<string, unknown>).protagonist as Record<string, unknown> | undefined)?.endGoal as string | undefined,
                };
              }
            } catch {
              // non-fatal
            }

            // Finale detection: should next arc be the final one?
            const totalTarget = project.total_planned_chapters || 200;
            let isFinale = (nextArcNumber * 20) >= totalTarget;
            if (!isFinale && chNum >= totalTarget * 0.6) {
              try {
                isFinale = await shouldBeFinaleArc(
                  aiService, updatedPayload.synopsis, storyVision,
                  updatedPayload.synopsis?.openThreads || [], chNum, totalTarget,
                );
              } catch {
                // non-fatal, keep false
              }
            }

            // Generate arc plan for the NEXT arc (only at 20-chapter boundaries)
            if (isArcPlanUpdate) {
              await generateArcPlan(
                aiService, project.id, nextArcNumber, genre, protagonistName,
                updatedPayload.synopsis, updatedPayload.storyBible,
                totalTarget,
                storyVision,
              );

              // Mark arc as finale if detected
              if (isFinale) {
                try {
                  const adminSupa = getSupabaseAdmin();
                  await adminSupa.from('arc_plans')
                    .update({ is_finale_arc: true })
                    .eq('project_id', project.id)
                    .eq('arc_number', nextArcNumber);
                } catch {
                  // non-fatal
                }
              }
            }
          }

          // Generate story bible after chapter 3 (one-time)
          if (chNum === 3) {
            const contextLoader = new ContextLoader(project.id, novel.id);
            const biblePayload = await contextLoader.load(chNum + 1);
            if (!biblePayload.hasStoryBible) {
              await generateStoryBible(
                aiService, project.id, genre, protagonistName,
                project.world_description || novel.title,
                biblePayload.recentChapters,
              );
            }
          }

          // Refresh story bible every 100 chapters
          const ARC_SIZE_CHECK = 20;
          if (chNum % ARC_SIZE_CHECK === 0) {
            const arcNum = Math.floor(chNum / ARC_SIZE_CHECK);
            if (arcNum > 0 && arcNum % 5 === 0) {
              const ctxLoader = new ContextLoader(project.id, novel.id);
              const refreshPayload = await ctxLoader.load(chNum + 1);
              if (refreshPayload.storyBible) {
                await refreshStoryBible(
                  aiService, project.id, genre, protagonistName,
                  refreshPayload.storyBible, refreshPayload.synopsis,
                  refreshPayload.recentChapters, chNum,
                );
              }
            }
          }
        } catch (postWriteErr) {
          console.error(`[${tier}][${project.id.slice(0, 8)}] Non-critical post-write failed:`,
            postWriteErr instanceof Error ? postWriteErr.message : String(postWriteErr));
        }
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
      novelId: novel.id,
      chaptersToWrite: 1,
      currentChapter: runCurrentCh,
    });

    return { runResult, attemptGenerated, attemptPersisted, persistError };
  };

  let { runResult: result, attemptGenerated: chapterGenerated, attemptPersisted: chapterWritten, persistError } = await runAttempt();

  // Fallback path: if first attempt produced no chapter, retry once with cheaper/simple workflow.
  // IMPORTANT: Skip fallback if the chapter was already generated (even if persist failed),
  // to avoid overwriting a good 3-agent chapter with a worse simple-workflow version.
  if (!chapterWritten && !chapterGenerated) {
    const fallback = await runAttempt({ use3AgentWorkflow: false, maxRetries: 0, maxTokens: 32768, temperature: 0.9 });
    if (fallback.attemptPersisted) {
      chapterGenerated = true;
      chapterWritten = true;
      result = fallback.runResult;
      persistError = undefined;
    } else {
      chapterGenerated = chapterGenerated || fallback.attemptGenerated;
      persistError = persistError || fallback.persistError;
    }

    if (!result.success && fallback.runResult.success) {
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
  // lastWrittenCh = the chapter number that was just written (currentCh was the state BEFORE writing)
  const lastWrittenCh = chapterWritten
    ? Math.max(currentCh, writtenChapterNumber || currentCh)
    : currentCh;
  const targetChapters = project.total_planned_chapters || 200;
  const hardStop = targetChapters + GRACE_BUFFER;
  const hasNaturalEnding = detectNaturalEnding(latestWrittenTitle, latestWrittenContent);
  let completionReason: RunResult['completionReason'];

  // Check if we should complete the story
  let shouldComplete = false;

  if (lastWrittenCh >= hardStop) {
    // Phase 4: Hard stop — safety net, prevent infinite writing
    shouldComplete = true;
    completionReason = 'hard_stop';
  } else if (lastWrittenCh >= targetChapters) {
    // Phase 3: Grace period — only complete at arc boundary (every 20 chapters)
    // Also complete if we've exactly hit the target (covers small novels where target isn't a multiple of arc size)
    const isArcBoundary = lastWrittenCh % CHAPTERS_PER_ARC === 0;
    const isExactTarget = lastWrittenCh === targetChapters;
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
  } else if (lastWrittenCh >= targetChapters - 5 && hasNaturalEnding) {
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
    const rootError = persistError
      ? `Chapter generated but persistence failed: ${persistError}`
      : result.error || (chapterGenerated ? 'Chapter generated but not persisted' : 'No chapter written in this run');
    return {
      id: project.id,
      title: novel.title,
      tier,
      success: false,
      error: rootError,
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

    // Atomic claim: only rows that are still older than fourMinutesAgo are claimed.
    // If another worker already claimed a row, it won't match this WHERE and won't be processed twice.
    const allIds = [...filteredResumeProjects, ...filteredInitProjects].map(p => p.id);
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
    const claimedInitProjects = filteredInitProjects.filter(p => claimedIds.has(p.id));

    if (claimedIds.size < allIds.length) {
      console.log(`[Cron] Atomic claim ${claimedIds.size}/${allIds.length}; ${allIds.length - claimedIds.size} already claimed by another worker.`);
    }

    const claimedTotal = claimedResumeProjects.length + claimedInitProjects.length;
    if (claimedTotal === 0) {
      return NextResponse.json({
        success: true,
        message: 'Candidates were due, but all were already claimed by another worker',
        activeCount,
        dueCandidates: dueCandidates.length,
      });
    }

    // ====== EXECUTE WITH BOUNDED CONCURRENCY ======

    // Helper: wrap a promise with a timeout to prevent one slow project from blocking the batch
    const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
      ]);

    const runTasks: Array<() => Promise<RunResult>> = [
      ...claimedResumeProjects.map(p => async () =>
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
      ...claimedInitProjects.map(p => async () =>
        withTimeout(
          writeOneChapter(p, geminiKey, supabase, 'init'),
          INIT_PROJECT_TIMEOUT_MS,
          { id: p.id, title: '?', tier: 'init' as const, success: false, error: `Timeout after ${INIT_PROJECT_TIMEOUT_MS / 1000}s` }
        ).catch(err => ({
          id: p.id,
          title: '?',
          tier: 'init' as const,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }))
      ),
    ];

    const summary: RunResult[] = await executeWithConcurrency(runTasks, RUN_CONCURRENCY);

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
      processed: claimedTotal,
      activeCount,
      dynamicResumeBatchSize,
      runConcurrency: RUN_CONCURRENCY,
      timeoutSeconds: PROJECT_TIMEOUT_MS / 1000,
      dueCandidates: dueCandidates.length,
      resumeCount: claimedResumeProjects.length,
      resumeSuccess,
      initCount: claimedInitProjects.length,
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
