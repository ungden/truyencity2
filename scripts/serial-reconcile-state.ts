/**
 * Rebuild a paused serial's Bible and cycle checkpoints from its latest digests.
 *
 * Dry-run is the default. The only repair performed is deterministic: when a
 * digest advances the golden finger, every asset progression backed by that
 * exact rung list advances in the same digest. No prose or publication changes.
 *
 * npm run serial:reconcile-state -- --serial-id=<uuid>
 * npm run serial:reconcile-state -- --serial-id=<uuid> --apply
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  ChapterDigestSchema, PremiseSchema, type ChapterDigest, type Premise,
} from '@/services/serial/contracts';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { rebuildBibleFromDigests, seedBible } from '@/services/serial/state';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const serialId = process.argv.find(item => item.startsWith('--serial-id='))?.split('=').slice(1).join('=');
const apply = process.argv.includes('--apply');
if (!serialId || !z.string().uuid().safeParse(serialId).success) {
  throw new Error('--serial-id=<uuid> is required.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase runtime credentials are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function progressionAssets(premise: Premise): Array<{ subjectId: string; systemId: string; trackId: string | null }> {
  const rungIds = premise.goldenFinger.evolution.map(rung => rung.id).join('|');
  return premise.worldKernel.progressionSubjects
    .filter(subject => subject.kind === 'asset')
    .flatMap(subject => subject.startingProgressions.flatMap(initial => {
      const system = premise.worldKernel.progressionSystems.find(item => item.id === initial.systemId);
      return system?.ranks.map(rank => rank.id).join('|') === rungIds
        ? [{ subjectId: subject.id, systemId: initial.systemId, trackId: initial.trackId }]
        : [];
    }));
}

function repairDigest(premise: Premise, digest: ChapterDigest): { digest: ChapterDigest; repaired: string[] } {
  const rung = digest.coreChanges.goldenFingerRungChange?.toRungId;
  if (!rung) return { digest, repaired: [] };
  const repaired: string[] = [];
  const progressionChanges = [...digest.coreChanges.progressionChanges];
  for (const asset of progressionAssets(premise)) {
    const existing = progressionChanges.find(change => change.subjectId === asset.subjectId
      && change.systemId === asset.systemId && change.trackId === asset.trackId);
    if (existing) {
      if (existing.toRankId !== rung) {
        throw new Error(`Chapter ${digest.chapterNumber} advances ${asset.subjectId} to ${existing.toRankId}, not ${rung}.`);
      }
      continue;
    }
    progressionChanges.push({
      ...asset,
      toRankId: rung,
      toMinorStageId: null,
      why: `Đồng bộ cấp tài sản với nấc kim thủ chỉ ${rung} đã được xác nhận trong chương.`,
    });
    repaired.push(`${asset.subjectId}:${asset.systemId}->${rung}`);
  }
  return {
    digest: ChapterDigestSchema.parse({
      ...digest,
      coreChanges: { ...digest.coreChanges, progressionChanges },
    }),
    repaired,
  };
}

async function main(): Promise<void> {
  const [serialResult, jobResult, cycleResult] = await Promise.all([
    db.from('serial_novels').select('id,premise').eq('id', serialId).single(),
    db.from('serial_jobs').select('id,status,current_chapter,lease_owner,lease_token')
      .eq('serial_novel_id', serialId).single(),
    db.from('serial_cycles').select('id,start_chapter').eq('serial_novel_id', serialId),
  ]);
  if (serialResult.error) throw serialResult.error;
  if (jobResult.error) throw jobResult.error;
  if (cycleResult.error) throw cycleResult.error;
  if (jobResult.data.status !== 'paused' || jobResult.data.lease_owner || jobResult.data.lease_token) {
    throw new Error('State reconciliation requires a paused, unleased serial job.');
  }
  const premise = PremiseSchema.parse(serialResult.data.premise);
  const throughChapter = Number(jobResult.data.current_chapter);
  const runsResult = await db.from('serial_runs').select('id,chapter_number,digest,finished_at')
    .eq('serial_novel_id', serialId).eq('kind', 'chapter')
    .in('status', ['committed', 'published']).not('digest', 'is', null)
    .gte('chapter_number', 1).lte('chapter_number', throughChapter)
    .order('finished_at', { ascending: false });
  if (runsResult.error) throw runsResult.error;

  const latest = new Map<number, { id: string; digest: ChapterDigest }>();
  for (const row of runsResult.data ?? []) {
    if (!latest.has(row.chapter_number)) {
      latest.set(row.chapter_number, { id: row.id, digest: ChapterDigestSchema.parse(row.digest) });
    }
  }
  const repaired = [...latest.entries()].map(([chapterNumber, row]) => {
    const result = repairDigest(premise, row.digest);
    return { chapterNumber, runId: row.id, ...result };
  });
  const digests = repaired.map(item => item.digest);
  const bible = rebuildBibleFromDigests({ premise, digests, throughChapter });
  const checkpoints = (cycleResult.data ?? []).map(cycle => ({
    id: cycle.id,
    startChapter: Number(cycle.start_chapter),
    bible: Number(cycle.start_chapter) === 1
      ? seedBible({ premise })
      : rebuildBibleFromDigests({ premise, digests, throughChapter: Number(cycle.start_chapter) - 1 }),
  }));
  const summary = {
    apply,
    serialId,
    throughChapter,
    repaired: repaired.filter(item => item.repaired.length > 0)
      .map(item => ({ chapterNumber: item.chapterNumber, changes: item.repaired })),
    checkpoints: checkpoints.map(item => ({ startChapter: item.startChapter, chapterNumber: item.bible.symbolicCore.chapterNumber })),
    finalRung: bible.symbolicCore.mc.goldenFingerRungId,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) return;

  for (const item of repaired.filter(row => row.repaired.length > 0)) {
    const update = await db.from('serial_runs').update({ digest: item.digest }).eq('id', item.runId);
    if (update.error) throw update.error;
  }
  for (const checkpoint of checkpoints) {
    const update = await db.from('serial_cycles').update({
      checkpoint_bible: checkpoint.bible,
      updated_at: new Date().toISOString(),
    }).eq('id', checkpoint.id);
    if (update.error) throw update.error;
  }
  const serialUpdate = await db.from('serial_novels').update({
    bible,
    prompt_version: SERIAL_PROMPT_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', serialId);
  if (serialUpdate.error) throw serialUpdate.error;
  console.log('State reconciliation applied. No prose or publication row was changed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
