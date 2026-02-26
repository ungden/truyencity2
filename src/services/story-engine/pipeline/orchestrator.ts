/**
 * Story Engine v2 — Orchestrator
 *
 * The main entry point that ties everything together.
 * Replaces v1: canonical-write.ts + runner.ts writeArc() + 7 parallel post-write tasks.
 *
 * Flow:
 * 1. Load project from DB
 * 2. Load context (4 layers + character states + genre boundary + RAG + scalability)
 * 3. Write chapter via 3-agent pipeline
 * 4. Save chapter to DB
 * 5. Run 7 parallel post-write tasks (summary, character, RAG, beats, rules, consistency, synopsis)
 * 6. Update project current_chapter
 */

import { getSupabase } from '../utils/supabase';
import { getGenreBoundaryText } from '../config';
import { loadContext, assembleContext } from './context-assembler';
import { writeChapter } from './chapter-writer';
import { retrieveRAGContext, chunkAndStoreChapter } from '../memory/rag-store';
import { saveCharacterStatesFromCombined } from '../memory/character-tracker';
import {
  buildPlotThreadContext,
  buildBeatContext,
  buildRuleContext,
  detectAndRecordBeats,
  extractRulesFromChapter,
  checkConsistency,
} from '../memory/plot-tracker';
import { runSummaryTasks } from '../memory/summary-manager';
import { generateArcPlan } from './context-assembler';
// Quality modules (Qidian Master Level)
import { getForeshadowingContext, updateForeshadowingStatus, generateForeshadowingAgenda } from '../memory/foreshadowing-planner';
import { getCharacterArcContext, updateCharacterArcs } from '../memory/character-arc-engine';
import { getChapterPacingContext, generatePacingBlueprint } from '../memory/pacing-director';
import { getVoiceContext, updateVoiceFingerprint } from '../memory/voice-fingerprint';
import { getPowerContext, updateMCPowerState } from '../memory/power-system-tracker';
import { getWorldContext, updateLocationExploration, prepareUpcomingLocation, initializeWorldMap } from '../memory/world-expansion-tracker';
import type {
  WriteChapterInput, WriteChapterResult, GeminiConfig, GenreType,
} from '../types';
import { DEFAULT_CONFIG } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  novel_id: string;
  main_character: string | null;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  world_description: string | null;
  temperature: number | null;
  target_chapter_length: number | null;
  ai_model: string | null;
  topic_id: string | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
}

export interface OrchestratorResult {
  chapterNumber: number;
  title: string;
  wordCount: number;
  qualityScore: number;
  projectId: string;
  novelId: string;
  duration: number;
}

export interface OrchestratorOptions {
  projectId: string;
  customPrompt?: string;
  temperature?: number;
  targetWordCount?: number;
  model?: string;
}

// ── Public: Write One Chapter ────────────────────────────────────────────────

/**
 * Write a single chapter for a project. This is the primary entry point.
 *
 * Loads all context, writes via 3-agent pipeline, saves, runs post-write tasks.
 */
