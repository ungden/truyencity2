import { z } from 'zod';
import type { ChapterDraft } from './contracts';

/** A reviewed fact has one owner and a temporal scope, rather than an appended correction. */
export interface EditorialFact {
  key: string;
  fromChapter: number;
  throughChapter: number;
  value: string;
}

export function factsForChapter(facts: EditorialFact[], chapterNumber: number): EditorialFact[] {
  const selected = facts.filter(fact => fact.fromChapter <= chapterNumber && fact.throughChapter >= chapterNumber);
  const byKey = new Map<string, EditorialFact>();
  for (const fact of selected) {
    const previous = byKey.get(fact.key);
    if (previous && previous.value !== fact.value) throw new Error(`EDITORIAL_CANON_CONFLICT: ${fact.key}`);
    byKey.set(fact.key, fact);
  }
  return [...byKey.values()];
}

export const EditorialPatchSchema = z.object({
  edits: z.array(z.object({
    before: z.string().min(4),
    after: z.string(),
  }).strict()).min(1).max(8),
}).strict();

/** Exact replacements make preservation executable instead of another prompt request. */
export function applyEditorialPatch(chapter: ChapterDraft, patch: z.infer<typeof EditorialPatchSchema>): ChapterDraft {
  const spans = patch.edits.map(edit => {
    const start = chapter.content.indexOf(edit.before);
    if (start < 0 || chapter.content.indexOf(edit.before, start + 1) >= 0) {
      throw new Error('EDITORIAL_PATCH_ANCHOR: replacement must match exactly once');
    }
    return { ...edit, start, end: start + edit.before.length };
  }).sort((a, b) => a.start - b.start);
  if (spans.some((span, index) => index > 0 && span.start < spans[index - 1].end)) {
    throw new Error('EDITORIAL_PATCH_OVERLAP');
  }
  const changed = spans.reduce((sum, span) => sum + Math.max(span.before.length, span.after.length), 0);
  if (changed > chapter.content.length * 0.35) throw new Error('EDITORIAL_PATCH_SCOPE: revise the scene contract first');
  let content = chapter.content;
  for (const span of [...spans].reverse()) content = content.slice(0, span.start) + span.after + content.slice(span.end);
  if (content === chapter.content) throw new Error('EDITORIAL_PATCH_NO_CHANGE');
  return { ...chapter, content };
}

export const containsQuote = (content: string, quote: string): boolean =>
  content.replace(/\s+/g, ' ').includes(quote.replace(/\s+/g, ' '));

export interface EditorialFeedback {
  chapterNumber: number;
  severity: string;
  target?: string;
  quote: string;
  explain: string;
  positiveDirection: string;
}

export function groundedEditorialFeedback(content: string, issues: EditorialFeedback[]): EditorialFeedback[] {
  return issues.filter(issue => issue.target !== 'context' && issue.severity !== 'minor'
    && containsQuote(content, issue.quote));
}

/** Newest feedback for the actual prose supersedes criticism of older versions. */
export function selectEditorialRepairChapters(
  chapters: Array<{ chapterNumber: number; newContent: string; review?: { issues?: Omit<EditorialFeedback, 'chapterNumber'>[] } }>,
  sequenceIssues: EditorialFeedback[],
): number[] {
  return chapters.filter(chapter => groundedEditorialFeedback(chapter.newContent, [
    ...sequenceIssues.filter(issue => issue.chapterNumber === chapter.chapterNumber),
    ...(chapter.review?.issues ?? []).map(issue => ({ ...issue, chapterNumber: chapter.chapterNumber })),
  ]).length > 0).map(chapter => chapter.chapterNumber).sort((a, b) => a - b);
}
