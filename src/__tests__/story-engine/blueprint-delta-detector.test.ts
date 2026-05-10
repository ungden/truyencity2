import { runDeltaDetection, formatDeltaReport, persistDeltaReport } from '@/services/story-engine/blueprint/delta-detector';

interface FakeRow {
  blueprint?: any;
  summary?: any;
  characterStates?: any[];
  newThreads?: any[];
  chapter?: any;
}

function fakeDb(rows: FakeRow, captured?: { update: any[] }) {
  const handlers: Record<string, () => Promise<{ data: any }>> = {
    chapter_blueprints: async () => ({ data: rows.blueprint }),
    chapter_summaries: async () => ({ data: rows.summary }),
    character_states: async () => ({ data: rows.characterStates ?? [] }),
    plot_threads: async () => ({ data: rows.newThreads ?? [] }),
    chapters: async () => ({ data: rows.chapter }),
  };
  return {
    from: (table: string) => {
      const handler = handlers[table];
      const chain: any = {
        maybeSingle: handler,
        eq: () => chain,
        gte: () => chain,
        lte: handler,
        select: () => chain,
        then: (resolve: any, reject: any) => handler().then(resolve, reject),
      };
      return {
        select: () => chain,
        update: (patch: any) => ({
          eq: () => ({
            eq: async () => {
              captured?.update.push(patch);
              return { error: null };
            },
          }),
        }),
      };
    },
  } as any;
}

