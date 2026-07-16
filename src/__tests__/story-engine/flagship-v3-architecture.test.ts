import { readFileSync } from 'node:fs';
import path from 'node:path';
import golden from '../fixtures/flagship-v3-golden.json';
import { classifyStoryFailure } from '@/lib/story-production-quota';
import {
  applyChapterStateV3,
  canTransitionFactoryV3,
  runV3ProsePreflight,
  type ChapterPlanV3,
  type StoryStateV3,
} from '@/services/story-engine/flagship-v3';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('flagship v3 architecture boundary', () => {
  it('dispatches v3 before v2 and before lazy legacy loading', () => {
    const dispatch = read('src/services/story-engine/dispatch.ts');
    expect(dispatch.indexOf("pipeline_version === 'flagship_v3'")).toBeLessThan(dispatch.indexOf("pipeline_version === 'flagship_v2'"));
    expect(dispatch.indexOf("pipeline_version === 'flagship_v3'")).toBeLessThan(dispatch.indexOf("import('./pipeline/orchestrator')"));
  });

  it('never imports legacy writer, templates, orchestrator or v2 prompts', () => {
    const files = [
      'contracts.ts', 'context.ts', 'preflight.ts', 'quality.ts', 'prompts.ts',
      'pipeline.ts', 'runtime.ts', 'rolling-planner.ts', 'concept-lab.ts', 'setup.ts',
    ];
    const forbidden = [
      '/pipeline/orchestrator', 'chapter-writer', '/templates/', 'golden fallback',
      '../flagship/prompts', 'routine_soft',
    ];
    for (const file of files) {
      const content = read(`src/services/story-engine/flagship-v3/${file}`);
      forbidden.forEach(term => expect(content).not.toContain(term));
    }
  });

  it('uses one v3 scheduler with terminal content blocks and no quality retry', () => {
    const route = read('src/app/api/cron/flagship-factory/route.ts');
    expect(route).toContain("pipeline_version: 'flagship_v3'");
    expect(route).toContain("'quality_blocked'");
    expect(route).toContain("'plan_blocked'");
    expect(route).not.toContain('recordQualityFailure');
    expect(route).not.toContain('decideFactoryQualityRetry');
    expect(canTransitionFactoryV3('quality_blocked', 'ready')).toBe(false);
    expect(canTransitionFactoryV3('plan_blocked', 'ready')).toBe(false);
  });

  it('ships immutable attempts, security-invoker operator view and stale reconciliation', () => {
    const migration = read('supabase/migrations/20260716104150_flagship_v3_factory_core.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.story_chapter_attempts');
    expect(migration).toContain('FLAGSHIP_V3_FINISHED_ATTEMPT_IMMUTABLE');
    expect(migration).toContain('WITH (security_invoker = true)');
    expect(migration).toContain('reconcile_stale_story_runs_v3');
    expect(migration).toContain('commit_flagship_chapter_v3');
    expect(migration).toContain('realized_delta_evidence');
    expect(migration).toContain('estimated_cost_usd');
    expect(migration).toContain('REVOKE ALL ON public.factory_story_status_v3 FROM PUBLIC, anon, authenticated');
  });
});

describe('flagship v3 golden production failures', () => {
  const plan = {
    chapterPromise: 'Sơn phải giữ được mẻ cá qua trận mưa đầu tiên bằng kỹ thuật có thể kiểm chứng.',
    nextChapterPressure: 'Trời sáng, mẻ cá giữ được độ dẻo nhưng gã cò mồi Gã Bảy đã xông thẳng vào sân.',
    scenes: [{
      desire: 'Sơn muốn giữ lô cá không bị nhũn trước khi mưa tràn vào sân.',
      opposition: 'Mái che dột và gia đình chỉ còn một lượng muối sạch hữu hạn.',
      tactic: 'Sơn chia cá thành lớp mỏng rồi tự cân lượng muối cần dùng.',
      cost: 'Gia đình mất phần lớn số muối sạch còn lại sau lần thử đầu tiên.',
      payoff: 'Lô cá vẫn giữ được thớ thịt sau khi trận mưa đi qua.',
      irreversibleChange: 'Gia đình có bằng chứng đầu tiên rằng phương pháp của Sơn hiệu quả.',
      informationDelta: 'Mẹ Sơn hiểu tỷ lệ muối cần thiết cho mẻ cá nhỏ.',
      unresolvedQuestion: 'Gã thu mua sẽ phản ứng thế nào khi không thể dùng hàng hỏng để ép giá.',
    }],
  } as ChapterPlanV3;

  for (const item of golden) {
    if (item.kind === 'preflight') {
      it(`catches ${item.id}`, () => {
        expect(runV3ProsePreflight(item.content!, plan).map(evidence => evidence.code)).toContain(item.expectedCode);
      });
    }
    if (item.kind === 'provider') {
      it(`classifies ${item.id}`, () => {
        expect(classifyStoryFailure(item.content!)).toBe(item.expectedClass);
      });
    }
    if (item.kind === 'negative_preflight') {
      it(`does not recreate ${item.id}`, () => {
        expect(runV3ProsePreflight(item.content!, plan).map(evidence => evidence.code)).not.toContain(item.forbiddenCode);
      });
    }
  }
});

