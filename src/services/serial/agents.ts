import type { StoryModelProvider, ProviderUsage } from '@/services/story-factory/provider';
import {
  ChapterDigestSchema, ChapterDraftSchema, LegacyChapterDigestSchema, CyclePlanShapeSchema, JudgeProviderVerdictSchema, OpeningAuditProviderSchema, PremiseSchema,
  type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict, type OpeningAudit, type Premise,
  type SerialRoutes,
} from './contracts';
import {
  promptsFor, WRITER_SYSTEM_PANEL_RULE,
} from './prompts';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import { groundEvidenceSpan } from '@/services/story-factory/validation';
import { serialSystemPrompt } from './foundation';

/**
 * One function per model call. Each takes a provider so the whole engine can be exercised
 * against a stub in tests without spending anything.
 */

/** Chapter calls must leave room for a judge call inside the same invocation. */
export const CHAPTER_TIMEOUT_MS = 180_000;
export const SUPPORT_TIMEOUT_MS = 120_000;
/**
 * The planner now writes every beat's ledger as well as its prose intent, so its output
 * is the largest of any call. It runs in its own tick (plan_cycle), which leaves room
 * under the 300s function ceiling that a chapter tick does not have.
 */
export const PLANNER_TIMEOUT_MS = 200_000;

const brief = (value: unknown): string => JSON.stringify(value, null, 1);

export interface AgentResult<T> { value: T; usage: ProviderUsage }

