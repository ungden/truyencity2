/**
 * Operator CLI for the serial engine.
 *
 *   npm run serial:operator -- status
 *   npm run serial:operator -- seed --premise=factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json --apply
 *   npm run serial:operator -- read --job-id=<id> --chapter=1
 *   npm run serial:operator -- approve --job-id=<id> --apply
 *   npm run serial:operator -- restart-opening --job-id=<id> --apply
 *   npm run serial:operator -- release --job-id=<id> --apply
 *   npm run serial:operator -- reroute --job-id=<id> --apply
 *   npm run serial:operator -- pause|resume --job-id=<id> --apply
 *
 * Every mutating command is a dry run without --apply. `approve` handles the two launch
 * gates: first the premise, then the four private opening chapters.
 */
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { assertSerialLaunchable, PremiseSchema } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { seedBible } from '@/services/serial/state';
import { runSerialTicks, TICK_BUDGET_MS } from '@/services/serial/runtime';

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
  assertSerialLaunchable(premise);
  const slug = value('slug') ?? slugify(premise.title);
  console.log(JSON.stringify({
    dryRun: !apply, title: premise.title, slug, lane: premise.lane,
    goldenFinger: premise.goldenFinger.name, cast: premise.castSeed.length,
    worlds: premise.worldKernel.worlds.map(world => world.name),
    progressionSystems: premise.worldKernel.progressionSystems.length,
    openingContract: premise.worldKernel.openingContract.map(item => item.chapterNumber),
    routes: DEFAULT_SERIAL_ROUTES.routeVersion,
  }, null, 2));
  if (!apply) return;

  const existing = await db.from('novels').select('id,title').eq('slug', slug).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    throw new Error(`Slug ${slug} already belongs to ${existing.data.title} (${existing.data.id}); seed is intentionally idempotent.`);
  }

  // The novel starts hidden. It becomes visible only when an operator releases it.
  const novel = await db.from('novels').insert({
    title: premise.title,
    slug,
    description: premise.presentation.shortDescription,
    cover_url: premise.presentation.coverPath,
    genres: premise.presentation.tags,
    hidden: true,
    status: 'Đang ra',
  }).select('id').single();
  if (novel.error) throw novel.error;

  const bible = seedBible({ premise });

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
    next: `Read the premise, then: npm run serial:operator -- approve --job-id=${job.data.id} --apply`,
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
  const job = await db.from('serial_jobs')
    .select('serial_novel_id,status,current_chapter').eq('id', jobId).single();
  if (job.error) throw job.error;
  if (label === 'resume') {
    if (job.data.status !== 'paused') {
      throw new Error('resume requires a paused job; it cannot bypass a review gate.');
    }
    console.log(JSON.stringify({ dryRun: !apply, command: label, jobId }, null, 2));
    if (!apply) return;
    const { data, error } = await db.rpc('resume_serial_job', { p_job_id: jobId });
    if (error) throw error;
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const patch: Record<string, unknown> = {
    status: next, lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
  };
  if (label === 'approve') {
    const approval = job.data.status === 'awaiting_approval'
      ? {
          gate: 'premise',
          patch: { approved_at: new Date().toISOString(), approved_by: process.env.USER ?? 'operator', updated_at: new Date().toISOString() },
        }
      : job.data.status === 'opening_review' && job.data.current_chapter === 4
        ? {
            gate: 'opening',
            patch: { opening_reviewed_at: new Date().toISOString(), opening_reviewed_by: process.env.USER ?? 'operator', updated_at: new Date().toISOString() },
          }
        : null;
    if (!approval) throw new Error('approve requires a job awaiting premise approval or chapter-four opening review.');
    const novel = await db.from('serial_novels').select('premise').eq('id', job.data.serial_novel_id).single();
    if (novel.error) throw novel.error;
    assertSerialLaunchable(PremiseSchema.parse(novel.data.premise));
    console.log(JSON.stringify({ dryRun: !apply, command: label, gate: approval.gate, jobId }, null, 2));
    if (!apply) return;
    const approved = await db.from('serial_novels').update(approval.patch).eq('id', job.data.serial_novel_id);
    if (approved.error) throw approved.error;
  } else {
    if (label === 'pause' && ['awaiting_approval', 'opening_review'].includes(job.data.status)) {
      throw new Error('pause cannot replace a premise or opening review gate.');
    }
    console.log(JSON.stringify({ dryRun: !apply, command: label, jobId }, null, 2));
    if (!apply) return;
  }
  const { error } = await db.from('serial_jobs').update(patch).eq('id', jobId);
  if (error) throw error;
  console.log(`${label}: ok`);
}

