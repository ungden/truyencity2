/**
 * DS Flash cheap-stable routine path.
 *
 * Routine chapters use a compact DB brief and one thinking writer call, then ship
 * only if deterministic gates find no hard continuity/canon/resource issue.
 */

import { callGemini } from '../utils/gemini';
import { getSupabase } from '../utils/supabase';
import { parseJSON } from '../utils/json-repair';
import { generateArcPlan } from '../context/assembler';
import { runSummaryTasks } from './summary-orchestrator';
import { chunkAndStoreChapter } from '../memory/rag-store';
import { saveCharacterStatesFromCombined, detectCharacterContradictions } from '../state/character-state';
import { checkConsistencyFast } from '../quality/consistency-check';
import { enforceCanonGates } from '../quality/canon-enforcement';
import { evaluateChapterQuality, type ChapterQualityIssue } from '../quality/quality-contract';
import { recordQualityMetrics } from '../quality/quality-metrics';
import { postWriteHealthCheck } from '../utils/post-write-health-check';
import type { CriticIssue, GeminiConfig, GenreType, StyleDirectives } from '../types';
import type { OrchestratorResult } from './orchestrator';

type DbClient = ReturnType<typeof getSupabase>;

interface CheapProject {
  id: string;
  novel_id: string;
  world_description: string | null;
  style_directives: StyleDirectives | null;
}

interface CheapNovel {
  id: string;
  title: string;
}

export interface FlashCheapRoutineInput {
  project: CheapProject;
  novel: CheapNovel;
  genre: GenreType;
  protagonistName: string;
  storyTitle: string;
  nextChapter: number;
  targetWordCount: number;
  totalPlanned: number;
  customPrompt?: string;
  config: GeminiConfig;
  startTime: number;
}

interface ContextSection {
  label: string;
  content: string;
  priority: number;
}

interface CheapWriterResponse {
  title?: string;
  content?: string;
  append_content?: string;
}

interface ContinuityHealthReport {
  verdict: 'pass' | 'revise' | 'block';
  issues: Array<{ severity: 'minor' | 'moderate' | 'major' | 'critical'; message: string; source: string }>;
  memoryRowsWritten: Record<string, number>;
  blockedNextChapterReason?: string | null;
}

interface FlashCheapArcRow {
  arc_number?: number;
  start_chapter?: number;
  end_chapter?: number;
  arc_theme?: string | null;
  plan_text?: string | null;
  sub_arcs?: Array<{ sub_arc_number?: number; start_chapter?: number; end_chapter?: number; theme?: string; mini_payoff?: string }> | null;
  chapter_briefs?: Array<{ chapterNumber?: number; brief?: string; sceneDirection?: string; mcBenefit?: string; scenes?: unknown[] }> | null;
  threads_to_advance?: string[] | null;
  threads_to_resolve?: string[] | null;
  new_threads?: string[] | null;
}

const DEFAULT_CONTEXT_CHARS = 32000;

export function shouldUseFlashBulkCheapMode(
  styleDirectives: StyleDirectives | null | undefined,
  model: string,
  chapterNumber: number,
  totalPlanned: number,
): boolean {
  if (styleDirectives?.flash_bulk_cheap_mode !== true) return false;
  if (model !== 'deepseek-v4-flash') return false;
  if (styleDirectives.flash_bulk_force_all === true) return true;
  return chapterNumber < Math.max(1, totalPlanned - 20);
}

export function trimFlashCheapContextSections(sections: ContextSection[], maxChars: number): string {
  const budget = Math.max(1, maxChars);
  const ordered = [...sections]
    .filter((section) => section.content.trim())
    .sort((a, b) => b.priority - a.priority);
  const chunks: string[] = [];
  let used = 0;

  for (const section of ordered) {
    const header = `\n\n[${section.label}]\n`;
    const remaining = budget - used - header.length;
    if (remaining <= 0) break;
    const content = section.content.trim().slice(0, remaining);
    if (!content) continue;
    chunks.push(`${header}${content}`);
    used += header.length + content.length;
  }

  return chunks.join('').trim().slice(0, budget);
}

