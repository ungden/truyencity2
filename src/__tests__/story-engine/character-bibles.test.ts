/**
 * strideSampleTimeline — guards the Phase 0 bible-staleness fix.
 *
 * Bug history: refreshOneBible queried character_states with
 * `ascending: true` + `limit(100)`, so long novels got the OLDEST 100 rows and
 * "latest state" was really ~ch.100. The fix fetches DESC then stride-samples;
 * these tests pin the sampler's contract: chronological output, newest row
 * always last, oldest row always first, capped size.
 *
 * Run: npm test -- character-bibles
 */

import { strideSampleTimeline } from '@/services/story-engine/memory/character-bibles';

interface Row { chapter_number: number }

/** Build a DESC-ordered row list for chapters n..1 */
function descRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ chapter_number: n - i }));
}

describe('strideSampleTimeline', () => {
  it('returns all rows in chronological order when input fits the budget', () => {
    const out = strideSampleTimeline(descRows(50), 40, 60);
    expect(out).toHaveLength(50);
    expect(out[0].chapter_number).toBe(1);
    expect(out[out.length - 1].chapter_number).toBe(50);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].chapter_number).toBeGreaterThan(out[i - 1].chapter_number);
    }
  });

  it('caps output at recentCount + historyCount for long histories', () => {
    const out = strideSampleTimeline(descRows(400), 40, 60);
    expect(out).toHaveLength(100);
  });

  it('always keeps the NEWEST row last (the original bug dropped it)', () => {
    const out = strideSampleTimeline(descRows(400), 40, 60);
    expect(out[out.length - 1].chapter_number).toBe(400);
    // the full recent window survives intact
    const recent = out.slice(-40).map(r => r.chapter_number);
    expect(recent).toEqual(Array.from({ length: 40 }, (_, i) => 361 + i));
  });

  it('always keeps the OLDEST row first (origin/life-arc coverage)', () => {
    const out = strideSampleTimeline(descRows(400), 40, 60);
    expect(out[0].chapter_number).toBe(1);
  });

  it('stays strictly chronological after sampling', () => {
    const out = strideSampleTimeline(descRows(957), 40, 60);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].chapter_number).toBeGreaterThan(out[i - 1].chapter_number);
    }
  });

  it('spreads history samples across the whole span, not one window', () => {
    const out = strideSampleTimeline(descRows(1000), 40, 60);
    const history = out.slice(0, 60).map(r => r.chapter_number);
    // samples should reach deep into both early and late history (ch.1..960)
    expect(Math.min(...history)).toBe(1);
    expect(Math.max(...history)).toBeGreaterThan(900);
  });

  it('handles tiny inputs', () => {
    expect(strideSampleTimeline(descRows(1), 40, 60)).toHaveLength(1);
    expect(strideSampleTimeline([], 40, 60)).toHaveLength(0);
  });
});
