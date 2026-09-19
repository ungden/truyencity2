/**
 * Operator CLI for the serial engine.
 *
 *   npm run serial:operator -- status
 *   npm run serial:operator -- seed --premise=factory/serial/he-thong-tham-dinh.json --apply
 *   npm run serial:operator -- read --job-id=<id> --chapter=1
 *   npm run serial:operator -- approve --job-id=<id> --apply
 *   npm run serial:operator -- pause|resume --job-id=<id> --apply
 *
 * Every mutating command is a dry run without --apply. `approve` is the one human gate
 * in the whole system: nobody can claim a job until someone has read the premise and the
 * first chapters and said yes.
 */
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PremiseSchema } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { seedBible } from '@/services/serial/state';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const command = process.argv[2];
const apply = process.argv.includes('--apply');
const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const db = createClient(url, key);

const slugify = (title: string): string =>
  title.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function status(): Promise<void> {
  const { data, error } = await db.from('serial_jobs')
    .select('id,status,stage,current_chapter,chapters_today,daily_target,consecutive_replans,last_error,novel_id,serial_novel_id,novels(title,hidden)')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  for (const job of rows) {
    const novel = Array.isArray(job.novels) ? job.novels[0] : job.novels;
    const { data: health } = await db.from('serial_runs')
      .select('scorecard_avg,cost_usd')
      .eq('serial_novel_id', job.serial_novel_id).eq('kind', 'chapter')
      .not('scorecard_avg', 'is', null)
      .order('started_at', { ascending: false }).limit(10);
    const scores = (health ?? []).map(run => Number(run.scorecard_avg));
    const average = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '—';
    const spend = (health ?? []).reduce((sum, run) => sum + Number(run.cost_usd ?? 0), 0);
    console.log(JSON.stringify({
      jobId: job.id,
      title: novel?.title,
      hidden: novel?.hidden,
      status: job.status,
      stage: job.stage,
      chapter: job.current_chapter,
      today: `${job.chapters_today}/${job.daily_target}`,
      replans: job.consecutive_replans,
      // The dashboard number: how the last ten chapters read, not how many are blocked.
      readingScore: average,
      last10Usd: Number(spend.toFixed(3)),
      lastError: job.last_error,
    }, null, 1));
  }
  if (rows.length === 0) console.log('No serial jobs yet.');
}

async function seed(): Promise<void> {
  const premisePath = value('premise');
  if (!premisePath) throw new Error('seed requires --premise=<file.json>');
  const premise = PremiseSchema.parse(JSON.parse(readFileSync(premisePath, 'utf8')));
  const slug = value('slug') ?? slugify(premise.title);
  const startLocationId = value('start-location') ?? 'noi_bat_dau';

  console.log(JSON.stringify({
    dryRun: !apply, title: premise.title, slug, lane: premise.lane,
    goldenFinger: premise.goldenFinger.name, cast: premise.castSeed.length,
    routes: DEFAULT_SERIAL_ROUTES.routeVersion,
  }, null, 2));
  if (!apply) return;

  // The novel starts hidden. It becomes visible only when an operator releases it.
  const novel = await db.from('novels').insert({
    title: premise.title,
    slug,
    description: premise.blurb,
    genres: [premise.lane],
    hidden: true,
    status: 'Đang ra',
  }).select('id').single();
  if (novel.error) throw novel.error;

  const bible = seedBible({
    premise, startLocationId,
    startLocationNote: value('start-note') ?? premise.arena,
  });

  const serialNovel = await db.from('serial_novels').insert({
    novel_id: novel.data.id,
    premise, bible,
    routes: DEFAULT_SERIAL_ROUTES,
    route_version: DEFAULT_SERIAL_ROUTES.routeVersion,
    prompt_version: SERIAL_PROMPT_VERSION,
  }).select('id').single();
  if (serialNovel.error) {
    await db.from('novels').delete().eq('id', novel.data.id);
    throw serialNovel.error;
  }

  const job = await db.from('serial_jobs').insert({
    serial_novel_id: serialNovel.data.id,
    novel_id: novel.data.id,
    status: 'awaiting_approval',
    stage: 'plan_cycle',
    daily_target: Number(value('daily-target') ?? 3),
  }).select('id').single();
  if (job.error) throw job.error;

  console.log(JSON.stringify({
    novelId: novel.data.id, serialNovelId: serialNovel.data.id, jobId: job.data.id,
    next: `Read the premise, then: serial:operator -- approve --job-id=${job.data.id} --apply`,
  }, null, 2));
}

async function read(): Promise<void> {
  const jobId = value('job-id');
  const chapter = Number(value('chapter') ?? 1);
  if (!jobId) throw new Error('read requires --job-id');
  const job = await db.from('serial_jobs').select('novel_id').eq('id', jobId).single();
  if (job.error) throw job.error;
  const { data, error } = await db.from('chapters')
    .select('chapter_number,title,content,publication_state')
    .eq('novel_id', job.data.novel_id).eq('chapter_number', chapter).maybeSingle();
  if (error) throw error;
  if (!data) {
    console.log(`Chapter ${chapter} has not been written yet.`);
    return;
  }
  console.log(`\n[${data.publication_state}] Chương ${data.chapter_number}: ${data.title}\n`);
  console.log(data.content);
}

async function setStatus(next: 'ready' | 'paused', label: string): Promise<void> {
  const jobId = value('job-id');
  if (!jobId) throw new Error(`${label} requires --job-id`);
  const patch: Record<string, unknown> = {
    status: next, lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
  };
  if (label === 'approve') {
    const job = await db.from('serial_jobs').select('serial_novel_id').eq('id', jobId).single();
    if (job.error) throw job.error;
    console.log(JSON.stringify({ dryRun: !apply, command: label, jobId }, null, 2));
    if (!apply) return;
    const approved = await db.from('serial_novels').update({
      approved_at: new Date().toISOString(),
      approved_by: process.env.USER ?? 'operator',
      updated_at: new Date().toISOString(),
    }).eq('id', job.data.serial_novel_id);
    if (approved.error) throw approved.error;
  } else {
    console.log(JSON.stringify({ dryRun: !apply, command: label, jobId }, null, 2));
    if (!apply) return;
  }
  const { error } = await db.from('serial_jobs').update(patch).eq('id', jobId);
  if (error) throw error;
  console.log(`${label}: ok`);
}

async function main(): Promise<void> {
  switch (command) {
    case 'status': return status();
    case 'seed': return seed();
    case 'read': return read();
    case 'approve': return setStatus('ready', 'approve');
    case 'pause': return setStatus('paused', 'pause');
    case 'resume': return setStatus('ready', 'resume');
    default:
      console.error('Commands: status | seed | read | approve | pause | resume');
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
