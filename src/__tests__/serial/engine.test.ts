import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import type { ChapterDigest, ChapterDraft, CyclePlan, JudgeVerdict } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import {
  cycleReadyToClose, foldVolume, planNextCycle, readingHealth, writeOneChapter,
} from '@/services/serial/engine';
import { buildWriterBrief, collectSteering, refreshStyleMemory, relevantCast } from '@/services/serial/context';
import { premise, baseBible, cycle } from './fixtures';

const usage = (model: string, costUsd = 0.02): ProviderUsage => ({
  model, inputTokens: 1_000, outputTokens: 1_000, costUsd, finishReason: 'STOP',
});

const draft = (over: Partial<ChapterDraft> = {}): ChapterDraft => ({
  title: 'Anh vừa nói ba trăm triệu à?',
  content: 'x'.repeat(900),
  ...over,
});

const cleanVerdict = (over: Partial<JudgeVerdict> = {}): JudgeVerdict => ({
  continuity: [],
  scorecard: { opening: 4, anticipation: 4, payoff: 4, newness: 4, endHook: 5 },
  repetition: [], aiFlavor: [], steering: ['Cho Bảy Thạch ra tay thật thay vì chỉ đứng nhìn.'],
  ...over,
});

const finding: JudgeVerdict['continuity'] = [{
  kind: 'knows_too_much',
  quote: 'Lão Hoà gật đầu, "Cậu có cái hệ thống đó đúng không."',
  explain: 'Lão Hoà chưa từng được ai nói về năng lực của Khang.',
}];

const goodDigest: ChapterDigest = {
  chapterNumber: 8,
  title: 'Anh vừa nói ba trăm triệu à?',
  summary: 'Khang định giá công khai món đồ Bảy Thạch vừa bán hớ.',
  payoffKind: 'va_mat',
  endedOn: 'Bà Lâm cho người mời hắn lên hội quán.',
  newNamedThings: ['Hội quán Thẩm Định Đông Thành'],
  coreChanges: {
    storyDayDelta: 1, died: [], tierChanges: [], moved: [], newCast: [],
    hooksPlanted: [], hooksPaid: [], learnedFinger: [],
  },
};

/**
 * A provider that returns canned values per role. The entire engine runs against this in
 * tests, so the failure policy is exercised without a single paid call.
 */
function stubProvider(script: {
  writer?: ChapterDraft[];
  judge?: JudgeVerdict[];
  extractor?: ChapterDigest[];
  planner?: CyclePlan[];
}): StoryModelProvider & { calls: string[] } {
  const queues = {
    writer: [...(script.writer ?? [])],
    judge: [...(script.judge ?? [])],
    extractor: [...(script.extractor ?? [])],
    planner: [...(script.planner ?? [])],
  };
  const calls: string[] = [];
  const roleOf = (model: string): keyof typeof queues => {
    if (model === DEFAULT_SERIAL_ROUTES.writer) return 'writer';
    if (model === DEFAULT_SERIAL_ROUTES.extractor) return 'extractor';
    return 'judge'; // judge and planner share a model; disambiguated by queue below
  };
  return {
    calls,
    async text() { throw new Error('unused'); },
    async json<T>(input: { model: string }): Promise<{ value: T; usage: ProviderUsage }> {
      let role = roleOf(input.model);
      if (role === 'judge' && queues.judge.length === 0 && queues.planner.length > 0) role = 'planner';
      if (role === 'judge' && queues.planner.length > 0 && queues.judge.length === 0) role = 'planner';
      calls.push(role);
      const queue = queues[role];
      const next = queue.shift();
      if (next === undefined) throw new Error(`stub provider ran out of ${role} responses`);
      return { value: next as T, usage: usage(input.model) };
    },
  };
}

const chapterInput = (provider: StoryModelProvider) => ({
  provider, routes: DEFAULT_SERIAL_ROUTES, premise,
  bible: baseBible(), cycle: cycle(), chapterNumber: 8, previousChapter: 'Câu cuối chương bảy.',
});