export function parseFlashCheapWriterResponse(raw: string): { title: string; content: string } {
  const parsed = parseJSON<CheapWriterResponse>(raw);
  if (parsed?.content?.trim()) {
    return {
      title: (parsed.title || 'Chương mới').trim(),
      content: parsed.content.trim(),
    };
  }

  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] || 'Chương mới';
  const title = firstLine.replace(/^#+\s*/, '').replace(/^["“]|["”]$/g, '').trim() || 'Chương mới';
  const content = lines.slice(1).join('\n\n').trim() || cleaned;
  return { title, content };
}

export function isFlashCheapHardIssue(issue: CriticIssue | ChapterQualityIssue): boolean {
  if (issue.severity === 'critical') return true;
  const type = 'type' in issue ? issue.type : undefined;
  const code = 'code' in issue ? issue.code : undefined;
  if (code && ['empty_content', 'model_or_prompt_leak', 'context_leak', 'placeholder_leak', 'protagonist_absent'].includes(code)) {
    return true;
  }
  if (code && ['severe_repetition', 'ai_phrase_hits', 'low_dialogue', 'low_sensory', 'low_inner_monologue', 'generic_ending'].includes(code)) {
    return false;
  }
  if (code && ['word_count_low', 'low_mc_agency', 'low_payoff'].includes(code)) {
    return true;
  }
  if (issue.severity === 'major') {
    return !type || ['continuity', 'consistency', 'logic', 'word_count', 'detail', 'critic_error'].includes(type);
  }
  return false;
}

function shouldAttemptCheapExtension(issues: ChapterQualityIssue[], styleDirectives: StyleDirectives | null | undefined): boolean {
  if (styleDirectives?.flash_routine_extend_on_short === false) return false;
  return issues.some((issue) => issue.code === 'word_count_low' || issue.code === 'weak_ending_hook');
}

export function hasFlashCheapChapterBrief(arc: FlashCheapArcRow | null | undefined, nextChapter: number): boolean {
  return Array.isArray(arc?.chapter_briefs)
    && arc.chapter_briefs.some((brief) => brief.chapterNumber === nextChapter && typeof brief.brief === 'string' && brief.brief.trim().length >= 20);
}

export function assertFlashCheapArcRail(arc: FlashCheapArcRow | null | undefined, nextChapter: number): asserts arc is FlashCheapArcRow {
  if (!arc) {
    throw new Error(`FLASH_CHEAP_ARC_RAIL_MISSING: no arc_plans row covers ch.${nextChapter}`);
  }
  if (!hasFlashCheapChapterBrief(arc, nextChapter)) {
    throw new Error(`FLASH_CHEAP_ARC_RAIL_INCOMPLETE: arc ${arc.arc_number ?? '?'} covers ch.${nextChapter} but has no usable chapter_briefs entry`);
  }
}

function throwFlashCheapContextErrors(results: Array<{ label: string; error?: { message?: string } | null }>): void {
  const failures = results
    .filter((result) => result.error)
    .map((result) => `${result.label}: ${result.error?.message || 'unknown error'}`);
  if (failures.length > 0) {
    throw new Error(`FLASH_CHEAP_CONTEXT_FAILED: ${failures.join(' | ')}`);
  }
}

async function loadCurrentArcRail(
  db: DbClient,
  projectId: string,
  nextChapter: number,
): Promise<FlashCheapArcRow | null> {
  const { data, error } = await db.from('arc_plans')
    .select('arc_number,start_chapter,end_chapter,arc_theme,plan_text,sub_arcs,chapter_briefs,threads_to_advance,threads_to_resolve,new_threads')
    .eq('project_id', projectId)
    .lte('start_chapter', nextChapter)
    .gte('end_chapter', nextChapter)
    .order('arc_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`FLASH_CHEAP_ARC_RAIL_QUERY_FAILED: ${error.message}`);
  }
  return (data as FlashCheapArcRow | null) || null;
}

