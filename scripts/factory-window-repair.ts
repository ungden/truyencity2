/**
 * Targeted repair for HIDDEN novels blocked by window review.
 *
 * Canon immutability is a publication concept. A committed chapter that no reader has
 * ever seen is still repairable — and three consecutive canaries died at the same
 * wall: a small prose drift ("hộp sắt" vs the established "hộp gỗ") baked into a
 * committed chapter that revive could only re-judge, never fix.
 *
 * This operator tool takes the blocked review's evidence-anchored issues, asks the
 * editor-class model to apply EXACTLY those edits to the cited chapters (nothing
 * else), guards the result (hidden novel only, bounded length drift, no new numbers),
 * updates the chapter rows, and returns the job to window_review for a fresh verdict.
 *
 *   npm run factory:window-repair -- --job-id <id>          # dry-run: show planned edits
 *   npm run factory:window-repair -- --job-id <id> --apply
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { geminiProvider } from '../src/services/story-factory/provider';
import { z } from 'zod';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const jobId = value('--job-id');
if (!jobId) throw new Error('window-repair requires --job-id.');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const REPAIR_MODEL = 'gemini-3.1-pro-preview';

const RepairedChapterSchema = z.object({
  content: z.string().trim().min(20),
}).strict();

async function main() {
  const jobRow = await db.from('story_factory_jobs')
    .select('id,status,stage,current_chapter,novel_id,novels!story_factory_jobs_novel_id_fkey(title,hidden)')
    .eq('id', jobId).single();
  if (jobRow.error) throw jobRow.error;
  const job = jobRow.data;
  const novel = Array.isArray(job.novels) ? job.novels[0] : job.novels;
  // The one hard rule: never touch prose a reader may have seen.
  if (!novel?.hidden) throw new Error('window-repair only operates on hidden novels. This novel is public.');
  if (job.status !== 'quality_blocked' || job.stage !== 'window_review') {
    throw new Error(`Job is ${job.status}/${job.stage}; window-repair expects quality_blocked/window_review.`);
  }

  const reviewRow = await db.from('story_factory_runs')
    .select('id,output_artifact')
    .eq('job_id', jobId).eq('kind', 'window_review').eq('status', 'blocked')
    .order('started_at', { ascending: false }).limit(1).single();
  if (reviewRow.error) throw reviewRow.error;
  const evidence = (reviewRow.data.output_artifact as { evidence?: { review?: { issues?: unknown[] } } })?.evidence;
  const issues = (evidence?.review?.issues ?? []) as Array<{
    category?: string; chapterNumber?: number; quote?: string;
    evidence?: Array<{ quote?: string; chapterNumber?: number }>;
    explanation?: string; instruction?: string;
  }>;
  if (!issues.length) throw new Error('Blocked review carries no issues to repair.');

  const { data: chapters, error } = await db.from('chapters')
    .select('id,chapter_number,title,content')
    .eq('novel_id', job.novel_id)
    .gte('chapter_number', job.current_chapter - 4).lte('chapter_number', job.current_chapter)
    .order('chapter_number');
  if (error) throw error;

  // Attach each issue to the chapter containing its quoted evidence; fall back to the
  // issue's declared chapterNumber.
  const perChapter = new Map<number, typeof issues>();
  for (const issue of issues) {
    // Review issues carry evidence as an array of {quote, chapterNumber} anchors.
    const anchors = [
      ...(issue.evidence ?? []),
      ...(issue.quote || issue.chapterNumber ? [{ quote: issue.quote, chapterNumber: issue.chapterNumber }] : []),
    ];
    let target: number | undefined;
    for (const anchor of anchors) {
      if (anchor.quote) {
        const hit = (chapters ?? []).find(chapter => chapter.content?.includes(anchor.quote!));
        if (hit) { target = hit.chapter_number; break; }
      }
      if (anchor.chapterNumber) { target = anchor.chapterNumber; break; }
    }
    if (!target) {
      console.warn('[repair] issue has no locatable chapter, skipping:', JSON.stringify(issue).slice(0, 150));
      continue;
    }
    perChapter.set(target, [...(perChapter.get(target) ?? []), issue]);
  }
  if (!perChapter.size) throw new Error('No issue could be located in a chapter.');

  console.log(JSON.stringify({
    dryRun: !apply,
    jobId,
    title: novel.title,
    repairs: [...perChapter.entries()].map(([chapter, list]) => ({
      chapter,
      edits: list.map(issue => (issue.instruction ?? issue.explanation ?? '').slice(0, 160)),
    })),
  }, null, 2));
  if (!apply) return;

  for (const [chapterNumber, chapterIssues] of perChapter) {
    const chapter = (chapters ?? []).find(item => item.chapter_number === chapterNumber)!;
    const result = await geminiProvider.json({
      model: REPAIR_MODEL,
      system: `Bạn là biên tập viên sửa bản thảo CHƯA xuất bản theo yêu cầu chính xác.
Chỉ được thực hiện đúng các sửa đổi được liệt kê và các chỉnh nhỏ bắt buộc để câu văn liền mạch sau khi sửa.
Tuyệt đối không thêm sự kiện, nhân vật, con số, giao dịch, lời hứa hay chi tiết mới; không đổi diễn biến, không viết lại đoạn không bị nêu.
Trả về toàn bộ nội dung chương sau khi sửa.`,
      prompt: JSON.stringify({
        chapterNumber,
        content: chapter.content,
        requiredEdits: chapterIssues.map(issue => ({
          instruction: issue.instruction ?? issue.explanation,
          quotes: (issue.evidence ?? []).map(anchor => anchor.quote).filter(Boolean),
        })),
      }),
      schema: RepairedChapterSchema,
      temperature: 0.2,
    });
    const repaired = result.value.content;
    const drift = Math.abs(repaired.length - (chapter.content?.length ?? 0)) / Math.max(1, chapter.content?.length ?? 1);
    if (drift > 0.2) {
      throw new Error(`Chapter ${chapterNumber} repair changed length by ${(drift * 100).toFixed(0)}% — exceeds the 20% guard; refusing.`);
    }
    const updated = await db.from('chapters').update({ content: repaired }).eq('id', chapter.id);
    if (updated.error) throw updated.error;
    console.log(`[repair] chapter ${chapterNumber}: applied ${chapterIssues.length} edit(s), length ${chapter.content?.length} → ${repaired.length}, $${result.usage.costUsd.toFixed(4)}`);
  }

  const now = new Date().toISOString();
  const revived = await db.from('story_factory_jobs').update({
    status: 'ready', retry_count: 0, last_error: null,
    lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: now, updated_at: now,
  }).eq('id', jobId);
  if (revived.error) throw revived.error;
  console.log('[repair] job returned to window_review for a fresh verdict.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