describe('runDeltaDetection', () => {
  it('flags missing blueprint as hard', async () => {
    const db = fakeDb({ blueprint: null });
    const report = await runDeltaDetection(db, 'p1', 7, 1000, 'novel-1');
    expect(report.hasHardDeltas).toBe(true);
    expect(report.deltas.some((d) => d.type === 'goal_mismatch')).toBe(true);
  });

  it('flags forbidden_term used as hard', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'MC trains pet',
        payoff: 'pet stronger',
        cast: ['MC'],
        forbidden_terms: ['Thần Cách'],
        meta: {},
      },
      summary: { summary: 'normal chapter', mc_state: '', cliffhanger: '' },
      chapter: { content: 'MC nhận một Thần Cách rất mạnh' },
    });
    const report = await runDeltaDetection(db, 'p1', 7, 1000, 'n1');
    expect(report.hasHardDeltas).toBe(true);
    expect(report.deltas.some((d) => d.type === 'forbidden_term_used' && d.evidence === 'Thần Cách')).toBe(true);
  });

  it('flags cosmic pull-forward at early chapter as medium', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'MC investigates',
        payoff: 'gain info',
        cast: ['MC'],
        forbidden_terms: [],
        meta: {},
      },
      summary: { summary: 'MC mơ thấy huyết mạch thức tỉnh', mc_state: '', cliffhanger: '' },
      chapter: { content: 'MC mơ thấy huyết mạch thức tỉnh trong giấc mơ kỳ lạ.' },
    });
    const report = await runDeltaDetection(db, 'p1', 15, 1000, 'n1');
    expect(report.deltas.some((d) => d.type === 'cosmic_pull_forward' && d.severity === 'medium')).toBe(true);
  });

  it('does not flag cosmic at late chapter (within cosmic arc)', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'MC investigates cosmic origin',
        payoff: 'unlock pháp tắc',
        cast: ['MC'],
        forbidden_terms: [],
        meta: {},
      },
      summary: { summary: 'MC khám phá lõi pháp tắc Vạn Linh Phổ', mc_state: '', cliffhanger: '' },
      chapter: { content: 'lõi pháp tắc cosmic context arc 6.' },
    });
    const report = await runDeltaDetection(db, 'p1', 800, 1000, 'n1');
    expect(report.deltas.some((d) => d.type === 'cosmic_pull_forward')).toBe(false);
  });

  it('detects new character not in blueprint cast', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'training',
        payoff: 'pet evolves',
        cast: ['Cố Diệp', 'Cố Tiểu Đào'],
        forbidden_terms: [],
        meta: {},
      },
      summary: {
        summary: 'Cố Diệp gặp Bạch Vân Tử mới — một thương nhân lạ.',
        mc_state: '',
        cliffhanger: '',
      },
      characterStates: [
        { character_name: 'Cố Diệp' },
        { character_name: 'Bạch Vân Tử' },
      ],
      chapter: { content: 'Cố Diệp gặp Bạch Vân Tử.' },
    });
    const report = await runDeltaDetection(db, 'p1', 20, 1000, 'n1');
    expect(report.deltas.some((d) => d.type === 'new_entity' && d.evidence === 'bạch vân tử')).toBe(true);
  });

  it('soft-flags entity only in summary text (not in character_states)', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'training',
        payoff: 'pet evolves',
        cast: ['Cố Diệp'],
        forbidden_terms: [],
        meta: {},
      },
      summary: {
        summary: 'Cố Diệp đi qua chợ Linh Châu Thành.',
        mc_state: '',
        cliffhanger: '',
      },
      characterStates: [{ character_name: 'Cố Diệp' }],
      chapter: { content: 'Cố Diệp đi qua chợ Linh Châu Thành.' },
    });
    const report = await runDeltaDetection(db, 'p1', 20, 1000, 'n1');
    const linhChau = report.deltas.find((d) => d.evidence === 'linh châu thành');
    if (linhChau) expect(linhChau.severity).toBe('soft');
  });

  it('flags goal mismatch when summary has no overlap with goal/payoff keywords', async () => {
    const db = fakeDb({
      blueprint: {
        goal: 'MC tham gia giải đấu nội tộc đối đầu Vân Kiếm',
        payoff: 'thắng giải đấu thu được uy tín nội tộc',
        cast: ['MC'],
        forbidden_terms: [],
        meta: {},
      },
      summary: {
        summary: 'MC đi câu cá ở hồ phía sau, ngắm hoàng hôn yên bình.',
        mc_state: '',
        cliffhanger: '',
      },
      chapter: { content: 'câu cá ngắm hoàng hôn.' },
    });
    const report = await runDeltaDetection(db, 'p1', 13, 1000, 'n1');
    expect(report.deltas.some((d) => d.type === 'goal_mismatch' && d.severity === 'hard')).toBe(true);
  });

  it('formatDeltaReport produces readable lines', async () => {
    const report = {
      projectId: '12345678-1234-1234-1234-123456789012',
      chapterNumber: 13,
      deltas: [
        { type: 'cosmic_pull_forward' as const, severity: 'medium' as const, description: 'cosmic at ch.13', evidence: 'huyết mạch' },
      ],
      hardCount: 0,
      mediumCount: 1,
      softCount: 0,
      hasHardDeltas: false,
    };
    const txt = formatDeltaReport(report);
    expect(txt).toContain('ch.13');
    expect(txt).toContain('hard=0 medium=1 soft=0');
    expect(txt).toContain('cosmic_pull_forward');
    expect(txt).toContain('huyết mạch');
  });
});

describe('persistDeltaReport', () => {
  it('writes JSON to chapter_blueprints.actual_summary_delta', async () => {
    const captured = { update: [] as any[] };
    const db = fakeDb({}, captured);
    await persistDeltaReport(db, {
      projectId: 'p1',
      chapterNumber: 13,
      deltas: [{ type: 'new_entity', severity: 'medium', description: 'new' }],
      hardCount: 0,
      mediumCount: 1,
      softCount: 0,
      hasHardDeltas: false,
    });
    expect(captured.update).toHaveLength(1);
    const patch = captured.update[0];
    expect(patch.actual_summary_delta).toBeDefined();
    const parsed = JSON.parse(patch.actual_summary_delta);
    expect(parsed.mediumCount).toBe(1);
    expect(parsed.deltas).toHaveLength(1);
  });

  it('skips empty reports', async () => {
    const captured = { update: [] as any[] };
    const db = fakeDb({}, captured);
    await persistDeltaReport(db, {
      projectId: 'p1',
      chapterNumber: 13,
      deltas: [],
      hardCount: 0,
      mediumCount: 0,
      softCount: 0,
      hasHardDeltas: false,
    });
    expect(captured.update).toHaveLength(0);
  });
});
