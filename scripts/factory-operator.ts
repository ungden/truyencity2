import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_MODEL_ROUTES,
  FIRST_30_PORTFOLIO,
  ModelRoutesSchema,
  ArcPlanSchema,
  RollingPlanSchema,
  StoryKernelSchema,
  StoryStateSchema,
  STORY_FACTORY_RELEASE,
  runStoryFactoryTick,
  validateKernelState,
  validateRollingPlan,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const args = process.argv.slice(2);
const command = args[0];
const apply = args.includes('--apply');
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

async function status() {
  const { data, error } = await db.from('story_factory_jobs').select(`
    *, ai_story_projects!story_factory_jobs_project_id_fkey(engine_release),
    novels!story_factory_jobs_novel_id_fkey(title,hidden,cover_url)
  `).order('updated_at', { ascending: false });
  if (error) throw error;
  console.log(JSON.stringify({ release: STORY_FACTORY_RELEASE, jobs: data }, null, 2));
}

async function seed() {
  const commissionPath = value('--commission');
  const researchPath = value('--research');
  const routesPath = value('--routes');
  if (!commissionPath || !researchPath) throw new Error('seed requires --commission and --research.');
  const commission = JSON.parse(readFileSync(path.resolve(commissionPath), 'utf8'));
  const research = JSON.parse(readFileSync(path.resolve(researchPath), 'utf8'));
  const routes = routesPath
    ? ModelRoutesSchema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')))
    : DEFAULT_MODEL_ROUTES;
  const slug = `factory-${commission.slotKey}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  console.log(JSON.stringify({ dryRun: !apply, command, release: STORY_FACTORY_RELEASE, commission, researchId: research.snapshotId, routes }, null, 2));
  if (!apply) return;
  const novelInsert = await db.from('novels').insert({
    title: `Đang chuẩn bị: ${commission.slotKey}`,
    slug,
    author: 'TruyenCity',
    description: 'Concept đang được Story Factory xây dựng.',
    genres: [commission.genreLane],
    hidden: true,
    status: 'Đang chuẩn bị',
  }).select('id').single();
  if (novelInsert.error) throw novelInsert.error;
  const novelId = novelInsert.data.id;
  const projectInsert = await db.from('ai_story_projects').insert({
    novel_id: novelId,
    genre: commission.genreLane,
    status: 'paused',
    current_chapter: 0,
    engine_release: STORY_FACTORY_RELEASE,
    model_routes: routes,
  }).select('id').single();
  if (projectInsert.error) {
    await db.from('novels').delete().eq('id', novelId);
    throw projectInsert.error;
  }
  const jobInsert = await db.from('story_factory_jobs').insert({
    project_id: projectInsert.data.id,
    novel_id: novelId,
    execution_mode: 'hidden_canary',
    status: 'setup',
    stage: 'setup',
    setup_input: { commission, research },
    daily_target: Number(value('--daily-target') || 5),
  }).select('id').single();
  if (jobInsert.error) {
    await db.from('novels').delete().eq('id', novelId);
    throw jobInsert.error;
  }
  console.log(JSON.stringify({ projectId: projectInsert.data.id, novelId, jobId: jobInsert.data.id }, null, 2));
}

async function mutate() {
  const jobId = value('--job-id');
  if (!jobId) throw new Error(`${command} requires --job-id.`);
  console.log(JSON.stringify({ dryRun: !apply, command, jobId, release: STORY_FACTORY_RELEASE }, null, 2));
  if (!apply) return;
  if (command === 'release') {
    const result = await db.rpc('promote_story_factory_canary', { p_job_id: jobId, p_engine_release: STORY_FACTORY_RELEASE });
    if (result.error) throw result.error;
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }
  const lookup = await db.from('story_factory_jobs').select('stage').eq('id', jobId).single();
  if (lookup.error) throw lookup.error;
  const statusValue = command === 'stop' ? 'cancelled' : (lookup.data.stage === 'setup' ? 'setup' : 'ready');
  const updated = await db.from('story_factory_jobs').update({
    status: statusValue, lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: new Date().toISOString(), last_error: null,
  }).eq('id', jobId);
  if (updated.error) throw updated.error;
}

async function restage() {
  const jobId = value('--job-id');
  const fromRelease = value('--from-release');
  if (!jobId || !fromRelease) throw new Error('restage requires --job-id and --from-release.');
  const lookup = await db.from('story_factory_jobs').select('*,ai_story_projects!story_factory_jobs_project_id_fkey(*)').eq('id', jobId).single();
  if (lookup.error) throw lookup.error;
  const job = lookup.data;
  const project = job.ai_story_projects;
  if (job.current_chapter !== 0 || job.stage !== 'cover' || project.engine_release !== fromRelease) {
    throw new Error('restage only accepts a chapter-zero job at cover stage on the declared source release.');
  }
  const kernel = StoryKernelSchema.parse(project.story_kernel);
  const arc = ArcPlanSchema.parse(project.arc_plan);
  const state = StoryStateSchema.parse(project.story_state);
  const rollingPlan = RollingPlanSchema.parse(job.rolling_plan);
  validateKernelState(kernel, state);
  validateRollingPlan({ kernel, arc, state, rollingPlan });
  const source = await db.from('story_factory_runs').select('id').eq('job_id', jobId).eq('kind', 'setup')
    .eq('status', 'passed').eq('engine_release', fromRelease).order('started_at', { ascending: false }).limit(1).single();
  if (source.error) throw source.error;
  const digest = (artifact: unknown) => createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  console.log(JSON.stringify({ dryRun: !apply, command, jobId, fromRelease, toRelease: STORY_FACTORY_RELEASE, title: kernel.title }, null, 2));
  if (!apply) return;
  const update = await db.from('ai_story_projects').update({ engine_release: STORY_FACTORY_RELEASE, updated_at: new Date().toISOString() })
    .eq('id', project.id).eq('engine_release', fromRelease).eq('current_chapter', 0);
  if (update.error) throw update.error;
  const inserted = await db.from('story_factory_runs').insert({
    job_id: jobId, project_id: project.id, novel_id: job.novel_id, kind: 'setup', status: 'passed',
    engine_release: STORY_FACTORY_RELEASE, model_routes: project.model_routes,
    input_artifact: { restagedFromRunId: source.data.id, fromRelease },
    output_artifact: {
      validation: 'current_runtime_passed', kernelDigest: digest(kernel), arcDigest: digest(arc),
      stateDigest: digest(state), rollingPlanDigest: digest(rollingPlan),
    },
    finished_at: new Date().toISOString(),
  });
  if (inserted.error) throw inserted.error;
}

async function main() {
  if (command === 'status') return status();
  if (command === 'portfolio') {
    console.log(JSON.stringify({ release: STORY_FACTORY_RELEASE, slots: FIRST_30_PORTFOLIO }, null, 2));
    return;
  }
  if (command === 'seed') return seed();
  if (command === 'restage') return restage();
  if (command === 'tick') {
    console.log(JSON.stringify({ dryRun: !apply, command, release: STORY_FACTORY_RELEASE }, null, 2));
    if (!apply) return;
    process.env.STORY_FACTORY_ENABLED = 'true';
    const result = await runStoryFactoryTick({ db, workerId: `operator-${crypto.randomUUID()}` });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (['start', 'stop', 'release'].includes(command)) return mutate();
  throw new Error('Usage: factory-operator.ts status|portfolio|seed|restage|tick|start|stop|release [options] [--apply]');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