describe('chapter loop', () => {
  test('a clean chapter commits in one attempt and advances the Bible', async () => {
    const provider = stubProvider({ writer: [draft()], judge: [cleanVerdict()], extractor: [goodDigest] });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.attempts).toBe(1);
    expect(result.bible.symbolicCore.chapterNumber).toBe(8);
    expect(result.bible.symbolicCore.storyDay).toBe(4);
    expect(result.costUsd).toBeCloseTo(0.06, 5);
    expect(provider.calls).toEqual(['writer', 'judge', 'extractor']);
  });

  test('a cited contradiction buys one targeted repair, not a fresh chapter', async () => {
    const provider = stubProvider({
      writer: [draft(), draft({ title: 'Bản sửa' })],
      judge: [cleanVerdict({ continuity: finding }), cleanVerdict()],
      extractor: [goodDigest],
    });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.attempts).toBe(2);
    expect(result.chapter.title).toBe('Bản sửa');
    expect(provider.calls).toEqual(['writer', 'judge', 'writer', 'judge', 'extractor']);
  });

  test('a contradiction that survives repair and rewrite replans instead of parking', async () => {
    const provider = stubProvider({
      writer: [draft(), draft(), draft()],
      judge: [
        cleanVerdict({ continuity: finding }),
        cleanVerdict({ continuity: finding }),
        cleanVerdict({ continuity: finding }),
      ],
    });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('needs_replan');
    if (result.status !== 'needs_replan') return;
    expect(result.reason).toMatch(/beat sheet is the problem/);
    expect(result.findings).toHaveLength(1);
    // Three writer calls and three judge calls, and it never reached the extractor.
    expect(provider.calls.filter(call => call === 'writer')).toHaveLength(3);
    expect(provider.calls).not.toContain('extractor');
  });

  test('prose the reader accepts but state cannot absorb replans rather than committing a wrong Bible', async () => {
    const provider = stubProvider({
      writer: [draft()], judge: [cleanVerdict()],
      extractor: [{ ...goodDigest, coreChanges: { ...goodDigest.coreChanges, hooksPaid: ['hook_khong_ton_tai'] } }],
    });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('needs_replan');
    if (result.status !== 'needs_replan') return;
    expect(result.reason).toMatch(/unknown_hook/);
  });

  test('worn phrases the judge quoted come back as the next chapter ban list', async () => {
    const provider = stubProvider({
      writer: [draft()],
      judge: [cleanVerdict({ aiFlavor: [{ quote: 'ánh mắt sắc như dao cạo', kind: 'generic_adjective' }] })],
      extractor: [goodDigest],
    });
    const result = await writeOneChapter(chapterInput(provider));
    if (result.status !== 'committed') throw new Error('expected a commit');
    expect(result.bible.styleMemory).toContain('ánh mắt sắc như dao cạo');
    expect(result.bible.styleMemory).toContain('ánh mắt sắc như dao');
  });
});

