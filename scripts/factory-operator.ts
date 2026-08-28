import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_MODEL_ROUTES,
  FIRST_30_PORTFOLIO,
  ModelRoutesSchema,
  ResearchSnapshotSchema,
  StoryCommissionSchema,
  ArcPlanSchema,
  RollingPlanSchema,
  StoryKernelSchema,
  StoryStateSchema,
  STORY_FACTORY_RELEASE,
  runStoryFactoryTick,
  activateUnambiguousAcquisitionMechanics,
  collectPlanAdvisories,
  assertFirst30PortfolioCommission,
  validateArcActivationBudget,
  validateArcAgainstKernel,
  validateArcResourceReachability,
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
  if (index >= 0) return args[index + 1];
  const inline = args.find(argument => argument.startsWith(`${flag}=`));
  return inline?.slice(flag.length + 1) || undefined;
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
  const commission = StoryCommissionSchema.parse(JSON.parse(readFileSync(path.resolve(commissionPath), 'utf8')));
  const research = ResearchSnapshotSchema.parse(JSON.parse(readFileSync(path.resolve(researchPath), 'utf8')));
  if (commission.genreLane !== research.lane) {
    throw new Error(`Research lane ${research.lane} does not match commission lane ${commission.genreLane}.`);
  }
  assertFirst30PortfolioCommission(commission);
  const routes = routesPath
    ? ModelRoutesSchema.parse(JSON.parse(readFileSync(path.resolve(routesPath), 'utf8')))
    : DEFAULT_MODEL_ROUTES;
  if (routes.setupGeneratorB === 'gemini-2.5-pro') {
    throw new Error('gemini-2.5-pro cannot serve the market-blueprint concept schema; use the current default setupGeneratorB before seeding a fresh story.');
  }
  // Same condition claim_story_factory_job enforces, surfaced here so seeding fails
  // with a clear message instead of producing a job that silently never gets claimed.
  const smokeResult = await db.from('story_factory_runs')
    .select('id,model_routes,output_artifact')
    .eq('kind', 'smoke')
    .eq('status', 'passed')
    .eq('engine_release', STORY_FACTORY_RELEASE)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (smokeResult.error) throw smokeResult.error;
  if (!smokeResult.data) {
    throw new Error(`No passed writing smoke exists for ${STORY_FACTORY_RELEASE}. Run: npm run factory:writing-smoke -- --apply`);
  }
  // Mirror the five keys story_factory_release_is_approved binds, so a mismatch fails
  // here with a clear message instead of seeding a job the claim query never sees.
  const approvedRoute = (smokeResult.data.model_routes as { route?: Record<string, unknown> } | null)?.route;
  for (const keyName of ['planner', 'planJudge', 'writer', 'editor', 'routeVersion'] as const) {
    if (approvedRoute?.[keyName] !== routes[keyName]) {
      throw new Error(`Smoke route mismatch at ${keyName}: smoke ran ${String(approvedRoute?.[keyName])}, seed requests ${routes[keyName]}.`);
    }
  }
  const seedToken = Date.now();
  const slug = `factory-${commission.slotKey}-${seedToken}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  console.log(JSON.stringify({
    dryRun: !apply,
    command,
    release: STORY_FACTORY_RELEASE,
    smokeRunId: smokeResult.data.id,
    commission,
    researchId: research.snapshotId,
    routes,
  }, null, 2));
  if (!apply) return;
  const novelInsert = await db.from('novels').insert({
    title: `Đang chuẩn bị: ${commission.slotKey} · ${seedToken}`,
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
    benchmark_run_id: smokeResult.data.id,
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

const digest = (artifact: unknown) => createHash('sha256').update(JSON.stringify(artifact)).digest('hex');

/**
 * Migrate one job onto the running release.
 *
 * The gate is what it should always have been: do the persisted artifacts still parse
 * and validate under the current schemas? Requiring current_chapter === 0 meant a novel
 * that had written a single chapter could never move release again — with the release
 * hash changing on nearly every commit, that orphaned the whole fleet permanently.
 */
async function restageJob(jobId: string): Promise<{ jobId: string; title: string; fromRelease: string; chapter: number }> {
  const lookup = await db.from('story_factory_jobs').select('*,ai_story_projects!story_factory_jobs_project_id_fkey(*)').eq('id', jobId).single();
  if (lookup.error) throw lookup.error;
  const job = lookup.data;
  const project = job.ai_story_projects;
  const fromRelease: string = project.engine_release;
  if (fromRelease === STORY_FACTORY_RELEASE) throw new Error(`Job ${jobId} already runs the current release.`);

  const kernel = StoryKernelSchema.parse(project.story_kernel);
  const arc = ArcPlanSchema.parse(project.arc_plan);
  const state = StoryStateSchema.parse(project.story_state);
  validateKernelState(kernel, state);
  // An uncommitted rolling window is disposable: recoverUncommittedPlan replans it.
  // Only reject the migration if a plan that IS present is incoherent with the artifacts.
  let rollingPlanDigest: string | null = null;
  if (job.rolling_plan) {
    const rollingPlan = RollingPlanSchema.parse(job.rolling_plan);
    // Advisories don't block a restage (they never block anything), but the operator
    // should see them — silently dropping them would make this check look cleaner
    // than the same plan looks to the Plan Judge.
    const { advisories } = collectPlanAdvisories(() => validateRollingPlan({ kernel, arc, state, rollingPlan }));
    if (advisories.length) console.warn(`[restage] ${jobId}: ${advisories.length} plan advisory(ies):`, JSON.stringify(advisories, null, 2));
    rollingPlanDigest = digest(rollingPlan);
  }

  if (!apply) return { jobId, title: kernel.title, fromRelease, chapter: job.current_chapter };
  const update = await db.from('ai_story_projects').update({ engine_release: STORY_FACTORY_RELEASE, updated_at: new Date().toISOString() })
    .eq('id', project.id).eq('engine_release', fromRelease);
  if (update.error) throw update.error;
  const inserted = await db.from('story_factory_runs').insert({
    job_id: jobId, project_id: project.id, novel_id: job.novel_id, kind: 'setup', status: 'passed',
    engine_release: STORY_FACTORY_RELEASE, model_routes: project.model_routes,
    input_artifact: { fromRelease, atChapter: job.current_chapter },
    output_artifact: {
      validation: 'current_runtime_passed',
      launchPackDigest: job.launch_pack_digest,
      kernelDigest: digest(kernel), arcDigest: digest(arc),
      stateDigest: digest(state), rollingPlanDigest,
    },
    finished_at: new Date().toISOString(),
  });
  if (inserted.error) throw inserted.error;
  return { jobId, title: kernel.title, fromRelease, chapter: job.current_chapter };
}

async function restage() {
  const jobId = value('--job-id');
  if (jobId) {
    console.log(JSON.stringify({ dryRun: !apply, command, toRelease: STORY_FACTORY_RELEASE, ...(await restageJob(jobId)) }, null, 2));
    return;
  }
  if (!args.includes('--all')) throw new Error('restage requires --job-id or --all.');
  const stale = await db.from('story_factory_jobs')
    .select('id,ai_story_projects!story_factory_jobs_project_id_fkey(engine_release)')
    .not('status', 'in', '("completed","cancelled")');
  if (stale.error) throw stale.error;
  const candidates = (stale.data ?? []).filter(row => {
    const project = row.ai_story_projects as unknown as { engine_release: string } | null;
    return project && project.engine_release !== STORY_FACTORY_RELEASE;
  });
  const migrated: unknown[] = [];
  const skipped: unknown[] = [];
  for (const row of candidates) {
    try {
      migrated.push(await restageJob(row.id));
    } catch (error) {
      skipped.push({ jobId: row.id, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  console.log(JSON.stringify({ dryRun: !apply, command, toRelease: STORY_FACTORY_RELEASE, migrated, skipped }, null, 2));
}

/**
 * Return parked jobs to the queue. Blocked jobs are unclaimable by construction, so
 * without this a transient failure removes a novel from production until a human notices.
 */
async function revive() {
  const jobId = value('--job-id');
  const query = db.from('story_factory_jobs')
    .select('id,status,stage,current_chapter,last_error,ai_story_projects!story_factory_jobs_project_id_fkey(engine_release)')
    .in('status', ['setup_blocked', 'plan_blocked', 'quality_blocked', 'infra_blocked']);
  const lookup = await (jobId ? query.eq('id', jobId) : query);
  if (lookup.error) throw lookup.error;
  // Revive returns a job to the claimable set, but claim also requires the project's
  // engine_release to match the running engine. Reviving a stale-release job without
  // saying so would report success while the job stays unclaimable forever.
  const jobs = (lookup.data ?? []).map(row => {
    const project = row.ai_story_projects as unknown as { engine_release: string } | null;
    return {
      id: row.id,
      status: row.status,
      stage: row.stage,
      current_chapter: row.current_chapter,
      last_error: row.last_error,
      engineRelease: project?.engine_release ?? null,
      needsRestage: project?.engine_release !== STORY_FACTORY_RELEASE,
    };
  });
  const staleCount = jobs.filter(job => job.needsRestage).length;
  console.log(JSON.stringify({ dryRun: !apply, command, release: STORY_FACTORY_RELEASE, jobs }, null, 2));
  if (staleCount) {
    console.warn(`[revive] ${staleCount} job(s) are on an old engine_release and will stay unclaimable after revive. Run: factory-operator restage --all --apply`);
  }
  if (!apply || !jobs.length) return;
  const now = new Date().toISOString();
  const updated = await db.from('story_factory_jobs').update({
    status: 'ready',
    retry_count: 0,
    last_error: null,
    lease_owner: null, lease_token: null, lease_until: null,
    next_run_at: now, updated_at: now,
  }).in('id', jobs.map(job => job.id));
  if (updated.error) throw updated.error;
  console.log(JSON.stringify({ revived: jobs.length, needingRestage: staleCount }, null, 2));
}

/**
 * Repair only the narrowly safe form of a parked resource-path error: an active
 * consumer has exactly one inactive conversion that can acquire its missing
 * input from balances already present in the canonical state. Ambiguity stays
 * blocked for a human/story decision; this command never chooses a supplier.
 */
async function repairReachability() {
  const jobId = value('--job-id');
  if (!jobId) throw new Error('repair-reachability requires --job-id.');
  const lookup = await db.from('story_factory_jobs')
    .select('id,project_id,status,stage,current_chapter,ai_story_projects!story_factory_jobs_project_id_fkey(id,story_kernel,arc_plan,story_state)')
    .eq('id', jobId)
    .single();
  if (lookup.error) throw lookup.error;
  const project = lookup.data.ai_story_projects as unknown as {
    id: string;
    story_kernel: unknown;
    arc_plan: unknown;
    story_state: unknown;
  } | null;
  if (!project) throw new Error(`Job ${jobId} has no Story Factory project.`);
  const kernel = StoryKernelSchema.parse(project.story_kernel);
  const arc = ArcPlanSchema.parse(project.arc_plan);
  const state = StoryStateSchema.parse(project.story_state);
  validateKernelState(kernel, state);
  const repaired = activateUnambiguousAcquisitionMechanics({ kernel, arc, state });
  validateArcActivationBudget(repaired.arc);
  validateArcResourceReachability({ kernel, arc: repaired.arc, state });
  console.log(JSON.stringify({
    dryRun: !apply,
    command,
    jobId,
    projectId: project.id,
    status: lookup.data.status,
    chapter: lookup.data.current_chapter,
    activatedMechanicIds: repaired.activatedMechanicIds,
    activeMechanicIdsBefore: arc.activeMechanicIds,
    activeMechanicIdsAfter: repaired.arc.activeMechanicIds,
  }, null, 2));
  if (!repaired.activatedMechanicIds.length) {
    throw new Error('No unambiguous funded acquisition mechanism was available; preserve the block for a story decision.');
  }
  if (!apply) return;
  const updated = await db.from('ai_story_projects')
    .update({ arc_plan: repaired.arc, updated_at: new Date().toISOString() })
    .eq('id', project.id);
  if (updated.error) throw updated.error;
}

/**
 * Remove only an impossible state_change effect from a capability that already
 * declares one or more fact effects. This preserves the unambiguous fact-level
 * mechanic (for example, an insulated hold becoming complete) without inventing
 * a numeric amount or silently choosing a different resource direction.
 */
async function repairInvalidCapabilityEffect() {
  const jobId = value('--job-id');
  if (!jobId) throw new Error('repair-invalid-capability-effect requires --job-id.');
  const lookup = await db.from('story_factory_jobs')
    .select('id,project_id,status,stage,current_chapter,ai_story_projects!story_factory_jobs_project_id_fkey(id,story_kernel,arc_plan,story_state)')
    .eq('id', jobId)
    .single();
  if (lookup.error) throw lookup.error;
  const project = lookup.data.ai_story_projects as unknown as {
    id: string;
    story_kernel: unknown;
    arc_plan: unknown;
    story_state: unknown;
  } | null;
  if (!project || !project.story_kernel || typeof project.story_kernel !== 'object') {
    throw new Error(`Job ${jobId} has no readable Story Factory kernel.`);
  }
  const rawKernel = structuredClone(project.story_kernel) as {
    resources?: Array<{ id?: unknown; kind?: unknown }>;
    worldMechanics?: Array<{
      id?: unknown;
      kind?: unknown;
      effectResources?: Array<{ resourceId?: unknown; direction?: unknown }>;
      effectFactIds?: unknown;
    }>;
  };
  if (!Array.isArray(rawKernel.resources) || !Array.isArray(rawKernel.worldMechanics)) {
    throw new Error('Kernel does not have readable resources and worldMechanics arrays.');
  }
  const numericResourceIds = new Set(rawKernel.resources
    .filter(resource => resource.kind === 'numeric' && typeof resource.id === 'string')
    .map(resource => resource.id as string));
  const candidates = rawKernel.worldMechanics
    .map((mechanic, index) => ({ mechanic, index }))
    .filter(({ mechanic }) => mechanic.kind === 'capability'
      && Array.isArray(mechanic.effectResources)
      && mechanic.effectResources.length === 1
      && mechanic.effectResources[0]?.direction === 'state_change'
      && typeof mechanic.effectResources[0]?.resourceId === 'string'
      && numericResourceIds.has(mechanic.effectResources[0].resourceId)
      && Array.isArray(mechanic.effectFactIds)
      && mechanic.effectFactIds.length > 0);
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one fact-backed invalid capability effect; found ${candidates.length}. Preserve the block for a story decision.`);
  }
  const candidate = candidates[0];
  const before = candidate.mechanic.effectResources!;
  candidate.mechanic.effectResources = [];
  const kernel = StoryKernelSchema.parse(rawKernel);
  const arc = ArcPlanSchema.parse(project.arc_plan);
  const state = StoryStateSchema.parse(project.story_state);
  validateKernelState(kernel, state);
  validateArcActivationBudget(arc);
  validateArcAgainstKernel(kernel, arc);
  validateArcResourceReachability({ kernel, arc, state });
  console.log(JSON.stringify({
    dryRun: !apply,
    command,
    jobId,
    projectId: project.id,
    status: lookup.data.status,
    chapter: lookup.data.current_chapter,
    mechanicId: candidate.mechanic.id,
    removedInvalidEffects: before,
    retainedEffectFactIds: candidate.mechanic.effectFactIds,
  }, null, 2));
  if (!apply) return;
  const updated = await db.from('ai_story_projects')
    .update({ story_kernel: kernel, updated_at: new Date().toISOString() })
    .eq('id', project.id);
  if (updated.error) throw updated.error;
}

