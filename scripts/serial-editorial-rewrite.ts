/**
 * Human-directed editorial rewrite for already-published serial chapters.
 *
 * Generation is read-only and writes a reviewable candidate bundle outside the repo:
 *   npm run serial:rewrite -- --book=mat-the --output=/tmp/mat-the-rewrite.json
 *   npm run serial:rewrite -- --book=rau-tuoi --output=/tmp/rau-tuoi-rewrite.json
 *
 * Applying is intentionally handled by the revision RPC after the candidate bundle has
 * been read. This script never silently replaces a published chapter.
 */
import dotenv from 'dotenv';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { geminiProvider } from '@/services/story-factory/provider';
import { PremiseSchema, type ChapterDraft } from '@/services/serial/contracts';
import { rewriteChapterEditorially, type EditorialRewriteResult } from '@/services/serial/editorial';
import { EDITORIAL_PILOTS } from '@/services/serial/editorial-pilots';
import { factsForChapter, groundedEditorialFeedback, selectEditorialRepairChapters, type EditorialFeedback } from '@/services/serial/editorial-policy';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const bookKey = value('book');
const outputPath = value('output');
const model = value('model') ?? 'gpt-5.6-terra';
const sourceBundlePath = value('source-bundle');
const restart = value('restart') === 'yes';
if (!bookKey || !outputPath) throw new Error('Usage: --book=mat-the|rau-tuoi --output=/tmp/file.json [--chapters=2,5]');
const candidateOutputPath = outputPath;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const books = EDITORIAL_PILOTS;
const selectedBook = books[bookKey as keyof typeof books];
if (!selectedBook) throw new Error(`Unknown book ${bookKey}.`);
const requested = value('chapters')?.split(',').map(Number);
if (requested?.some(chapter => !selectedBook.chapters.includes(chapter))) {
  throw new Error('Requested chapters must be in the reviewed 2–10 pilot range.');
}
let targetChapters = requested?.length ? [...new Set(requested)].sort((a, b) => a - b) : [...selectedBook.chapters];

const SequenceAuditSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    target: z.enum(['prose', 'context']),
    chapterNumber: z.number().int().min(1).max(20),
    severity: z.enum(['blocking', 'important', 'minor']),
    quote: z.string().trim().min(4).max(400),
    explain: z.string().trim().min(4).max(700),
    positiveDirection: z.string().trim().min(4).max(700),
  }).strict()).max(12),
  summary: z.string().trim().min(4).max(1_000),
}).strict().superRefine((audit, ctx) => {
  if (audit.passed !== audit.issues.every(issue => issue.severity === 'minor')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passed'], message: 'passed must agree with issue severities' });
  }
});

const tail = (text: string, words: number): string => text.trim().split(/\s+/).slice(-words).join(' ');
const head = (text: string, words: number): string => text.trim().split(/\s+/).slice(0, words).join(' ');

