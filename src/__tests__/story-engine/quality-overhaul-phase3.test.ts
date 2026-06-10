/**
 * Quality Overhaul Phase 3 — setup + ending planning unit tests.
 *
 *  - 3.1 shouldRefineEndgame trigger + formatEndgameContext phases
 *  - 3.2 getRequiredCanonArtifacts per genre
 *  - 3.4 normalizeWorldRules legacy/provenance shapes
 *
 * Run: npm test -- quality-overhaul-phase3
 */

import { shouldRefineEndgame, formatEndgameContext } from '@/services/story-engine/plan/ending-plan';
import { getRequiredCanonArtifacts } from '@/services/story-engine/plan/setup-canon-spawn';
import { normalizeWorldRules } from '@/services/story-engine/plan/story-outline';
import type { EndgamePlan } from '@/services/story-engine/plan/master-outline';

const endgame: EndgamePlan = {
  climaxArc: {
    startChapter: 900,
    endChapter: 970,
    description: 'Hội tụ thương chiến cuối với tập đoàn Hoàng Gia.',
    convergingThreads: ['Thương vụ cảng nước sâu', 'Bí mật cổ phần của cha'],
    finalConfrontation: 'Phiên đấu giá quyết định quyền kiểm soát tập đoàn.',
  },
  resolutionArc: {
    startChapter: 971,
    endChapter: 1000,
    beats: ['Tái cấu trúc tập đoàn', 'Hôn lễ', 'Bàn giao thế hệ'],
  },
  finalState: 'MC đứng đầu hệ sinh thái kinh doanh quốc gia, gia đình viên mãn.',
  mustResolveThreads: ['Thương vụ cảng nước sâu'],
  epilogueBeats: ['5 năm sau — công ty lên sàn quốc tế'],
  source: 'refined',
  refinedAtChapter: 700,
};

describe('3.1 shouldRefineEndgame', () => {
  it('does not trigger before 70% progress', () => {
    expect(shouldRefineEndgame(600, 1000, undefined)).toBe(false);
  });

  it('triggers at ≥70% when no refined plan exists', () => {
    expect(shouldRefineEndgame(700, 1000, undefined)).toBe(true);
    expect(shouldRefineEndgame(700, 1000, { ...endgame, source: 'initial' })).toBe(true);
  });

  it('refines only once', () => {
    expect(shouldRefineEndgame(800, 1000, endgame)).toBe(false);
  });

  it('never triggers without a planned total', () => {
    expect(shouldRefineEndgame(900, null, undefined)).toBe(false);
    expect(shouldRefineEndgame(900, 0, undefined)).toBe(false);
  });
});

describe('3.1 formatEndgameContext phase guidance', () => {
  it('pre-climax: setup guidance', () => {
    const ctx = formatEndgameContext(endgame, 890, 1000);
    expect(ctx).toContain('[ENDGAME PLAN');
    expect(ctx).toContain('SẮP VÀO CLIMAX');
  });

  it('climax arc: escalate-with-direction guidance', () => {
    const ctx = formatEndgameContext(endgame, 930, 1000);
    expect(ctx).toContain('ĐANG Ở CLIMAX ARC');
  });

  it('resolution arc: no-new-escalation guidance', () => {
    const ctx = formatEndgameContext(endgame, 980, 1000);
    expect(ctx).toContain('ĐANG Ở RESOLUTION ARC');
    expect(ctx).toContain('KHÔNG mở conflict');
  });

  it('includes must-resolve threads and final state', () => {
    const ctx = formatEndgameContext(endgame, 930, 1000);
    expect(ctx).toContain('Thương vụ cảng nước sâu');
    expect(ctx).toContain('TRẠNG THÁI CUỐI');
  });
});

describe('3.2 getRequiredCanonArtifacts', () => {
  it('always requires worldCanon + foreshadowing', () => {
    for (const genre of ['tien-hiep', 'do-thi', null]) {
      const req = getRequiredCanonArtifacts(genre);
      expect(req).toContain('worldCanon');
      expect(req).toContain('foreshadowing');
    }
  });

  it('requires powerSystem for combat genres only', () => {
    expect(getRequiredCanonArtifacts('tien-hiep')).toContain('powerSystem');
    // do-thi is a proactive/non-combat genre — no power ladder needed
    expect(getRequiredCanonArtifacts('do-thi')).not.toContain('powerSystem');
  });
});

describe('3.4 normalizeWorldRules', () => {
  it('accepts legacy plain strings', () => {
    const out = normalizeWorldRules(['Hệ Thống chỉ active trong bếp']);
    expect(out).toEqual([{ rule: 'Hệ Thống chỉ active trong bếp' }]);
  });

  it('accepts provenance objects and mixed arrays', () => {
    const out = normalizeWorldRules([
      'rule A',
      { rule: 'rule B', introducedAt: 'setup' },
      { rule: 'rule C', introducedAt: 15 },
    ]);
    expect(out).toHaveLength(3);
    expect(out[2]).toEqual({ rule: 'rule C', introducedAt: 15 });
  });

  it('drops empty/invalid entries and handles null', () => {
    expect(normalizeWorldRules(null)).toEqual([]);
    expect(normalizeWorldRules([''])).toEqual([]);
  });
});
