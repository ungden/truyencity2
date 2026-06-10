/**
 * Quality Overhaul Phase 1 — unit tests for the new pure decision functions.
 *
 *  - decideGateAction: critic-directed revise pass gate (1.1)
 *  - applyContextBudget: tier-aware context trimming (1.3)
 *  - extractMotifs / isBannedMotif: cross-chapter repetition tracker (1.6)
 *  - shouldTripBreaker: quality circuit breaker (1.5)
 *
 * Run: npm test -- quality-overhaul-phase1
 */

import { decideGateAction } from '@/services/story-engine/pipeline/chapter-writer';
import { applyContextBudget } from '@/services/story-engine/context/assembler';
import { extractMotifs, isBannedMotif } from '@/services/story-engine/quality/repetition-tracker';
import { shouldTripBreaker } from '@/services/story-engine/quality/circuit-breaker';
import type { CriticOutput, CriticIssue } from '@/services/story-engine/types';

function critic(overrides: Partial<CriticOutput> & { issues?: CriticIssue[] }): CriticOutput {
  return {
    overallScore: 7.5,
    dopamineScore: 7,
    pacingScore: 7,
    approved: true,
    requiresRewrite: false,
    issues: [],
    ...overrides,
  } as CriticOutput;
}

const issue = (type: string, severity: string, description = 'x'): CriticIssue =>
  ({ type, severity, description } as CriticIssue);

describe('decideGateAction (1.1)', () => {
  it('accepts a clean APPROVE chapter without revision', () => {
    expect(decideGateAction(critic({}), 7.5, 7, 'standard', true)).toBe('accept');
  });

  it('REVISE verdict (score 5-6) in soft-gate mode triggers revise pass, not blind accept', () => {
    const c = critic({ overallScore: 5.5, approved: false });
    expect(decideGateAction(c, 5.5, 5, 'routine_soft', true)).toBe('revise_then_accept');
  });

  it('soft-gate path with major pacing issue triggers revise pass (old code shipped it untouched)', () => {
    const c = critic({ overallScore: 6.5, approved: true, issues: [issue('pacing', 'major')] });
    expect(decideGateAction(c, 6.5, 5, 'routine_soft', true)).toBe('revise_then_accept');
  });

  it('moderate pile-up (≥4) triggers revise pass even when approved', () => {
    const c = critic({
      overallScore: 7.2,
      issues: [issue('repetition', 'moderate'), issue('quality', 'moderate'), issue('comedy', 'moderate'), issue('template_pattern', 'moderate')],
    });
    expect(decideGateAction(c, 7.2, 7, 'standard', true)).toBe('revise_then_accept');
  });

  it('3 moderates do NOT trigger revision', () => {
    const c = critic({
      overallScore: 7.2,
      issues: [issue('repetition', 'moderate'), issue('quality', 'moderate'), issue('comedy', 'moderate')],
    });
    expect(decideGateAction(c, 7.2, 7, 'standard', true)).toBe('accept');
  });

  it('hard continuity blocker in soft-gate mode still retries (soft gate never accepts it)', () => {
    const c = critic({ overallScore: 6, approved: false, issues: [issue('continuity', 'major')] });
    expect(decideGateAction(c, 6, 5, 'routine_soft', true)).toBe('retry');
  });

  it('failed gate in standard mode retries', () => {
    const c = critic({ overallScore: 5, approved: false, requiresRewrite: true });
    expect(decideGateAction(c, 5, 7, 'standard', true)).toBe('retry');
  });

  it('flag off restores legacy behavior: soft gate accepts unrevised', () => {
    const c = critic({ overallScore: 5.5, approved: false, issues: [issue('pacing', 'major')] });
    expect(decideGateAction(c, 5.5, 5, 'routine_soft', false)).toBe('accept');
  });
});