async function main(): Promise<void> {
  const checkpointPath = `${candidateOutputPath}.checkpoint.json`;
  const checkpoint = existsSync(checkpointPath) && !restart
    ? JSON.parse(readFileSync(checkpointPath, 'utf8')) as { book: string; rewrites: Array<Record<string, unknown>> }
    : null;
  if (checkpoint && checkpoint.book !== bookKey) throw new Error('Checkpoint book mismatch.');
  const sourceBundle = sourceBundlePath
    ? JSON.parse(readFileSync(sourceBundlePath, 'utf8')) as {
      book: string; novelId: string; serialNovelId: string;
      rewrites?: Array<{ chapterNumber: number; newTitle: string; newContent: string;
        review?: { issues?: Omit<EditorialFeedback, 'chapterNumber'>[] };
        contextHash?: string; decision?: string;
      }>;
      sequenceReview?: { issues?: EditorialFeedback[] };
    }
    : null;
  if (sourceBundle && (sourceBundle.book !== bookKey || sourceBundle.novelId !== selectedBook.novelId
    || sourceBundle.serialNovelId !== selectedBook.serialNovelId)) throw new Error('Source bundle identity mismatch.');
  if (sourceBundle && !requested?.length) {
    targetChapters = selectEditorialRepairChapters(sourceBundle.rewrites ?? [], sourceBundle.sequenceReview?.issues ?? []);
    if (!targetChapters.length) {
      console.log('[rewrite] No grounded prose findings. Review context/state instead of regenerating chapters.');
      return;
    }
  }
  const sourceByNumber = new Map((sourceBundle?.rewrites ?? []).map(item => [item.chapterNumber, item]));
  const [serial, chaptersResult] = await Promise.all([
    db.from('serial_novels').select('id,premise,prompt_version').eq('id', selectedBook.serialNovelId).single(),
    db.from('chapters').select('id,chapter_number,title,content,publication_state')
      .eq('novel_id', selectedBook.novelId).lte('chapter_number', 10).order('chapter_number'),
  ]);
  if (serial.error) throw serial.error;
  if (chaptersResult.error) throw chaptersResult.error;

  const premise = PremiseSchema.parse(serial.data.premise);
  const chapters = chaptersResult.data ?? [];
  const chapterByNumber = new Map(chapters.map(chapter => [chapter.chapter_number, chapter]));

  const rewritten = new Map<number, ChapterDraft>();
  const results: Array<Record<string, unknown>> = [];
  const saveCheckpoint = (rows: Array<Record<string, unknown>>) => {
    const byNumber = new Map((checkpoint?.rewrites ?? []).map(row => [row.chapterNumber, row]));
    for (const row of rows) byNumber.set(row.chapterNumber, row);
    writeFileSync(`${checkpointPath}.tmp`, JSON.stringify({ book: bookKey, rewrites: [...byNumber.values()] }, null, 2));
    renameSync(`${checkpointPath}.tmp`, checkpointPath);
  };
  for (const chapterNumber of targetChapters) {
    const current = chapterByNumber.get(chapterNumber);
    if (!current) throw new Error(`Missing chapter ${chapterNumber}.`);
    const source = sourceByNumber.get(chapterNumber);
    const sourcePrevious = sourceByNumber.get(chapterNumber - 1);
    const sourceNext = sourceByNumber.get(chapterNumber + 1);
    const previousContent = rewritten.get(chapterNumber - 1)?.content
      ?? sourcePrevious?.newContent
      ?? chapterByNumber.get(chapterNumber - 1)?.content;
    // A chapter scheduled for revision cannot constrain the current draft with its old opening.
    const nextContent = targetChapters.includes(chapterNumber + 1) ? null
      : sourceNext?.newContent ?? chapterByNumber.get(chapterNumber + 1)?.content;
    const direction = selectedBook.directions[chapterNumber];
    const canon = factsForChapter(selectedBook.canon, chapterNumber);
    const reviewFocus = groundedEditorialFeedback(source?.newContent ?? current.content,
      (sourceBundle?.sequenceReview?.issues ?? []).filter(issue => issue.chapterNumber === chapterNumber));
    const contextHash = createHash('sha256').update(JSON.stringify({
      model, promptVersion: SERIAL_PROMPT_VERSION, premise, chapterNumber,
      previousContent, nextContent, direction, canon, reviewFocus,
    })).digest('hex');
    const requestHash = createHash('sha256').update(JSON.stringify({
      model, promptVersion: SERIAL_PROMPT_VERSION, premise, chapterNumber,
      current, source: source?.newContent, contextHash,
    })).digest('hex');
    const saved = checkpoint?.rewrites.find(row => row.chapterNumber === chapterNumber && row.requestHash === requestHash);
    if (saved?.complete === true) {
      results.push(saved);
      rewritten.set(chapterNumber, { title: String(saved.newTitle), content: String(saved.newContent) });
      console.log(`[rewrite] chapter ${chapterNumber}: reused checkpoint`);
      continue;
    }
    if (!restart && source?.contextHash === contextHash && source.decision && source.decision !== 'accepted') {
      throw new Error(`Chapter ${chapterNumber}: unchanged failed context. Reconcile its findings before retrying; use --restart=yes only for an intentional new attempt.`);
    }
    const record = (result: Awaited<ReturnType<typeof rewriteChapterEditorially>>, complete: boolean) => ({
      chapterId: current.id, chapterNumber, publicationState: current.publication_state,
      oldTitle: current.title, oldContent: current.content,
      newTitle: result.chapter.title, newContent: result.chapter.content,
      review: result.review, accepted: result.accepted, attempts: result.attempts,
      usage: result.usages, costUsd: result.costUsd, decision: result.decision,
      history: result.history, diagnostics: result.diagnostics, direction, canon, contextHash, requestHash, complete,
      checkpointResult: result,
    });
    console.log(`[rewrite] ${bookKey} chapter ${chapterNumber}: generating`);
    const result = await rewriteChapterEditorially(geminiProvider, {
      premise,
      chapterNumber,
      chapter: { title: current.title, content: source?.newContent ?? current.content },
      previousTail: previousContent ? tail(previousContent, 650) : '',
      nextHead: nextContent ? head(nextContent, 450) : '',
      canonicalDigest: null,
      plannedBeat: null,
      direction,
      canon,
      reviewFocus,
      mode: source ? 'repair' : 'rewrite',
      resume: saved?.checkpointResult as EditorialRewriteResult | undefined,
      onCheckpoint: result => saveCheckpoint([...results, record(result, false)]),
      model,
    });
    rewritten.set(chapterNumber, result.chapter);
    results.push(record(result, true));
    saveCheckpoint(results);
    console.log(`[rewrite] chapter ${chapterNumber}: ${result.accepted ? 'accepted' : 'needs review'}, ${result.chapter.content.length} chars, $${result.costUsd.toFixed(4)}`);
  }

  const sequence = chapters.map(chapter => ({
    chapterNumber: chapter.chapter_number,
    title: rewritten.get(chapter.chapter_number)?.title ?? sourceByNumber.get(chapter.chapter_number)?.newTitle ?? chapter.title,
    content: rewritten.get(chapter.chapter_number)?.content
      ?? sourceByNumber.get(chapter.chapter_number)?.newContent
      ?? chapter.content,
  }));
  const sequenceReview = await geminiProvider.json({
    model,
    system: `Bạn đọc liền mười chương đầu Song Xuyên: kiểm nhân quả, giao dịch, cấp bậc, quyền sở hữu, luật cửa và nhịp khách mua → dùng hàng kiếm vốn → thể hiện → mua cao hơn. Canon đã duyệt xác định sự thật. target=prose cho lỗi nội dung, quote nguyên văn chương được đánh số; target=context cho xung đột nguồn. Hướng sửa bằng cảnh, lựa chọn và payoff cụ thể. passed đúng khi mọi issue chỉ là minor.`,
    prompt: JSON.stringify({
      title: premise.title,
      readerFantasy: premise.readerFantasy,
      goldenFinger: premise.goldenFinger,
      canonDaDuyet: selectedBook.canon,
      chapters: sequence,
    }, null, 1),
    schema: SequenceAuditSchema,
    temperature: 0.2,
    timeoutMs: 240_000,
  });

  const carryover = (sourceBundle?.rewrites ?? [])
    .filter(item => !(targetChapters as number[]).includes(item.chapterNumber)) as Array<Record<string, unknown>>;
  const bundleRewrites = [...carryover, ...results]
    .sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
  const bundle = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    book: bookKey,
    novelId: selectedBook.novelId,
    serialNovelId: selectedBook.serialNovelId,
    model,
    sourcePromptVersion: serial.data.prompt_version,
    targetPromptVersion: SERIAL_PROMPT_VERSION,
    rewrites: bundleRewrites,
    sequenceReview: sequenceReview.value,
    sequenceReviewUsage: sequenceReview.usage,
    accepted: bundleRewrites.every(result => result.accepted === true)
      && sequenceReview.value.passed
      && sequenceReview.value.issues.every(issue => issue.severity === 'minor'),
  };
  writeFileSync(candidateOutputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`[rewrite] bundle: ${candidateOutputPath}`);
  console.log(`[rewrite] accepted: ${bundle.accepted}`);
  console.log(`[rewrite] sequence: ${sequenceReview.value.summary}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
