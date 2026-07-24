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
  });

  test('narrative outcomes stay out of Writer context and each rolling window is reviewed', () => {
    const context = readFileSync('src/services/story-factory/context.ts', 'utf8');
    const writerBriefBody = context.slice(context.indexOf('export function buildWriterBrief'), context.indexOf('export function selectPreviousTail'));
    expect(writerBriefBody).not.toContain('recentOutcomes');
    expect(context).toContain('recentOutcomes: input.state.recentOutcomes');
    const migration = readFileSync('supabase/migrations/20260722072832_canonical_story_outcomes.sql', 'utf8');
    expect(migration).toContain('p_expected_chapter % 5 = 0');
    expect(migration).not.toContain('p_expected_chapter % 10 = 0');
  });

  test('Concept Generator receives the stable-ID rule that provider schemas cannot enforce', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    expect(setup).toContain('Mỗi concept.id phải là stable ID ASCII chữ thường');
    expect(setup).toContain('chỉ dùng a-z, 0-9, dấu gạch dưới hoặc gạch ngang');
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
    expect(setup).toContain('Không được chỉ khai một chiều');
  });

  test('Planner receives the absolute-time formula and complete repair evidence', () => {
    const planner = readFileSync('src/services/story-factory/planner.ts', 'utf8');
    const prompts = readFileSync('src/services/story-factory/prompts.ts', 'utf8');
    expect(planner).toContain('time >= State.storyTimeMinutes + tổng mọi scene.dur + scene.travel');
    expect(planner).toContain('message: lastError.message');
    expect(planner).toContain('evidence: lastError.evidence ?? null');
    expect(prompts).toContain('Thời gian cuối chương là mốc tuyệt đối');
  });

  test('canary promotion requires the latest chapter-10 review on the exact release', () => {
    const migration = readFileSync(
      'supabase/migrations/20260724062050_continuity_correction_audit_gate.sql',
      'utf8',
    );
    expect(migration).toContain('ORDER BY finished_at DESC NULLS LAST, started_at DESC');
    expect(migration).toContain("latest_review_status IS DISTINCT FROM 'passed'");
    expect(migration).toContain('latest_review_release IS DISTINCT FROM p_engine_release');
    expect(migration).toContain('project_release IS DISTINCT FROM p_engine_release');
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

  test('the long-series outline is story-specific and never injected from a genre template', () => {
    const setup = readFileSync('src/services/story-factory/setup.ts', 'utf8');
    const context = readFileSync('src/services/story-factory/context.ts', 'utf8');
    expect(setup).toContain('seriesSpine phải có 8-15 stage');
    expect(setup).toContain('tổng target 800-1.200 chương');
    expect(context.slice(context.indexOf('export function buildWriterBrief'), context.indexOf('export function selectPreviousTail')))
      .not.toContain('seriesSpine');
  });
});
