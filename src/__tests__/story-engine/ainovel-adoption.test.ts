import { assembleContext } from '@/services/story-engine/context/assembler';
import { decideNextProductionAction } from '@/lib/story-production-flow';
import { resolveStoryRules, validateStoryRules } from '@/services/story-engine/quality/story-rules';
import { analyzeStyleHabits } from '@/services/story-engine/quality/style-habits';
import { digestObject } from '@/services/story-engine/pipeline/write-run-ledger';
import type { ContextPayload } from '@/services/story-engine/types';

function minimalPayload(overrides: Partial<ContextPayload> = {}): ContextPayload {
  return {
    hasStoryBible: false,
    recentChapters: [],
    previousTitles: [],
    recentOpenings: [],
    recentCliffhangers: [],
    knownCharacterNames: [],
    ...overrides,
  };
}

describe('ainovel-inspired context assembly', () => {
  it('assembles real context without recursive push and emits block diagnostics', () => {
    const diagnostics: Array<{ label: string; status: string }> = [];
    const text = assembleContext(
      minimalPayload({
        worldDescription: 'Một thế giới đô thị nơi nhân vật chính dùng ký ức kinh doanh để thắng.',
        storyOutline: {
          title: 'Minh Ký',
          genre: 'do-thi',
          targetChapters: 200,
          premise: 'MC làm lại từ đầu.',
          mainConflict: 'Đối thủ thao túng thị trường.',
          themes: ['kinh doanh', 'gia đình'],
          protagonist: { name: 'Minh', startingState: 'nghèo', endGoal: 'tự do tài chính', characterArc: 'tự tin hơn' },
          majorPlotPoints: [{ chapter: 3, event: 'Minh chốt deal đầu tiên', name: 'Mở công ty', description: 'Minh chốt deal đầu tiên' }],
          uniqueHooks: ['VN business'],
          endingVision: 'Xây empire sạch.',
        },
        previousSummary: 'Minh vừa ký hợp đồng đầu tiên.',
        previousCliffhanger: 'Đối thủ gửi tối hậu thư.',
      }),
      2,
      {
        maxChars: 50_000,
        onDiagnostics: (d) => diagnostics.push(...d),
      },
    );
    expect(text).toContain('[WORLD DESCRIPTION');
    expect(text).toContain('[STORY OUTLINE');
    expect(text).toContain('[CẦU NỐI CHƯƠNG');
    expect(text).toContain('[PROJECT STORY RULES');
    expect(diagnostics.some(d => d.label.includes('WORLD DESCRIPTION'))).toBe(true);
  });
});

describe('story production flow router', () => {
  it('routes due resume projects to resume', () => {
    expect(decideNextProductionAction({
      projectId: 'p1',
      status: 'active',
      currentChapter: 12,
      totalPlannedChapters: 200,
      hasNovel: true,
      quotaDue: true,
      hasValidSetupKernel: true,
    }).action).toBe('resume');
  });

  it('routes ready chapter-zero projects to init-write', () => {
    expect(decideNextProductionAction({
      projectId: 'p1',
      status: 'active',
      currentChapter: 0,
      totalPlannedChapters: 200,
      hasNovel: true,
      quotaDue: true,
      setupStage: 'ready_to_write',
      hasArcPlan: true,
      hasFullSetup: true,
      hasValidSetupKernel: true,
      hasCanonAndPassedReview: true,
    }).action).toBe('init-write');
  });

  it('routes missing canon chapter-zero projects back to init-prep', () => {
    expect(decideNextProductionAction({
      projectId: 'p1',
      status: 'active',
      currentChapter: 0,
      totalPlannedChapters: 200,
      hasNovel: true,
      quotaDue: true,
      setupStage: 'ready_to_write',
      hasArcPlan: true,
      hasFullSetup: true,
      hasValidSetupKernel: true,
      hasCanonAndPassedReview: false,
    }).reason).toBe('missing_canon_or_foundation_review');
  });
});

describe('story rules', () => {
  it('merges defaults with project overrides and detects violations', () => {
    const rules = resolveStoryRules({
      story_rules: {
        chapter_words: { min: 5, max: 20 },
        forbidden_phrases: ['cấm dùng'],
        fatigue_words: { 'đột nhiên': 1 },
        required_currency: 'VND',
      },
    });
    const violations = validateStoryRules('đột nhiên cấm dùng 10 xu rồi đột nhiên rời đi', rules, 8);
    expect(violations.map(v => v.rule)).toEqual(expect.arrayContaining([
      'forbidden_phrases',
      'fatigue_words',
      'required_currency',
    ]));
  });
});

describe('style habits', () => {
  it('detects repeated sentence and opening habits across chapters', () => {
    const chapters = [1, 2, 3, 4].map((n) => ({
      chapter_number: n,
      content: `Sáng hôm đó, Minh đứng bên cửa sổ nhìn xuống phố.\n\nCâu văn này được lặp lại nguyên xi để test detector. Anh bước ra ngoài và chốt một deal mới.\n\nĐêm xuống, mọi thứ im lặng.`,
    }));
    const stats = analyzeStyleHabits(chapters);
    expect(stats.repeatedSentences.length).toBeGreaterThan(0);
    expect(stats.openingPatternRate).toBeGreaterThanOrEqual(0.5);
    expect(stats.warnings.length).toBeGreaterThan(0);
  });
});

describe('write-run ledger helpers', () => {
  it('hashes objects stably for checkpoint idempotency', () => {
    expect(digestObject({ b: 2, a: { z: 1, y: 0 } })).toBe(digestObject({ a: { y: 0, z: 1 }, b: 2 }));
  });
});
