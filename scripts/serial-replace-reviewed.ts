/**
 * Replace the first ten public Song Xuyen chapters with a fully reviewed private run.
 *
 * The existing revision RPC stores every public byte before replacement. This script
 * additionally backs up the paused production state, removes superseded private work
 * after chapter ten, and aligns premise/Bible/cycle/run state with the reviewed prose.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  BibleSchema,
  ChapterDigestSchema,
  CyclePlanSchema,
  JudgeVerdictSchema,
  PremiseSchema,
  scorecardAverage,
} from '@/services/serial/contracts';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { seedBible } from '@/services/serial/state';
import { NarrativeReviewSchema } from '@/services/narrative/foundation';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const apply = process.argv.includes('--apply');
const backupPath = process.argv.find(arg => arg.startsWith('--backup='))?.slice('--backup='.length)
  ?? `factory/serial/song-xuyen/private/backups/${new Date().toISOString().replaceAll(':', '-')}-before-reviewed-replacement.json`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const projectUrl = url;
const db = createClient(projectUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });

const configs = [
  {
    key: 'mat-the',
    serialNovelId: '67265a0f-9270-486b-b296-9d158f0821b3',
    novelId: '8c67e4bd-86fa-426e-9169-c71cf7ae7236',
    runDir: 'factory/serial/song-xuyen/private/runs/cua-hang-cong-phap-v4-ch01-10',
    publicTitle: 'Song Xuyên Mạt Thế: Cửa Hàng Của Ta Bán Công Pháp Tu Tiên',
  },
  {
    key: 'rau-tuoi',
    serialNovelId: 'b47b6510-182b-4b64-96e1-c4ead89dc477',
    novelId: '67408d38-65fb-4bf6-9351-a63006bf1913',
    runDir: 'factory/serial/song-xuyen/private/runs/song-xuyen-tuong-lai-v4c-ch01-10',
    publicTitle: 'Song Xuyên Tương Lai: Từ Một Lưỡi Dao Đến Công Ty Công Nghệ',
  },
] as const;

const LiteraryArtifactSchema = z.object({
  review: NarrativeReviewSchema,
  gate: z.object({
    upstreamFindings: z.array(z.unknown()),
    blockingProseFindings: z.array(z.unknown()),
    mayPublish: z.literal(true),
  }),
  usage: z.unknown(),
});

type LiveChapter = {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  publication_state: string;
  published_at: string | null;
};

type LoadedBook = ReturnType<typeof loadLocalBook> & {
  config: typeof configs[number];
  live: Awaited<ReturnType<typeof readLiveBook>>;
};

function json(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function comparableTitle(title: string): string {
  return title.trim().replace(/^[\"“”]+|[\"“”]+$/g, '').trim();
}

function loadLocalBook(config: typeof configs[number]) {
  const premise = PremiseSchema.parse(json(join(config.runDir, 'premise.json')));
  const bible = BibleSchema.parse(json(join(config.runDir, 'bible.json')));
  const literary = LiteraryArtifactSchema.parse(json(join(config.runDir, 'literary-review.json')));
  if (premise.schemaVersion !== 3 || bible.symbolicCore.chapterNumber !== 10) {
    throw new Error(`${config.key}: private run is not a completed v3 chapter-10 state.`);
  }
  if (literary.review.findings.length || literary.gate.upstreamFindings.length
      || literary.gate.blockingProseFindings.length) {
    throw new Error(`${config.key}: literary review is not clean.`);
  }
  const plans = readdirSync(config.runDir)
    .filter(file => /^cycle-1(?:-from-\d+)?\.json$/.test(file))
    .map(file => CyclePlanSchema.parse(json(join(config.runDir, file))))
    .sort((left, right) => {
      const leftChapter = left.beatSheets.at(0)?.chapterNumber ?? left.startChapter;
      const rightChapter = right.beatSheets.at(0)?.chapterNumber ?? right.startChapter;
      return leftChapter - rightChapter;
    });
  if (!plans.length || plans.at(-1)?.plannedEndChapter !== 10) {
    throw new Error(`${config.key}: private run has no complete cycle-one plan history.`);
  }
  const chapters = Array.from({ length: 10 }, (_, index) => {
    const chapterNumber = index + 1;
    const stem = `chapter-${String(chapterNumber).padStart(3, '0')}`;
    const markdown = readFileSync(join(config.runDir, `${stem}.md`), 'utf8');
    const [heading = '', ...body] = markdown.split(/\r?\n/);
    const artifact = z.object({
      verdict: JudgeVerdictSchema,
      digest: ChapterDigestSchema,
      attempts: z.number().int().positive(),
      costUsd: z.number().nonnegative(),
    }).parse(json(join(config.runDir, `${stem}.verdict.json`)));
    const title = heading.replace(/^#\s*/, '').trim();
    const content = body.join('\n').trim();
    if (artifact.digest.chapterNumber !== chapterNumber
        || comparableTitle(artifact.digest.title) !== comparableTitle(title)) {
      throw new Error(`${config.key}: chapter ${chapterNumber} artifact does not match prose.`);
    }
    for (const evidence of artifact.digest.narrativeEvidence) {
      if (!content.includes(evidence.quote)) throw new Error(
        `${config.key}: chapter ${chapterNumber} lost evidence ${evidence.id}.`,
      );
    }
    return { chapterNumber, title, content, ...artifact };
  });
  const snapshot = chapters.map(({ chapterNumber, title, content }) => ({ chapterNumber, title, content }));
  const fingerprint = createHash('sha256').update(JSON.stringify(
    snapshot.map(chapter => [chapter.chapterNumber, chapter.title, chapter.content]),
  )).digest('hex');
  return { premise, bible, literary, plans, chapters, snapshot, fingerprint };
}