export async function writeOneChapter(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const db = getSupabase();

  // ── Step 1: Load project ───────────────────────────────────────────────
  const { data: projectData, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,world_description,temperature,target_chapter_length,ai_model,topic_id,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', options.projectId)
    .single();

  if (projectError || !projectData) {
    throw new Error(projectError?.message || 'Project not found');
  }

  const project = projectData as unknown as ProjectRow;
  const novel = normalizeNovel(project.novels);
  if (!novel) throw new Error('Project has no linked novel');

  const currentChapter = project.current_chapter || 0;
  const nextChapter = currentChapter + 1;
  const genre = (project.genre || 'tien-hiep') as GenreType;
  const protagonistName = project.main_character || 'Nhân vật chính';
  const storyTitle = novel.title || project.world_description || `Project ${project.id}`;
  const totalPlanned = project.total_planned_chapters || 1000;
  const targetWordCount = options.targetWordCount ?? project.target_chapter_length ?? DEFAULT_CONFIG.targetWordCount;

  const geminiConfig: GeminiConfig = {
    model: options.model || project.ai_model || DEFAULT_CONFIG.model,
    temperature: options.temperature ?? project.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };

  // ── Step 2: Load context (4 layers from DB) ────────────────────────────
  const context = await loadContext(project.id, novel.id, nextChapter);

  // ── Step 2b: Inject genre boundary ─────────────────────────────────────
  context.genreBoundary = getGenreBoundaryText(genre);

  // ── Step 2c: Inject RAG context (non-fatal) ────────────────────────────
  try {
    const ragCtx = await retrieveRAGContext(
      project.id,
      nextChapter,
      context.arcPlan?.slice(0, 300) || null,
      context.previousCliffhanger || null,
      protagonistName,
    );
    if (ragCtx) context.ragContext = ragCtx;
  } catch {
    // Non-fatal
  }

  // ── Step 2d: Inject scalability modules (non-fatal) ────────────────────
  try {
    const arcNumber = Math.ceil(nextChapter / 20);
    // Use all known characters from DB (not just protagonist) for better
    // plot thread scoring and rule matching with secondary characters
    const characters = context.knownCharacterNames.length > 0
      ? context.knownCharacterNames
      : [protagonistName];

    const [plotCtx, beatCtx, ruleCtx] = await Promise.all([
      buildPlotThreadContext(project.id, nextChapter, characters, arcNumber),
      buildBeatContext(project.id, nextChapter, arcNumber),
      buildRuleContext(project.id, nextChapter, context.arcPlan?.slice(0, 300) || '', characters),
    ]);

    if (plotCtx) context.plotThreads = plotCtx;
    if (beatCtx) context.beatGuidance = beatCtx;
    if (ruleCtx) context.worldRules = ruleCtx;
  } catch {
    // Non-fatal
  }

  // ── Step 2d+: Inject quality modules (all non-fatal) ────────────────────
  try {
    const [foreshadowCtx, charArcCtx, pacingCtx, voiceCtx, powerCtx, worldCtx] = await Promise.all([
      getForeshadowingContext(project.id, nextChapter).catch(() => null),
      getCharacterArcContext(project.id, nextChapter, context.knownCharacterNames).catch(() => null),
      getChapterPacingContext(project.id, nextChapter).catch(() => null),
      getVoiceContext(project.id).catch(() => null),
      getPowerContext(project.id).catch(() => null),
      getWorldContext(project.id, nextChapter).catch(() => null),
    ]);

    // Smart truncation: per-module budgets, cut at section boundaries (newline)
    // Foreshadowing & character arcs contain per-hint/per-character blocks → need more space
    // Pacing/voice/power/world are shorter by nature → tighter budgets
    if (foreshadowCtx) context.foreshadowingContext = smartTruncate(foreshadowCtx, 1500);
    if (charArcCtx) context.characterArcContext = smartTruncate(charArcCtx, 1500);
    if (pacingCtx) context.pacingContext = smartTruncate(pacingCtx, 600);
    if (voiceCtx) context.voiceContext = smartTruncate(voiceCtx, 600);
    if (powerCtx) context.powerContext = smartTruncate(powerCtx, 600);
    if (worldCtx) context.worldContext = smartTruncate(worldCtx, 600);
  } catch {
    // Non-fatal
  }

  // ── Step 2e: Inject progressive finale wind-down ───────────────────────
  const finaleContext = buildFinaleContext(nextChapter, totalPlanned);
  if (finaleContext) {
    context.ragContext = (context.ragContext || '') + '\n\n' + finaleContext;
  }

  // ── Step 2f: Inject custom prompt ──────────────────────────────────────
  if (options.customPrompt) {
    context.ragContext = (context.ragContext || '') +
      `\n\n[YÊU CẦU ĐẶC BIỆT CHO CHƯƠNG ${nextChapter}]: ${options.customPrompt}`;
  }

  // ── Step 2g: Auto-generate arc plan for arc 1 if missing ──────────────
  // When writing chapters 1-20, if no arc plan exists, generate it from
  // story_outline + master_outline to give the writer proper direction.
  if (!context.arcPlan && nextChapter <= 20) {
    try {
      const arcNumber = 1;
      // Build synopsis-like context from story outline for arc planning
      let outlineSynopsis: string | undefined;
      if (context.storyOutline) {
        const o = context.storyOutline;
        const parts: string[] = [];
        if (o.premise) parts.push(`Premise: ${o.premise}`);
        if (o.mainConflict) parts.push(`Xung đột: ${o.mainConflict}`);
        if (o.protagonist?.name) parts.push(`MC: ${o.protagonist.name} — ${o.protagonist.startingState || ''}`);
        if (o.endingVision) parts.push(`Kết cục: ${o.endingVision}`);
        outlineSynopsis = parts.join('\n');
      }

      await generateArcPlan(
        project.id, arcNumber, genre, protagonistName,
        outlineSynopsis || context.masterOutline,
        context.storyBible,
        totalPlanned, geminiConfig,
      );

      // Reload arc plan from DB
      const { data: arcRow } = await db.from('arc_plans')
        .select('plan_text,chapter_briefs,threads_to_advance,threads_to_resolve,new_threads')
        .eq('project_id', project.id).eq('arc_number', arcNumber).maybeSingle();

      if (arcRow) {
        context.arcPlan = arcRow.plan_text;
        if (arcRow.chapter_briefs && Array.isArray(arcRow.chapter_briefs)) {
          const brief = (arcRow.chapter_briefs as Array<{ chapterNumber: number; brief: string }>)
            .find(b => b.chapterNumber === nextChapter);
          context.chapterBrief = brief?.brief;
        }
        context.arcPlanThreads = {
          threads_to_advance: arcRow.threads_to_advance || [],
          threads_to_resolve: arcRow.threads_to_resolve || [],
          new_threads: arcRow.new_threads || [],
        };
      }
    } catch {
      // Non-fatal: arc plan generation failure shouldn't block chapter writing
    }
  }

  // ── Step 3: Assemble context string ────────────────────────────────────
  const contextString = assembleContext(context, nextChapter);

  // ── Step 4: Write chapter via 3-agent pipeline ─────────────────────────
  const isFinalArc = nextChapter >= totalPlanned - 20;

  const result: WriteChapterResult = await writeChapter(
    nextChapter,
    contextString,
    genre,
    targetWordCount,
    context.previousTitles,
    geminiConfig,
    DEFAULT_CONFIG.maxRetries,
    {
      projectId: project.id,
      protagonistName,
      topicId: project.topic_id || undefined,
      isFinalArc,
      genreBoundary: context.genreBoundary,
      worldBible: context.storyBible,
    },
  );

  // ── Step 5: Save chapter to DB ─────────────────────────────────────────
  const { error: upsertErr } = await db.from('chapters').upsert(
    {
      novel_id: novel.id,
      chapter_number: nextChapter,
      title: result.title,
      content: result.content,
    },
    { onConflict: 'novel_id,chapter_number' },
  );

  if (upsertErr) {
    throw new Error(`Chapter upsert failed: ${upsertErr.message}`);
  }

  // ── Step 6: 7 parallel post-write tasks (all non-fatal) ───────────────
  const arcNumber = Math.ceil(nextChapter / 20);

  // Extract all unique character names from the Architect outline
  const outlineChars = new Set<string>();
  if (result.outline?.scenes) {
    for (const scene of result.outline.scenes) {
      for (const char of scene.characters || []) {
        outlineChars.add(char);
      }
    }
  }
  // Always include protagonist, then add outline characters
  outlineChars.add(protagonistName);
  const characters = Array.from(outlineChars);

  // Task 1: Combined summary + character extraction (single AI call)
  // Returns combined result so we can save character states without a separate AI call.
  const combinedResult = await runSummaryTasks(
    project.id, novel.id, nextChapter, result.title, result.content,
    protagonistName, genre, totalPlanned,
    project.world_description || storyTitle, geminiConfig,
  ).catch(() => null);

  // Task 2: Save character states from combined result (no AI call needed)
  if (combinedResult?.characters && combinedResult.characters.length > 0) {
    await saveCharacterStatesFromCombined(
      project.id, nextChapter, combinedResult.characters,
    ).catch(e => console.warn('[Orchestrator] Task 2 character state save failed:', e instanceof Error ? e.message : String(e)));
  }

  await Promise.all([
    // Task 3: RAG chunking + embedding
    chunkAndStoreChapter(
      project.id, nextChapter, result.content, result.title,
      `Chương ${nextChapter}: ${result.title}`, characters,
    ).catch(e => console.warn('[Orchestrator] Task 3 RAG chunking failed:', e instanceof Error ? e.message : String(e))),

    // Task 4: Beat detection + recording
    detectAndRecordBeats(
      project.id, nextChapter, arcNumber, result.content,
    ).catch(e => console.warn('[Orchestrator] Task 4 beat detection failed:', e instanceof Error ? e.message : String(e))),

    // Task 5: Rule extraction
    extractRulesFromChapter(
      project.id, nextChapter, result.content,
    ).catch(e => console.warn('[Orchestrator] Task 5 rule extraction failed:', e instanceof Error ? e.message : String(e))),

    // Task 6: Consistency check — every 3 chapters to reduce AI calls
    // (dead character regex runs every chapter; business logic AI check runs every 3)
    ...(nextChapter % 3 === 0 ? [
      checkConsistency(
        project.id, nextChapter, result.content, characters,
      ).catch(e => console.warn('[Orchestrator] Task 6 consistency check failed:', e instanceof Error ? e.message : String(e))),
    ] : []),

    // ── Quality modules post-write (Tasks 7-12, all non-fatal) ──────────

    // Task 7: Update foreshadowing status
    updateForeshadowingStatus(
      project.id, nextChapter,
    ).catch((e) => console.warn(`[Orchestrator] Task 7 foreshadowing status failed:`, e instanceof Error ? e.message : String(e))),

    // Task 8: Update character arcs
    updateCharacterArcs(
      project.id, nextChapter, characters, geminiConfig, genre, protagonistName,
    ).catch((e) => console.warn(`[Orchestrator] Task 8 character arcs failed:`, e instanceof Error ? e.message : String(e))),

    // Task 9: Update voice fingerprint (every 10 chapters)
    updateVoiceFingerprint(
      project.id, novel.id, nextChapter, geminiConfig,
    ).catch((e) => console.warn(`[Orchestrator] Task 9 voice fingerprint failed:`, e instanceof Error ? e.message : String(e))),

    // Task 10: Update MC power state (every 3 chapters or on breakthrough)
    updateMCPowerState(
      project.id, nextChapter, result.content, protagonistName, genre, geminiConfig,
    ).catch((e) => console.warn(`[Orchestrator] Task 10 MC power failed:`, e instanceof Error ? e.message : String(e))),

    // Task 11: Update location exploration
    updateLocationExploration(
      project.id, nextChapter,
    ).catch((e) => console.warn(`[Orchestrator] Task 11 location exploration failed:`, e instanceof Error ? e.message : String(e))),

    // Task 12: Pre-generate upcoming location bible
    prepareUpcomingLocation(
      project.id, nextChapter, genre, context.synopsis, context.masterOutline, geminiConfig,
    ).catch((e) => console.warn(`[Orchestrator] Task 12 upcoming location failed:`, e instanceof Error ? e.message : String(e))),
  ]);

  // ── Step 7: Update project current_chapter ─────────────────────────────
  const { error: stepSevenErr } = await db
    .from('ai_story_projects')
    .update({ current_chapter: nextChapter, updated_at: new Date().toISOString() })
    .eq('id', project.id);

  if (stepSevenErr) {
    console.warn(`[Orchestrator] CRITICAL: Failed to update current_chapter to ${nextChapter} for project ${project.id}: ${stepSevenErr.message}`);
  }

  return {
    chapterNumber: nextChapter,
    title: result.title,
    wordCount: result.wordCount,
    qualityScore: result.qualityScore,
    projectId: project.id,
    novelId: novel.id,
    duration: Date.now() - startTime,
  };
}

// ── Progressive Finale Wind-down ─────────────────────────────────────────────

function buildFinaleContext(chapterNumber: number, totalPlanned: number): string | null {
  const progressPct = chapterNumber / totalPlanned;
  const remaining = totalPlanned - chapterNumber;

  if (chapterNumber >= totalPlanned) {
    // Past target — MUST finish
    return [
      `🏁 GIAI ĐOẠN KẾT THÚC (đã vượt target ${totalPlanned} chương):`,
      `- PHẢI kết thúc bộ truyện trong arc hiện tại`,
      `- Giải quyết TẤT CẢ xung đột còn lại ngay lập tức`,
      `- Không mở thêm bất kỳ xung đột hoặc bí ẩn mới nào`,
    ].join('\n');
  }

  if (remaining <= 20) {
    return [
      `🏁 FINAL PUSH (còn ~${remaining} chương):`,
      `- Giải quyết NGAY các plot threads còn lại — KHÔNG trì hoãn`,
      `- Không mở thêm xung đột mới hoặc bí ẩn mới`,
      `- Đẩy protagonist lên cảnh giới cao hơn nhanh chóng`,
      `- Chuẩn bị climax lớn nhất và kết cục`,
    ].join('\n');
  }

  if (progressPct >= 0.90) {
    return [
      `⚡ GIAI ĐOẠN CUỐI (90%+ truyện, còn ~${remaining} chương):`,
      `- Tích cực giải quyết các tuyến truyện đang mở`,
      `- HẠN CHẾ mở tuyến mới (chỉ nếu phục vụ kết cục)`,
      `- Đẩy nhanh tiến triển sức mạnh MC`,
      `- Bắt đầu thiết lập final confrontation`,
    ].join('\n');
  }

  if (progressPct >= 0.80) {
    return [
      `📋 CHUẨN BỊ KẾT THÚC (80%+ truyện, còn ~${remaining} chương):`,
      `- Bắt đầu gieo hạt cho kết cục — các tuyến truyện nên hội tụ`,
      `- Ưu tiên giải quyết tuyến phụ trước, để dành xung đột chính cho cuối`,
      `- Vẫn có thể có twist nhưng phải phục vụ hướng đến kết cục`,
    ].join('\n');
  }

  return null;
}

// ── Smart Truncation ─────────────────────────────────────────────────────────

/**
 * Truncate text at the last newline boundary before maxChars.
 * Preserves complete lines/sections instead of cutting mid-sentence.
 * If no newline found before maxChars, falls back to hard cut.
 */
function smartTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cutPoint = text.lastIndexOf('\n', maxChars);
  if (cutPoint > maxChars * 0.5) {
    return text.slice(0, cutPoint);
  }
  // Fallback: no good newline boundary, cut at maxChars
  return text.slice(0, maxChars);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeNovel(
  novels: ProjectRow['novels'],
): { id: string; title: string } | null {
  const novel = Array.isArray(novels) ? novels[0] : novels;
  if (!novel?.id || !novel?.title) return null;
  return novel;
}