describe('flagship v3 long-story state bounds', () => {
  it('simulates 1200 committed transitions without unbounded snapshot growth', () => {
    let state: StoryStateV3 = {
      schemaVersion: 3,
      chapterNumber: 0,
      facts: [{ id: 'progress', value: 'chapter zero', sourceChapter: 0 }],
      timeline: [],
      characters: [{
        characterId: 'main',
        status: 'alive',
        locationId: 'home',
        knowledge: [],
        relationshipState: 'Main đang tự chịu trách nhiệm cho lựa chọn của mình.',
      }],
      resources: [{
        resourceId: 'cash',
        value: { mode: 'numeric', amount: 0, unit: 'dong' },
        source: 'initial',
        lastChangedChapter: 0,
      }],
      promises: [{ promiseId: 'ending', status: 'open', pressure: 'Cơ nghiệp chưa hoàn thành.' }],
      recentSummary: '',
      previousEnding: '',
      retrievalNotes: [],
    };
    for (let chapter = 1; chapter <= 1200; chapter += 1) {
      const plan = {
        schemaVersion: 3,
        chapterNumber: chapter,
        chapterPromise: `Chương ${chapter} tạo một bước tiến có nguồn và hậu quả rõ ràng.`,
        preconditions: [],
        scenes: [{
          id: `scene_${chapter}_a`,
          povCharacterId: 'main',
          participantIds: ['main'],
          locationId: 'home',
          startMinute: chapter * 10,
          durationMinutes: 5,
          travelMinutesFromPrevious: 0,
          desire: 'Main muốn tạo một đơn vị tiến bộ có thể kiểm chứng trong chương này.',
          opposition: 'Nguồn lực hữu hạn buộc Main phải trả chi phí trước khi nhận kết quả.',
          tactic: 'Main hoàn thành giao dịch và lưu lại bằng chứng thay đổi nguồn lực.',
          cost: 'Main dành thời gian và công sức thật cho giao dịch của chương.',
          payoff: 'Nguồn lực tăng đúng một đơn vị sau giao dịch đã hoàn thành.',
          irreversibleChange: 'Tổng nguồn lực đã thay đổi và được commit vào state.',
          informationDelta: 'Main biết kết quả của giao dịch vừa hoàn tất.',
          hookIntent: 'opportunity_opens',
          unresolvedQuestion: 'Cơ hội kế tiếp sẽ yêu cầu Main đánh đổi nguồn lực nào.',
          requiredDeltaIds: [`cash_${chapter}`, `progress_${chapter}`],
        }],
        requiredDeltas: [
          { id: `cash_${chapter}`, kind: 'resource_numeric', resourceId: 'cash', before: chapter - 1, delta: 1, after: chapter, unit: 'dong', source: 'completed work', sink: 'none', evidenceRequired: true },
          { id: `progress_${chapter}`, kind: 'fact', factId: 'progress', valueAfter: `chapter ${chapter}`, evidenceRequired: true },
        ],
        nextChapterPressure: 'Bước tiến kế tiếp cần một lựa chọn mới thay vì lặp lại giao dịch cũ.',
      } as ChapterPlanV3;
      state = applyChapterStateV3({
        state,
        plan,
        title: `Chapter ${chapter}`,
        content: `Committed chapter ${chapter}.`,
        realizedDeltaIds: plan.requiredDeltas.map(delta => delta.id),
      });
    }
    expect(state.chapterNumber).toBe(1200);
    expect(state.timeline).toHaveLength(100);
    expect(state.facts).toHaveLength(1);
    expect(state.resources).toHaveLength(1);
    expect(state.resources[0].value).toEqual({ mode: 'numeric', amount: 1200, unit: 'dong' });
  });
});
