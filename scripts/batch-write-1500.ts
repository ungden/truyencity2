/**
 * FAST Batch Writer: Push 1 novel to 1500 chapters
 *
 * v2: Bypasses StoryRunner entirely. Calls ChapterWriter directly + pipelines post-write.
 *     ~60s/chapter (was ~85s) = ~40% faster.
 *
 * Speed optimizations:
 * 1. Reuse ChapterWriter instance across ALL chapters (no re-init overhead)
 * 2. Pipeline post-write: chapter summary + arc generators run in background
 *    while the NEXT chapter is already being written
 * 3. Zero inter-chapter delay
 * 4. No QC systems, no consistency checker, no memory manager overhead
 * 5. Context loaded from DB (4-layer system) — always fresh
 *
 * Usage:
 *   npx tsx scripts/batch-write-1500.ts
 *
 * Resume-safe: reads current_chapter from DB on start.
 */

import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import { ChapterWriter } from '@/services/story-writing-factory/chapter';
import { ContextLoader } from '@/services/story-writing-factory/context-loader';
import { saveChapterSummary } from '@/services/story-writing-factory/context-loader';
import {
  summarizeChapter,
  generateSynopsis,
  generateArcPlan,
  generateStoryBible,
  refreshStoryBible,
  shouldBeFinaleArc,
} from '@/services/story-writing-factory/context-generators';
import type { StoryVision } from '@/services/story-writing-factory/context-generators';
import { getStyleByGenre, getPowerSystemByGenre } from '@/services/story-writing-factory/templates';
import { loadStoryOutline } from '@/services/story-writing-factory/context-loader';
import type { FactoryConfig, GenreType, WorldBible, StoryArc, ArcTheme } from '@/services/story-writing-factory/types';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIG
// ============================================================================

// Accept CLI args: npx tsx scripts/batch-write-1500.ts <project_id> <novel_id> [target_chapters]
const PROJECT_ID = process.argv[2] || '62b7ce71-887c-4b9b-9fbc-bbcdcd8cfe01';
const NOVEL_ID = process.argv[3] || '524c60e0-0af5-448e-b458-53e62a5f3ec5';
const TARGET_CHAPTERS_ARG = process.argv[4] ? parseInt(process.argv[4], 10) : 0; // 0 = read from DB
const ARC_SIZE = 20;
const MAX_CONSECUTIVE_FAILURES = 5;
const RETRY_DELAY_MS = 10_000;

