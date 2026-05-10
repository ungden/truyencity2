import { syncBlueprintToDb } from '@/services/story-engine/blueprint/sync';
import { UNIVERSAL_BANNED_PATTERNS, UNIVERSAL_TONE_DIRECTIVES } from '@/services/story-engine/blueprint/universal-bans';
import type { NovelBlueprint } from '@/services/story-engine/blueprint/types';

function fakeDb(captured: { rows: any[] }) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      upsert: async (row: any) => {
        captured.rows.push(row);
        return { error: null };
      },
    }),
  } as any;
}

const minimalBlueprint: NovelBlueprint = {
  id: 'test-novel',
  title: 'Test Novel',
  slug: 'test-novel',
  genre: 'di-gioi',
  totalChapters: 100,
  arcs: [
    {
      arc: {
        arcNumber: 1,
        range: [1, 50],
        theme: 'opening arc',
        corePayoff: 'foundation set',
        subArcs: [
          { number: 1, range: [1, 5], theme: 'warm baseline', payoff: 'mc settled' },
          { number: 2, range: [6, 50], theme: 'rest', payoff: 'expand' },
        ],
      },
      briefs: [
        {
          n: 1,
          beat: 'setup',
          brief: 'MC arrives in new world',
          scenes: ['scene 1', 'scene 2', 'scene 3', 'scene 4'],
          mcBenefit: 'tài nguyên — gặp người mentor lần đầu',
          threadsAdvance: ['mc origin'],
        },
        {
          n: 2,
          beat: 'breathing',
          brief: 'MC observes surroundings',
          scenes: ['s1', 's2', 's3', 's4'],
          mcBenefit: 'thông tin về thế giới mới',
        },
      ],
    },
    {
      arc: {
        arcNumber: 2,
        range: [51, 100],
        theme: 'second arc',
        corePayoff: 'expand',
        subArcs: [{ number: 1, range: [51, 100], theme: 't', payoff: 'p' }],
      },
      briefs: [], // skipped
    },
  ],
  extraBannedPatterns: ['CẤM novel-specific pattern X'],
  toneDirectives: ['Tone: lạnh đạm + tự tin'],
};

describe('syncBlueprintToDb', () => {
  it('upserts only arcs with non-empty briefs', async () => {
    const captured = { rows: [] as any[] };
    const result = await syncBlueprintToDb(fakeDb(captured), 'project-1', minimalBlueprint);
    expect(result.arcsSynced).toBe(1);
    expect(result.arcsSkipped).toBe(1);
    expect(result.briefsTotal).toBe(2);
    expect(captured.rows).toHaveLength(1);
    expect(captured.rows[0].arc_number).toBe(1);
    expect(captured.rows[0].project_id).toBe('project-1');
  });

  it('builds chapter_briefs with chapterNumber, scenes, mcBenefit, sub_arc_number, sceneDirection', async () => {
    const captured = { rows: [] as any[] };
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const briefs = captured.rows[0].chapter_briefs;
    expect(briefs).toHaveLength(2);
    expect(briefs[0].chapterNumber).toBe(1);
    expect(briefs[0].sub_arc_number).toBe(1); // ch.1 in sub-arc 1 (ch.1-5)
    expect(briefs[0].scenes).toEqual(['scene 1', 'scene 2', 'scene 3', 'scene 4']);
    expect(briefs[0].mcBenefit).toContain('tài nguyên');
    expect(briefs[0].sceneDirection).toContain('UNIVERSAL BANS:');
    expect(briefs[1].sub_arc_number).toBe(1); // ch.2 falls in sub-arc 1 (range [1,5])
  });

  it('injects UNIVERSAL_BANNED_PATTERNS + tone in sceneDirection', async () => {
    const captured = { rows: [] as any[] };
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const sceneDirection = captured.rows[0].chapter_briefs[0].sceneDirection;
    for (const ban of UNIVERSAL_BANNED_PATTERNS) {
      expect(sceneDirection).toContain(ban);
    }
    for (const tone of UNIVERSAL_TONE_DIRECTIVES) {
      expect(sceneDirection).toContain(tone);
    }
  });

  it('appends per-novel extraBannedPatterns + toneDirectives', async () => {
    const captured = { rows: [] as any[] };
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const sceneDirection = captured.rows[0].chapter_briefs[0].sceneDirection;
    expect(sceneDirection).toContain('CẤM novel-specific pattern X');
    expect(sceneDirection).toContain('Tone: lạnh đạm + tự tin');
  });

  it('plan_text contains arc theme + sub-arcs + universal bans', async () => {
    const captured = { rows: [] as any[] };
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const planText = captured.rows[0].plan_text;
    expect(planText).toContain('opening arc');
    expect(planText).toContain('foundation set');
    expect(planText).toContain('Sub-arc 1');
    expect(planText).toContain('warm baseline');
    expect(planText).toContain('UNIVERSAL BANS');
  });
});
