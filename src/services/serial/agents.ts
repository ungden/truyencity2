import type { StoryModelProvider, ProviderUsage } from '@/services/story-factory/provider';
import {
  ChapterDigestSchema, ChapterDraftSchema, CyclePlanSchema, JudgeVerdictSchema, OpeningAuditSchema, PremiseSchema,
  type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict, type OpeningAudit, type Premise,
  type SerialRoutes,
} from './contracts';
import {
  PREMISE_SYSTEM_PROMPT, WRITER_SYSTEM_PANEL_RULE,
} from './prompts';
import { narrativeCraft, type NarrativeCraftProfile } from '@/services/narrative/foundation';
import { serialSystemPrompt } from './foundation';

/**
 * One function per model call. Each takes a provider so the whole engine can be exercised
 * against a stub in tests without spending anything.
 */

/** Chapter calls must leave room for a judge call inside the same invocation. */
export const CHAPTER_TIMEOUT_MS = 180_000;
export const SUPPORT_TIMEOUT_MS = 120_000;

const brief = (value: unknown): string => JSON.stringify(value, null, 1);

export interface AgentResult<T> { value: T; usage: ProviderUsage }

const comparableTitle = (value: string): string => value
  .normalize('NFKC')
  .toLowerCase()
  .replace(/^#{1,6}\s*/, '')
  .replace(/^chương\s+\d+\s*:\s*/u, '')
  .replace(/[“”"'‘’`*_#:\s]/gu, '');

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
  return ChapterDraftSchema.parse({ ...draft, title, content: lines.join('\n').trim() });
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
  findings: JudgeVerdict['continuity'];
}): Promise<AgentResult<ChapterDraft>> {
  const base = serialSystemPrompt('writer', input.premise);
  const system = `${input.premise.voiceSheet.showsSystemPanel ? `${base}\n\n${WRITER_SYSTEM_PANEL_RULE}` : base}

ĐANG SỬA BẢN BỊ TRẢ
banBiTra là chương bạn vừa viết. loi là những chỗ mâu thuẫn với canon, mỗi lỗi có trích dẫn nguyên văn chỉ đúng chỗ hỏng.
Sửa đúng những chỗ đó và mọi hệ quả của chúng. Giữ nguyên phần còn lại — đừng viết lại cả chương, và tuyệt đối đừng thêm sự kiện mới để che lỗi cũ.
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
    schema: OpeningAuditSchema,
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
}): Promise<AgentResult<JudgeVerdict>> {
  const result = await input.provider.json({
    model: input.routes.judge,
    system: serialSystemPrompt('judge', input.premise),
    prompt: brief(input.judgeBrief),
    schema: JudgeVerdictSchema,
    temperature: 0.2,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}

export async function extractDigest(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  premise: Premise;
  extractorBrief: unknown;
}): Promise<AgentResult<ChapterDigest>> {
  const result = await input.provider.json({
    model: input.routes.extractor,
    system: serialSystemPrompt('extractor', input.premise),
    prompt: brief(input.extractorBrief),
    schema: ChapterDigestSchema,
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
}): Promise<AgentResult<CyclePlan>> {
  const result = await input.provider.json({
    model: input.routes.planner,
    system: serialSystemPrompt('planner', input.premise),
    prompt: brief(input.plannerBrief),
    schema: CyclePlanSchema,
    temperature: 0.8,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}

export async function proposePremise(input: {
  provider: StoryModelProvider;
  routes: SerialRoutes;
  lane: string;
  avoid: string[];
  craftProfile?: NarrativeCraftProfile;
}): Promise<AgentResult<Premise>> {
  const result = await input.provider.json({
    model: input.routes.premise,
    system: input.craftProfile
      ? `Bạn dựng premise schemaVersion 3 với narrativeFoundation đầy đủ.\n\n${narrativeCraft(input.craftProfile)}\n\nKhông khóa số chương phải bán hàng hoặc lên cấp. World Kernel vẫn dùng stable IDs; các mảng thương mại/cấp bậc có thể rỗng nếu chưa thuộc mở đầu.`
      : PREMISE_SYSTEM_PROMPT,
    prompt: brief({ lane: input.lane, craftProfile: input.craftProfile ?? null, khongDuocTrungVoi: input.avoid }),
    schema: PremiseSchema,
    temperature: 1,
    timeoutMs: SUPPORT_TIMEOUT_MS,
  });
  return { value: result.value, usage: result.usage };
}
