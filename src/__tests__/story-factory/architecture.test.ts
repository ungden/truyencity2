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
    expect(prompts).toContain('không được tự tạo thay đổi trạng thái bền vững ngoài requiredDeltas');
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
    expect(writerBriefBody).not.toContain('uniqueMechanism');
    expect(writerBriefBody).not.toContain('durationMinutes: scene.durationMinutes');
    expect(writerBriefBody).not.toContain('travelMinutesFromPrevious: scene.travelMinutesFromPrevious');
    expect(writerBriefBody).not.toContain('genreLane: input.kernel.genreLane');
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
    expect(planner).toContain('for (let attempt = 1; attempt <= 2; attempt += 1)');
    expect(pipeline).not.toContain('planJudge');
    expect(benchmark).toContain('Current Planner and Plan Judge must pass exactly chapters 1-5');
    expect(benchmark).toContain('writeStoryChapter({');
    expect(benchmark).toContain('assessSequentialContinuity({');
    expect(benchmark).not.toContain('convertPack');
    expect(benchmark).not.toContain('SOURCE_REF');
    expect(routes).toContain("planner: 'gemini-3.1-pro-preview'");
    expect(routes).toContain("planJudge: 'gemini-2.5-pro'");
  });

  test('Concept Generator receives the stable-ID rule that provider schemas cannot enforce', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    expect(setup).toContain('Mỗi concept.id phải là stable ID ASCII chữ thường');
    expect(setup).toContain('chỉ dùng a-z, 0-9, dấu gạch dưới hoặc gạch ngang');
    expect(setup).toContain('chỉ là một cụm phân loại tối đa 12 từ');
    expect(setup).not.toContain('600-900');
    expect(setup).not.toContain('min(1_200)');
    expect(setup).toContain('Không kéo dài để đạt số từ');
    expect(setup).toContain('Mọi longPromises.promiseId');
    expect(setup).toContain('phải tham chiếu ID trong promises');
    expect(setup).toContain('schema: LaunchIdentitySchema');
    expect(setup).toContain('schema: LaunchWorldSchema');
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
    expect(planner).toContain('time >= State.storyTimeMinutes + tổng mọi scene.dur + scene.travel');
    expect(planner).toContain('mỗi scene.dur bắt buộc trong khoảng 1-10000');
    expect(planner).toContain('tuyệt đối không dùng dur=0');
    expect(planner).toContain('change > 0 bắt buộc source khác null và sink=null');
    expect(planner).toContain('change < 0 bắt buộc sink khác null và source=null');
    expect(planner).toContain('không tạo delta change=0');
    expect(planner).toContain('vật tư bị dùng/tiêu hao phải có delta giảm');
    expect(prompts).toContain('không được giả định Writer sẽ tự bịa một giao dịch hay nhân vật phụ');
    expect(prompts).toContain('Không để Writer tự bịa tài xế, chủ xe, khoản nợ');
    expect(planner).toContain('requiredWorldRules: chapter.requiredWorldRuleIds.map');
    expect(planner).toContain('numericResources: input.kernel.resources.flatMap');
    expect(prompts).toContain('Rule cần muối, nhiên liệu, điện, vật liệu hay công cụ');
    expect(planner).toContain('message: lastError.message');
    expect(planner).toContain('evidence: lastError.evidence ?? null');
    expect(prompts).toContain('Thời gian cuối chương là mốc tuyệt đối');
  });

  test('Planner contract changes participate in the engine release identity', () => {
    const release = readFileSync('src/services/story-factory/release.ts', 'utf8');
    expect(release).toContain('plannerVersion: FACTORY_PLANNER_VERSION');
  });

  test('canary promotion requires the latest chapter-10 review on the exact release', () => {
    const migration = readFileSync(
      'supabase/migrations/20260726084642_story_factory_sequential_validation_v3.sql',
      'utf8',
    );
    expect(migration).toContain('ORDER BY finished_at DESC NULLS LAST, started_at DESC');
    expect(migration).toContain("latest_review_status IS DISTINCT FROM 'passed'");
    expect(migration).toContain('latest_review_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain('project.engine_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain("benchmark.benchmark_protocol_version IS DISTINCT FROM 'story-factory-validation-v3-sequential-reader'");
    expect(migration).toContain("'story-factory-writer-bakeoff-v2-plan-qualified'");
    expect(migration).toContain("'story-factory-sequential-survival-v1'");
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
    expect(benchmark).toContain('buildBlindReaderInput({ sample })');
    expect(benchmark).not.toContain('sample.plan');
    expect(benchmark).not.toContain('stateBefore');
    expect(benchmark).not.toContain('chapterPlan');
    expect(provider.match(/usage: response\.usage/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test('Writer bake-off cannot reuse historical plans or charge plan defects to a Writer', () => {
    const bakeoff = readFileSync('scripts/factory-model-bakeoff.ts', 'utf8');
    const sequential = readFileSync('scripts/factory-benchmark-build.ts', 'utf8');
    expect(bakeoff).toContain('WriterBakeoffCorpusSchema.parse');
    expect(bakeoff).toContain("status: assessmentHasInvalidArtifact(assessment) ? 'corpus_invalid' : 'writer_failed'");
    expect(bakeoff).not.toContain('freezeCorpus');
    expect(bakeoff).not.toContain('normalizeHistoricalKernel');
    expect(bakeoff).not.toContain("from('story_factory_jobs')");
    expect(sequential).toContain('failedUsageCost(record.evidence)');
    expect(sequential).toContain('estimated_cost_usd: progress.buildCostUsd + unbookedSetupCost');
    expect(sequential).toContain('telemetry: candidate.attemptTelemetry');
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