// ============================================================================
// HELPERS
// ============================================================================

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function elapsed(startMs: number): string {
  const sec = Math.round((Date.now() - startMs) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h${m}m${s}s`;
}

function eta(startMs: number, done: number, total: number): string {
  if (done === 0) return '??';
  const msPerChapter = (Date.now() - startMs) / done;
  const remaining = total - done;
  const etaSec = Math.round((remaining * msPerChapter) / 1000);
  const h = Math.floor(etaSec / 3600);
  const m = Math.floor((etaSec % 3600) / 60);
  return `~${h}h${m}m`;
}

async function resolveChapterCursorPlan(
  supabase: SupabaseClient,
  novelId: string,
  currentCh: number,
): Promise<{
  persistedCurrentChapter: number;
  nextChapter: number;
  reason?: 'ahead_of_db_max' | 'internal_gap';
}> {
  if (currentCh <= 0) {
    return { persistedCurrentChapter: 0, nextChapter: 1 };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select('chapter_number')
    .eq('novel_id', novelId)
    .lte('chapter_number', currentCh + 1)
    .order('chapter_number', { ascending: true });

  if (error) {
    return {
      persistedCurrentChapter: currentCh,
      nextChapter: currentCh + 1,
    };
  }

  const numbers = (data || []).map((r) => r.chapter_number as number);
  let expected = 1;
  for (const n of numbers) {
    if (n > expected) {
      return {
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
      persistedCurrentChapter: maxExisting,
      nextChapter: maxExisting + 1,
      reason: 'ahead_of_db_max',
    };
  }

  return {
    persistedCurrentChapter: currentCh,
    nextChapter: currentCh + 1,
  };
}

// ============================================================================
// BUILD DYNAMIC WORLDBIBLE from synopsis data (C4 fix — was frozen/static)
// ============================================================================

import type { SynopsisData, ArcPlanData } from '@/services/story-writing-factory/context-loader';

function buildDynamicWorldBible(
  projectId: string,
  title: string,
  protagonistName: string,
  genre: GenreType,
  synopsis: SynopsisData | null,
): WorldBible {
  const powerSystem = getPowerSystemByGenre(genre);

  // Extract dynamic data from synopsis if available
  const mcState = synopsis?.mcCurrentState || '';
  const allies = synopsis?.activeAllies || [];
  const enemies = synopsis?.activeEnemies || [];
  const openThreads = synopsis?.openThreads || [];

  // Try to infer MC realm from synopsis mc_state (e.g. "Cảnh giới: Kim Đan kỳ")
  const realmMatch = mcState.match(/[Cc]ảnh giới[:\s]*([^,.\n]+)/);
  const currentRealm = realmMatch?.[1]?.trim() || powerSystem.realms[0].name;

  // Build NPC relationships from allies + enemies
  const npcRelationships = [
    ...allies.map((name, i) => ({ name, role: 'ally' as const, affinity: 70, description: 'đồng minh', firstAppearance: i + 1 })),
    ...enemies.map((name, i) => ({ name, role: 'enemy' as const, affinity: -50, description: 'kẻ thù', firstAppearance: i + 1 })),
  ];

  // Convert open threads strings to PlotThread objects
  const plotThreads = openThreads.map((t, i) => ({
    id: `thread-${i}`,
    name: t.slice(0, 50),
    description: t,
    priority: 'sub' as const,
    status: 'open' as const,
    startChapter: 1,
  }));

  return {
    projectId,
    storyTitle: title,
    powerSystem,
    protagonist: {
      name: protagonistName,
      realm: currentRealm,
      level: 1, // not critical — synopsis mc_state carries real info
      age: 18,
      traits: ['kiên trì', 'mưu trí', 'quyết tâm'],
      abilities: [],
      inventory: [],
      goals: openThreads.length > 0 ? openThreads.slice(0, 3) : ['Trở thành cường giả tối thượng'],
      status: 'active',
    },
    npcRelationships,
    locations: [],
    openPlotThreads: plotThreads,
    resolvedPlotThreads: [],
    foreshadowing: [],
    worldRules: ['Sức mạnh quyết định địa vị', 'Cảnh giới cao áp chế cảnh giới thấp'],
  };
}

// ============================================================================
// BUILD ARC CONTEXT from DB arc plan (C3 fix — was hardcoded theme cycle)
// ============================================================================

function buildArcContextFromDB(
  projectId: string,
  chapterNumber: number,
  totalPlannedChapters: number,
  arcPlan: ArcPlanData | null,
): StoryArc {
  const arcNumber = Math.ceil(chapterNumber / ARC_SIZE);
  const startChapter = (arcNumber - 1) * ARC_SIZE + 1;
  const endChapter = arcNumber * ARC_SIZE;
  const structuralFinalArc = endChapter >= totalPlannedChapters;

  // Use theme from DB arc plan if available, otherwise fallback cycle
  let theme: ArcTheme;
  let arcTitle: string;

  if (arcPlan && arcPlan.arcTheme) {
    // Map the AI-generated theme to closest ArcTheme enum value
    const themeMap: Record<string, ArcTheme> = {
      'foundation': 'foundation', 'conflict': 'conflict', 'growth': 'growth',
      'betrayal': 'betrayal', 'redemption': 'redemption', 'revelation': 'revelation',
      'war': 'war', 'triumph': 'triumph', 'tournament': 'tournament',
      'exploration': 'exploration', 'revenge': 'revenge', 'romance': 'romance',
      'finale': 'finale',
    };
    const lowerTheme = arcPlan.arcTheme.toLowerCase();
    theme = Object.keys(themeMap).find(k => lowerTheme.includes(k))
      ? themeMap[Object.keys(themeMap).find(k => lowerTheme.includes(k))!]
      : structuralFinalArc ? 'finale' : 'conflict';
    arcTitle = arcPlan.arcTheme;
  } else {
    // Fallback: cycle through themes
    const themes: ArcTheme[] = ['foundation', 'conflict', 'growth', 'betrayal', 'revelation', 'war', 'triumph', 'tournament', 'exploration', 'revenge'];
    theme = structuralFinalArc ? 'finale' : themes[(arcNumber - 1) % themes.length];
    arcTitle = `Arc ${arcNumber}`;
  }

  return {
    id: `arc-${arcNumber}`,
    projectId,
    arcNumber,
    title: arcTitle,
    theme,
    startChapter,
    endChapter,
    tensionCurve: [3, 4, 5, 6, 5, 6, 7, 8, 7, 8, 9, 8, 7, 8, 9, 10, 9, 8, 7, 6],
    climaxChapter: startChapter + Math.floor(ARC_SIZE * 0.75),
    status: 'in_progress',
    isFinalArc: structuralFinalArc,
  };
}

// ============================================================================
// NATURAL ENDING DETECTION (ported from cron route for H1 fix)
// ============================================================================

function detectNaturalEnding(title: string | null, content: string | null): boolean {
  if (!title || !content) return false;
  const lower = (title + ' ' + content.slice(-2000)).toLowerCase();
  const endingSignals = [
    'đại kết cục', 'toàn thư hoàn', 'hết', 'the end', 'kết thúc',
    'epilogue', 'vĩ thanh', 'đoạn kết', 'tạm biệt', 'vĩnh biệt',
  ];
  return endingSignals.some(s => lower.includes(s));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = getEnv('GEMINI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);
  const aiService = new AIProviderService({ gemini: geminiKey });

  // Load project info
  const { data: project, error: projErr } = await supabase
    .from('ai_story_projects')
    .select(`
      id, main_character, genre, current_chapter, total_planned_chapters,
      world_description, temperature, target_chapter_length,
      novels!ai_story_projects_novel_id_fkey (id, title)
    `)
    .eq('id', PROJECT_ID)
    .single();

  if (projErr || !project) throw new Error(`Failed to load project: ${projErr?.message || 'not found'}`);

  const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
  if (!novel?.id || !novel?.title) throw new Error('No novel linked to project');

  const genre = (project.genre || 'tien-hiep') as GenreType;
  const protagonistName = project.main_character || 'MC';
  const startChapter = project.current_chapter || 0;
  // Determine target: CLI arg > DB > default 1500
  const TARGET_CHAPTERS = TARGET_CHAPTERS_ARG > 0
    ? TARGET_CHAPTERS_ARG
    : (project.total_planned_chapters || 1500);
  const totalToWrite = TARGET_CHAPTERS - startChapter;

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  FAST BATCH WRITER v2');
  console.log(`  Novel:   ${novel.title}`);
  console.log(`  MC:      ${protagonistName} | Genre: ${genre}`);
  console.log(`  Current: ch.${startChapter} → target ch.${TARGET_CHAPTERS}`);
  console.log(`  To write: ${totalToWrite} chapters`);
  console.log(`  ETA:     ~${Math.round(totalToWrite * 60 / 3600)}h (@ 60s/chapter)`);
  console.log('══════════════════════════════════════════════════');
  console.log('');

  if (totalToWrite <= 0) {
    console.log('Already at or past target.');
    return;
  }

  // ── Reusable objects (created ONCE) ──
  const factoryConfig: Partial<FactoryConfig> = {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    temperature: project.temperature || 1.0,
    maxTokens: 32768,
    targetWordCount: project.target_chapter_length || 2500,
    genre,
    minQualityScore: 5,
    maxRetries: 2,
    use3AgentWorkflow: true,
  };

  const chapterWriter = new ChapterWriter(factoryConfig, aiService);
  const styleBible = getStyleByGenre(genre);
  const contextLoader = new ContextLoader(PROJECT_ID, NOVEL_ID);

  // WorldBible is rebuilt per-chapter from synopsis data (C4 fix)
  // This ensures MC state, allies, enemies, and plot threads stay current.

  // ── Background post-write task tracking ──
  let pendingPostWrite: Promise<void> | null = null;
  let latestTitle: string | null = null;
  let latestContent: string | null = null;

  const batchStartMs = Date.now();
  let chaptersWrittenThisRun = 0;
  let consecutiveFailures = 0;
  let currentCh = startChapter;

  // Canonicalize startup cursor only for tail drift.
  // For internal gaps, we backfill missing chapter numbers without regressing current_chapter.
  const startupPlan = await resolveChapterCursorPlan(supabase, NOVEL_ID, currentCh);
  if (startupPlan.reason === 'ahead_of_db_max' && startupPlan.persistedCurrentChapter !== currentCh) {
    const from = currentCh;
    currentCh = startupPlan.persistedCurrentChapter;
    await supabase
      .from('ai_story_projects')
      .update({ current_chapter: currentCh, updated_at: new Date().toISOString() })
      .eq('id', PROJECT_ID);
    console.log(`  ⚠ Corrected chapter cursor (${startupPlan.reason}): ${from} -> ${currentCh}`);
  }

  // Allow writing past TARGET_CHAPTERS for grace period (up to +1 arc = 20 chapters)
  // Soft-ending logic inside the loop handles actual completion detection
  while (currentCh < TARGET_CHAPTERS + ARC_SIZE) {
    // Re-evaluate cursor every loop.
    // - ahead_of_db_max: move cursor backward to real max
    // - internal_gap: backfill missing chapter while keeping persisted cursor at max
    const plan = await resolveChapterCursorPlan(supabase, NOVEL_ID, currentCh);
    if (plan.reason === 'ahead_of_db_max' && plan.persistedCurrentChapter !== currentCh) {
      const from = currentCh;
      currentCh = plan.persistedCurrentChapter;
      await supabase
        .from('ai_story_projects')
        .update({ current_chapter: currentCh, updated_at: new Date().toISOString() })
        .eq('id', PROJECT_ID);
      console.log(`  ⚠ Gap repair (${plan.reason}): ${from} -> ${currentCh}`);
    }

    const persistedCurrentCh = plan.persistedCurrentChapter;
    const nextCh = plan.nextChapter;
    const isGapBackfill = plan.reason === 'internal_gap';
    const writeStartMs = Date.now();

    process.stdout.write(
      `[${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}] ` +
      `ch.${nextCh}/${TARGET_CHAPTERS} ` +
      `(${chaptersWrittenThisRun + 1}/${totalToWrite}) ` +
      `[${elapsed(batchStartMs)} / ETA ${eta(batchStartMs, chaptersWrittenThisRun, totalToWrite)}] `,
    );

    try {
      // ── 1. Load 4-layer context from DB ──
      const contextPayload = await contextLoader.load(nextCh);
      const previousSummary = ContextLoader.assembleContext(contextPayload, nextCh);
      const previousTitles = contextPayload.previousTitles;

      // Progressive wind-down guidance (Gap 12 fix: earlier wind-down at 80%)
      let finaleSuffix = '';
      const progressPct = nextCh / TARGET_CHAPTERS;
      if (nextCh >= TARGET_CHAPTERS) {
        finaleSuffix = `\n\n🏁 GIAI ĐOẠN KẾT THÚC: PHẢI kết thúc bộ truyện. Giải quyết TẤT CẢ xung đột. KHÔNG mở mới.`;
      } else if (nextCh >= TARGET_CHAPTERS - 20) {
        finaleSuffix = `\n\n🏁 FINAL PUSH (còn ~${TARGET_CHAPTERS - nextCh} chương): Giải quyết NGAY các plot threads. Không mở mới. Chuẩn bị climax + kết cục.`;
      } else if (progressPct >= 0.90) {
        finaleSuffix = `\n\n⚡ GIAI ĐOẠN CUỐI (90%+, còn ~${TARGET_CHAPTERS - nextCh} chương): Tích cực giải quyết tuyến mở. Hạn chế mở mới. Đẩy nhanh MC. Thiết lập final confrontation.`;
      } else if (progressPct >= 0.80) {
        finaleSuffix = `\n\n📋 CHUẨN BỊ KẾT THÚC (80%+, còn ~${TARGET_CHAPTERS - nextCh} chương): Hội tụ tuyến truyện. Giải quyết tuyến phụ. Gieo hạt cho kết cục.`;
      }

      // Build arc context from DB arc plan (C3 fix — was hardcoded theme cycle)
      const arcContext = buildArcContextFromDB(PROJECT_ID, nextCh, TARGET_CHAPTERS, contextPayload.arcPlan);

      // Build dynamic WorldBible from synopsis data (C4 fix — was frozen)
      const worldBible = buildDynamicWorldBible(PROJECT_ID, novel.title, protagonistName, genre, contextPayload.synopsis);

      // ── 2. Write chapter (3-agent: Architect → Writer → Critic) ──
      const result = await chapterWriter.writeChapter(nextCh, {
        worldBible,
        styleBible,
        currentArc: arcContext,
        previousSummary: previousSummary + finaleSuffix,
        previousTitles,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Chapter write failed');
      }

      const writeDurationSec = Math.round((Date.now() - writeStartMs) / 1000);

      // ── 3. Save chapter to DB (MUST complete before next chapter) ──
      const { error: upsertErr } = await supabase.from('chapters').upsert(
        { novel_id: NOVEL_ID, chapter_number: nextCh, title: result.data.title, content: result.data.content },
        { onConflict: 'novel_id,chapter_number' },
      );
      if (upsertErr) throw new Error(`Chapter upsert failed: ${upsertErr.message}`);

      const { error: updateErr } = await supabase
        .from('ai_story_projects')
        .update({ current_chapter: Math.max(persistedCurrentCh, nextCh), updated_at: new Date().toISOString() })
        .eq('id', PROJECT_ID);
      if (updateErr) throw new Error(`Project update failed: ${updateErr.message}`);

      // ── 4. SUCCESS ──
      consecutiveFailures = 0;
      chaptersWrittenThisRun++;
      currentCh = Math.max(persistedCurrentCh, nextCh);
      latestTitle = result.data.title;
      latestContent = result.data.content;

      const titlePreview = (result.data.title || '').substring(0, 50);
      process.stdout.write(`OK ${writeDurationSec}s | ${result.data.wordCount || 0}w | "${titlePreview}"${isGapBackfill ? ' [GAP-FILL]' : ''}`);

      // ── 5. PIPELINE POST-WRITE (fire-and-forget background) ──
      // Wait for PREVIOUS post-write to finish before starting new one
      // (prevents unbounded accumulation of background tasks)
      if (pendingPostWrite) {
        await pendingPostWrite.catch(() => {}); // swallow errors
      }

      const chNum = nextCh;
      const chTitle = result.data.title;
      const chContent = result.data.content;

      pendingPostWrite = (async () => {
        try {
          // Chapter summary (AI call)
          const summaryResult = await summarizeChapter(
            aiService, PROJECT_ID, chNum, chTitle, chContent, protagonistName,
          );
          await saveChapterSummary(
            PROJECT_ID, chNum, chTitle,
            summaryResult.summary, summaryResult.openingSentence,
            summaryResult.mcState, summaryResult.cliffhanger,
          );

          // Arc boundary: synopsis + arc plan
          if (chNum % ARC_SIZE === 0) {
            const completedArcNumber = Math.floor(chNum / ARC_SIZE);
            const nextArcNumber = completedArcNumber + 1;
            const arcPayload = await contextLoader.load(chNum + 1);

            await generateSynopsis(
              aiService, PROJECT_ID, arcPayload.synopsis,
              arcPayload.arcChapterSummaries, genre, protagonistName, chNum,
            );

            const updatedPayload = await contextLoader.load(chNum + 1);

            // Load story vision for directional coherence (Gap 2/7 fix)
            let storyVision: StoryVision | null = null;
            try {
              const savedOutline = await loadStoryOutline(PROJECT_ID);
              if (savedOutline) {
                storyVision = {
                  endingVision: (savedOutline as Record<string, unknown>).endingVision as string | undefined,
                  majorPlotPoints: ((savedOutline as Record<string, unknown>).majorPlotPoints as Array<{ description?: string }> | undefined)
                    ?.map(p => typeof p === 'string' ? p : p.description || JSON.stringify(p)),
                  mainConflict: (savedOutline as Record<string, unknown>).mainConflict as string | undefined,
                  endGoal: ((savedOutline as Record<string, unknown>).protagonist as Record<string, unknown> | undefined)?.endGoal as string | undefined,
                };
              }
            } catch { /* non-fatal */ }

            // Finale detection (Gap 3 fix)
            let isFinale = (nextArcNumber * ARC_SIZE) >= TARGET_CHAPTERS;
            if (!isFinale && chNum >= TARGET_CHAPTERS * 0.6) {
              try {
                isFinale = await shouldBeFinaleArc(
                  aiService, updatedPayload.synopsis, storyVision,
                  updatedPayload.synopsis?.openThreads || [], chNum, TARGET_CHAPTERS,
                );
              } catch { /* non-fatal */ }
            }

            await generateArcPlan(
              aiService, PROJECT_ID, nextArcNumber, genre,
              protagonistName, updatedPayload.synopsis,
              updatedPayload.storyBible, TARGET_CHAPTERS,
              storyVision,
            );

            // Mark arc as finale if detected
            if (isFinale) {
              try {
                await supabase.from('arc_plans')
                  .update({ is_finale_arc: true })
                  .eq('project_id', PROJECT_ID)
                  .eq('arc_number', nextArcNumber);
              } catch { /* non-fatal */ }
            }

            process.stdout.write(` [ARC ${completedArcNumber} → plan arc ${nextArcNumber}${isFinale ? ' FINALE' : ''}]`);
          }

          // Story bible at chapter 3
          if (chNum === 3) {
            const biblePayload = await contextLoader.load(chNum + 1);
            if (!biblePayload.hasStoryBible) {
              await generateStoryBible(
                aiService, PROJECT_ID, genre, protagonistName,
                project.world_description || novel.title, biblePayload.recentChapters,
              );
              process.stdout.write(' [BIBLE]');
            }
          }

          // Refresh story bible every 100 chapters (Gap 5b fix)
          if (chNum % ARC_SIZE === 0) {
            const arcNum = Math.floor(chNum / ARC_SIZE);
            if (arcNum > 0 && arcNum % 5 === 0) { // every 100 chapters
              const refreshPayload = await contextLoader.load(chNum + 1);
              if (refreshPayload.storyBible) {
                await refreshStoryBible(
                  aiService, PROJECT_ID, genre, protagonistName,
                  refreshPayload.storyBible, refreshPayload.synopsis,
                  refreshPayload.recentChapters, chNum,
                );
                process.stdout.write(' [BIBLE-REFRESH]');
              }
            }
          }
        } catch (err) {
          process.stderr.write(` [POST-WRITE ERR: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}]`);
        }
      })();

      process.stdout.write('\n');

      // Milestone logging
      if (currentCh % 100 === 0) {
        const rate = Math.round(chaptersWrittenThisRun / ((Date.now() - batchStartMs) / 3600000));
        console.log(`\n  ★ MILESTONE ch.${currentCh} | ${chaptersWrittenThisRun} written | ${rate} ch/hr | ${elapsed(batchStartMs)}\n`);
      } else if (currentCh % 20 === 0) {
        console.log(`  ◆ Arc ${Math.floor(currentCh / ARC_SIZE)} complete`);
      }

      // ── SOFT ENDING LOGIC (H1 fix — ported from cron route) ──
      // The story should finish at a natural arc boundary, not mid-arc.
      const GRACE_BUFFER = ARC_SIZE;
      const hardStop = TARGET_CHAPTERS + GRACE_BUFFER;
      const hasNaturalEnding = detectNaturalEnding(latestTitle, latestContent);
      const isArcBoundary = currentCh % ARC_SIZE === 0;

      let shouldComplete = false;
      let completionReason = '';

      if (currentCh >= hardStop) {
        shouldComplete = true;
        completionReason = 'hard_stop';
      } else if (currentCh >= TARGET_CHAPTERS) {
        // Grace period: past target, complete at arc boundary or natural ending
        if (isArcBoundary) {
          shouldComplete = true;
          completionReason = 'arc_boundary';
        } else if (hasNaturalEnding) {
          shouldComplete = true;
          completionReason = 'natural_ending';
        }
      } else if (currentCh >= TARGET_CHAPTERS - 5 && hasNaturalEnding) {
        shouldComplete = true;
        completionReason = 'natural_ending';
      }

      if (shouldComplete) {
        console.log(`\n  ✦ STORY COMPLETE at ch.${currentCh} (reason: ${completionReason})`);
        await supabase.from('ai_story_projects')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', PROJECT_ID);
        break; // Exit the write loop
      }

    } catch (err) {
      consecutiveFailures++;
      const errMsg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`FAIL | ${errMsg.slice(0, 120)}\n`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`\n✗ ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Stopping at ch.${currentCh}.`);
        process.exit(1);
      }

      process.stdout.write(`  Retry in ${RETRY_DELAY_MS / 1000}s...\n`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

      // Re-read current_chapter from DB
      const { data: refreshed } = await supabase
        .from('ai_story_projects')
        .select('current_chapter')
        .eq('id', PROJECT_ID)
        .single();
      if (refreshed) currentCh = refreshed.current_chapter || currentCh;
    }
  }

  // Wait for last post-write
  if (pendingPostWrite) await pendingPostWrite.catch(() => {});

  // Done
  const totalDuration = elapsed(batchStartMs);
  const avgSec = chaptersWrittenThisRun > 0
    ? Math.round((Date.now() - batchStartMs) / (chaptersWrittenThisRun * 1000))
    : 0;

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  ✓ BATCH COMPLETE');
  console.log(`  Written: ${chaptersWrittenThisRun} | Duration: ${totalDuration} | Avg: ${avgSec}s/ch`);
  console.log('══════════════════════════════════════════════════');

  await supabase.from('ai_story_projects')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', PROJECT_ID);

  // Verify
  const { count } = await supabase.from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', NOVEL_ID);
  console.log(`  DB chapters: ${count}`);
}

main().catch((err) => {
  console.error('\nFatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
