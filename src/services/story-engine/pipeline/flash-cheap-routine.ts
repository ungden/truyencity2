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
import {
  buildCausalLogicHealth,
  checkCausalLogicFast,
  isHardCausalIssue,
  type CausalLogicIssue,
} from '../quality/causal-logic-check';
import { evaluateChapterQuality, type ChapterQualityIssue } from '../quality/quality-contract';
import { recordQualityMetrics } from '../quality/quality-metrics';
import { postWriteHealthCheck } from '../utils/post-write-health-check';
import { buildFocusPresetContext, validateFocusPresetChapterContent } from '../codex-automation/focus-presets';
import { UNIVERSAL_SANG_VAN_DIRECTIVE } from '../templates/sang-van-directives';
import {
  assertChapterBlueprintReady,
  evaluateBlueprintAlignment,
  formatChapterBlueprintContext,
  markChapterBlueprintUsed,
  type ChapterBlueprint,
} from '../plan/chapter-blueprints';
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

/**
 * RETIRED (2026-05-29). This routine path hardcoded `gemini-3.1-flash-lite` as the
 * chapter writer (see `writeFlashCheapRoutineChapter` → writerConfig.model), which the
 * user judged "lởm" (noticeably weaker than deepseek-v4-pro). Every chapter now goes
 * through the standard 3-agent path in the orchestrator, which routes the writer/architect
 * tasks to deepseek-v4-pro via per-task model routing (`installModelTierRouting`).
 *
 * This function now ALWAYS returns false so the cheap path can never activate, regardless
 * of any leftover `flash_bulk_cheap_mode` flag in DB. The rest of the module's helpers are
 * kept (they remain unit-tested) but the entry point is dead at runtime.
 */