async function readLiveBook(client: SupabaseClient, config: typeof configs[number]) {
  const [novel, serial, job, chapters, cycles, runs] = await Promise.all([
    client.from('novels').select('*').eq('id', config.novelId).single(),
    client.from('serial_novels').select('*').eq('id', config.serialNovelId).single(),
    client.from('serial_jobs').select('*').eq('serial_novel_id', config.serialNovelId).single(),
    client.from('chapters').select('id,chapter_number,title,content,publication_state,published_at,updated_at')
      .eq('novel_id', config.novelId).order('chapter_number'),
    client.from('serial_cycles').select('*').eq('serial_novel_id', config.serialNovelId).order('cycle_number'),
    client.from('serial_runs').select('*').eq('serial_novel_id', config.serialNovelId)
      .order('finished_at', { ascending: false }),
  ]);
  for (const result of [novel, serial, job, chapters, cycles, runs]) {
    if (result.error) throw result.error;
  }
  return {
    novel: novel.data,
    serial: serial.data,
    job: job.data,
    chapters: chapters.data as LiveChapter[],
    cycles: cycles.data ?? [],
    runs: runs.data ?? [],
  };
}

function verifyPreconditions(book: LoadedBook): 'old' | 'new' {
  const { config, chapters } = book;
  const { job } = book.live;
  if (job.status !== 'paused' || job.lease_owner || job.lease_token || job.lease_until) {
    throw new Error(`${config.key}: serial job must be paused with no lease.`);
  }
  const publicTen = book.live.chapters.filter(chapter => chapter.chapter_number <= 10);
  if (publicTen.length !== 10 || publicTen.some(chapter => chapter.publication_state !== 'published')) {
    throw new Error(`${config.key}: expected exactly ten published source chapters.`);
  }
  const matches = publicTen.map(live => {
    const replacement = chapters.find(chapter => chapter.chapterNumber === live.chapter_number)!;
    return live.title === replacement.title && live.content === replacement.content;
  });
  if (matches.every(Boolean)) return 'new';
  if (matches.some(Boolean)) throw new Error(`${config.key}: live chapters are a partial replacement.`);
  const extraPublic = book.live.chapters.filter(chapter =>
    chapter.chapter_number > 10 && chapter.publication_state === 'published');
  if (extraPublic.length) throw new Error(`${config.key}: published chapters exist after chapter ten.`);
  const extraDrafts = book.live.chapters.filter(chapter =>
    chapter.chapter_number > 10 && chapter.publication_state === 'draft');
  if (extraDrafts.some(chapter => chapter.chapter_number !== 11) || extraDrafts.length > 1) {
    throw new Error(`${config.key}: unexpected private chapters exist after chapter ten.`);
  }
  return 'old';
}