async function generateMissingFlashCheapArcRail(
  input: FlashCheapRoutineInput,
  db: DbClient,
): Promise<void> {
  const arcNumber = Math.max(1, Math.ceil(input.nextChapter / 20));
  const [{ data: synRow, error: synError }, { data: projectRow, error: projectError }] = await Promise.all([
    db.from('story_synopsis')
      .select('synopsis_text')
      .eq('project_id', input.project.id)
      .order('last_updated_chapter', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('ai_story_projects')
      .select('story_bible,story_outline,master_outline,world_description')
      .eq('id', input.project.id)
      .maybeSingle(),
  ]);

  throwFlashCheapContextErrors([
    { label: 'story_synopsis', error: synError },
    { label: 'ai_story_projects.arc_context', error: projectError },
  ]);

  const outline = projectRow?.story_outline as {
    endingVision?: string;
    mainConflict?: string;
    majorPlotPoints?: Array<string | { description?: string; name?: string }>;
    protagonist?: { endGoal?: string };
    setupKernel?: unknown;
  } | null;
  const storyVision = outline && typeof outline === 'object'
    ? {
        endingVision: outline.endingVision,
        mainConflict: outline.mainConflict,
        endGoal: outline.protagonist?.endGoal,
        setupKernel: outline.setupKernel as never,
        majorPlotPoints: outline.majorPlotPoints
          ?.map((point) => typeof point === 'string' ? point : point.description || point.name || JSON.stringify(point))
          ?.slice(0, 6),
      }
    : undefined;

  await generateArcPlan(
    input.project.id,
    arcNumber,
    input.genre,
    input.protagonistName,
    synRow?.synopsis_text,
    projectRow?.story_bible,
    input.totalPlanned,
    { ...input.config, maxTokens: Math.max(input.config.maxTokens || 0, 8192) },
    storyVision,
    projectRow?.world_description || input.project.world_description || undefined,
    projectRow?.master_outline,
  );
}

export async function ensureFlashCheapArcRail(input: FlashCheapRoutineInput, db: DbClient = getSupabase()): Promise<FlashCheapArcRow> {
  const existing = await loadCurrentArcRail(db, input.project.id, input.nextChapter);
  if (existing && hasFlashCheapChapterBrief(existing, input.nextChapter)) return existing;

  if (!existing) {
    await generateMissingFlashCheapArcRail(input, db);
  }

  const repaired = await loadCurrentArcRail(db, input.project.id, input.nextChapter);
  assertFlashCheapArcRail(repaired, input.nextChapter);
  return repaired;
}

export async function buildFlashCheapRoutineContext(input: FlashCheapRoutineInput): Promise<string> {
  const db = getSupabase();
  const maxChars = Number(input.project.style_directives?.flash_bulk_context_max_chars || DEFAULT_CONTEXT_CHARS);
  const arc = await ensureFlashCheapArcRail(input, db);
  const [summariesRes, statesRes, chunksRes, threadsRes] = await Promise.all([
    db.from('chapter_summaries')
      .select('chapter_number,title,summary,mc_state,cliffhanger')
      .eq('project_id', input.project.id)
      .lt('chapter_number', input.nextChapter)
      .order('chapter_number', { ascending: false })
      .limit(6),
    db.from('character_states')
      .select('chapter_number,character_name,status,power_level,location,notes')
      .eq('project_id', input.project.id)
      .lt('chapter_number', input.nextChapter)
      .order('chapter_number', { ascending: false })
      .limit(24),
    db.from('story_memory_chunks')
      .select('chapter_number,chunk_type,content')
      .eq('project_id', input.project.id)
      .lt('chapter_number', input.nextChapter)
      .in('chunk_type', ['key_event', 'world_detail', 'plot_point', 'character_event'])
      .order('chapter_number', { ascending: false })
      .limit(12),
    db.from('plot_threads')
      .select('name,description,status,importance,last_active_chapter')
      .eq('project_id', input.project.id)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false })
      .limit(8),
  ]);

  throwFlashCheapContextErrors([
    { label: 'chapter_summaries', error: summariesRes.error },
    { label: 'character_states', error: statesRes.error },
    { label: 'story_memory_chunks', error: chunksRes.error },
    { label: 'plot_threads', error: threadsRes.error },
  ]);

  const summaries = [...(summariesRes.data || [])].reverse();
  const states = statesRes.data || [];
  const chunks = [...(chunksRes.data || [])].reverse();
  const threads = threadsRes.data || [];
  const previousSummary = summaries[summaries.length - 1];
  const currentBrief = Array.isArray(arc?.chapter_briefs)
    ? arc.chapter_briefs.find((brief) => brief.chapterNumber === input.nextChapter)
    : undefined;
  const currentSubArc = Array.isArray(arc?.sub_arcs)
    ? arc.sub_arcs.find((subArc) =>
        typeof subArc.start_chapter === 'number'
        && typeof subArc.end_chapter === 'number'
        && input.nextChapter >= subArc.start_chapter
        && input.nextChapter <= subArc.end_chapter)
    : undefined;

  const sections: ContextSection[] = [
    {
      label: 'ROUTINE BRIEF',
      priority: 100,
      content: [
        `Truyện: ${input.storyTitle}`,
        `Thể loại: ${input.genre}`,
        `Chương cần viết: ${input.nextChapter}/${input.totalPlanned}`,
        `Nhân vật chính: ${input.protagonistName}`,
        `Target: ${input.targetWordCount} từ, sảng văn, có payoff cụ thể, không hành hạ MC quá mức.`,
        `Golden finger: Khởi Nguyên Biên Niên / Vạn Tượng Ký Ức chuyển hóa trí nhớ kiếp trước thành template thế giới có chi phí, tài nguyên, quy luật, loài phụ thuộc, tín ngưỡng và rủi ro.`,
        input.customPrompt ? `Yêu cầu riêng operator: ${input.customPrompt}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      label: 'WORLD CORE',
      priority: 95,
      content: (input.project.world_description || '').slice(0, 7000),
    },
    {
      label: 'PREVIOUS CHAPTER',
      priority: 90,
      content: previousSummary
        ? [
            `Ch.${previousSummary.chapter_number} "${previousSummary.title}"`,
            `Tóm tắt: ${previousSummary.summary}`,
            `MC state: ${previousSummary.mc_state || '(missing)'}`,
            `Hook: ${previousSummary.cliffhanger || '(missing)'}`,
          ].join('\n')
        : '(chưa có summary trước)',
    },
    {
      label: 'CURRENT ARC RAIL',
      priority: 88,
      content: arc
        ? [
            `Arc ${arc.arc_number} (${arc.start_chapter}-${arc.end_chapter}) — ${arc.arc_theme || 'growth'}`,
            arc.plan_text ? `Plan: ${arc.plan_text.slice(0, 1800)}` : '',
            currentSubArc ? `Sub-arc ${currentSubArc.sub_arc_number}: ${currentSubArc.theme || ''} (${currentSubArc.start_chapter}-${currentSubArc.end_chapter}); mini-payoff: ${currentSubArc.mini_payoff || ''}` : '',
            currentBrief ? `Brief ch.${input.nextChapter}: ${currentBrief.brief || ''}` : '',
            currentBrief?.sceneDirection ? `Scene direction: ${currentBrief.sceneDirection}` : '',
            currentBrief?.mcBenefit ? `MC benefit: ${currentBrief.mcBenefit}` : '',
            Array.isArray(currentBrief?.scenes) && currentBrief.scenes.length > 0 ? `Scenes: ${JSON.stringify(currentBrief.scenes).slice(0, 1500)}` : '',
            arc.threads_to_advance?.length ? `Advance threads: ${arc.threads_to_advance.join('; ')}` : '',
            arc.threads_to_resolve?.length ? `Resolve threads: ${arc.threads_to_resolve.join('; ')}` : '',
            arc.new_threads?.length ? `New threads: ${arc.new_threads.join('; ')}` : '',
          ].filter(Boolean).join('\n')
        : 'NO ARC PLAN COVERING THIS CHAPTER. Cron should generate/repair arc_plans before long routine continuation.',
    },
    {
      label: 'RECENT SUMMARIES',
      priority: 80,
      content: summaries.map((s) => `Ch.${s.chapter_number} "${s.title}": ${s.summary} | MC: ${s.mc_state || '-'} | Hook: ${s.cliffhanger || '-'}`).join('\n'),
    },
    {
      label: 'CHARACTER STATES',
      priority: 70,
      content: states.map((s) => `Ch.${s.chapter_number} ${s.character_name}: ${s.status || 'unknown'}, ${s.power_level || 'power n/a'}, ${s.location || 'location n/a'}${s.notes ? `, notes: ${s.notes}` : ''}`).join('\n'),
    },
    {
      label: 'ACTIVE THREADS',
      priority: 65,
      content: threads.map((t) => `${t.name || '(untitled)'} [${t.status || 'active'}; importance ${t.importance ?? '?'}; last ch.${t.last_active_chapter ?? '?'}]: ${t.description || ''}`).join('\n'),
    },
    {
      label: 'RECENT MEMORY CHUNKS',
      priority: 55,
      content: chunks.map((c) => `Ch.${c.chapter_number} ${c.chunk_type}: ${c.content}`).join('\n'),
    },
  ];

  return trimFlashCheapContextSections(sections, maxChars);
}

export async function writeFlashCheapRoutineChapter(input: FlashCheapRoutineInput): Promise<OrchestratorResult> {
  const db = getSupabase();
  const context = await buildFlashCheapRoutineContext(input);
  const minWords = Math.max(
    1200,
    Number(input.project.style_directives?.flash_bulk_min_words || Math.max(1800, Math.floor(input.targetWordCount * 0.72))),
  );
  const writerConfig: GeminiConfig = {
    ...input.config,
    model: 'deepseek-v4-flash',
    temperature: 0.75,
    maxTokens: Math.max(input.config.maxTokens || 0, 20000),
    deepseekThinkingEnabled: true,
    deepseekReasoningEffort: input.config.deepseekReasoningEffort || 'high',
    deepseekThinkingTasks: ['writer'],
  };

  const maxRetries = Math.max(0, Number(input.project.style_directives?.flash_routine_max_retries ?? 1));
  let response: Awaited<ReturnType<typeof callGemini>> | null = null;
  let chapter: { title: string; content: string } | null = null;
  let quality: ReturnType<typeof evaluateChapterQuality> | null = null;
  let qualityHardIssues: ChapterQualityIssue[] = [];
  let extensionResponse: Awaited<ReturnType<typeof callGemini>> | null = null;
  let extensionsAttempted = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt = attempt === 0
      ? buildWriterPrompt(input, context, minWords)
      : buildRetryWriterPrompt(input, context, minWords, chapter, qualityHardIssues);
    response = await callGemini(prompt, writerConfig, {
      jsonMode: true,
      tracking: { projectId: input.project.id, task: attempt === 0 ? 'writer' : 'writer_retry', chapterNumber: input.nextChapter },
    });
    chapter = parseFlashCheapWriterResponse(response.content);
    quality = evaluateChapterQuality(chapter.content, {
      title: chapter.title,
      protagonistName: input.protagonistName,
      targetWords: input.targetWordCount,
      minWords,
      genre: input.genre,
      worldDescription: input.project.world_description,
    });

    qualityHardIssues = quality.issues.filter(isFlashCheapHardIssue);
    if (!chapter.title.trim() || !chapter.content.trim()) {
      qualityHardIssues.push({
        code: 'empty_content',
        severity: 'critical',
        message: 'Writer returned empty title/content.',
        goal: 'coherence',
      });
    }
    if (!quality.metrics.endingHook) {
      qualityHardIssues.push({
        code: 'weak_ending_hook',
        severity: 'moderate',
        message: 'Kết chương thiếu hook đọc tiếp rõ.',
        goal: 'ending_readiness',
      });
    }
    if (qualityHardIssues.length === 0) break;
  }

  if (!response || !chapter || !quality) {
    throw new Error('FLASH_CHEAP_GATE_BLOCKED: writer produced no usable response');
  }
  const maxExtensions = Math.max(0, Number(input.project.style_directives?.flash_routine_max_extensions ?? 2));
  while (
    qualityHardIssues.length > 0 &&
    extensionsAttempted < maxExtensions &&
    shouldAttemptCheapExtension(qualityHardIssues, input.project.style_directives)
  ) {
    extensionResponse = await callGemini(buildExtensionPrompt(input, context, minWords, chapter, qualityHardIssues), writerConfig, {
      jsonMode: true,
      tracking: { projectId: input.project.id, task: 'writer_expand', chapterNumber: input.nextChapter },
    });
    extensionsAttempted += 1;
    chapter = mergeFlashCheapExtension(chapter, extensionResponse.content);
    quality = evaluateChapterQuality(chapter.content, {
      title: chapter.title,
      protagonistName: input.protagonistName,
      targetWords: input.targetWordCount,
      minWords,
      genre: input.genre,
      worldDescription: input.project.world_description,
    });
    qualityHardIssues = quality.issues.filter(isFlashCheapHardIssue);
    if (!quality.metrics.endingHook) {
      qualityHardIssues.push({
        code: 'weak_ending_hook',
        severity: 'moderate',
        message: 'Kết chương thiếu hook đọc tiếp rõ.',
        goal: 'ending_readiness',
      });
    }
  }
  if (input.project.style_directives?.flash_routine_hard_block_weak_hook !== true) {
    qualityHardIssues = qualityHardIssues.filter((issue) => issue.code !== 'weak_ending_hook');
  }
  if (qualityHardIssues.length > 0) {
    throw new Error(`FLASH_CHEAP_GATE_BLOCKED: ${qualityHardIssues.map((i) => `${i.code}:${i.message}`).join(' | ')}`);
  }

  const summaryConfig: GeminiConfig = {
    ...writerConfig,
    deepseekThinkingEnabled: false,
    deepseekThinkingTasks: [],
  };
  const combined = await runSummaryTasks(
    input.project.id,
    input.novel.id,
    input.nextChapter,
    chapter.title,
    chapter.content,
    input.protagonistName,
    input.genre,
    input.totalPlanned,
    input.project.world_description || input.storyTitle,
    summaryConfig,
  );
  if (!combined) {
    throw new Error(`FLASH_CHEAP_SUMMARY_FAILED: summary/character extraction failed for ch.${input.nextChapter}`);
  }

  const characters = combined.characters.map((c) => c.character_name).filter(Boolean);
  const [contradictions, consistencyIssues, canonIssues] = await Promise.all([
    detectCharacterContradictions(input.project.id, input.nextChapter, combined.characters),
    checkConsistencyFast(input.project.id, input.nextChapter, chapter.content),
    enforceCanonGates({
      projectId: input.project.id,
      chapterNumber: input.nextChapter,
      content: chapter.content,
      protagonistName: input.protagonistName,
      expectedCharacters: [input.protagonistName, ...characters],
    }),
  ]);

  const hardBlockers = [
    ...contradictions.filter((c) => c.severity === 'critical').map((c): CriticIssue => ({ type: 'continuity', severity: 'critical', description: c.description })),
    ...consistencyIssues.filter((i) => i.severity === 'critical' || i.severity === 'major').map((i): CriticIssue => ({ type: i.type === 'dead_character' ? 'continuity' : 'consistency', severity: i.severity, description: i.description })),
    ...canonIssues.filter(isFlashCheapHardIssue),
  ];

  if (hardBlockers.length > 0) {
    throw new Error(`FLASH_CHEAP_GATE_BLOCKED: ${hardBlockers.map((i) => `${i.type}/${i.severity}: ${i.description}`).join(' | ')}`);
  }

  const wordCount = quality.metrics.wordCount;
  const qualityScore = Math.max(1, Math.min(10, Math.round(quality.score / 10)));
  const now = new Date().toISOString();
  const { error: chapterErr } = await db.from('chapters').upsert({
    novel_id: input.novel.id,
    chapter_number: input.nextChapter,
    title: chapter.title,
    content: chapter.content,
    quality_score: qualityScore,
  }, { onConflict: 'novel_id,chapter_number' });
  if (chapterErr) throw new Error(`FLASH_CHEAP_SAVE_FAILED: ${chapterErr.message}`);

  const { error: projectErr } = await db.from('ai_story_projects').update({
    current_chapter: input.nextChapter,
    updated_at: now,
  }).eq('id', input.project.id);
  if (projectErr) throw new Error(`FLASH_CHEAP_PROJECT_UPDATE_FAILED: ${projectErr.message}`);

  await saveCharacterStatesFromCombined(input.project.id, input.nextChapter, combined.characters);
  await chunkAndStoreChapter(input.project.id, input.nextChapter, chapter.content, chapter.title, combined.summary.summary, characters);
  await runCadencedOptionalTasks(input, chapter.content, characters, writerConfig);

  const health = await postWriteHealthCheck(input.project.id, input.nextChapter);
  const continuityHealth: ContinuityHealthReport = {
    verdict: health.warnings.length > 0 ? 'revise' : 'pass',
    issues: health.warnings.map((message) => ({ severity: 'major', message, source: 'post_write_health' })),
    memoryRowsWritten: {
      chapter_summaries: health.hasChapterSummary ? 1 : 0,
      character_states: health.characterStateCount,
      story_memory_chunks: health.ragChunkCount,
    },
    blockedNextChapterReason: null,
  };

  await recordQualityMetrics({
    projectId: input.project.id,
    novelId: input.novel.id,
    chapterNumber: input.nextChapter,
    overallScore: qualityScore,
    dopamineScore: quality.metrics.payoffHits >= 2 ? 8 : 6,
    pacingScore: quality.metrics.dialogueLines >= 3 && quality.metrics.sensoryHits >= 5 ? 8 : 6,
    endingHookScore: quality.metrics.endingHook ? 8 : 5,
    wordCount,
    wordRatio: quality.metrics.wordRatio,
    contradictionsCritical: contradictions.filter((c) => c.severity === 'critical').length,
    contradictionsWarning: contradictions.filter((c) => c.severity === 'warning').length,
    guardianIssuesCritical: hardBlockers.filter((i) => i.severity === 'critical').length,
    guardianIssuesMajor: hardBlockers.filter((i) => i.severity === 'major').length,
    guardianIssuesModerate: canonIssues.filter((i) => i.severity === 'moderate').length,
    rewritesAttempted: 0,
    autoRevised: false,
    contextSizeChars: context.length,
    writerEvidenceChars: response.promptTokens || undefined,
    meta: {
      provider: 'deepseek_flash_cheap_routine',
      flash_bulk_cheap_mode: true,
      score_scope: 'published_chapter',
      strict_critic_score: null,
      cheap_quality_score: quality.score,
      cheap_quality_verdict: quality.verdict,
      cheap_quality_issues: quality.issues,
      continuity_health: continuityHealth,
      health,
      compact_context_chars: context.length,
      writer_prompt_tokens: response.promptTokens,
      writer_completion_tokens: response.completionTokens,
      writer_expanded: Boolean(extensionResponse),
      writer_extensions_attempted: extensionsAttempted,
      writer_expand_prompt_tokens: extensionResponse?.promptTokens,
      writer_expand_completion_tokens: extensionResponse?.completionTokens,
    },
  });

  return {
    chapterNumber: input.nextChapter,
    title: chapter.title,
    wordCount,
    qualityScore,
    projectId: input.project.id,
    novelId: input.novel.id,
    duration: Date.now() - input.startTime,
    chaptersCreated: 1,
    lastChapterNumber: input.nextChapter,
  };
}

function mergeFlashCheapExtension(
  previous: { title: string; content: string },
  raw: string,
): { title: string; content: string } {
  const parsed = parseJSON<CheapWriterResponse>(raw);
  if (parsed?.content?.trim()) {
    return {
      title: (parsed.title || previous.title).trim(),
      content: parsed.content.trim(),
    };
  }
  if (parsed?.append_content?.trim()) {
    return {
      title: previous.title,
      content: `${previous.content.trim()}\n\n${parsed.append_content.trim()}`,
    };
  }
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return {
    title: previous.title,
    content: `${previous.content.trim()}\n\n${cleaned}`,
  };
}

function buildWriterPrompt(input: FlashCheapRoutineInput, context: string, minWords: number): string {
  const preferredMin = Math.max(minWords, Math.floor(input.targetWordCount * 0.93));
  const preferredMax = Math.max(preferredMin + 300, Math.ceil(input.targetWordCount * 1.1));
  return `Bạn là writer chính của một bộ sảng văn sáng thế/thần minh dài kỳ.

YÊU CẦU OUTPUT: chỉ trả về JSON object hợp lệ:
{
  "title": "tiêu đề chương tiếng Việt, không ghi Chương ${input.nextChapter}",
  "content": "toàn văn chương bằng tiếng Việt"
}

KHUNG CHƯƠNG:
- Viết chương ${input.nextChapter} của "${input.storyTitle}", mục tiêu khoảng ${input.targetWordCount} từ.
- Độ dài ưu tiên: ${preferredMin}-${preferredMax} từ; hard minimum ${minWords} từ. Không viết ngắn kiểu tóm tắt.
- Main: ${input.protagonistName}. MC có trí nhớ kiếp trước về văn học, phim ảnh, game, thần thoại, webnovel.
- Bàn tay vàng: Khởi Nguyên Biên Niên / Vạn Tượng Ký Ức. Nó biến ký ức thành template thế giới khả thi, hiển thị ledger chi phí/tài nguyên/quy luật/loài phụ thuộc/tín ngưỡng/rủi ro.
- Tone: sảng văn. MC có thể gặp trở ngại nhỏ nhưng phải xử lý gọn, thông minh, có tiến triển mạnh lên, có payoff cụ thể trong chính chương.
- Mỗi chương phải có: world-state Thần Vực, tiến triển loài/phụ thuộc, template inspiration, tài nguyên tiêu hao/thu được, lợi ích rõ, ending hook.
- Không leak prompt/context/model/API. Không tự tạo canon lớn mâu thuẫn chương trước. Không hồi sinh nhân vật chết nếu không có cơ chế đã establish.
- TUYỆT ĐỐI không viết tóm tắt/outline. "content" phải là toàn văn truyện, tối thiểu ${minWords} từ, có scene nối tiếp nhau.

CONTEXT COMPACT:
${context}`;
}

function buildRetryWriterPrompt(
  input: FlashCheapRoutineInput,
  context: string,
  minWords: number,
  previous: { title: string; content: string } | null,
  issues: ChapterQualityIssue[],
): string {
  return `${buildWriterPrompt(input, context, minWords)}

BẢN TRƯỚC BỊ CHẶN BỞI GATE:
${issues.map((i) => `- ${i.code}: ${i.message}`).join('\n')}

YÊU CẦU SỬA:
- Viết lại hoàn toàn, không tóm tắt.
- Độ dài tối thiểu ${minWords} từ, ưu tiên quanh ${input.targetWordCount} từ.
- Thêm payoff rõ trong chương: tài nguyên/ledger/law/species/world-state phải thay đổi thấy được.
- Kết chương phải có hook cụ thể.

BẢN NGẮN BỊ LOẠI ĐỂ THAM KHẢO, KHÔNG COPY NGUYÊN:
${previous ? `${previous.title}\n${previous.content.slice(0, 2500)}` : '(không có)'}`;
}

function buildExtensionPrompt(
  input: FlashCheapRoutineInput,
  context: string,
  minWords: number,
  previous: { title: string; content: string },
  issues: ChapterQualityIssue[],
): string {
  const currentWords = previous.content.trim().split(/\s+/).filter(Boolean).length;
  const needed = Math.max(450, minWords - currentWords + 350);
  return `Bạn đang sửa một chương routine của sảng văn sáng thế/thần minh.

YÊU CẦU OUTPUT: chỉ trả về JSON object hợp lệ:
{
  "append_content": "phần nối thêm bằng tiếng Việt"
}

Chương ${input.nextChapter} của "${input.storyTitle}" đã gần xong nhưng bị gate chặn:
${issues.map((i) => `- ${i.code}: ${i.message}`).join('\n')}

NHIỆM VỤ:
- KHÔNG viết lại từ đầu. Chỉ viết phần nối thêm ${needed}-${needed + 450} từ để gắn trực tiếp sau bản hiện có.
- Phần nối thêm phải mở rộng cảnh hiện tại bằng hành động cụ thể, ledger tài nguyên, world-state Thần Vực, tiến triển loài/phụ thuộc và payoff rõ.
- Kết thúc phần nối thêm bằng hook cụ thể đủ mạnh để đọc tiếp.
- Tránh lặp cụm đang bị cảnh báo; dùng chi tiết vật thể, phản ứng sinh vật, luật thế giới và lựa chọn chủ động của ${input.protagonistName}.
- Không leak prompt/context/model/API.

CONTEXT COMPACT:
${context}

BẢN HIỆN CÓ CẦN NỐI THÊM:
Tiêu đề: ${previous.title}
${previous.content}`;
}

async function runCadencedOptionalTasks(
  input: FlashCheapRoutineInput,
  content: string,
  characters: string[],
  config: GeminiConfig,
): Promise<void> {
  const cadence = Number(input.project.style_directives?.flash_bulk_optional_task_cadence || 5);
  if (cadence <= 0 || input.nextChapter % cadence !== 0) return;
  const taskConfig = { ...config, deepseekThinkingEnabled: false, deepseekThinkingTasks: [] };
  const tasks = [
    import('../state/timeline').then(({ recordChapterTime }) => recordChapterTime(input.project.id, input.nextChapter, content, input.protagonistName, taskConfig)),
    import('../state/item-inventory').then(({ recordItemEvents }) => recordItemEvents(input.project.id, input.nextChapter, content, characters, taskConfig)),
    import('../state/knowledge-graph').then(({ extractCharacterKnowledge }) => extractCharacterKnowledge(input.project.id, input.nextChapter, content, characters, taskConfig)),
    import('../state/plot-threads').then(({ extractAndUpdatePlotThreads }) => extractAndUpdatePlotThreads(input.project.id, input.nextChapter, content, characters, taskConfig)),
  ];
  await Promise.all(tasks.map((task) => task.catch((err) => {
    console.warn('[flash-cheap-routine] optional task failed:', err instanceof Error ? err.message : String(err));
  })));
}
