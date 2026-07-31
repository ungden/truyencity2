import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function files(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap(entry => {
    const target = path.join(root, entry);
    return statSync(target).isDirectory() ? files(target) : [target];
  });
}

/**
 * Migrations replay in filename order, so only the last definition of a function is
 * live. Asserting a named historical file lets a later migration silently revert it.
 */
function latestMigrationDefining(functionName: string): string {
  const marker = `FUNCTION ${functionName}(`;
  const match = readdirSync('supabase/migrations')
    .filter(entry => entry.endsWith('.sql'))
    .sort()
    .reverse()
    .find(entry => readFileSync(path.join('supabase/migrations', entry), 'utf8').includes(marker));
  if (!match) throw new Error(`No migration defines ${functionName}`);
  return path.join('supabase/migrations', match);
}

describe('Story Factory architecture boundary', () => {
  test('legacy engines and write endpoints no longer exist', () => {
    expect(files('src/services/story-engine')).toHaveLength(0);
    expect(files('src/services/story-writing-factory')).toHaveLength(0);
    expect(existsSync('src/app/api/claude-writer/route.ts')).toBe(false);
    expect(existsSync('src/app/api/cron/write-chapters/route.ts')).toBe(false);
    expect(existsSync('src/app/api/cron/flagship-factory/route.ts')).toBe(false);
  });

  test('there is exactly one writing cron and no legacy imports', () => {
    const writingCrons = files('src/app/api/cron').filter(file => file.endsWith('route.ts') && /story-factory|write-chapters|flagship-factory/.test(file));
    expect(writingCrons).toEqual(['src/app/api/cron/story-factory/route.ts']);
    const source = files('src').filter(file => /\.tsx?$/.test(file) && !file.includes('/__tests__/')).map(file => readFileSync(file, 'utf8')).join('\n');
    expect(source).not.toContain('@/services/story-engine');
    expect(source).not.toContain('@/services/story-writing-factory');
  });

  test('publication code does not gate on word count or use provider fallback', () => {
    const pipeline = readFileSync('src/services/story-factory/pipeline.ts', 'utf8');
    const provider = readFileSync('src/services/story-factory/provider.ts', 'utf8');
    expect(pipeline).not.toMatch(/min(?:imum)?Words|max(?:imum)?Words|targetWord/i);
    expect(provider).not.toMatch(/fallback|openrouter|deepseek/i);
  });

  test('Writer freedom cannot create state outside required deltas', () => {
    const prompts = readFileSync('src/services/story-factory/prompts.ts', 'utf8');
    const pipeline = readFileSync('src/services/story-factory/pipeline.ts', 'utf8');
    expect(prompts).toContain('không được tự tạo thay đổi trạng thái bền vững ngoài requiredChanges');
    expect(prompts).toContain('prose tự tạo bất kỳ thay đổi trạng thái bền vững nào không có trong requiredDeltas');
    expect(prompts).toContain('draft bỏ sót, kết thúc trước, hiểu sai hoặc tự bịa chi tiết');
    expect(prompts).toContain('luôn dùng scope=prose');
    expect(prompts).toContain('encounteredRelevantCharacters là nguồn sự thật exact-ID');
    expect(prompts).toContain('ledgerSnapshot.encounters là nguồn sự thật exact-ID');
    expect(prompts).toContain('Không khuếch đại thất bại cục bộ thành sụp đổ toàn diện');
    expect(prompts).toContain('Không dừng ở lỗi tiêu đề/canon dễ thấy');
    expect(prompts).toContain('payoff đánh bại họ thuộc long promise ở stage sau');
    expect(prompts).toContain('relevantConversionRates khóa các mức quy đổi/giá');
    expect(prompts).toContain('Không được yêu cầu Planner hay Kernel đổi số liệu đúng');
    expect(prompts).toContain('Không áp giá hiện đại hoặc trực giác ngoài Kernel');
    expect(prompts).toContain('không dùng scope=plan để đòi đổi số dư');
    expect(prompts).toContain('amount=15, unit=VND nghĩa là mười lăm đồng');
    expect(prompts).toContain('canonicalUnits là từ điển đơn vị hợp lệ');
    expect(prompts).toContain('không được ngẫu nhiên cung cấp đúng lực, góc, công cụ');
    expect(prompts).toContain('họ phải can thiệp trước hoặc trong hành động quyết định');
    expect(prompts).toContain('required changes luôn ưu tiên');
    expect(prompts).toContain('không được yêu cầu hạ, đảo hay để dang dở required delta');
    expect(prompts).toContain('before/after là tổng số dư còn delta là lượng của một giao dịch');
    expect(pipeline).toContain('before/after là tổng số dư còn delta là lượng giao dịch');
  });

  test('narrative outcomes stay out of Writer context and each rolling window is reviewed', () => {
    const context = readFileSync('src/services/story-factory/context.ts', 'utf8');
    const writerBriefBody = context.slice(context.indexOf('export function buildWriterBrief'), context.indexOf('export function selectPreviousTail'));
    expect(writerBriefBody).not.toContain('recentOutcomes');
    expect(context).toContain('recentOutcomes: input.state.recentOutcomes');
    expect(writerBriefBody).not.toContain('scene.action');
    expect(writerBriefBody).not.toContain('requiredDeltaIds:');
    expect(writerBriefBody).not.toContain('deltaId:');
    expect(writerBriefBody).not.toContain('worldRules');
    expect(writerBriefBody).not.toContain('source:');
    expect(writerBriefBody).not.toContain('sink:');
    expect(writerBriefBody).not.toContain('uniqueMechanism');
    expect(writerBriefBody).not.toContain('durationMinutes: scene.durationMinutes');
    expect(writerBriefBody).not.toContain('travelMinutesFromPrevious: scene.travelMinutesFromPrevious');
    expect(writerBriefBody).not.toContain('genreLane: input.kernel.genreLane');
    expect(writerBriefBody).not.toContain('unwrittenGapMinutes');
    expect(writerBriefBody).not.toContain('aliases: character.aliases');
    expect(context).not.toContain('WRITER_BRIEF_MAX_CHARS');
    const migration = readFileSync('supabase/migrations/20260722072832_canonical_story_outcomes.sql', 'utf8');
    expect(migration).toContain('p_expected_chapter % 5 = 0');
    expect(migration).not.toContain('p_expected_chapter % 10 = 0');
  });

  test('rolling planning has one independent Plan Judge and no per-chapter judge call', () => {
    const planner = readFileSync('src/services/story-factory/planner.ts', 'utf8');
    const pipeline = readFileSync('src/services/story-factory/pipeline.ts', 'utf8');
    const benchmark = readFileSync('scripts/factory-benchmark-build.ts', 'utf8');
    const routes = readFileSync('src/services/story-factory/routes.ts', 'utf8');
    expect(planner).toContain('model: input.routes.planJudge');
    expect(planner).toContain('for (let mechanicalAttempt = 1; mechanicalAttempt <= 2; mechanicalAttempt += 1)');
    expect(planner).toContain('Tạo lại toàn bộ rolling window đúng một lần theo evidence của Plan Judge');
    expect(planner).toContain('const rejudged = await assessRollingPlan({');
    expect(pipeline).not.toContain('planJudge');
    expect(benchmark).toContain('Current Planner and Plan Judge must pass exactly chapters 1-3');
    expect(benchmark).toContain('requiredWindowSize: 3');
    expect(benchmark).toContain('requiredWindowSize: 2');
    expect(benchmark).toContain('Current Planner and Plan Judge must pass exactly chapters 4-5 from committed chapter-3 state');
    expect(benchmark).toContain('writeStoryChapter({');
    expect(benchmark).toContain('nextPlan: window.rollingPlan.plans[planIndex + 1]');
    expect(benchmark).toContain('nextPlan: planned.rollingPlan.plans[1]');
    expect(benchmark).toContain('assessSequentialContinuity({');
    expect(benchmark).toContain('buildContinuityPacketFromEvents({');
    expect(benchmark).toContain('memoryEntityIdsForPlan(setup.launchPack.kernel, plan)');
    expect(benchmark).toContain('continuityPacket,');
    expect(benchmark).toContain('eventLedger.push(...candidate.stateEvents)');
    expect(benchmark).toContain('stateEventsByLane');
    expect(benchmark).toContain('--frozen-discovery-progress');
    expect(benchmark).toContain('planned = frozenProgress.plannedWindows[lane]');
    expect(benchmark).toContain('prepareDiscoveryResume({');
    expect(benchmark).toContain('resume: frozenProgress?.setupCheckpoints[lane] ?? progress.setupCheckpoints[lane]');
    expect(benchmark).toContain('bookSetupCheckpointCost({');
    expect(benchmark).toContain("const failureKind = discoveryOnly ? 'writer-discovery-v4' : 'sequential-v3'");
    expect(benchmark).toContain('protocolVersion: buildProtocol');
    expect(benchmark).toContain('sourceDiscoveryDigest: writerCorpus.sourceDiscoveryDigest');
    expect(benchmark).not.toContain('convertPack');
    expect(benchmark).not.toContain('SOURCE_REF');
    expect(routes).toContain("planner: 'gemini-3.1-pro-preview'");
    expect(routes).toContain("planJudge: 'gemini-2.5-pro'");
  });

  test('Concept Generator IDs are assigned by code instead of trusted to provider output', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    expect(setup).toContain('Không tạo ID; code sẽ gán stable ID bất biến');
    expect(setup).toContain('ConceptCandidateSchema.omit({ id: true })');
    expect(setup).toContain('`concept_${generator.toLowerCase()}_${String(index + 1).padStart(2,');
    expect(setup).toContain('const LaunchCharacterWireSchema = StoryCharacterSchema.omit({ id: true })');
    expect(setup).toContain("id: 'character_protagonist_01'");
    expect(setup).toContain('`character_opposition_${String(index + 1).padStart(2,');
    expect(setup).toContain('chỉ là một cụm phân loại tối đa 12 từ');
    expect(setup).not.toContain('600-900');
    expect(setup).not.toContain('min(1_200)');
    expect(setup).toContain('Không kéo dài để đạt số từ');
    expect(setup).toContain('Mọi longPromises.promiseId');
    expect(setup).toContain('phải tham chiếu ID trong promises');
    expect(setup).toContain('schema: rankingSchema');
    expect(setup).toContain('schema: simulationSchema');
    expect(setup).toContain('schema: launchIdentityWireSchema');
    expect(setup).toContain("role: z.literal('opposition')");
    expect(setup).toContain('sentenceRhythm chỉ mô tả độ dài, nhịp và cấu trúc câu');
    expect(setup.indexOf('assertVoiceSemantics(launchIdentity.value.kernel.characters)'))
      .toBeLessThan(setup.indexOf('let launchWorld:'));
    expect(setup).toContain('schema: createLaunchWorldWireSchema(');
    expect(setup).toContain('const actorId = z.enum(ids');
    expect(setup).toContain('conversions: z.array(WorldMechanicSchema.options[0])');
    expect(setup).toContain('Constraint chỉ là guard cho một hành động');
    expect(setup).toContain('Constraint không bao giờ tự tạo fact/resource/state effect');
    expect(setup).toContain('phải mô hình hóa hậu quả đó bằng capability/conversion');
    expect(setup).toContain('schema: LaunchSeriesSchema');
    expect(setup).toContain('schema: LaunchStateSchema');
    expect(setup).not.toContain('kernelJson');
    expect(setup).not.toContain('LaunchPackWireSchema');
  });

  test('domain grounding constrains selection instead of auditing only after selection', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    expect(setup.indexOf("setupStage('Grounded Domain Research'"))
      .toBeLessThan(setup.indexOf("setupStage('Blind Concept Judge'"));
    expect(setup).toContain('Grounded Domain Research là ràng buộc');
    expect(setup).toContain("realityMode: z.enum(['grounded', 'speculative'])");
    expect(setup).toContain('không bác nó chỉ vì trái vật lý Trái Đất');
    expect(setup).toContain('Phải áp dụng realityPolicy');
    expect(setup).toContain('concepts: candidates');
  });

  test('Launch Architect must emit a connected directed travel graph', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    expect(setup).toContain('travelRules là đồ thị có hướng');
    expect(setup).toContain('có đường quay về');
  });

  test('Planner receives the absolute-time formula and complete repair evidence', () => {
    const planner = readFileSync('src/services/story-factory/planner.ts', 'utf8');
    const prompts = readFileSync('src/services/story-factory/prompts.ts', 'utf8');
    const validation = readFileSync('src/services/story-factory/validation.ts', 'utf8');
    expect(planner).toContain('time >= State.storyTimeMinutes + tổng mọi scene.dur + scene.travel');
    expect(planner).toContain('mỗi scene.dur bắt buộc trong khoảng 1-10000');
    expect(planner).toContain('tuyệt đối không dùng dur=0');
    expect(planner).toContain('change > 0 bắt buộc source khác null và sink=null');
    expect(planner).toContain('change < 0 bắt buộc sink khác null và source=null');
    expect(planner).toContain('không tạo delta change=0');
    expect(planner).toContain('primaryDeltaId');
    expect(planner).toContain('additionalDeltaIds');
    expect(planner).toContain("role: z.enum(['effect', 'support'])");
    expect(planner).toContain('Mỗi resource delta dương và mọi resource_state phải có đúng một effect owner');
    expect(planner).toContain('Resource_numeric âm chỉ được bỏ effect mechanic khi chủ sở hữu resource có mặt');
    expect(planner).toContain('availableMinutes=scene.dur+scene.travel');
    expect(planner).toContain('compiler sẽ sắp thứ tự dependency tất định trong scene');
    expect(planner).toContain('compiler là nguồn duy nhất tự sinh location delta');
    expect(planner).toContain('initialLocationsByCharacter');
    expect(planner).toContain('scene.travel phải >= thời gian shortest-path lớn nhất');
    expect(planner).toContain('Conversion phải gắn đủ delta đầu vào và đầu ra');
    expect(planner).not.toContain('lossesPerBatch');
    expect(planner).toContain('Conversion là một batch nguyên tử');
    expect(validation).toContain('validateCausalMechanics');
    expect(validation).toContain('Positive numeric deltas and all state-resource changes need exactly one active conversion/capability effect owner');
    expect(validation).toContain('causal validation issues');
    expect(validation).toContain('Schedule this capability after an earlier causal effect');
    expect(validation).toContain('exceeds scene capacity');
    expect(prompts).toContain('Không để Writer tự bịa tài xế, chủ xe, khoản nợ');
    expect(planner).not.toContain('numericResources: input.kernel.resources.flatMap');
    expect(prompts).toContain('Code đã kiểm số học, tài nguyên, thời gian, vị trí, công suất, quyền hạn');
    expect(planner).toContain('message: mechanicalError?.message');
    expect(planner).toContain('evidence: mechanicalError?.evidence ?? null');
    expect(prompts).toContain('Thời gian cuối chương là mốc tuyệt đối');
    expect(prompts).toContain('kernel.realityMode');
    expect(planner).toContain('domainPlausibility');
    expect(planner).toContain('target là chính nhân vật đổi thái độ');
    expect(planner).toContain('stateTransitionOwnership');
    expect(planner).toContain('judge_replan_mechanical_repair');
  });

  test('the release identity covers artifact compatibility only, not generation quality', () => {
    const release = readFileSync('src/services/story-factory/release.ts', 'utf8');
    const compat = release.slice(release.indexOf('const compatibilityIdentity'), release.indexOf('const revisionIdentity'));
    const revision = release.slice(release.indexOf('const revisionIdentity'), release.indexOf('function digest'));

    // Only versions that decide whether a persisted artifact still parses may gate
    // job claiming. Gating on prompt/planner/validator revisions meant every fix
    // orphaned the fleet and invalidated the benchmark the fix was made to pass.
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
    const runtime = readFileSync('src/services/story-factory/runtime.ts', 'utf8');
    expect(runtime).toContain('engine_revision: STORY_FACTORY_REVISION');
  });

  test('a transient infrastructure failure retries with backoff instead of parking the job', () => {
    const runtime = readFileSync('src/services/story-factory/runtime.ts', 'utf8');
    expect(runtime).toContain("factoryError.code === 'infra_blocked' && job.retry_count < INFRA_RETRY_LIMIT");
    // Semantic verdicts about the story are not retried — they need a human or a replan.
    expect(runtime).toContain("status: retryable ? 'ready' : factoryError.code");
  });

  test('the rewrite path runs in its own tick so no chapter exceeds the route ceiling', () => {
    const pipeline = readFileSync('src/services/story-factory/pipeline.ts', 'utf8');
    const runtime = readFileSync('src/services/story-factory/runtime.ts', 'utf8');
    const route = readFileSync('src/app/api/cron/story-factory/route.ts', 'utf8');
    const provider = readFileSync('src/services/story-factory/provider.ts', 'utf8');
    expect(pipeline).toContain('export async function draftStoryChapter');
    expect(pipeline).toContain('export async function reviseStoryChapter');
    expect(runtime).toContain("if (job.stage === 'revise') return runRevision(");

    // Two provider calls per tick must fit inside maxDuration with headroom.
    const maxDurationSeconds = Number(route.match(/maxDuration\s*=\s*(\d+)/)![1]);
    const providerTimeoutMs = Number(provider.match(/REQUEST_TIMEOUT_MS = (\d[\d_]*)/)![1].replace(/_/g, ''));
    expect(providerTimeoutMs * 2).toBeLessThan(maxDurationSeconds * 1000);
  });

  test('canary promotion requires the latest chapter-10 review on the exact release', () => {
    const migration = readFileSync(
      'supabase/migrations/20260726133707_story_factory_typed_causal_release.sql',
      'utf8',
    );
    expect(migration).toContain('ORDER BY finished_at DESC NULLS LAST, started_at DESC');
    expect(migration).toContain("latest_review_status IS DISTINCT FROM 'passed'");
    expect(migration).toContain('latest_review_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain('project.engine_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain("'allCausalPlansPassed'");
    expect(migration).toContain("'totalCostUsd'");
    expect(migration).toContain('setup_digest IS DISTINCT FROM job.launch_pack_digest');
  });

  test('run telemetry is terminally consistent and reader judges never see internal plans', () => {
    const migration = readFileSync(
      'supabase/migrations/20260725135035_story_factory_benchmark_v2_telemetry.sql',
      'utf8',
    );
    const benchmark = readFileSync('scripts/factory-benchmark.ts', 'utf8');
    const provider = readFileSync('src/services/story-factory/provider.ts', 'utf8');
    expect(migration).toContain('story_factory_runs_terminal_consistency_check');
    expect(migration).toContain("status = 'infra_blocked'");
    expect(migration).toContain("benchmark_protocol_version = 'legacy_incomparable'");
    expect(benchmark).toContain('buildBlindReaderComparison({');
    expect(benchmark).not.toContain('sample.plan');
    expect(benchmark).not.toContain('stateBefore');
    expect(benchmark).not.toContain('chapterPlan');
    expect(provider.match(/usage: response\.usage/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test('Editor provider schema stays bounded while application validation remains exact-ID', () => {
    const pipeline = readFileSync('src/services/story-factory/pipeline.ts', 'utf8');
    expect(pipeline).not.toContain('referenceId: exactStringSchema(input.referenceIds)');
    expect(pipeline).toContain('groundIssueEvidence validates exact membership');
    expect(pipeline).toContain('!validIds.has(issue.referenceId)');
    expect(pipeline).toContain('deltaId: exactStringSchema(input.deltaIds)');
  });

  test('Writer discovery selects two routes but promotion requires frozen sequential evidence', () => {
    const bakeoff = readFileSync('scripts/factory-model-bakeoff.ts', 'utf8');
    const validation = readFileSync('scripts/factory-benchmark.ts', 'utf8');
    const promotion = readFileSync(
      'supabase/migrations/20260728190942_story_factory_writer_bakeoff_v5.sql',
      'utf8',
    );
    expect(bakeoff).toContain('topTwoWriters');
    expect(bakeoff).toContain('comparisonWriters');
    expect(bakeoff).not.toContain('survivalLeaders');
    expect(bakeoff).toContain('initialAssessment: result.attemptTelemetry.initialAssessment');
    expect(validation).toContain('topTwoWriters.includes(input.writer)');
    expect(validation).toContain('sourceDiscoveryDigest');
    expect(promotion).toContain("output_artifact->'topTwoWriters'");
    expect(promotion).toContain("output_artifact->>'sourceDiscoveryDigest'");
    expect(promotion).toContain("output_artifact->'manifest'->>'competingSequentialRunId'");
    expect(promotion).toContain("metrics'->>'candidatePreference'");
    expect(promotion).toContain("'story-factory-validation-v5-pairwise-sequential-reader'");
    expect(promotion).toContain("'story-factory-writer-bakeoff-v5-reader-complete'");
    expect(promotion).toContain("'story-factory-sequential-survival-v3-frozen-causal-continuity'");
  });

  test('Writer bake-off cannot reuse historical plans or charge plan defects to a Writer', () => {
    const bakeoff = readFileSync('scripts/factory-model-bakeoff.ts', 'utf8');
    const sequential = readFileSync('scripts/factory-benchmark-build.ts', 'utf8');
    expect(bakeoff).toContain('WriterBakeoffCorpusSchema.parse');
    expect(bakeoff).toContain("status: assessmentHasInvalidArtifact(assessment) ? 'corpus_invalid' : 'writer_failed'");
    expect(bakeoff).toContain("status: 'infra_failed'");
    expect(bakeoff).toContain('A transport failure is not a completed sample');
    expect(bakeoff).not.toContain("'corpus_invalid', 'infra_failed'");
    expect(bakeoff).not.toContain('freezeCorpus');
    expect(bakeoff).not.toContain('normalizeHistoricalKernel');
    expect(bakeoff).not.toContain("from('story_factory_jobs')");
    expect(sequential).toContain('failedUsageCost(record.evidence)');
    expect(sequential).toContain('estimated_cost_usd: progress.buildCostUsd');
    expect(sequential).not.toContain('unbookedSetupCost');
    expect(sequential).toContain('telemetry: candidate.attemptTelemetry');
    expect(sequential).toContain("outcome: 'failed'");
    expect(sequential).toContain('failedChapterTelemetry(error)');
    expect(sequential).toContain('chapterAttempts: progress.chapterAttempts');
  });

  test('long-series memory uses indexed exact IDs and arc transitions are atomic', () => {
    const migration = readFileSync(
      'supabase/migrations/20260724074948_long_series_spine_exact_id_memory.sql',
      'utf8',
    );
    const runtime = readFileSync('src/services/story-factory/runtime.ts', 'utf8');
    expect(migration).toContain('related_entity_ids text[]');
    expect(migration).toContain('USING gin (related_entity_ids)');
    expect(migration).toContain('FUNCTION public.commit_story_factory_arc_transition');
    expect(migration).toContain('SECURITY INVOKER');
    expect(runtime).toContain("db.rpc('commit_story_factory_arc_transition'");
    expect(runtime).not.toContain("update({ arc_plan: result.lifecycle.nextArc");
  });

  test('one slow provider stage cannot be reclaimed by another worker', () => {
    // Assert the migration that actually defines the function last. Reading a fixed
    // historical file let 20260726133707 silently reinstate a 5 minute lease five hours
    // after 20260726091255 restored 30 minutes — the test kept passing while production
    // ran a lease exactly equal to maxDuration, discarding paid-for chapters on commit.
    const migration = readFileSync(latestMigrationDefining('public.claim_story_factory_job'), 'utf8');
    expect(migration).toContain("lease_until = now() + interval '30 minutes'");
    expect(migration).not.toContain("lease_until = now() + interval '5 minutes'");
    expect(migration).toContain('FOR UPDATE OF job SKIP LOCKED');
    expect(migration).toContain('SECURITY INVOKER');
  });

  test('the production gate is a mechanical smoke check, not a self-invalidating benchmark chain', () => {
    const migration = readFileSync(latestMigrationDefining('public.story_factory_release_is_approved'), 'utf8');
    const body = migration.slice(
      migration.indexOf('FUNCTION public.story_factory_release_is_approved('),
      migration.indexOf('FUNCTION public.claim_story_factory_job('),
    );
    expect(body).toContain("smoke.kind = 'smoke'");
    expect(body).toContain("(smoke.output_artifact->>'chaptersCompleted')::integer, 0) >= 5");
    expect(body).toContain("(smoke.output_artifact->>'criticalContinuityViolations')::integer, -1) = 0");
    // The four-run chain required every run to carry the current release, so any fix
    // destroyed the evidence it was made to obtain. None of it may gate claiming again.
    expect(body).not.toContain('writerBakeoffRunId');
    expect(body).not.toContain('competingSequentialRunId');
    expect(body).not.toContain('samplesCompleted');
  });

  test('the long-series outline is story-specific and never injected from a genre template', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    const context = readFileSync('src/services/story-factory/context.ts', 'utf8');
    expect(setup).toContain('seriesSpine có 8-15 stage');
    expect(setup).toContain('tổng target 800-1.200 chương');
    expect(context.slice(context.indexOf('export function buildWriterBrief'), context.indexOf('export function selectPreviousTail')))
      .not.toContain('seriesSpine');
  });
});