async function applyBook(client: SupabaseClient, book: LoadedBook): Promise<void> {
  const { config, chapters, premise, bible, literary, plans, snapshot, fingerprint } = book;
  const sourceState = verifyPreconditions(book);
  const publicTen = book.live.chapters.filter(chapter => chapter.chapter_number <= 10);
  if (sourceState === 'old') {
    const revisions = chapters.map(replacement => {
      const live = publicTen.find(chapter => chapter.chapter_number === replacement.chapterNumber)!;
      return {
        chapterId: live.id,
        chapterNumber: replacement.chapterNumber,
        oldTitle: live.title,
        oldContent: live.content,
        newTitle: replacement.title,
        newContent: replacement.content,
        review: { chapter: replacement.verdict, sequence: literary.review },
        direction: { source: basename(config.runDir), policy: 'lived-causality-v3' },
        usage: [],
        costUsd: replacement.costUsd,
      };
    });
    const revised = await client.rpc('apply_serial_editorial_revisions', {
      p_serial_novel_id: config.serialNovelId,
      p_revisions: revisions,
      p_reason: 'Replace public chapters 1-10 with the user-approved lived-causality sequence.',
      p_model: 'gpt-5.6-terra',
      p_prompt_version: SERIAL_PROMPT_VERSION,
    });
    if (revised.error) throw revised.error;
  }

  const laterRuns = await client.from('serial_runs').update({
    status: 'replanned',
    error: 'Superseded by the approved v3 rewrite of chapters 1-10.',
    finished_at: new Date().toISOString(),
  }).eq('serial_novel_id', config.serialNovelId).gt('chapter_number', 10)
    .in('status', ['running', 'committed']);
  if (laterRuns.error) throw laterRuns.error;
  const laterChapters = await client.from('chapters').delete()
    .eq('novel_id', config.novelId).gt('chapter_number', 10).eq('publication_state', 'draft');
  if (laterChapters.error) throw laterChapters.error;
  const laterCycles = await client.from('serial_cycles').delete()
    .eq('serial_novel_id', config.serialNovelId).gt('cycle_number', 1);
  if (laterCycles.error) throw laterCycles.error;

  const cycleOne = book.live.cycles.find((cycle: { cycle_number: number }) => cycle.cycle_number === 1);
  if (!cycleOne) throw new Error(`${config.key}: cycle one is missing.`);
  const cycleUpdate = await client.from('serial_cycles').update({
    volume_number: 1,
    start_chapter: 1,
    end_chapter: 10,
    plan: plans.at(-1),
    plan_history: plans,
    checkpoint_bible: seedBible({ premise }),
    status: 'published',
    narrative_review: literary.review,
    narrative_review_fingerprint: fingerprint,
    narrative_review_snapshot: snapshot,
    narrative_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', cycleOne.id);
  if (cycleUpdate.error) throw cycleUpdate.error;

  const serialUpdate = await client.from('serial_novels').update({
    premise,
    bible,
    prompt_version: SERIAL_PROMPT_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', config.serialNovelId);
  if (serialUpdate.error) throw serialUpdate.error;

  const jobUpdate = await client.from('serial_jobs').update({
    status: 'paused',
    stage: 'plan_cycle',
    current_chapter: 10,
    current_cycle_id: null,
    consecutive_replans: 0,
    retry_count: 0,
    lease_owner: null,
    lease_token: null,
    lease_until: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('serial_novel_id', config.serialNovelId);
  if (jobUpdate.error) throw jobUpdate.error;

  const novelUpdate = await client.from('novels').update({
    title: config.publicTitle,
    chapter_count: 10,
    total_chapters: 10,
    updated_at: new Date().toISOString(),
  }).eq('id', config.novelId);
  if (novelUpdate.error) throw novelUpdate.error;

  for (const replacement of chapters) {
    const existing = book.live.runs.find((run: { kind: string; chapter_number: number; status: string }) =>
      run.kind === 'chapter' && run.chapter_number === replacement.chapterNumber && run.status === 'published');
    if (!existing) throw new Error(`${config.key}: published run ${replacement.chapterNumber} is missing.`);
    const runUpdate = await client.from('serial_runs').update({
      cycle_id: cycleOne.id,
      verdict: replacement.verdict,
      digest: replacement.digest,
      scorecard_avg: scorecardAverage(replacement.verdict),
      attempts: replacement.attempts,
      usage: [],
      cost_usd: replacement.costUsd,
      route_version: 'serial-openai-2026-09-19.1',
      prompt_version: SERIAL_PROMPT_VERSION,
      error: null,
      finished_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (runUpdate.error) throw runUpdate.error;
  }
}

async function verifyApplied(client: SupabaseClient, local: ReturnType<typeof loadLocalBook>, config: typeof configs[number]) {
  const live = await readLiveBook(client, config);
  const publicChapters = live.chapters.filter(chapter => chapter.publication_state === 'published');
  if (publicChapters.length !== 10 || live.chapters.length !== 10) throw new Error(`${config.key}: chapter count readback failed.`);
  for (const chapter of publicChapters) {
    const expected = local.chapters.find(item => item.chapterNumber === chapter.chapter_number)!;
    if (chapter.title !== expected.title || chapter.content !== expected.content) {
      throw new Error(`${config.key}: chapter ${chapter.chapter_number} readback mismatch.`);
    }
  }
  const premise = PremiseSchema.parse(live.serial.premise);
  const bible = BibleSchema.parse(live.serial.bible);
  if (premise.schemaVersion !== 3 || bible.symbolicCore.chapterNumber !== 10) {
    throw new Error(`${config.key}: v3 state readback failed.`);
  }
  if (live.job.status !== 'paused' || live.job.current_chapter !== 10 || live.job.current_cycle_id) {
    throw new Error(`${config.key}: paused job readback failed.`);
  }
  if (live.cycles.length !== 1 || live.cycles[0].narrative_review_fingerprint !== local.fingerprint) {
    throw new Error(`${config.key}: reviewed cycle readback failed.`);
  }
  return {
    title: live.novel.title,
    slug: live.novel.slug,
    chapters: publicChapters.length,
    first: publicChapters[0].title,
    last: publicChapters.at(-1)?.title,
    job: { status: live.job.status, stage: live.job.stage, currentChapter: live.job.current_chapter },
    revisionRows: (await client.from('serial_chapter_revisions').select('id', { count: 'exact', head: true })
      .eq('serial_novel_id', config.serialNovelId)).count,
  };
}

async function main(): Promise<void> {
  const loaded: LoadedBook[] = [];
  for (const config of configs) {
    const local = loadLocalBook(config);
    const live = await readLiveBook(db, config);
    loaded.push({ config, ...local, live });
  }
  const preflight = loaded.map(book => ({
    book: book.config.key,
    sourceState: verifyPreconditions(book),
    liveChapters: book.live.chapters.map(chapter => ({
      chapterNumber: chapter.chapter_number,
      state: chapter.publication_state,
      title: chapter.title,
    })),
    replacementFingerprint: book.fingerprint,
  }));
  if (!apply) {
    console.log(JSON.stringify({ dryRun: true, project: new URL(projectUrl).hostname.split('.')[0], preflight }, null, 2));
    return;
  }

  if (existsSync(backupPath)) throw new Error(`Backup already exists: ${backupPath}`);
  mkdirSync(dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, `${JSON.stringify({
    createdAt: new Date().toISOString(),
    project: new URL(projectUrl).hostname.split('.')[0],
    books: loaded.map(book => ({ config: book.config, live: book.live })),
  }, null, 2)}\n`, 'utf8');

  for (const book of loaded) await applyBook(db, book);
  const readback = [];
  for (const config of configs) readback.push({ book: config.key, ...(await verifyApplied(db, loadLocalBook(config), config)) });
  console.log(JSON.stringify({ applied: true, backupPath, readback }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