const comparableTitle = (value: string): string => value
  .normalize('NFKC')
  .toLowerCase()
  .replace(/^#{1,6}\s*/, '')
  .replace(/^chương\s+\d+\s*:\s*/u, '')
  .replace(/[“”"'‘’`*_#:\s]/gu, '');

/**
 * Did the judge read this draft? Title and chapter must match, and the excerpt must be a
 * real passage — exact, or a run of at least twelve words (or 70% of a short excerpt) once
 * quotes, dashes and spacing are ignored. Models re-type curly quotes and em-dashes; a
 * reviewer who reproduced the passage word for word has read it.
 */
export function reviewBindingMismatch(
  binding: { chapterNumber: number; title: string; excerpt: string } | undefined,
  chapter: { chapterNumber: number; title: string; content: string },
): string | null {
  if (!binding) return 'missing reviewBinding';
  if (binding.chapterNumber !== chapter.chapterNumber) return `chapterNumber ${binding.chapterNumber} ≠ ${chapter.chapterNumber}`;
  if (comparableTitle(binding.title) !== comparableTitle(chapter.title)) return `title "${binding.title}" ≠ "${chapter.title}"`;
  if (chapter.content.includes(binding.excerpt)) return null;
  const words = (value: string) => value.match(/[\p{L}\p{N}]+/gu) ?? [];
  const excerptWords = words(binding.excerpt).length;
  const matched = words(groundEvidenceSpan(chapter.content, binding.excerpt) ?? '').length;
  return matched >= Math.min(12, Math.ceil(excerptWords * 0.7)) && matched >= 6
    ? null
    : `excerpt not found (${matched}/${excerptWords} words): ${binding.excerpt.slice(0, 120)}`;
}

/**
 * The reader renders plain text: a model's **bold** reached the first published chapter
 * as literal asterisks. Emphasis markers and heading hashes are removed in code; scene
 * breaks and 【】 panels are left alone.
 */
export function stripMarkdown(content: string): string {
  return content
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/__([^_\n]+?)__/g, '$1')
    .replace(/(^|[\s(“"])\*([^*\s][^*\n]*?[^*\s]|[^*\s])\*(?=[\s).,!?;:”"]|$)/gm, '$1$2')
    .replace(/^#{1,6}\s+/gm, '');
}

/** Remove a model-emitted Markdown heading that merely repeats the structured title. */
export function normalizeChapterDraft(draft: ChapterDraft): ChapterDraft {
  const title = draft.title.replace(/^chương\s+\d+\s*:\s*/iu, '').trim();
  const lines = draft.content.split(/\r?\n/);
  const first = lines[0]?.trim() ?? '';
  const headingLike = /^#{1,6}\s+/.test(first) || /^chương\s+\d+\s*:/iu.test(first);
  if (headingLike && comparableTitle(first) === comparableTitle(title)) {
    while (lines.length > 1 && lines[1].trim() === '') lines.splice(1, 1);
    lines.shift();
  }
  return ChapterDraftSchema.parse({ ...draft, title, content: stripMarkdown(lines.join('\n')).trim() });
}

export async function writeChapter(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  writerBrief: unknown;
}): Promise<AgentResult<ChapterDraft>> {
  const base = serialSystemPrompt('writer', input.premise);
  const system = input.premise.voiceSheet.showsSystemPanel
    ? `${base}\n\n${WRITER_SYSTEM_PANEL_RULE}`
    : base;
  const result = await input.provider.json({
    model: input.routes.writer,
    system,
    prompt: brief(input.writerBrief),
    schema: ChapterDraftSchema,
    temperature: 1,
    timeoutMs: CHAPTER_TIMEOUT_MS,
  });
  return { value: normalizeChapterDraft(result.value), usage: result.usage };
}

/**
 * A targeted repair. The rejected draft goes back with the findings so the model fixes
 * the cited passages instead of rolling a fresh chapter that breaks something else —
 * the one lesson from the old engine worth carrying over verbatim.
 */
export async function reviseChapter(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  writerBrief: unknown;
  rejected: ChapterDraft;
  /** Judge continuity, code-detected slips or opening-audit findings: a quote and why. */
  findings: Array<{ kind: string; quote: string | null; explain: string }>;
}): Promise<AgentResult<ChapterDraft>> {
  const base = serialSystemPrompt('writer', input.premise);
  const system = `${input.premise.voiceSheet.showsSystemPanel ? `${base}\n\n${WRITER_SYSTEM_PANEL_RULE}` : base}

ĐANG SỬA BẢN BỊ TRẢ
banBiTra là chương bạn vừa viết. loi là những chỗ mâu thuẫn với canon, mỗi lỗi có trích dẫn nguyên văn chỉ đúng chỗ hỏng.
Sửa đúng những chỗ đó và mọi hệ quả của chúng. Giữ nguyên phần còn lại — đừng viết lại cả chương, và tuyệt đối đừng thêm sự kiện mới để che lỗi cũ.
Tiêu đề là một câu trích từ chương: nếu bản sửa làm mất câu ấy, đặt lại tiêu đề bằng một câu có thái độ còn nằm trong chương, ưu tiên câu móc cuối.
Trả về toàn bộ chương sau khi sửa.`;
  const result = await input.provider.json({
    model: input.routes.writer,
    system,
    prompt: brief({ ...(input.writerBrief as object), banBiTra: input.rejected, loi: input.findings }),
    schema: ChapterDraftSchema,
    temperature: 1,
    timeoutMs: CHAPTER_TIMEOUT_MS,
  });
  return { value: normalizeChapterDraft(result.value), usage: result.usage };
}

export async function auditOpening(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  auditBrief: unknown;
}): Promise<AgentResult<OpeningAudit>> {
  const result = await input.provider.json({
    model: input.routes.judge,
    system: serialSystemPrompt('opening', input.premise),
    prompt: brief(input.auditBrief),
    schema: OpeningAuditProviderSchema,
    temperature: 0,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}

export async function judgeChapter(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  judgeBrief: unknown;
  chapter: { chapterNumber: number; title: string; content: string };
}): Promise<AgentResult<JudgeVerdict>> {
  const result = await input.provider.json({
    model: input.routes.judge,
    system: serialSystemPrompt('judge', input.premise),
    prompt: brief(input.judgeBrief),
    schema: JudgeProviderVerdictSchema,
    temperature: 0.2,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  const deniedInput = (result.value.steering ?? []).some(line =>
    /(?:không|chưa) (?:có|được (?:cấp|cung cấp|gửi)) (?:truyện|văn bản|nội dung|phần văn|bản thảo)/iu.test(line));
  const mismatch = deniedInput ? 'steering says no text was supplied' : reviewBindingMismatch(result.value.reviewBinding, input.chapter);
  if (mismatch) {
    throw new StoryFactoryError(
      'infra_blocked',
      `Judge response is not grounded in the supplied chapter: ${mismatch}`,
      { usage: result.usage },
    );
  }
  return { value: result.value, usage: result.usage };
}

export async function extractDigest(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  extractorBrief: unknown;
}): Promise<AgentResult<ChapterDigest>> {
  // Lived-causality evidence exists only for retired v3 stories. Offering the field to a
  // v2 extractor bought tokens that sanitizeDigest then threw away on every chapter.
  const result = await input.provider.json({
    model: input.routes.extractor,
    system: serialSystemPrompt('extractor', input.premise),
    prompt: brief(input.extractorBrief),
    schema: input.premise.schemaVersion === 3 ? ChapterDigestSchema : LegacyChapterDigestSchema,
    temperature: 0,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}

export async function planCycle(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  plannerBrief: unknown;
  rolling?: boolean;
}): Promise<AgentResult<CyclePlan>> {
  const result = await input.provider.json({
    model: input.routes.planner,
    system: serialSystemPrompt('planner', input.premise),
    prompt: brief(input.plannerBrief),
    schema: CyclePlanShapeSchema,
    temperature: 0.8,
    timeoutMs: PLANNER_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}

export async function proposePremise(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  lane: string;
  archetype?: string;
  avoid: string[];
}): Promise<AgentResult<Premise>> {
  const result = await input.provider.json({
    model: input.routes.premise,
    system: promptsFor(input.archetype).premise,
    prompt: brief({ lane: input.lane, archetype: input.archetype ?? null, khongDuocTrungVoi: input.avoid }),
    schema: PremiseSchema,
    temperature: 1,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}
