import { syncBlueprintToDb } from '@/services/story-engine/blueprint/sync';
import { UNIVERSAL_BANNED_PATTERNS, UNIVERSAL_TONE_DIRECTIVES } from '@/services/story-engine/blueprint/universal-bans';
import type { NovelBlueprint } from '@/services/story-engine/blueprint/types';

interface CapturedRows {
  arc_plans: any[];
  chapter_blueprints: any[];
  story_blueprint_runs: any[];
  ai_story_projects: any[];
  coverageRows: Array<{ chapter_number: number; status: string }>;
}

function fakeDb(captured: CapturedRows) {
  return {
    from: (table: string) => ({
      select: (_columns?: string) => ({
        eq: (..._args: unknown[]) => ({
          eq: (..._args2: unknown[]) => ({
            gte: (..._args3: unknown[]) => ({
              lte: async () => ({ data: captured.coverageRows, error: null }),
            }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: { style_directives: {} }, error: null }),
        }),
      }),
      upsert: async (rowOrRows: any) => {
        const arr = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        for (const r of arr) captured[table as keyof CapturedRows].push(r);
        return { error: null };
      },
      update: (patch: any) => ({
        eq: async () => {
          captured.ai_story_projects.push(patch);
          return { error: null };
        },
      }),
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
          goal: 'MC arrives in new world',
          payoff: 'mentor introduction + first network connection',
          scenes: ['scene 1', 'scene 2', 'scene 3', 'scene 4'],
          mcBenefit: 'tài nguyên — gặp người mentor lần đầu',
          threadsAdvance: ['mc origin'],
          authorityConstraints: 'must register at academy gate',
          forbiddenTerms: ['novel-specific term to ban'],
        },
        {
          n: 2,
          beat: 'breathing',
          goal: 'MC observes surroundings',
          payoff: 'gathered intel about world structure',
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
  extraForbiddenTerms: ['novel-extra forbidden literal'],
  toneDirectives: ['Tone: lạnh đạm + tự tin'],
};

function freshCaptured(): CapturedRows {
  return {
    arc_plans: [],
    chapter_blueprints: [],
    story_blueprint_runs: [],
    ai_story_projects: [],
    coverageRows: [],
  };
}

describe('syncBlueprintToDb (unified)', () => {
  it('upserts only arcs with non-empty briefs into chapter_blueprints', async () => {
    const captured = freshCaptured();
    const result = await syncBlueprintToDb(fakeDb(captured), 'project-1', minimalBlueprint);
    expect(result.arcsSynced).toBe(1);
    expect(result.arcsSkipped).toBe(1);
    expect(result.briefsSynced).toBe(2);
    expect(captured.chapter_blueprints).toHaveLength(2);
    expect(captured.chapter_blueprints[0].project_id).toBe('project-1');
    expect(captured.chapter_blueprints[0].chapter_number).toBe(1);
    expect(captured.chapter_blueprints[1].chapter_number).toBe(2);
  });

  it('writes Codex column-level fields (goal, payoff, conflict, cast, authority)', async () => {
    const captured = freshCaptured();
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const row = captured.chapter_blueprints[0];
    expect(row.goal).toBe('MC arrives in new world');
    expect(row.payoff).toBe('mentor introduction + first network connection');
    expect(row.authority_constraints).toBe('must register at academy gate');
    expect(row.arc_number).toBe(1);
    expect(row.sub_arc_number).toBe(1);
    expect(row.status).toBe('planned');
    expect(row.version).toBe(1);
  });

  it('forbidden_terms = universal + per-novel + per-chapter', async () => {
    const captured = freshCaptured();
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const row = captured.chapter_blueprints[0];
    expect(row.forbidden_terms).toContain('novel-extra forbidden literal');
    expect(row.forbidden_terms).toContain('novel-specific term to ban');
    // (no UNIVERSAL_FORBIDDEN_TERMS by default — that array is empty in v1)
  });

  it('meta JSONB carries Claude additions (beat, scenes, mcBenefit, sceneDirection)', async () => {
    const captured = freshCaptured();
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    const row = captured.chapter_blueprints[0];
    expect(row.meta.beat).toBe('setup');
    expect(row.meta.scenes).toEqual(['scene 1', 'scene 2', 'scene 3', 'scene 4']);
    expect(row.meta.mcBenefit).toContain('tài nguyên');
    expect(row.meta.sceneDirection).toContain('UNIVERSAL BANS:');
    expect(row.meta.sceneDirection).toContain('CẤM novel-specific pattern X');
    expect(row.meta.sceneDirection).toContain('Tone: lạnh đạm');
  });

  it('also syncs arc_plans (plan_text + sub_arcs) for arc-level context', async () => {
    const captured = freshCaptured();
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    expect(captured.arc_plans).toHaveLength(1);
    expect(captured.arc_plans[0].arc_number).toBe(1);
    expect(captured.arc_plans[0].plan_text).toContain('opening arc');
    expect(captured.arc_plans[0].plan_text).toContain('UNIVERSAL BANS');
    // Pre-activation: keeps legacy arc_plans.chapter_briefs[] populated for
    // backward compat with running writers/cron jobs.
    expect(captured.arc_plans[0].chapter_briefs).toHaveLength(2);
    expect(captured.arc_plans[0].chapter_briefs[0].chapterNumber).toBe(1);
  });

  it('clears legacy arc_plans.chapter_briefs[] at --activate (single source of truth)', async () => {
    const captured = freshCaptured();
    captured.coverageRows = Array.from({ length: 100 }, (_, i) => ({
      chapter_number: i + 1,
      status: 'planned',
    }));
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint, { activate: true });
    expect(captured.arc_plans[0].chapter_briefs).toEqual([]);
  });

  it('upserts story_blueprint_runs with coverage status', async () => {
    const captured = freshCaptured();
    captured.coverageRows = [
      { chapter_number: 1, status: 'planned' },
      { chapter_number: 2, status: 'planned' },
    ];
    const result = await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    expect(captured.story_blueprint_runs).toHaveLength(1);
    expect(captured.story_blueprint_runs[0].project_id).toBe('p1');
    expect(captured.story_blueprint_runs[0].target_chapters).toBe(100);
    expect(captured.story_blueprint_runs[0].generated_chapters).toBe(2);
    // 2 of 100 → coverage NOT ok
    expect(result.coverageOk).toBe(false);
    expect(captured.story_blueprint_runs[0].status).toBe('invalid');
  });

  it('refuses --activate when coverage incomplete', async () => {
    const captured = freshCaptured();
    captured.coverageRows = [{ chapter_number: 1, status: 'planned' }];
    await expect(
      syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint, { activate: true })
    ).rejects.toThrow(/coverage incomplete/i);
  });

  it('activates project flags when coverage complete + activate flag', async () => {
    const captured = freshCaptured();
    // Simulate 100 of 100 chapters covered
    captured.coverageRows = Array.from({ length: 100 }, (_, i) => ({
      chapter_number: i + 1,
      status: 'planned',
    }));
    const result = await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint, { activate: true, version: 2 });
    expect(result.coverageOk).toBe(true);
    expect(captured.ai_story_projects).toHaveLength(1);
    const patch = captured.ai_story_projects[0];
    expect(patch.style_directives.require_full_chapter_blueprint).toBe(true);
    expect(patch.style_directives.chapter_blueprint_version).toBe(2);
  });

  it('preserves arc 2 placeholder (empty briefs[]) without inserting fake rows', async () => {
    const captured = freshCaptured();
    await syncBlueprintToDb(fakeDb(captured), 'p1', minimalBlueprint);
    // Only arc 1's 2 chapters should be inserted; arc 2 (briefs:[]) is skipped
    expect(captured.chapter_blueprints).toHaveLength(2);
    expect(captured.arc_plans).toHaveLength(1); // also skipped arc 2 plan_text upsert
  });
});