describe('cycle lifecycle', () => {
  test('a planner that repeats the previous payoff gets one corrective attempt', async () => {
    const previous = cycle({ cycleNumber: 1, startChapter: 1, plannedEndChapter: 7, climax: { payoffKind: 'nghich_tap' } });
    const provider = stubProvider({
      planner: [
        cycle({ climax: { payoffKind: 'nghich_tap' } }),
        cycle({ climax: { payoffKind: 'tri_thang' } }),
      ],
    });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: previous, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [cleanVerdict()],
    });
    expect(result.cycle.climax.payoffKind).toBe('tri_thang');
    expect(result.usages).toHaveLength(2);
  });

  test('a planner that repeats twice fails loudly rather than shipping the repetition', async () => {
    const previous = cycle({ cycleNumber: 1, startChapter: 1, plannedEndChapter: 7, climax: { payoffKind: 'nghich_tap' } });
    const provider = stubProvider({
      planner: [cycle({ climax: { payoffKind: 'nghich_tap' } }), cycle({ climax: { payoffKind: 'nghich_tap' } })],
    });
    await expect(planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: previous, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    })).rejects.toThrow(/repeats the payoff kind/);
  });

  test('a cycle cannot close early or with an overdue hook', () => {
    const bible = baseBible();
    expect(cycleReadyToClose(bible, cycle({ plannedEndChapter: 16 }))).toEqual({ ready: false, reason: 'At chapter 7 of 16.' });

    const atEnd = { ...bible, symbolicCore: { ...bible.symbolicCore, chapterNumber: 16 } };
    expect(cycleReadyToClose(atEnd, cycle({ plannedEndChapter: 16 })))
      .toEqual({ ready: false, reason: 'Overdue hooks: hook_giay_to.' });

    const paid = {
      ...atEnd,
      symbolicCore: { ...atEnd.symbolicCore, openHooks: [{ ...bible.symbolicCore.openHooks[0], status: 'paid' as const }] },
    };
    expect(cycleReadyToClose(paid, cycle({ plannedEndChapter: 16 }))).toEqual({ ready: true, reason: null });
  });

  test('folding a volume bounds the Bible instead of letting it grow with the story', () => {
    const folded = foldVolume({ bible: baseBible(), volumeNumber: 1 });
    expect(folded.volumeSummaries).toHaveLength(1);
    expect(folded.volumeSummaries[0].summary).toMatch(/Ch\.6 /);
    expect(folded.recentSummary.length).toBeLessThanOrEqual(3);
    expect(folded.styleMemory).toEqual([]);
  });
});

describe('context selection', () => {
  test('the writer brief carries beats and a short do-not-contradict list, never deltas', () => {
    const brief = buildWriterBrief({
      premise, bible: baseBible(), cycle: cycle(), chapterNumber: 8, previousChapter: 'Câu cuối.',
    });
    expect(brief.nhipChuong).toHaveLength(2);
    expect(brief.khongDuocTrai.daChet).toEqual([]);
    expect(brief.khongDuocTrai.nhanVatChinh.capBac).toBe('Thợ xem');
    expect(brief.kieuHookKetChuong).toBe('threat');
    expect(JSON.stringify(brief)).not.toMatch(/requiredDelta|mechanicUse|storyTimeAfterMinutes/);
  });

  test('a missing beat sheet is a programming error, not a silent empty chapter', () => {
    expect(() => buildWriterBrief({
      premise, bible: baseBible(), cycle: cycle(), chapterNumber: 99, previousChapter: null,
    })).toThrow(/no beat sheet for chapter 99/);
  });

  test('relevant cast prefers the protagonist, then whoever the beats name', () => {
    const ids = relevantCast(baseBible(), premise, 'Bảy Thạch chặn hắn ngay cổng chợ');
    expect(ids[0]).toBe('khang');
    expect(ids).toContain('chu_tiem');
  });

  test('steering is deduplicated newest-first and style memory merges old and new', () => {
    expect(collectSteering([
      cleanVerdict({ steering: ['a', 'b'] }),
      cleanVerdict({ steering: ['b', 'c'] }),
    ])).toEqual(['b', 'c', 'a']);

    expect(refreshStyleMemory(baseBible(), [
      cleanVerdict({ repetition: [{ quote: 'lại mở sổ ra', repeatsChapter: 6, note: 'lặp' }] }),
    ])).toEqual(['lại mở sổ ra', 'ánh mắt sắc như dao']);
  });

  test('reading health reports the weakest dimension for the operator dashboard', () => {
    expect(readingHealth([])).toEqual({ chapters: 0, average: 0, weakest: null });
    expect(readingHealth([
      cleanVerdict({ scorecard: { opening: 5, anticipation: 2, payoff: 4, newness: 4, endHook: 5 } }),
      cleanVerdict({ scorecard: { opening: 4, anticipation: 1, payoff: 4, newness: 5, endHook: 5 } }),
    ])).toEqual({ chapters: 2, average: 3.9, weakest: 'anticipation' });
  });
});