async function launchAction(kind: 'restart-opening' | 'release'): Promise<void> {
  const jobId = value('job-id');
  if (!jobId) throw new Error(`${kind} requires --job-id`);
  console.log(JSON.stringify({ dryRun: !apply, command: kind, jobId }, null, 2));
  if (!apply) return;
  const fn = kind === 'restart-opening' ? 'restart_serial_opening' : 'release_serial_novel';
  const args = kind === 'restart-opening'
    ? { p_job_id: jobId, p_reason: value('reason') ?? 'Opening rejected by human review.' }
    : { p_job_id: jobId };
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function tick(): Promise<void> {
  const budgetMs = Number(value('budget-ms') ?? TICK_BUDGET_MS);
  if (!Number.isInteger(budgetMs) || budgetMs < 1_000 || budgetMs > 900_000) {
    throw new Error('tick --budget-ms must be an integer from 1000 to 900000.');
  }
  console.log(JSON.stringify({ dryRun: !apply, command: 'tick', budgetMs }, null, 2));
  if (!apply) return;
  const result = await runSerialTicks({ db, budgetMs, owner: `serial-operator-${process.pid}` });
  console.log(JSON.stringify(result, null, 2));
}

async function reroute(): Promise<void> {
  const jobId = value('job-id');
  if (!jobId) throw new Error('reroute requires --job-id');
  const job = await db.from('serial_jobs')
    .select('serial_novel_id,current_chapter,current_cycle_id,status').eq('id', jobId).single();
  if (job.error) throw job.error;
  if (job.data.current_chapter !== 0) {
    throw new Error('reroute is allowed only before chapter 1.');
  }
  console.log(JSON.stringify({
    dryRun: !apply, command: 'reroute', jobId,
    routeVersion: DEFAULT_SERIAL_ROUTES.routeVersion,
    routes: DEFAULT_SERIAL_ROUTES,
  }, null, 2));
  if (!apply) return;
  const updated = await db.from('serial_novels').update({
    routes: DEFAULT_SERIAL_ROUTES,
    route_version: DEFAULT_SERIAL_ROUTES.routeVersion,
    prompt_version: SERIAL_PROMPT_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', job.data.serial_novel_id);
  if (updated.error) throw updated.error;
  const cleared = await db.from('serial_jobs').update({
    last_error: null, retry_count: 0, next_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', jobId);
  if (cleared.error) throw cleared.error;
  console.log('reroute: ok');
}

async function setDailyTarget(): Promise<void> {
  const jobId = value('job-id');
  const dailyTarget = Number(value('daily-target'));
  if (!jobId) throw new Error('quota requires --job-id');
  if (!Number.isInteger(dailyTarget) || dailyTarget < 1 || dailyTarget > 12) {
    throw new Error('quota --daily-target must be an integer from 1 to 12.');
  }
  console.log(JSON.stringify({ dryRun: !apply, command: 'quota', jobId, dailyTarget }, null, 2));
  if (!apply) return;
  const { error } = await db.from('serial_jobs').update({
    daily_target: dailyTarget, next_run_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', jobId).neq('status', 'running');
  if (error) throw error;
  console.log('quota: ok');
}

async function main(): Promise<void> {
  switch (command) {
    case 'status': return status();
    case 'seed': return seed();
    case 'read': return read();
    case 'approve': return setStatus('ready', 'approve');
    case 'restart-opening': return launchAction('restart-opening');
    case 'release': return launchAction('release');
    case 'tick': return tick();
    case 'reroute': return reroute();
    case 'quota': return setDailyTarget();
    case 'pause': return setStatus('paused', 'pause');
    case 'resume': return setStatus('ready', 'resume');
    default:
      console.error('Commands: status | seed | read | approve | restart-opening | release | reroute | quota | tick | pause | resume');
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
