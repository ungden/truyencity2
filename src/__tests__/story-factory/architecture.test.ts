import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Structural invariants only.
 *
 * This file used to carry ~150 assertions on exact Vietnamese prompt substrings. Every
 * prompt improvement broke it, so improving a prompt meant editing a test that asserted
 * nothing about behaviour — a change detector wearing an architecture test's name. Those
 * are gone. What remains are properties that would be genuine defects if violated:
 * boundaries between roles, what the Writer is allowed to see, and how the runtime is
 * gated. Prompt quality is measured by the writing smoke and by window review, not here.
 */

function files(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap(entry => {
    const target = path.join(root, entry);
    return statSync(target).isDirectory() ? files(target) : [target];
  });
}

/**
 * Migrations replay in filename order, so only the last mention of an object is what
 * production runs. Asserting a named historical file lets a later migration silently
 * revert it — which is exactly how a 5 minute lease replaced a 30 minute one while the
 * test stayed green.
 */
function latestMigrationContaining(marker: string): string {
  const match = readdirSync('supabase/migrations')
    .filter(entry => entry.endsWith('.sql'))
    .sort()
    .reverse()
    .find(entry => readFileSync(path.join('supabase/migrations', entry), 'utf8').includes(marker));
  if (!match) throw new Error(`No migration contains ${marker}`);
  return path.join('supabase/migrations', match);
}

function latestMigrationDefining(functionName: string): string {
  return latestMigrationContaining(`FUNCTION ${functionName}(`);
}

