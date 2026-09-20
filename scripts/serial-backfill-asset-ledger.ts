/**
 * Backfill exact, human-reviewed asset events into historical serial digests.
 * Dry-run by default; never changes prose or publication state.
 *
 * npm run serial:backfill-assets -- --snapshot=<json>
 * npm run serial:backfill-assets -- --snapshot=<json> --apply
 */
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  AssetEventSchema, BibleSchema, ChapterDigestSchema, PremiseSchema, type ChapterDigest,
} from '@/services/serial/contracts';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { rebuildBibleFromDigests, seedBible } from '@/services/serial/state';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const snapshotPath = process.argv.find(item => item.startsWith('--snapshot='))?.split('=').slice(1).join('=');
const apply = process.argv.includes('--apply');
if (!snapshotPath) throw new Error('--snapshot=<json> is required.');

const SnapshotSchema = z.object({
  serialId: z.string().uuid(),
  throughChapter: z.number().int().min(1),
  replanCurrentCycle: z.boolean().default(false),
  chapters: z.array(z.object({
    chapterNumber: z.number().int().min(1),
    assetEvents: z.array(AssetEventSchema).max(24),
  }).strict()).min(1),
}).strict();
const snapshot = SnapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, 'utf8')));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase runtime credentials are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main(): Promise<void> {
  const [serialResult, jobResult, cyclesResult, runsResult] = await Promise.all([
    db.from('serial_novels').select('id,premise').eq('id', snapshot.serialId).single(),
    db.from('serial_jobs').select('status,current_chapter,lease_owner,lease_token')
      .eq('serial_novel_id', snapshot.serialId).single(),
    db.from('serial_cycles').select('id,start_chapter').eq('serial_novel_id', snapshot.serialId),
    db.from('serial_runs').select('id,chapter_number,digest,finished_at')
      .eq('serial_novel_id', snapshot.serialId).eq('kind', 'chapter')
      .in('status', ['committed', 'published']).not('digest', 'is', null)
      .gte('chapter_number', 1).order('finished_at', { ascending: false }),
  ]);
  if (serialResult.error) throw serialResult.error;
  if (jobResult.error) throw jobResult.error;
  if (cyclesResult.error) throw cyclesResult.error;
  if (runsResult.error) throw runsResult.error;
  if (jobResult.data.status !== 'paused' || jobResult.data.lease_owner || jobResult.data.lease_token) {
    throw new Error('Asset backfill requires a paused, unleased serial job.');
  }
  if (snapshot.throughChapter > Number(jobResult.data.current_chapter)) {
    throw new Error('Snapshot extends beyond the current serial state.');
  }

  const premise = PremiseSchema.parse(serialResult.data.premise);
  const eventMap = new Map(snapshot.chapters.map(chapter => [chapter.chapterNumber, chapter.assetEvents]));
  const latest = new Map<number, { id: string; digest: ChapterDigest }>();
  for (const row of runsResult.data ?? []) {
    if (row.chapter_number && !latest.has(row.chapter_number)) {
      latest.set(row.chapter_number, { id: row.id, digest: ChapterDigestSchema.parse(row.digest) });
    }
  }
  for (let chapter = 1; chapter <= Number(jobResult.data.current_chapter); chapter++) {
    if (!latest.has(chapter)) throw new Error(`Missing latest digest for chapter ${chapter}.`);
  }

  const patched = [...latest.entries()].map(([chapterNumber, row]) => ({
    chapterNumber,
    runId: row.id,
    digest: ChapterDigestSchema.parse({
      ...row.digest,
      coreChanges: {
        ...row.digest.coreChanges,
        assetEvents: eventMap.get(chapterNumber) ?? row.digest.coreChanges.assetEvents,
      },
    }),
  }));
  const digests = patched.map(row => row.digest);
  const liveBible = rebuildBibleFromDigests({
    premise,
    digests,
    throughChapter: Number(jobResult.data.current_chapter),
  });
  const checkpoints = (cyclesResult.data ?? []).map(cycle => ({
    id: cycle.id,
    startChapter: Number(cycle.start_chapter),
    bible: Number(cycle.start_chapter) === 1
      ? seedBible({ premise })
      : rebuildBibleFromDigests({ premise, digests, throughChapter: Number(cycle.start_chapter) - 1 }),
  }));
  console.log(JSON.stringify({
    apply,
    serialId: snapshot.serialId,
    patchedChapters: [...eventMap.keys()].sort((a, b) => a - b),
    liveChapter: liveBible.symbolicCore.chapterNumber,
    activeLots: liveBible.symbolicCore.activeAssetLots.map(lot => ({
      lotId: lot.lotId, asset: lot.assetName, owner: lot.ownerName, quantity: lot.quantity, unit: lot.unit,
    })),
    checkpoints: checkpoints.map(row => ({ startChapter: row.startChapter, activeLots: row.bible.symbolicCore.activeAssetLots.length })),
  }, null, 2));
  if (!apply) return;

  for (const row of patched.filter(item => eventMap.has(item.chapterNumber))) {
    const update = await db.from('serial_runs').update({ digest: row.digest }).eq('id', row.runId);
    if (update.error) throw update.error;
  }
  for (const row of checkpoints) {
    const update = await db.from('serial_cycles').update({
      checkpoint_bible: row.bible,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (update.error) throw update.error;
  }
  const serialUpdate = await db.from('serial_novels').update({
    bible: liveBible,
    prompt_version: SERIAL_PROMPT_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', snapshot.serialId);
  if (serialUpdate.error) throw serialUpdate.error;

  if (snapshot.replanCurrentCycle) {
    const jobUpdate = await db.from('serial_jobs').update({
      stage: 'plan_cycle',
      last_error: 'Sổ tài sản lịch sử đã được backfill; lập lại cycle hiện tại từ quyền sở hữu và số dư thật.',
      next_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('serial_novel_id', snapshot.serialId).eq('status', 'paused');
    if (jobUpdate.error) throw jobUpdate.error;
  }

  const [verifiedSerial, verifiedJob] = await Promise.all([
    db.from('serial_novels').select('bible,prompt_version').eq('id', snapshot.serialId).single(),
    db.from('serial_jobs').select('status,stage,current_chapter,lease_owner,lease_token,last_error')
      .eq('serial_novel_id', snapshot.serialId).single(),
  ]);
  if (verifiedSerial.error) throw verifiedSerial.error;
  if (verifiedJob.error) throw verifiedJob.error;
  const verifiedBible = BibleSchema.parse(verifiedSerial.data.bible);
  const expectedLots = liveBible.symbolicCore.activeAssetLots.map(lot => lot.lotId).sort();
  const actualLots = verifiedBible.symbolicCore.activeAssetLots.map(lot => lot.lotId).sort();
  if (JSON.stringify(expectedLots) !== JSON.stringify(actualLots)) {
    throw new Error('Production readback does not match the rebuilt asset ledger.');
  }
  console.log(JSON.stringify({
    verified: true,
    promptVersion: verifiedSerial.data.prompt_version,
    chapter: verifiedBible.symbolicCore.chapterNumber,
    activeLots: actualLots.length,
    job: verifiedJob.data,
    proseChanged: false,
    publicationChanged: false,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