export function shouldUseFlashBulkCheapMode(
  _styleDirectives: StyleDirectives | null | undefined,
  _model: string,
  _chapterNumber: number,
  _totalPlanned: number,
): boolean {
  return false;
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

  return scrubFlashCheapMetaLabels(chunks.join('').trim().slice(0, budget));
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

export function isInvalidFlashCheapTitle(title: string): boolean {
  const clean = title.trim();
  if (!clean) return true;
  if (/^[{}\[\],:"']+$/.test(clean)) return true;
  if (/^(json|content|title|chapter|chương mới)$/i.test(clean)) return true;
  if (clean.length > 120) return true;
  return false;
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

export function isFlashCheapHardCanonIssue(issue: CriticIssue): boolean {
  const description = issue.description || '';
  // Cast-roster extraction is heuristic and often catches book titles,
  // in-story fictional characters, techniques, or crowd NPCs. In cheap routine
  // this remains an audit signal, while true blockers still fail closed.
  if (
    issue.type === 'continuity'
    && issue.severity === 'major'
    && (
      description.includes('tên nhân vật MỚI')
      || description.includes('cast roster')
      || description.includes('có thể là nhân vật mới')
    )
  ) {
    return false;
  }
  return isFlashCheapHardIssue(issue);
}

function shouldAttemptCheapExtension(issues: ChapterQualityIssue[], styleDirectives: StyleDirectives | null | undefined): boolean {
  if (styleDirectives?.flash_routine_extend_on_short === false) return false;
  return issues.some((issue) => issue.code === 'word_count_low' || issue.code === 'weak_ending_hook');
}

function focusPresetIssuesAsQualityIssues(
  focusIssues: ReturnType<typeof validateFocusPresetChapterContent>['issues'],
): ChapterQualityIssue[] {
  return focusIssues.map((issue) => ({
    code: issue.code,
    severity: issue.severity === 'critical' ? 'critical' : issue.severity === 'major' ? 'major' : 'moderate',
    message: issue.message,
    goal: 'coherence',
  }));
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

export function getRoutinePromptContext(styleDirectives: StyleDirectives | null | undefined): string {
  if (typeof styleDirectives?.routine_prompt_context === 'string' && styleDirectives.routine_prompt_context.trim()) {
    return scrubFlashCheapMetaLabels(styleDirectives.routine_prompt_context.trim());
  }
  return scrubFlashCheapMetaLabels(buildFocusPresetContext(styleDirectives?.focus_key || undefined).trim());
}

function scrubFlashCheapMetaLabels(value: string | null | undefined): string {
  return (value || '')
    .replace(/(^|\n)\s*Hook\s*:/gi, '$1Dư âm:')
    .replace(/(^|\n)\s*Outline\s*:/gi, '$1Dàn ý:')
    .replace(/(^|\n)\s*Tóm tắt\s*:/gi, '$1Tóm lược:')
    .replace(/(^|\n)\s*Yêu cầu\s*:/gi, '$1Gợi ý:')
    .trim();
}

export function buildRoutineBrief(input: FlashCheapRoutineInput): string {
  const styleDirectives = input.project.style_directives;
  const focusKey = styleDirectives?.focus_key || null;
  const lines = [
    `Truyện: ${input.storyTitle}`,
    `Thể loại: ${input.genre}`,
    `Chương cần viết: ${input.nextChapter}/${input.totalPlanned}`,
    `Nhân vật chính: ${input.protagonistName}`,
    `Target: ${input.targetWordCount} từ, sảng văn, có payoff cụ thể, không hành hạ MC quá mức.`,
    UNIVERSAL_SANG_VAN_DIRECTIVE,
    `Focus key: ${focusKey || 'generic'}`,
  ];

  if (focusKey === 'sang-the-than-minh') {
    lines.push(
      'Bàn tay vàng: Khởi Nguyên Biên Niên / Vạn Tượng Ký Ức chuyển hóa trí nhớ kiếp trước thành template thế giới có chi phí, tài nguyên, quy luật, loài phụ thuộc, tín ngưỡng và rủi ro.',
      'Chapter loop: world-state Thần Vực, tiến triển loài/quyến thuộc, template inspiration, tài nguyên tiêu hao/thu được, lợi ích rõ, dư âm đọc tiếp.',
    );
  } else if (focusKey === 'thien-dao-thu-vien') {
    lines.push(
      'Bàn tay vàng: Vạn Văn Ký Ức tái hiện văn học/phim/game/thần thoại Trái Đất theo template ledger: phải ghi rõ template gốc là bộ nào và nhân vật/cảnh gốc nào đang dùng; giữ xương sống nguyên tác, vai trò nhân vật, đại cảnh và payoff. Không đổi 100%; chỉ đổi những phần cần hợp luật Thiên Đạo.',
      'Thiên Đạo Thư Viện là thư viện tinh thần do Thiên Đạo tạo ra; Lâm Mặc dùng thần niệm/bút danh/ý niệm để khắc tác phẩm, độc giả gọi trong đầu để đọc. Không nộp bản thảo vật lý, không phân lâu, không xếp hàng.',
      'Chapter loop: Lâm Mặc ẩn danh viết/khắc tác phẩm -> độc giả nhập tâm/lĩnh ngộ võ học/công pháp -> faction/bảng xếp hạng phản ứng -> MC nhận danh vọng/điểm công nhận/tài nguyên và dư âm đọc tiếp.',
      'Early arc taboo: không lộ thân phận thật, không gặp địch trực tiếp, không điều tra quán trà/tổ chức đen, không ám sát sớm; conflict chính là tác phẩm, độc giả, bảng và cách kể chuyện.',
    );
  } else {
    lines.push(
      'MC có trí nhớ/lợi thế cốt lõi đã ghi trong world_description và story_outline; mọi payoff phải có nguyên nhân, chi phí hoặc phản ứng xã hội rõ.',
      'Chapter loop: mục tiêu cụ thể -> trở ngại ngắn -> lựa chọn chủ động của MC -> lợi ích đo được -> phản ứng thế giới -> dư âm đọc tiếp.',
    );
  }

  if (input.customPrompt) lines.push(`Yêu cầu riêng operator: ${input.customPrompt}`);
  return lines.join('\n');
}

export async function buildFlashCheapRoutineContext(input: FlashCheapRoutineInput, blueprint?: ChapterBlueprint | null): Promise<string> {
  const db = getSupabase();
  const maxChars = Number(input.project.style_directives?.flash_bulk_context_max_chars || DEFAULT_CONTEXT_CHARS);
  const routinePromptContext = getRoutinePromptContext(input.project.style_directives);
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
  const currentBrief = Array.isArray(arc.chapter_briefs)
    ? arc.chapter_briefs.find((brief) => brief.chapterNumber === input.nextChapter)
    : undefined;
  const currentSubArc = Array.isArray(arc.sub_arcs)
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
      content: buildRoutineBrief(input),
    },
    {
      label: 'FOCUS REQUIREMENTS',
      priority: 98,
      content: routinePromptContext,
    },
    {
      label: 'WORLD CORE',
      priority: 95,
      content: (input.project.world_description || '').slice(0, 7000),
    },
    {
      label: 'FULL CHAPTER BLUEPRINT',
      priority: 94,
      content: formatChapterBlueprintContext(blueprint),
    },
    {
      label: 'PREVIOUS CHAPTER',
      priority: 90,
      content: previousSummary
        ? [
            `Ch.${previousSummary.chapter_number} "${previousSummary.title}"`,
            `Tóm lược: ${scrubFlashCheapMetaLabels(previousSummary.summary)}`,
            `MC state: ${scrubFlashCheapMetaLabels(previousSummary.mc_state) || '(missing)'}`,
            `Dư âm cuối chương trước: ${scrubFlashCheapMetaLabels(previousSummary.cliffhanger) || '(missing)'}`,
          ].join('\n')
        : '(chưa có summary trước)',
    },
    {
      label: 'CURRENT ARC RAIL',
      priority: 88,
      content: [
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
      ].filter(Boolean).join('\n'),
    },
    {
      label: 'RECENT SUMMARIES',
      priority: 80,
      content: summaries.map((s) => `Ch.${s.chapter_number} "${s.title}": ${scrubFlashCheapMetaLabels(s.summary)} | MC: ${scrubFlashCheapMetaLabels(s.mc_state) || '-'} | Dư âm cuối: ${scrubFlashCheapMetaLabels(s.cliffhanger) || '-'}`).join('\n'),
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
  const blueprint = await assertChapterBlueprintReady({
    projectId: input.project.id,
    chapterNumber: input.nextChapter,
    targetChapters: input.totalPlanned,
    styleDirectives: input.project.style_directives,
  }, db);
  const context = await buildFlashCheapRoutineContext(input, blueprint);
  const minWords = Math.max(
    1200,
    Number(input.project.style_directives?.flash_bulk_min_words || Math.max(1800, Math.floor(input.targetWordCount * 0.72))),
  );
  const writerConfig: GeminiConfig = {
    ...input.config,
    model: 'gemini-3.1-flash-lite',
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
  let causalIssues: CausalLogicIssue[] = [];
  let causalHardIssues: CausalLogicIssue[] = [];
  let extensionResponse: Awaited<ReturnType<typeof callGemini>> | null = null;
  let extensionsAttempted = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const prompt = attempt === 0
      ? buildWriterPrompt(input, context, minWords)
      : buildRetryWriterPrompt(input, context, minWords, chapter, qualityHardIssues, causalHardIssues);
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
    const focusReport = validateFocusPresetChapterContent({
      chapterNumber: input.nextChapter,
      content: chapter.content,
      protagonistName: input.protagonistName,
    }, input.project.style_directives?.focus_key || undefined);
    qualityHardIssues.push(...focusPresetIssuesAsQualityIssues(focusReport.issues).filter(isFlashCheapHardIssue));
    causalIssues = await checkCausalLogicFast(input.project.id, input.nextChapter, chapter.content, {
      protagonistName: input.protagonistName,
      focusKey: input.project.style_directives?.focus_key,
    });
    causalHardIssues = causalIssues.filter(isHardCausalIssue);
    const blueprintIssues = evaluateBlueprintAlignment(chapter.content, blueprint);
    causalIssues.push(...blueprintIssues);
    causalHardIssues.push(...blueprintIssues.filter(isHardCausalIssue));
    if (!chapter.title.trim() || !chapter.content.trim()) {
      qualityHardIssues.push({
        code: 'empty_content',
        severity: 'critical',
        message: 'Writer returned empty title/content.',
        goal: 'coherence',
      });
    }
    if (isInvalidFlashCheapTitle(chapter.title)) {
      qualityHardIssues.push({
        code: 'model_or_prompt_leak',
        severity: 'critical',
        message: `Writer returned invalid reader-facing title: "${chapter.title}".`,
        goal: 'coherence',
      });
    }
    // Cheap routine uses a soft style gate: weak hook may trigger an extension
    // when the quality contract reports it, but it must not block publish alone.
    if (qualityHardIssues.length === 0 && causalHardIssues.length === 0) break;
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
    const focusReport = validateFocusPresetChapterContent({
      chapterNumber: input.nextChapter,
      content: chapter.content,
      protagonistName: input.protagonistName,
    }, input.project.style_directives?.focus_key || undefined);
    qualityHardIssues.push(...focusPresetIssuesAsQualityIssues(focusReport.issues).filter(isFlashCheapHardIssue));
    causalIssues = await checkCausalLogicFast(input.project.id, input.nextChapter, chapter.content, {
      protagonistName: input.protagonistName,
      focusKey: input.project.style_directives?.focus_key,
    });
    causalHardIssues = causalIssues.filter(isHardCausalIssue);
    const blueprintIssues = evaluateBlueprintAlignment(chapter.content, blueprint);
    causalIssues.push(...blueprintIssues);
    causalHardIssues.push(...blueprintIssues.filter(isHardCausalIssue));
    // Keep ending hook as a soft audit signal; do not convert it to a hard blocker.
  }
  causalIssues = await checkCausalLogicFast(input.project.id, input.nextChapter, chapter.content, {
    protagonistName: input.protagonistName,
    focusKey: input.project.style_directives?.focus_key,
  }).catch((e) => {
    throw new Error(`FLASH_CHEAP_CAUSAL_GATE_FAILED: ${e instanceof Error ? e.message : String(e)}`);
  });
  causalHardIssues = causalIssues.filter(isHardCausalIssue);
  const finalBlueprintIssues = evaluateBlueprintAlignment(chapter.content, blueprint);
  causalIssues.push(...finalBlueprintIssues);
  causalHardIssues.push(...finalBlueprintIssues.filter(isHardCausalIssue));

  if (qualityHardIssues.length > 0 || causalHardIssues.length > 0) {
    const qualityText = qualityHardIssues.map((i) => `${i.code}:${i.message}`);
    const causalText = causalHardIssues.map((i) => `${i.code}:${i.message}`);
    throw new Error(`FLASH_CHEAP_GATE_BLOCKED: ${[...qualityText, ...causalText].join(' | ')}`);
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
      genre: input.genre,
      expectedCharacters: [input.protagonistName, ...characters],
    }),
  ]);

  const hardBlockers = [
    ...contradictions.filter((c) => c.severity === 'critical').map((c): CriticIssue => ({ type: 'continuity', severity: 'critical', description: c.description })),
    ...consistencyIssues.filter((i) => i.severity === 'critical' || i.severity === 'major').map((i): CriticIssue => ({ type: i.type === 'dead_character' ? 'continuity' : 'consistency', severity: i.severity, description: i.description })),
    ...causalHardIssues.map((i): CriticIssue => ({ type: 'logic', severity: i.severity, description: `[${i.code}] ${i.message}${i.evidence ? ` Evidence: ${i.evidence}` : ''}` })),
    ...canonIssues.filter(isFlashCheapHardCanonIssue),
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
  if (blueprint) {
    await markChapterBlueprintUsed(input.project.id, input.nextChapter, combined.summary.summary, db);
  }
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
      causal_logic_health: buildCausalLogicHealth(causalIssues),
      chapter_blueprint: blueprint ? {
        version: blueprint.version,
        status: 'used',
        title_hint: blueprint.title_hint,
        goal: blueprint.goal,
        payoff: blueprint.payoff,
        actual_summary_delta: combined.summary.summary,
      } : null,
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
  const focusInstructions = getRoutinePromptContext(input.project.style_directives);
  return `Bạn là writer chính của một bộ sảng văn dài kỳ.

YÊU CẦU OUTPUT: chỉ trả về JSON object hợp lệ:
{
  "title": "tiêu đề chương tiếng Việt, không ghi Chương ${input.nextChapter}",
  "content": "toàn văn chương bằng tiếng Việt"
}

KHUNG CHƯƠNG:
- Viết chương ${input.nextChapter} của "${input.storyTitle}", mục tiêu khoảng ${input.targetWordCount} từ.
- Độ dài ưu tiên: ${preferredMin}-${preferredMax} từ; hard minimum ${minWords} từ. Không viết ngắn kiểu tóm tắt.
- Main: ${input.protagonistName}. MC có trí nhớ kiếp trước về văn học, phim ảnh, game, thần thoại, webnovel.
- Tone: sảng văn. MC có thể gặp trở ngại nhỏ nhưng phải xử lý gọn, thông minh, có tiến triển mạnh lên, có payoff cụ thể trong chính chương.
- Áp dụng universal sảng văn directive: MC nắm nhịp, thưởng dày hơn áp lực, không stack đối thủ/âm mưu/kìm nén nếu chưa trả lợi ích trong cùng chương.
- Nếu dùng văn minh Trái Đất, Vạn Văn Ký Ức/inner monologue phải ghi rõ template gốc, nhân vật/cảnh gốc và vì sao dùng nó; không đổi hết 100% làm mất hồi ức.
- Không leak prompt/context/model/API. Không tự tạo canon lớn mâu thuẫn chương trước. Không hồi sinh nhân vật chết nếu không có cơ chế đã establish.
- Hard causal logic: không để rival/nhân vật yếu tự nhiên vào Học Viện/khu cấm/lấy đồ nếu chưa có quyền hạn hợp pháp; mọi bản đồ/tọa độ/vật phẩm/tài nguyên cao cấp phải có nguồn, giá, chi phí hoặc ledger; không mở thread vượt cấp trái CURRENT ARC RAIL.
- Full blueprint map là đường ray chính: goal/payoff/resource/authority/forbidden terms trong FULL CHAPTER BLUEPRINT phải được giữ. Có thể đổi văn phong/cảnh phụ, không được đổi mục tiêu chương.
- Không tự kéo named rival/faction vào chương nếu CURRENT ARC RAIL hoặc ACTIVE THREADS không yêu cầu. Nếu rival xuất hiện, phải có động cơ, quyền hạn, lợi ích/áp lực và giới hạn hành động ngay trong cảnh.
- Không dùng nhãn meta/nhãn dàn ý trong content; kết chương phải là văn xuôi/cảnh truyện tự nhiên.
- TUYỆT ĐỐI không viết tóm tắt/outline. "content" phải là toàn văn truyện, tối thiểu ${minWords} từ, có scene nối tiếp nhau.

FOCUS REQUIREMENTS:
${focusInstructions || '- Bám world_description/story_outline hiện có; payoff phải hữu hình, có ledger hoặc phản ứng thế giới rõ.'}

CONTEXT COMPACT:
${context}`;
}

function buildRetryWriterPrompt(
  input: FlashCheapRoutineInput,
  context: string,
  minWords: number,
  previous: { title: string; content: string } | null,
  issues: ChapterQualityIssue[],
  causalIssues: CausalLogicIssue[] = [],
): string {
  return `${buildWriterPrompt(input, context, minWords)}

BẢN TRƯỚC BỊ CHẶN BỞI GATE:
${[
  ...issues.map((i) => `- ${i.code}: ${i.message}`),
  ...causalIssues.map((i) => `- ${i.code}: ${i.message}${i.evidence ? ` (${i.evidence})` : ''}`),
].join('\n')}

YÊU CẦU SỬA:
- Viết lại hoàn toàn, không tóm tắt.
- Độ dài tối thiểu ${minWords} từ, ưu tiên quanh ${input.targetWordCount} từ.
- Thêm payoff rõ trong chương: tài nguyên/ledger/law/species/world-state phải thay đổi thấy được.
- Kết chương phải có lực kéo đọc tiếp cụ thể.
- Mọi nhân vật phụ/rival chỉ được vào khu vực, lấy vật phẩm, đưa bản đồ/tọa độ hoặc mở thread mới nếu có quyền hạn, nguồn tin, động cơ và chi phí rõ trong chương.
- Không đưa high-tier thread trái arc rail; nếu arc chưa seed Thần Cách/sát thủ Hư Không/tàn tích cấp cao thì không tự mở.
- Nếu brief chương không cần rival/faction cụ thể, bỏ họ khỏi chương; tập trung vào mục tiêu/payoff của brief.
- Không ghi literal nhãn dàn ý hoặc nhãn prompt nào trong truyện; hãy viết cảnh kết tự nhiên.

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
  return `Bạn đang sửa một chương routine của sảng văn dài kỳ.

YÊU CẦU OUTPUT: chỉ trả về JSON object hợp lệ:
{
  "append_content": "phần nối thêm bằng tiếng Việt"
}

Chương ${input.nextChapter} của "${input.storyTitle}" đã gần xong nhưng bị gate chặn:
${issues.map((i) => `- ${i.code}: ${i.message}`).join('\n')}

NHIỆM VỤ:
- KHÔNG viết lại từ đầu. Chỉ viết phần nối thêm ${needed}-${needed + 450} từ để gắn trực tiếp sau bản hiện có.
- Phần nối thêm phải mở rộng cảnh hiện tại bằng hành động cụ thể, ledger tài nguyên/danh vọng/trạng thái thế giới, phản ứng nhân vật/faction và payoff rõ theo đúng focus preset.
- Kết thúc phần nối thêm bằng lực kéo cụ thể đủ mạnh để đọc tiếp.
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