describe('applyContextBudget (1.3)', () => {
  const mk = (len: number, ch: string) => ch.repeat(len);

  it('returns everything untouched when under budget', () => {
    const parts = [mk(100, 'a'), mk(100, 'b')];
    const res = applyContextBudget(parts, [0, 2], 10_000);
    expect(res.trimmedTiers).toEqual([]);
    expect(res.text).toContain('aaa');
    expect(res.text).toContain('bbb');
  });

  it('drops tier 3 first, preserves tier 0 verbatim', () => {
    const tier0 = mk(5_000, 'k'); // kernel/bridge/bibles
    const tier3a = mk(5_000, 'x'); // oldest full prose
    const tier3b = mk(5_000, 'y');
    const res = applyContextBudget([tier0, tier3a, tier3b], [0, 3, 3], 11_000);
    expect(res.text).toContain(tier0);
    expect(res.text).not.toContain('xxx');
    expect(res.trimmedTiers).toContain(3);
  });

  it('halves tier 2 before dropping it', () => {
    const tier0 = mk(2_000, 'k');
    const tier2 = mk(8_000, 'r'); // RAG
    const res = applyContextBudget([tier0, tier2], [0, 2], 7_000);
    expect(res.text).toContain(tier0);
    // halved, not dropped
    expect(res.text).toMatch(/r{1000,}/);
    expect(res.text.length).toBeLessThanOrEqual(7_000);
    expect(res.trimmedTiers).toContain(2);
  });

  it('never touches tier 0 even when budget is impossible', () => {
    const tier0 = mk(20_000, 'k');
    const res = applyContextBudget([tier0], [0], 5_000);
    expect(res.text).toBe(tier0);
  });

  it('drops tier-3 items oldest-first (array order)', () => {
    const tier0 = mk(1_000, 'k');
    const old3 = mk(3_000, 'o');
    const new3 = mk(3_000, 'n');
    const res = applyContextBudget([tier0, old3, new3], [0, 3, 3], 5_000);
    expect(res.text).not.toContain('ooo');
    expect(res.text).toContain('nnn');
  });
});

describe('extractMotifs / isBannedMotif (1.6)', () => {
  it('detects lexicon imagery phrases', () => {
    const content = 'Hắn nhìn ra cửa sổ, ánh ban mai chiếu qua tấm rèm. Khóe miệng cong lên thành một nụ cười.';
    const motifs = extractMotifs(content);
    expect(motifs).toContain('ánh ban mai');
    expect(motifs).toContain('khóe miệng cong lên');
  });

  it('detects repeated 4-gram pet phrases within a chapter', () => {
    const pet = 'bàn tay gõ nhịp lên mặt bàn gỗ';
    const filler = 'Trời hôm nay nắng đẹp, phố xá đông đúc người qua lại buôn bán tấp nập.';
    const content = `${pet}. ${filler} ${pet}. ${filler}`;
    const motifs = extractMotifs(content);
    expect(motifs.some(m => m.includes('gõ nhịp lên mặt'))).toBe(true);
  });

  it('ignores stopword-heavy n-grams', () => {
    const content = 'của và là một của và là một của và là một';
    expect(extractMotifs(content)).toEqual([]);
  });

  it('bans motif used in 3 of last 5 chapters', () => {
    expect(isBannedMotif([95, 97, 99], 100)).toBe(true);
    expect(isBannedMotif([95, 99], 100)).toBe(false);
    // old uses outside the window don't count
    expect(isBannedMotif([10, 11, 12], 100)).toBe(false);
    // the current chapter itself doesn't count toward its own ban
    expect(isBannedMotif([100], 100)).toBe(false);
  });
});

describe('shouldTripBreaker (1.5)', () => {
  it('trips only on 2 consecutive criticals', () => {
    expect(shouldTripBreaker('critical', 'critical')).toBe(true);
    expect(shouldTripBreaker('critical', 'warn')).toBe(false);
    expect(shouldTripBreaker('critical', null)).toBe(false);
    expect(shouldTripBreaker('warn', 'critical')).toBe(false);
  });
});