async function main() {
  if (command === 'status') return status();
  if (command === 'portfolio') {
    console.log(JSON.stringify({ release: STORY_FACTORY_RELEASE, slots: FIRST_30_PORTFOLIO }, null, 2));
    return;
  }
  if (command === 'seed') return seed();
  if (command === 'restage') return restage();
  if (command === 'revive') return revive();
  if (command === 'repair-reachability') return repairReachability();
  if (command === 'repair-invalid-capability-effect') return repairInvalidCapabilityEffect();
  if (command === 'tick') {
    console.log(JSON.stringify({ dryRun: !apply, command, release: STORY_FACTORY_RELEASE }, null, 2));
    if (!apply) return;
    process.env.STORY_FACTORY_ENABLED = 'true';
    const result = await runStoryFactoryTick({ db, workerId: `operator-${crypto.randomUUID()}` });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (['start', 'stop', 'release'].includes(command)) return mutate();
  throw new Error('Usage: factory-operator.ts status|portfolio|seed|restage|revive|repair-reachability|repair-invalid-capability-effect|tick|start|stop|release [options] [--apply]');
}

main().catch(error => {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === 'object' && error !== null && 'message' in error
      ? `Error: ${String(error.message)}`
      : `Error: ${String(error)}`;
  console.error(message);
  process.exitCode = 1;
});
