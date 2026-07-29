import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function files(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap(entry => {
    const target = path.join(root, entry);
    return statSync(target).isDirectory() ? files(target) : [target];
  });
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
    expect(prompts).toContain('không được tự tạo thay đổi trạng thái bền vững ngoài requiredChanges');
    expect(prompts).toContain('prose tự tạo bất kỳ thay đổi trạng thái bền vững nào không có trong requiredDeltas');
    expect(prompts).toContain('draft bỏ sót, kết thúc trước, hiểu sai hoặc tự bịa chi tiết');
    expect(prompts).toContain('luôn dùng scope=prose');
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
  });

  test('Planner contract changes participate in the engine release identity', () => {
    const release = readFileSync('src/services/story-factory/release.ts', 'utf8');
    expect(release).toContain('plannerVersion: FACTORY_PLANNER_VERSION');
    expect(release).toContain('causalValidatorVersion: CAUSAL_VALIDATOR_VERSION');
    expect(release).toContain('contextProjectionVersion: FACTORY_CONTEXT_VERSION');
    expect(release).toContain('memoryPolicyVersion: FACTORY_MEMORY_POLICY_VERSION');
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
    const migration = readFileSync(
      'supabase/migrations/20260726091255_restore_story_factory_30_minute_lease_v3.sql',
      'utf8',
    );
    expect(migration).toContain("lease_until = now() + interval '30 minutes'");
    expect(migration).not.toContain("lease_until = now() + interval '5 minutes'");
    expect(migration).toContain('FOR UPDATE OF job SKIP LOCKED');
    expect(migration).toContain('SECURITY INVOKER');
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