/** A slice bounded by two markers; throws instead of returning '' when a marker moves. */
function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Markers out of order: ${startMarker} .. ${endMarker}`);
  }
  return source.slice(start, end);
}

const read = (target: string) => readFileSync(target, 'utf8');

describe('Story Factory architecture boundary', () => {
  test('legacy engines, endpoints and docs no longer exist', () => {
    // Gone, not merely empty. Empty shells kept reading as a live five-layer engine in the
    // docs and in every fresh session's mental model of the repo.
    for (const legacy of [
      'src/services/story-engine',
      'src/services/story-writing-factory',
      'src/app/api/claude-writer',
      'src/app/api/cron/write-chapters',
      'src/app/api/cron/flagship-factory',
      'docs/story-engine',
      'supabase/functions/ai-writer-scheduler',
      'supabase/functions/factory-main-loop',
      'supabase/functions/factory-writer-worker',
      'supabase/functions/factory-publisher',
      'supabase/functions/factory-daily-tasks',
      'supabase/functions/openrouter-chat',
    ]) {
      expect(existsSync(legacy)).toBe(false);
    }
  });

  test('there is exactly one writing cron and no legacy imports', () => {
    const writingCrons = files('src/app/api/cron')
      .filter(file => file.endsWith('route.ts') && /story-factory|write-chapters|flagship-factory/.test(file));
    expect(writingCrons).toEqual(['src/app/api/cron/story-factory/route.ts']);
    const source = files('src')
      .filter(file => /\.tsx?$/.test(file) && !file.includes('/__tests__/'))
      .map(read).join('\n');
    expect(source).not.toContain('@/services/story-engine');
    expect(source).not.toContain('@/services/story-writing-factory');
  });

  test('publication never gates on length and the provider never substitutes a model', () => {
    // Word count is telemetry. A length gate makes the Writer pad, which is the one
    // failure mode no downstream check can distinguish from a legitimately long chapter.
    expect(read('src/services/story-factory/pipeline.ts'))
      .not.toMatch(/min(?:imum)?Words|max(?:imum)?Words|targetWord/i);
    // The historical ban here was on vendor NAMES, from an era when a failing call
    // silently fell back to template output. Vendors are now legitimate routed paths
    // (Gemini, OpenAI, OpenRouter) — what stays banned is substitution: every path
    // must exhaust its bounded retries on the SAME routed model and then throw.
    const provider = read('src/services/story-factory/provider.ts');
    expect(provider).not.toMatch(/fallback/i);
    // One bounded retry loop per vendor path, all ending in the same terminal throw.
    expect(provider.match(/Provider retry loop ended unexpectedly\./g)?.length).toBe(3);
    // Dispatch is a pure function of the routed model id — no catch clause ever
    // invokes a different vendor's generate.
    expect(provider).not.toMatch(/catch[\s\S]{0,200}?(openaiGenerate|openrouterGenerate)\(/);
  });

  test('the Writer never sees plan internals or narrative outcomes', () => {
    // The Writer owns prose; the Planner owns causality. Leaking deltas, mechanics or
    // prior outcomes into the brief turns the Writer into a summariser of its own plan.
    const context = read('src/services/story-factory/context.ts');
    // sliceBetween throws if either marker moves — a silent '' here would turn the
    // strongest leak checks in this file into tautologies.
    const brief = sliceBetween(context, 'export function buildWriterBrief', 'export function selectPreviousTail');
    // 'worldRules' is deliberately absent from this list: the brief now projects the
    // DESCRIPTIONS of the chapter's required world rules as physicalLaws. That is
    // kernel canon, not plan internals — and denying it produced a canon violation
    // (prose contradicting a rule the Writer had never seen) that only the
    // independent continuity judge caught.
    for (const leak of [
      'recentOutcomes',
      'scene.action',
      'requiredDeltaIds:',
      'deltaId:',
      'source:',
      'sink:',
      'uniqueMechanism',
      'seriesSpine',
      'genreLane: input.kernel.genreLane',
      'aliases: character.aliases',
    ]) {
      expect(brief).not.toContain(leak);
    }
    expect(brief).toContain('physicalLaws');
    // The Editor and Planner do receive them.
    expect(context).toContain('recentOutcomes: input.state.recentOutcomes');
  });

  test('the Plan Judge is independent and is never called per chapter', () => {
    const planner = read('src/services/story-factory/planner.ts');
    expect(planner).toContain('model: input.routes.planJudge');
    expect(planner).toContain('const rejudged = await assessRollingPlan({');
    // Bounded repair: two mechanical attempts, then exactly one judge-driven replan.
    expect(planner).toContain('for (let mechanicalAttempt = 1; !currentPlan && mechanicalAttempt <= 2; mechanicalAttempt += 1)');
    // A judge in the chapter path would grade the plan it just wrote.
    expect(read('src/services/story-factory/pipeline.ts')).not.toContain('planJudge');
    // release → benchmark → planner already exists; planner importing release closes a
    // cycle that typechecks fine but TDZ-crashes the production bundle at module init.
    expect(planner).not.toContain("from './release'");
  });

  test('grounding constrains concept selection instead of auditing after it', () => {
    const setup = read('src/services/story-factory/setup.ts');
    expect(setup.indexOf("setupStage('Grounded Domain Research'"))
      .toBeLessThan(setup.indexOf("setupStage('Blind Concept Judge'"));
  });

  test('stable IDs are assigned by code, never trusted from provider output', () => {
    const setup = read('src/services/story-factory/setup.ts');
    expect(setup).toContain('ConceptCandidateSchema.omit({ id: true })');
    expect(setup).toContain('StoryCharacterSchema.omit({ id: true })');
    expect(setup).toContain("id: 'character_protagonist_01'");
  });

  test('new stories fail closed when their market blueprint is missing', () => {
    const runtime = read('src/services/story-factory/runtime.ts');
    const smoke = read('scripts/factory-writing-smoke.ts');
    expect(runtime).toContain("if (job.stage !== 'setup') requireMarketBlueprint(project.market_blueprint)");
    expect(runtime).toContain('routes, marketBlueprint, provider');
    expect(read('src/services/story-factory/planner.ts')).toContain('dueMarketPayoffs');
    expect(read('src/services/story-factory/planner.ts')).toContain('marketBlueprintWindowContract');
    expect(read('src/services/story-factory/prompts.ts')).toContain('Một thắng lợi khác dù vẫn sảng không được thay thế deadline đã khóa');
    expect(smoke).toContain('marketBlueprint = MarketBlueprintSchema.parse(setup.selectedConcept.marketBlueprint)');
    expect(smoke).toContain('marketBlueprintDigest: digestArtifact(marketBlueprint)');
    expect(read('src/services/story-factory/setup.ts')).toContain("schemaComplexity: 'omit_array_max'");
    expect(read('src/services/story-factory/setup.ts')).toContain('constrainSchema: false');
    expect(smoke).toContain("factory/smoke-checkpoint.local.json");
    expect(smoke).toContain('onCheckpoint: async checkpoint =>');
    expect(read('src/services/story-factory/routes.ts')).toContain("setupGeneratorB: 'gemini-3.1-pro-preview'");
    expect(read('scripts/factory-operator.ts')).toContain("routes.setupGeneratorB === 'gemini-2.5-pro'");
  });

  test('the release identity covers artifact compatibility only, not generation quality', () => {
    const release = read('src/services/story-factory/release.ts');
    const compat = release.slice(release.indexOf('const compatibilityIdentity'), release.indexOf('const revisionIdentity'));
    const revision = release.slice(release.indexOf('const revisionIdentity'), release.indexOf('function digest'));

    // Only versions deciding whether a persisted artifact still parses may gate claiming.
    // Gating on prompt/planner/validator revisions meant every fix orphaned the fleet and
    // invalidated the benchmark evidence the fix was made to obtain.
    expect(compat).toContain('contractVersion: FACTORY_CONTRACT_VERSION');
    expect(compat).toContain('stateVersion: FACTORY_STATE_VERSION');
    expect(compat).toContain('setupVersion: FACTORY_SETUP_VERSION');
    for (const generationVersion of [
      'promptVersion',
      'plannerVersion',
      'causalValidatorVersion',
      'contextProjectionVersion',
      'memoryPolicyVersion',
      'windowReviewVersion',
      'routeVersion',
    ]) {
      expect(compat).not.toContain(generationVersion);
      expect(revision).toContain(generationVersion);
    }
    // Quality regressions must still be attributable to an exact engine revision.
    expect(read('src/services/story-factory/runtime.ts')).toContain('engine_revision: STORY_FACTORY_REVISION');
  });

  test('a transient infrastructure failure retries with backoff instead of parking the job', () => {
    const runtime = read('src/services/story-factory/runtime.ts');
    const provider = read('src/services/story-factory/provider.ts');
    expect(provider).toContain('408, 409, 429, 499');
    expect(runtime).toContain("factoryError.code === 'infra_blocked' && job.retry_count < INFRA_RETRY_LIMIT");
    // Semantic verdicts about the story are not retried — they need a human or a replan.
    expect(runtime).toContain("status: retryable ? 'ready' : factoryError.code");
  });

  test('schema correction is a low-temperature exhaustive repair, not a creative reroll', () => {
    const provider = read('src/services/story-factory/provider.ts');
    const setup = read('src/services/story-factory/setup.ts');
    expect(provider).toContain('rà lại cùng field trên TOÀN BỘ các phần tử');
    expect(provider).toContain('temperature: Math.min(input.temperature ?? 0.7, 0.2)');
    expect(setup).toContain('arena, statusPrize, oppositionClass và advantageEvolution đều phải là mô tả cụ thể dài tối thiểu 20 ký tự');
  });

  test('the rewrite path runs in its own tick so no chapter exceeds the route ceiling', () => {
    const pipeline = read('src/services/story-factory/pipeline.ts');
    expect(pipeline).toContain('export async function draftStoryChapter');
    expect(pipeline).toContain('export async function reviseStoryChapter');
    expect(read('src/services/story-factory/runtime.ts')).toContain("if (job.stage === 'revise') return runRevision(");

    // Two chapter-tick provider calls must fit inside maxDuration with headroom.
    // The tight timeout applies only to Writer/Editor calls — setup and planner
    // legitimately run long and keep the generous default.
    const route = read('src/app/api/cron/story-factory/route.ts');
    const provider = read('src/services/story-factory/provider.ts');
    const maxDurationSeconds = Number(route.match(/maxDuration\s*=\s*(\d+)/)![1]);
    const chapterTimeoutMs = Number(
      provider.match(/CHAPTER_CALL_TIMEOUT_MS = (\d[\d_]*)/)![1].replace(/_/g, ''),
    );
    expect(chapterTimeoutMs * 2).toBeLessThan(maxDurationSeconds * 1000);
    // All four chapter-tick call sites (Writer, Rewrite, shared Editor and its
    // grounding-corrective re-roll) opt in.
    expect(pipeline.match(/timeoutMs: CHAPTER_CALL_TIMEOUT_MS/g)?.length).toBe(4);
  });

  test('prose heuristics can advise but never block a job', () => {
    const validation = read('src/services/story-factory/validation.ts');
    // Pattern matching over free-form Vietnamese cannot be authoritative: the same verb
    // reads as completing an asset or agreeing to start one. Both such checks advise.
    const proseChecks = validation.slice(validation.indexOf('function describesCompletedDurableAsset'));
    expect(proseChecks).toContain('advisory({');
    expect(validation).toContain('export function collectPlanAdvisories');
    // The Plan Judge answers them with the whole window in hand.
    expect(read('src/services/story-factory/planner.ts')).toContain('advisorySignals');
  });

  test('one invocation drains the queue without starting work it cannot finish', () => {
    const runtime = read('src/services/story-factory/runtime.ts');
    expect(runtime).toContain('export async function runStoryFactoryTicks');
    expect(runtime).toContain('export function shouldStartAnotherStage');
    expect(read('src/app/api/cron/story-factory/route.ts')).toContain('runStoryFactoryTicks()');
  });

  test('a new story validates its opening plan before paying for a cover', () => {
    const runtime = read('src/services/story-factory/runtime.ts');
    const setup = sliceBetween(runtime, 'async function runSetup', 'async function runCover');
    const cover = sliceBetween(runtime, 'async function runCover', 'async function loadPlanCheckpoint');
    const plan = sliceBetween(runtime, 'async function runPlan', 'async function runChapter');

    expect(setup).toContain("stage: 'plan'");
    expect(cover).toContain('rollingPlanContainsChapter(job.rolling_plan, nextChapter)');
    expect(cover).toContain("stage: 'write'");
    expect(plan).toContain("stage: job.current_chapter === 0 ? 'cover' : 'write'");
    expect(plan).toContain('job.current_chapter === 0 || job.plan_feedback || job.retry_count >= 2 ? 1 : undefined');
  });

  test('the production gate is a mechanical smoke check, not a self-invalidating benchmark chain', () => {
    const migration = read(latestMigrationDefining('public.story_factory_release_is_approved'));
    const body = migration.slice(
      migration.indexOf('FUNCTION public.story_factory_release_is_approved('),
      migration.indexOf('FUNCTION public.claim_story_factory_job('),
    );
    expect(body).toContain("smoke.kind = 'smoke'");
    expect(body).toContain("smoke.status IN ('passed', 'blocked')");
    expect(body).toContain("(smoke.output_artifact->>'chaptersCompleted')::integer, 0) >= 5");
    expect(body).toContain("(smoke.output_artifact->>'criticalContinuityViolations')::integer, -1) = 0");
    // The four-run chain required every run to carry the current release, so any fix
    // destroyed the evidence it was made to obtain. None of it may gate claiming again.
    expect(body).not.toContain('writerBakeoffRunId');
    expect(body).not.toContain('competingSequentialRunId');
    expect(body).not.toContain('samplesCompleted');
  });

  test('one slow provider stage cannot be reclaimed by another worker', () => {
    const migration = read(latestMigrationDefining('public.claim_story_factory_job'));
    // Chapter work keeps the full 30 minutes; only setup — whose slices die at the
    // route ceiling by design — gets the short lease for fast resume.
    expect(migration).toMatch(/CASE WHEN job\.stage = 'setup' THEN interval '8 minutes' ELSE interval '30 minutes' END/);
    expect(migration).not.toContain("lease_until = now() + interval '5 minutes'");
    expect(migration).toContain('FOR UPDATE OF job SKIP LOCKED');
    expect(migration).toContain('SECURITY INVOKER');
    // Expired-lease jobs return only through reconcile, which counts the crash against
    // the retry budget. Claim admitting 'writing' would beat that accounting every time
    // and let a crash-looping job burn provider spend forever.
    expect(migration).toContain("WHERE job.status IN ('setup', 'ready', 'finale')");
    expect(read('src/services/story-factory/runtime.ts')).toContain('p_stale_minutes: 0');
  });

  test('canary promotion requires the latest chapter-10 review on the exact release', () => {
    const runtime = read('src/services/story-factory/runtime.ts');
    const migration = read(latestMigrationDefining('public.promote_story_factory_canary'));
    expect(runtime).not.toContain("db.rpc('promote_story_factory_canary'");
    expect(runtime).toContain("canaryReadyForHumanReview ? 'completed' : 'ready'");
    expect(migration).toContain('ORDER BY finished_at DESC NULLS LAST, started_at DESC');
    expect(migration).toContain("latest_review_status IS DISTINCT FROM 'passed'");
    expect(migration).toContain('latest_review_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain('project.engine_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain('setup_digest IS DISTINCT FROM job.launch_pack_digest');
  });

  test('window review reads five chapters and the chapter commit is atomic', () => {
    const commit = read(latestMigrationDefining('public.commit_story_factory_chapter'));
    expect(commit).toContain('p_expected_chapter % 5 = 0');
    expect(commit).not.toContain('p_expected_chapter % 10 = 0');
    // A committed chapter resets the transient-failure budget: it proves the job is healthy.
    expect(commit).toContain('retry_count = 0');
    const memory = read(latestMigrationContaining('USING gin (related_entity_ids)'));
    expect(memory).toContain('related_entity_ids text[]');
    expect(memory).not.toContain('DROP INDEX');
    const runtime = read('src/services/story-factory/runtime.ts');
    expect(runtime).toContain("db.rpc('commit_story_factory_arc_transition'");
    expect(runtime).not.toContain('update({ arc_plan: result.lifecycle.nextArc');
  });

  test('run telemetry is terminally consistent and reader judges never see internal plans', () => {
    const migration = read(latestMigrationContaining('story_factory_runs_terminal_consistency_check'));
    expect(migration).toContain('ADD CONSTRAINT story_factory_runs_terminal_consistency_check');
    const benchmark = read('scripts/factory-benchmark.ts');
    expect(benchmark).toContain('buildBlindReaderComparison({');
    for (const internal of ['sample.plan', 'stateBefore', 'chapterPlan']) {
      expect(benchmark).not.toContain(internal);
    }
  });

  test('the Editor provider schema stays bounded while validation remains exact-ID', () => {
    const pipeline = read('src/services/story-factory/pipeline.ts');
    // Enumerating every reference ID in the provider schema blows the schema size limit;
    // the model gets a free string and code checks exact membership afterwards.
    expect(pipeline).not.toContain('referenceId: exactStringSchema(input.referenceIds)');
    expect(pipeline).toContain('!validIds.has(issue.referenceId)');
    expect(pipeline).toContain('deltaId: exactStringSchema(input.deltaIds)');
  });
});
