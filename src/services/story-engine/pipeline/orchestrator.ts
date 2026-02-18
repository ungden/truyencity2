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
import { extractAndSaveCharacterStates } from '../memory/character-tracker';
import {
  buildPlotThreadContext,
  buildBeatContext,
  buildRuleContext,
  detectAndRecordBeats,
  extractRulesFromChapter,
  checkConsistency,
} from '../memory/plot-tracker';
import { runSummaryTasks } from '../memory/summary-manager';
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
    .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,world_description,temperature,target_chapter_length,ai_model,novels!ai_story_projects_novel_id_fkey(id,title)')
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
    const characters = [protagonistName];

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
  const characters = [protagonistName]; // TODO: extract from outline once available

  await Promise.all([
    // Task 1: Summary + synopsis + arc plan + bible (conditional)
    runSummaryTasks(
      project.id, novel.id, nextChapter, result.title, result.content,
      protagonistName, genre, totalPlanned,
      project.world_description || storyTitle, geminiConfig,
    ).catch(() => {}),

    // Task 2: Character state extraction
    extractAndSaveCharacterStates(
      project.id, nextChapter, result.content, protagonistName, geminiConfig,
    ).catch(() => {}),

    // Task 3: RAG chunking + embedding
    chunkAndStoreChapter(
      project.id, nextChapter, result.content, result.title,
      `Chương ${nextChapter}: ${result.title}`, characters,
    ).catch(() => {}),

    // Task 4: Beat detection + recording
    detectAndRecordBeats(
      project.id, nextChapter, arcNumber, result.content,
    ).catch(() => {}),

    // Task 5: Rule extraction
    extractRulesFromChapter(
      project.id, nextChapter, result.content,
    ).catch(() => {}),

    // Task 6: Consistency check (log-only, doesn't block)
    checkConsistency(
      project.id, nextChapter, result.content, characters,
    ).catch(() => {}),
  ]);

  // ── Step 7: Update project current_chapter ─────────────────────────────
  await db
    .from('ai_story_projects')
    .update({ current_chapter: nextChapter, updated_at: new Date().toISOString() })
    .eq('id', project.id);

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeNovel(
  novels: ProjectRow['novels'],
): { id: string; title: string } | null {
  const novel = Array.isArray(novels) ? novels[0] : novels;
  if (!novel?.id || !novel?.title) return null;
  return novel;
}
