import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import { metaLeakFindings, type ChapterDigest, type ChapterDraft, type CyclePlan, type JudgeVerdict, type OpeningAudit, type SceneMode } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import {
  auditFourChapterOpening, cyclePull, cycleReadyToClose, foldVolume, LOW_PULL_THRESHOLD, lowPullStreak,
  planNextCycle, readingHealth, repairOpeningChapters, repairOpeningUntilClean, SerialCheckpointError, SerialDeadlineError, splitOpeningFindings, writeOneChapter,
  type SerialDraftCheckpoint,
} from '@/services/serial/engine';
import { normalizeChapterDraft, reviewBindingMismatch, stripMarkdown } from '@/services/serial/agents';
import { assetLedgerSlice, splitLedgerLines, buildCyclePlannerBrief, buildExtractorBrief, buildJudgeBrief, buildWriterBrief, collectSteering, refreshStyleMemory, relevantCast } from '@/services/serial/context';
import { seedBible } from '@/services/serial/state';
import { premise, baseBible, cycle } from './fixtures';
import {
  CYCLE_PLANNER_SYSTEM_PROMPT, EXTRACTOR_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT,
  OPENING_AUDITOR_SYSTEM_PROMPT, promptsFor, WRITER_SYSTEM_PROMPT,
} from '@/services/serial/prompts';

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
  craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 4 },
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
  narrativeEvidence: [],
  title: 'Anh vừa nói ba trăm triệu à?',
  summary: 'Khang định giá công khai món đồ Bảy Thạch vừa bán hớ.',
  payoffKind: 'va_mat',
  endedOn: 'Bà Lâm cho người mời hắn lên hội quán.',
  newNamedThings: ['Hội quán Thẩm Định Đông Thành'],
  coreChanges: {
    storyDayDelta: 1, died: [], progressionChanges: [], assetEvents: [], goldenFingerRungChange: null, moved: [], worldFactsRevealed: [], newCast: [],
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
  auditor?: OpeningAudit[];
}): StoryModelProvider & { calls: string[] } {
  const queues = {
    writer: [...(script.writer ?? [])],
    judge: [...(script.judge ?? [])],
    extractor: [...(script.extractor ?? [])],
    planner: [...(script.planner ?? [])],
    auditor: [...(script.auditor ?? [])],
  };
  const calls: string[] = [];
  const roleOf = (system: string): keyof typeof queues => {
    if (system.startsWith(WRITER_SYSTEM_PROMPT)) return 'writer';
    if (system === EXTRACTOR_SYSTEM_PROMPT) return 'extractor';
    if (system === CYCLE_PLANNER_SYSTEM_PROMPT) return 'planner';
    if (system === JUDGE_SYSTEM_PROMPT) return 'judge';
    if (system === OPENING_AUDITOR_SYSTEM_PROMPT) return 'auditor';
    throw new Error('unknown test agent system prompt');
  };
  return {
    calls,
    async text() { throw new Error('unused'); },
    async json<T>(input: { model: string; system: string; prompt: string }): Promise<{ value: T; usage: ProviderUsage }> {
      const role = roleOf(input.system);
      calls.push(role);
      const queue = queues[role];
      const next = queue.shift();
      if (next === undefined) throw new Error(`stub provider ran out of ${role} responses`);
      if (role === 'judge' && !(next as JudgeVerdict).reviewBinding) {
        const supplied = JSON.parse(input.prompt) as { chuongSo: number; tieuDe: string; chuong: string };
        return {
          value: {
            ...(next as JudgeVerdict),
            reviewBinding: {
              chapterNumber: supplied.chuongSo,
              title: supplied.tieuDe,
              excerpt: supplied.chuong.slice(0, 80),
            },
          } as T,
          usage: usage(input.model),
        };
      }
      return { value: next as T, usage: usage(input.model) };
    },
  };
}

const chapterInput = (provider: StoryModelProvider) => ({
  provider, routes: DEFAULT_SERIAL_ROUTES, premise,
  bible: baseBible(), cycle: cycle(), chapterNumber: 8, previousChapter: 'Câu cuối chương bảy.',
});

describe('chapter loop', () => {
  test('markdown emphasis never reaches the reader as literal symbols', () => {
    expect(stripMarkdown('Trên đó chỉ có một dòng.\n\n**Tịnh Mạch Đan — ba tinh hạch.**\n\n*Thôi xong.*\n\n# Hết'))
      .toBe('Trên đó chỉ có một dòng.\n\nTịnh Mạch Đan — ba tinh hạch.\n\nThôi xong.\n\nHết');
    expect(stripMarkdown('【Giao dịch: 3 × 2 viên】 và 5*3 = 15')).toBe('【Giao dịch: 3 × 2 viên】 và 5*3 = 15');
  });

  test('structured title owns the heading and duplicate Markdown is stripped', () => {
    const normalized = normalizeChapterDraft(draft({
      title: '“Đông Hà lớn nhất, ta mới vừa bắt đầu!”',
      content: `## Chương 4: “Đông Hà lớn nhất, ta mới vừa bắt đầu!”\n\n${'x'.repeat(900)}`,
    }));
    expect(normalized.title).toBe('“Đông Hà lớn nhất, ta mới vừa bắt đầu!”');
    expect(normalized.content).toBe('x'.repeat(900));
  });

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

  test('a judge that did not bind its verdict to the supplied prose cannot commit', async () => {
    const provider = stubProvider({
      writer: [draft()],
      judge: [cleanVerdict({
        reviewBinding: { chapterNumber: 8, title: draft().title, excerpt: 'đoạn không tồn tại trong bản thảo' },
      })],
    });
    await expect(writeOneChapter(chapterInput(provider))).rejects.toMatchObject({
      name: 'SerialCheckpointError',
      checkpoint: { schemaVersion: 2, resumeFrom: 'judge' },
    });
    expect(provider.calls).toEqual(['writer', 'judge']);
  });

  test('an extractor transport failure resumes from the saved draft without buying Writer or Judge again', async () => {
    const calls: string[] = [];
    const failingProvider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string; prompt: string }) {
        if (input.system.startsWith(WRITER_SYSTEM_PROMPT)) {
          calls.push('writer');
          return { value: draft() as T, usage: usage(input.model) };
        }
        if (input.system === JUDGE_SYSTEM_PROMPT) {
          calls.push('judge');
          const supplied = JSON.parse(input.prompt) as { chuongSo: number; tieuDe: string; chuong: string };
          return { value: {
            ...cleanVerdict(),
            reviewBinding: {
              chapterNumber: supplied.chuongSo,
              title: supplied.tieuDe,
              excerpt: supplied.chuong.slice(0, 80),
            },
          } as T, usage: usage(input.model) };
        }
        calls.push('extractor');
        throw new Error('extractor timeout');
      },
    } as StoryModelProvider;
    let checkpoint: SerialCheckpointError | null = null;
    try {
      await writeOneChapter(chapterInput(failingProvider));
    } catch (error) {
      if (error instanceof SerialCheckpointError) checkpoint = error;
      else throw error;
    }
    expect(checkpoint?.checkpoint).toMatchObject({
      resumeFrom: 'extractor', chapter: { title: draft().title },
    });
    expect(checkpoint?.usages).toHaveLength(2);
    expect(calls).toEqual(['writer', 'judge', 'extractor']);

    const resumedProvider = stubProvider({ extractor: [goodDigest] });
    const resumed = await writeOneChapter({
      ...chapterInput(resumedProvider),
      resumeArtifact: checkpoint!.checkpoint,
    });
    expect(resumed.status).toBe('committed');
    expect(resumedProvider.calls).toEqual(['extractor']);
    if (resumed.status === 'committed') expect(resumed.costUsd).toBeCloseTo(0.02, 5);
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

  test('a surviving contradiction returns its evidence without another blind full rewrite', async () => {
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
    expect(result.reason).toMatch(/Reconcile the supplied canon and beat/);
    expect(result.reason).toContain(finding[0].kind);
    expect(result.reason).toContain(finding[0].quote);
    expect(result.findings).toHaveLength(1);
    expect(result.verdict.continuity).toEqual(finding);
    expect(result.attempts).toBe(2);
    expect(provider.calls.filter(call => call === 'writer')).toHaveLength(2);
    expect(provider.calls).not.toContain('extractor');
  });

  test('an extractor entry the merge cannot absorb is set aside instead of rejecting accepted prose', async () => {
    const invalid = { ...goodDigest, coreChanges: { ...goodDigest.coreChanges, hooksPaid: ['hook_khong_ton_tai'] } };
    const provider = stubProvider({ writer: [draft()], judge: [cleanVerdict()], extractor: [invalid] });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.digest.coreChanges.hooksPaid).toEqual([]);
    expect(result.mergeNotes.join(' ')).toMatch(/hook_khong_ton_tai/);
    expect(provider.calls.filter(call => call === 'extractor')).toHaveLength(1);
  });

  test('a digest for the wrong chapter still pauses with its private draft after one repair', async () => {
    const wrongChapter = { ...goodDigest, chapterNumber: 9 };
    const provider = stubProvider({
      writer: [draft()], judge: [cleanVerdict()],
      extractor: [wrongChapter, wrongChapter],
    });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('needs_review');
    if (result.status !== 'needs_review') return;
    expect(result.reviewKind).toBe('extractor');
    expect(result.chapter.content).toBe(draft().content);
    expect(result.reason).toMatch(/chapter_sequence/);
    expect(provider.calls.filter(call => call === 'extractor')).toHaveLength(2);
  });

  test('an invented world id becomes a named thing without another extractor call', async () => {
    const provider = stubProvider({
      writer: [draft()], judge: [cleanVerdict()],
      extractor: [
        { ...goodDigest, coreChanges: { ...goodDigest.coreChanges, worldFactsRevealed: [{ id: 'doi_tam_thoi', note: 'Một đội vừa ký đơn.' }] } },
      ],
    });
    const result = await writeOneChapter(chapterInput(provider));
    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.digest.newNamedThings).toContain('Một đội vừa ký đơn.');
    expect(provider.calls.filter(call => call === 'writer')).toHaveLength(1);
    expect(provider.calls.filter(call => call === 'extractor')).toHaveLength(1);
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

describe('four-chapter opening audit', () => {
  const chapters = Array.from({ length: 4 }, (_, index) => ({
    chapterNumber: index + 1,
    title: `Mở hàng lần ${index + 1}`,
    content: `${'Một giao dịch có nguồn hàng và thanh toán rõ ràng. '.repeat(30)}\n\n【Giao dịch hoàn tất: 3 tinh hạch Nhất giai】`,
  }));

  test('reads like an acquiring editor, not an inventory clerk', () => {
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).toContain('muốn bấm chương năm');
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).toMatch(/golden_finger_late[\s\S]*reward_hook_missing[\s\S]*title_promise_unpaid/);
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).not.toContain('Sổ giao dịch chuẩn');
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).not.toMatch(/cộng trừ khớp|giá niêm yết/);
  });

  test('a system lane whose opening never shows the system fails in code', async () => {
    const provider = stubProvider({ auditor: [{ passed: true, summary: 'Mở đầu ổn.', findings: [] }] });
    const noPanel = chapters.map(chapter => ({ ...chapter, content: chapter.content.replaceAll('【', '[').replaceAll('】', ']') }));
    const result = await auditFourChapterOpening({ provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: noPanel });
    expect(premise.voiceSheet.showsSystemPanel).toBe(true);
    expect(result.audit.passed).toBe(false);
    expect(result.audit.findings.map(finding => finding.kind)).toContain('system_panel_missing');
  });

  test('runs once over all four chapters and records a clean pass', async () => {
    const provider = stubProvider({ auditor: [{ passed: true, summary: 'Mạch giao dịch khép kín.', findings: [] }] });
    const result = await auditFourChapterOpening({ provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters });
    expect(result.audit.passed).toBe(true);
    expect(result.costUsd).toBeCloseTo(0.02, 5);
    expect(provider.calls).toEqual(['auditor']);
  });

  test('refuses a partial bundle before spending a model call', async () => {
    const provider = stubProvider({});
    await expect(auditFourChapterOpening({ provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: chapters.slice(1) }))
      .rejects.toThrow(/requires chapters 1-4 in order/);
    expect(provider.calls).toEqual([]);
  });

  test('deterministic formatting evidence cannot be waved through by the model', async () => {
    const provider = stubProvider({ auditor: [{ passed: true, summary: 'Không thấy lỗi ngữ nghĩa.', findings: [] }] });
    const malformed = chapters.map((chapter, index) => index === 0 ? { ...chapter, title: 'Chương 1: Mở hàng' } : chapter);
    const result = await auditFourChapterOpening({ provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: malformed });
    expect(result.audit.passed).toBe(false);
    expect(result.audit.findings[0]).toMatchObject({ kind: 'format_duplicate_title', chapterNumber: 1 });
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
      editorialNotes: ['Nêu tên đội giao thịt và khoản đối giá ngay trên trang.'],
    });
    expect(result.cycle.climax.payoffKind).toBe('tri_thang');
    expect(result.cycle.editorialNotes).toEqual(['Nêu tên đội giao thịt và khoản đối giá ngay trên trang.']);
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

  test('a planner whose first beat misses the requested chapter gets one corrective attempt', async () => {
    const provider = stubProvider({
      planner: [
        cycle({ startChapter: 9, plannedEndChapter: 17 }),
        cycle({ startChapter: 8, plannedEndChapter: 16 }),
      ],
    });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(result.cycle.beatSheets[0].chapterNumber).toBe(8);
    expect(result.usages).toHaveLength(2);
  });

  test('a repeated scene mode is taste: the first rolling plan is kept, not rejected', async () => {
    const makeBeat = (chapterNumber: number, sceneMode: 'transaction' | 'hunt' | 'public_showcase' | 'investigation' | 'crafting') => ({
      chapterNumber,
      sceneMode,
      openingBridge: `Trả ngay câu cuối chương ${chapterNumber - 1}.`,
      protagonistMove: `Lâm Việt tự chọn cách xử lý chương ${chapterNumber}.`,
      beats: ['Mở cảnh bằng hệ quả trực tiếp', 'Chốt một thành quả nhìn thấy'],
      materialOutcome: `Một kết quả vật chất của chương ${chapterNumber} được xác lập.`,
      emotionalTarget: 'Thỏa mãn vì tình thế đổi thật.',
      newNamedThing: `Mốc ${chapterNumber}`,
      endHookKind: 'opportunity' as const,
      prerequisiteIds: [],
      revealsFactIds: [],
      advancesMilestoneIds: [],
    });
    const active = cycle({
      startChapter: 11,
      plannedEndChapter: 18,
      beatSheets: [makeBeat(11, 'transaction'), makeBeat(12, 'hunt'), makeBeat(13, 'public_showcase')],
    });
    const provider = stubProvider({ planner: [
      cycle({
        startChapter: 14, plannedEndChapter: 18,
        beatSheets: [makeBeat(14, 'transaction'), makeBeat(15, 'hunt'), makeBeat(16, 'investigation')],
      }),
      cycle({
        startChapter: 14, plannedEndChapter: 18,
        beatSheets: [makeBeat(14, 'transaction'), makeBeat(15, 'investigation'), makeBeat(16, 'crafting')],
      }),
    ] });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, activeCycle: active,
      cycleNumber: 2, volumeNumber: 1, startChapter: 14, fixedEndChapter: 18, recentVerdicts: [],
    });
    expect(result.cycle.beatSheets.map(sheet => sheet.sceneMode)).toEqual(['transaction', 'hunt', 'investigation']);
    expect(result.usages).toHaveLength(1);
  });

  test('a final rolling window plans only the exact remaining chapter', async () => {
    const makeBeat = (chapterNumber: number, sceneMode: SceneMode) => ({
      chapterNumber,
      sceneMode,
      openingBridge: `Trả ngay câu cuối chương ${chapterNumber - 1}.`,
      protagonistMove: `Lâm Việt tự kiểm chứng mốc ${chapterNumber}.`,
      beats: ['Kiểm chứng điều kiện còn thiếu', 'Ghi lại kết quả nhìn thấy'],
      materialOutcome: `Mốc ${chapterNumber} có một kết quả kiểm chứng được.`,
      emotionalTarget: 'Thỏa mãn vì kết luận không vượt quá bằng chứng.',
      newNamedThing: `Mốc ${chapterNumber}`,
      endHookKind: 'question' as const,
      prerequisiteIds: [],
      revealsFactIds: [],
      advancesMilestoneIds: [],
    });
    const active = cycle({
      startChapter: 1,
      plannedEndChapter: 10,
      beatSheets: [makeBeat(4, 'transaction'), makeBeat(5, 'investigation'), makeBeat(6, 'crafting')],
    });
    const rolling = {
      ...active,
      startChapter: 10,
      plannedEndChapter: 10,
      beatSheets: [makeBeat(10, 'reflection')],
    } as CyclePlan;
    const provider = stubProvider({ planner: [rolling] });

    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, activeCycle: active,
      cycleNumber: 1, volumeNumber: 1, startChapter: 10, fixedEndChapter: 10, recentVerdicts: [],
    });

    expect(result.cycle.plannedEndChapter).toBe(10);
    expect(result.cycle.beatSheets.map(sheet => sheet.chapterNumber)).toEqual([10]);
    expect(result.usages).toHaveLength(1);
  });

  test('a cycle cannot close early or with an overdue hook', () => {
    const bible = baseBible();
    expect(cycleReadyToClose(bible, cycle({ plannedEndChapter: 16 }))).toEqual({ ready: false, reason: 'At chapter 7 of 16.' });

    const atEnd = { ...bible, symbolicCore: { ...bible.symbolicCore, chapterNumber: 16 } };
    expect(cycleReadyToClose(atEnd, cycle({ plannedEndChapter: 16 })))
      .toEqual({ ready: false, reason: 'Overdue hooks: hook_dao_van.' });

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
    expect(brief.khongDuocTrai.nhanVatChinh.tienTrien).toEqual(expect.arrayContaining([
      expect.objectContaining({ he: 'Cảnh giới Tu Tiên', cap: 'Luyện Khí tầng bốn' }),
    ]));
    expect(brief.kieuHookKetChuong).toBe('opportunity');
    expect(brief.worldSlice.progressionSystems.length).toBeGreaterThan(0);
    expect(brief).not.toHaveProperty('worldKernel');
    expect(JSON.stringify(brief)).not.toMatch(/requiredDelta|mechanicUse|storyTimeAfterMinutes/);
    expect(brief.mocVongKhachHangChuongNay).toEqual(expect.objectContaining({
      step: 'purchase', assetId: 'ho_than_phu_nhat_giai_ha_pham',
    }));
  });

  test('a missing beat sheet is a programming error, not a silent empty chapter', () => {
    expect(() => buildWriterBrief({
      premise, bible: baseBible(), cycle: cycle(), chapterNumber: 99, previousChapter: null,
    })).toThrow(/no beat sheet for chapter 99/);
  });

  test('writer, judge and extractor receive a chapter slice while planner alone owns the full kernel', () => {
    const bible = seedBible({ premise });
    const opening = cycle({
      startChapter: 1,
      plannedEndChapter: 5,
      editorialNotes: ['Mọi lô hàng phải có người giao và đối giá rõ.'],
      beatSheets: [{
        chapterNumber: 1,
        sceneMode: 'public_showcase',
        openingBridge: 'Hứa An bước vào quầy ngay sau lời mời thử đan.',
        protagonistMove: 'Lâm Việt tự niêm yết điều kiện dùng thử trước phố.',
        beats: ['Hứa An dùng Tịnh Mạch Đan trước phố', 'Khách gọi phẩm cấp rồi tranh mua'],
        materialOutcome: 'Hứa An hoàn tất thức tỉnh và khách đầu tiên đặt hàng.',
        emotionalTarget: 'Giá trị cửa hàng được công khai.',
        newNamedThing: 'Tịnh Mạch Đan Nhất giai hạ phẩm',
        endHookKind: 'reward',
        prerequisiteIds: [],
        revealsFactIds: [],
        advancesMilestoneIds: [],
      }],
    });
    const writer = buildWriterBrief({ premise, bible, cycle: opening, chapterNumber: 1, previousChapter: null });
    const judge = buildJudgeBrief({ premise, bible, cycle: opening, chapterNumber: 1, title: 'Đây là đan dược?', prose: 'Hứa An gọi tên Tịnh Mạch Đan.' });
    const extractor = buildExtractorBrief({ premise, bible, chapterNumber: 1, title: 'Đây là đan dược?', prose: 'Hứa An gọi tên Tịnh Mạch Đan.' });
    for (const brief of [writer, judge, extractor]) {
      expect(brief).not.toHaveProperty('worldKernel');
      expect(JSON.stringify(brief)).not.toContain('Độ Thành Thạo');
      expect(JSON.stringify(brief)).toContain('Tịnh Mạch Đan');
    }
    expect(extractor.thucTheTheGioiHopLe.every(entity => /^[a-z0-9_]+$/.test(entity.id))).toBe(true);
    expect(extractor.chuTheTienTrienHopLe).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'song_gioi_thuong_diem',
        tienTrienHienTai: expect.any(Array),
        nacKeTiepDuyNhat: expect.arrayContaining([
          expect.objectContaining({ rank: expect.objectContaining({ id: 'kho_thu_mua' }) }),
        ]),
      }),
    ]));
    expect(writer.worldSlice.progressionSubjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'song_gioi_thuong_diem' }),
    ]));
    expect(extractor.nacKimThuChiHienTai?.id).toBe('ke_ban_le');
    expect(extractor.nacKeTiepDuyNhat?.id).toBe('kho_thu_mua');
    expect(writer.ghiChuBienTap).toEqual(['Mọi lô hàng phải có người giao và đối giá rõ.']);
    expect(writer.soGiaoDichMoDau).toEqual(
      premise.worldKernel.openingLedger.filter(entry => entry.chapterNumber === 1),
    );
    expect(EXTRACTOR_SYSTEM_PROMPT).toContain('learnedFinger chỉ được chứa id của người');
    expect(EXTRACTOR_SYSTEM_PROMPT).toContain('dueByChapter phải lớn hơn chuongSo hiện tại');
    expect(JUDGE_SYSTEM_PROMPT).toContain('trạng thái ở đầu chương, không phải trần của chương');
    expect(EXTRACTOR_SYSTEM_PROMPT).toContain('newCast.locationId và moved.toLocationId chỉ được lấy nguyên văn từ diaDiemHopLe');
  });

  test('planner receives the open payoff registry as exact ids', () => {
    const brief = buildCyclePlannerBrief({
      premise, bible: baseBible(), previousCycle: null,
      cycleNumber: 2, volumeNumber: 1, startChapter: 8, steering: [],
    });
    expect(brief.loaiSuongHopLe).toContain('tri_thang');
    expect(brief.loaiSuongHopLe).toContain('chan_dong');
    expect(brief.loaiSuongHopLe).not.toContain('deal');
  });

  test('chapter roles receive only the relevant active and recently consumed asset lots', () => {
    const bible = baseBible();
    bible.symbolicCore.activeAssetLots = [{
      lotId: 'c7_ho_than_01', assetId: 'ho_than_phu', assetName: 'Hộ Thân Phù số 01',
      ownerId: 'lam_viet', ownerName: 'Lâm Việt', quantity: 1, unit: 'lá', fungible: false,
      provenance: 'Mua tại quầy phù.', acquiredChapter: 7, updatedChapter: 7,
    }];
    bible.symbolicCore.recentAssetEvents = [{
      chapterNumber: 7, eventId: 'c7_dung_ho_than_00', kind: 'consume',
      assetId: 'ho_than_phu', assetName: 'Hộ Thân Phù số 00', quantity: 1, unit: 'lá', fungible: false,
      sourceLotId: 'c6_ho_than_00', fromOwnerId: 'lam_viet', fromOwnerName: 'Lâm Việt',
      toOwnerId: null, toOwnerName: null, note: 'Lá phù đã kích phát rồi vỡ.',
    }];
    const slice = assetLedgerSlice(bible, ['lam_viet'], 'Hộ Thân Phù');
    expect(slice.activeLots.map(lot => lot.lotId)).toEqual(['c7_ho_than_01']);
    expect(slice.recentEvents.map(event => event.eventId)).toEqual(['c7_dung_ho_than_00']);
    const extractor = buildExtractorBrief({
      premise, bible, chapterNumber: 8, title: 'Dùng phù', prose: 'Lâm Việt giao Hộ Thân Phù số 01.',
    });
    // Quantities are owned by the planned ledger; the extractor no longer reconstructs them.
    expect(extractor).not.toHaveProperty('soTaiSanDauChuong');
  });

  test('relevant cast prefers the protagonist, then whoever the beats name', () => {
    const ids = relevantCast(baseBible(), premise, 'Cao Nguyên chặn hắn ngay cổng chợ');
    expect(ids[0]).toBe('lam_viet');
    expect(ids).toContain('cao_nguyen');
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
    ])).toEqual({ chapters: 2, average: 3.95, weakest: 'anticipation' });
  });
});

describe('code-owned ledger and reader-facing gates', () => {
  const ledger = [
    {
      eventId: 'c8_nhap_phu', kind: 'acquire' as const, assetId: 'ho_than_phu', assetName: 'Hộ Thân Phù',
      quantity: 3, unit: 'lá', fungible: true, sourceLotId: null, fromOwnerId: null, fromOwnerName: null,
      toOwnerId: 'lam_viet', toOwnerName: 'Lâm Việt', note: 'Mua ở quầy phù Thanh Lô.',
    },
    {
      eventId: 'c8_ban_phu', kind: 'transfer' as const, assetId: 'ho_than_phu', assetName: 'Hộ Thân Phù',
      quantity: 1, unit: 'lá', fungible: true, sourceLotId: 'c8_nhap_phu', fromOwnerId: 'lam_viet', fromOwnerName: 'Lâm Việt',
      toOwnerId: 'bay_thach', toOwnerName: 'Bảy Thạch', note: 'Bảy Thạch trả ba tinh hạch Nhất giai.',
    },
  ];
  const ledgerCycle = () => {
    const base = cycle();
    return { ...base, beatSheets: base.beatSheets.map(beat => ({ ...beat, ledger })) };
  };

  test('the writer copies numbers rendered by code from the planned ledger', () => {
    const writerBrief = buildWriterBrief({ premise, bible: baseBible(), cycle: ledgerCycle(), chapterNumber: 8, previousChapter: null });
    expect(writerBrief.bangSoLieu).toEqual([
      '1. Nhập kho: Lâm Việt nhận 3 lá Hộ Thân Phù',
      '2. Giao dịch: Lâm Việt → Bảy Thạch: 1 lá Hộ Thân Phù',
    ]);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/bangSoLieu/);
  });

  test("a customer's own purse never shows up as a shop notice", () => {
    const purse = {
      eventId: 'c8_tui_bay_thach', kind: 'acquire' as const, assetId: 'tinh_hach_nhat_giai', assetName: 'Tinh hạch Nhất giai',
      quantity: 3, unit: 'viên', fungible: true, sourceLotId: null, fromOwnerId: null, fromOwnerName: null,
      toOwnerId: 'bay_thach', toOwnerName: 'Bảy Thạch', note: 'Tinh hạch Bảy Thạch mang theo.',
    };
    const pay = {
      ...purse, eventId: 'c8_tra_tien', kind: 'transfer' as const, sourceLotId: 'c8_tui_bay_thach',
      fromOwnerId: 'bay_thach', fromOwnerName: 'Bảy Thạch', toOwnerId: 'lam_viet', toOwnerName: 'Lâm Việt', note: 'Trả tiền phù.',
    };
    const gift = { ...pay, eventId: 'c8_tang', toOwnerId: 'to_van', toOwnerName: 'Tô Vãn', quantity: 1 };
    const lines = splitLedgerLines([...ledger, purse, pay, gift], 'lam_viet');
    expect(lines.panel.join('\n')).not.toMatch(/Bảy Thạch nhận/);
    expect(lines.panel.join('\n')).toMatch(/Bảy Thạch → Lâm Việt: 3 viên/);
    expect(lines.background).toEqual(['1. Giao dịch: Bảy Thạch → Tô Vãn: 1 viên Tinh hạch Nhất giai']);
  });

  test('a unit the item name already starts with is not printed twice', () => {
    const ticket = {
      ...ledger[0], eventId: 'c3_phieu', assetId: 'phieu_khao_hach', assetName: 'Phiếu Khảo Hạch Chính Thức', quantity: 1, unit: 'phiếu',
    };
    const [line] = splitLedgerLines([ticket], ticket.toOwnerId ?? undefined).panel;
    expect(line).toMatch(/nhận 1 Phiếu Khảo Hạch Chính Thức$/);
    expect(splitLedgerLines([{ ...ticket, unit: 'tấm' }], ticket.toOwnerId ?? undefined).panel[0]).toMatch(/1 tấm Phiếu Khảo Hạch/);
  });

  test('the committed ledger is the plan, whatever the extractor thought changed hands', async () => {
    const extractorGuess = {
      ...goodDigest,
      coreChanges: {
        ...goodDigest.coreChanges,
        assetEvents: [{ ...ledger[0], eventId: 'c8_doan_bua', quantity: 99 }],
      },
    };
    const provider = stubProvider({ writer: [draft()], judge: [cleanVerdict()], extractor: [extractorGuess] });
    const result = await writeOneChapter({ ...chapterInput(provider), cycle: ledgerCycle() });
    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.digest.coreChanges.assetEvents.map(event => event.eventId)).toEqual(['c8_nhap_phu', 'c8_ban_phu']);
    expect(result.bible.symbolicCore.activeAssetLots.map(lot => [lot.lotId, lot.ownerId, lot.quantity])).toEqual([
      ['c8_nhap_phu', 'lam_viet', 2],
      ['c8_ban_phu', 'bay_thach', 1],
    ]);
  });

  test('a price slip that survives its repair is committed, a plot hole is not', async () => {
    const priceSlip: JudgeVerdict['continuity'] = [{
      kind: 'transaction_contradiction',
      quote: 'Bảy Thạch đặt bốn tinh hạch lên quầy.',
      explain: 'bangSoLieu ghi ba tinh hạch.',
    }];
    const provider = stubProvider({
      writer: [draft(), draft()],
      judge: [cleanVerdict({ continuity: priceSlip }), cleanVerdict({ continuity: priceSlip })],
      extractor: [goodDigest],
    });
    const result = await writeOneChapter(chapterInput(provider));
    expect(result.status).toBe('committed');
    if (result.status !== 'committed') return;
    expect(result.verdict.continuity).toEqual(priceSlip);
    expect(provider.calls).toEqual(['writer', 'judge', 'writer', 'judge', 'extractor']);
  });

  test('an impossible planned sale costs one planner retry, never a chapter', async () => {
    const overspend = cycle();
    const bad = {
      ...overspend,
      beatSheets: overspend.beatSheets.map(beat => ({
        ...beat,
        ledger: [ledger[0], { ...ledger[1], quantity: 5 }],
      })),
    };
    const provider = stubProvider({ planner: [bad, ledgerCycle()] });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(provider.calls).toEqual(['planner', 'planner']);
    expect(result.cycle.beatSheets[0].ledger?.[1].quantity).toBe(1);
  });

  test('a planner that forgets the chapter prefix is corrected, references included', async () => {
    const unprefixed = cycle();
    const plan = {
      ...unprefixed,
      beatSheets: unprefixed.beatSheets.map(beat => ({
        ...beat,
        ledger: [
          { ...ledger[0], eventId: 'nhap_phu' },
          { ...ledger[1], eventId: 'ban_phu', sourceLotId: 'nhap_phu' },
        ],
      })),
    };
    const provider = stubProvider({ planner: [plan] });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(provider.calls).toEqual(['planner']);
    expect(result.cycle.beatSheets[0].ledger?.map(event => [event.eventId, event.sourceLotId])).toEqual([
      ['c8_nhap_phu', null],
      ['c8_ban_phu', 'c8_nhap_phu'],
    ]);
  });

  test('brief vocabulary in the prose is caught in code and sent to the one repair', async () => {
    const leaked = draft({ content: `${'x'.repeat(900)}\n\nĐây là Sổ tín dụng thợ săn.\n\nMột thứ mới có tên.` });
    const provider = stubProvider({
      writer: [leaked, draft()],
      judge: [cleanVerdict(), cleanVerdict()],
      extractor: [goodDigest],
    });
    const result = await writeOneChapter(chapterInput(provider));
    expect(result.status).toBe('committed');
    expect(provider.calls).toEqual(['writer', 'judge', 'writer', 'judge', 'extractor']);
    expect(metaLeakFindings('Hoàn tất đơn đã trả trước ở chương 2.')).toHaveLength(1);
    expect(metaLeakFindings('Chương mới của đời hắn bắt đầu.')).toHaveLength(0);
    expect(metaLeakFindings('【1. Giao dịch: Lâm Việt → Bảy Thạch: 1 lá Hộ Thân Phù】')).toHaveLength(1);
  });

  test('two low-pull cycles in a row are a pattern; one is steering', () => {
    const low = cleanVerdict({ scorecard: { opening: 2, anticipation: 2, payoff: 1, newness: 2, endHook: 2 } });
    const high = cleanVerdict();
    expect(cyclePull([low, low])).toBe(1.8);
    expect(cyclePull([])).toBeNull();
    expect(lowPullStreak(cyclePull([low]), cyclePull([low]))).toBe(true);
    expect(lowPullStreak(cyclePull([low]), cyclePull([high]))).toBe(false);
    expect(lowPullStreak(cyclePull([low]), null)).toBe(false);
    expect(LOW_PULL_THRESHOLD).toBe(2.5);
  });
});

describe('never start a paid call without time to finish it', () => {
  const soon = () => Date.now() + 5_000;
  /** Wrap a stub so the tick's remaining time collapses right after the first paid call. */
  const exhaustAfterFirstCall = (provider: StoryModelProvider & { calls: string[] }, clock: { deadline: number }) => ({
    ...provider,
    async json(args: never) {
      const result = await (provider.json as (value: never) => Promise<unknown>)(args);
      clock.deadline = Date.now() + 30_000;
      return result;
    },
  }) as unknown as StoryModelProvider;

  test('a tick too short for the Writer spends nothing', async () => {
    const provider = stubProvider({ writer: [draft()], judge: [cleanVerdict()], extractor: [goodDigest] });
    await expect(writeOneChapter({ ...chapterInput(provider), deadline: soon() })).rejects.toBeInstanceOf(SerialDeadlineError);
    expect(provider.calls).toEqual([]);
  });

  test('a draft written late in the tick is checkpointed before the judge, then resumed without rewriting', async () => {
    const provider = stubProvider({ writer: [draft()], judge: [cleanVerdict()], extractor: [goodDigest] });
    const clock = { deadline: Date.now() + 10 * 60_000 };
    // A live getter: the compiled object spread would freeze it at its first value.
    const withClock = <T extends object>(value: T) => Object.defineProperty(value, 'deadline', { get: () => clock.deadline }) as T & { deadline: number };
    const input = withClock(chapterInput(exhaustAfterFirstCall(provider, clock)));
    const error = await writeOneChapter(input).catch(caught => caught);
    expect(error).toBeInstanceOf(SerialCheckpointError);
    const checkpoint = (error as SerialCheckpointError).checkpoint;
    expect((error as SerialCheckpointError).underlying).toBeInstanceOf(SerialDeadlineError);
    expect(checkpoint.resumeFrom).toBe('judge');
    expect(provider.calls).toEqual(['writer']);

    const resumed = await writeOneChapter({ ...chapterInput(provider), resumeArtifact: checkpoint });
    expect(resumed.status).toBe('committed');
    expect(provider.calls).toEqual(['writer', 'judge', 'extractor']);
  });

  test('a plan that fails validation with no time for its retry hands the correction to the next tick', async () => {
    const previous = cycle({ cycleNumber: 1, startChapter: 1, plannedEndChapter: 7, climax: { payoffKind: 'nghich_tap' } });
    const provider = stubProvider({ planner: [cycle({ climax: { payoffKind: 'nghich_tap' } })] });
    const clock = { deadline: Date.now() + 10 * 60_000 };
    const planInput = Object.defineProperty({
      provider: exhaustAfterFirstCall(provider, clock), routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: previous, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [] as JudgeVerdict[],
    }, 'deadline', { get: () => clock.deadline }) as Parameters<typeof planNextCycle>[0];
    const error = await planNextCycle(planInput).catch(caught => caught);
    expect(error).toBeInstanceOf(SerialDeadlineError);
    expect((error as SerialDeadlineError).correction).toMatch(/payoff kind/);
    expect((error as SerialDeadlineError).usages).toHaveLength(1);
    expect(provider.calls).toEqual(['planner']);
  });

  test('mechanical plan fields are repaired in code instead of costing a retry', async () => {
    const broken = cycle();
    const plan = {
      ...broken,
      plannedEndChapter: broken.startChapter + 2,
      customerLoop: { ...broken.customerLoop!, schedule: { purchaseChapter: 8, useToEarnChapter: 8, publicProofChapter: 20, returnUpgradeChapter: 9 } },
      beatSheets: broken.beatSheets.map(beat => ({ ...beat, valueContrastId: 'thuoc_sang_mat_the', valueExperience: null })),
    };
    const provider = stubProvider({ planner: [plan] });
    const result = await planNextCycle({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(provider.calls).toEqual(['planner']);
    expect(result.cycle.plannedEndChapter).toBe(12);
    expect(result.cycle.customerLoop?.schedule).toEqual({ purchaseChapter: 8, useToEarnChapter: 9, publicProofChapter: 10, returnUpgradeChapter: 11 });
    expect(result.cycle.beatSheets[0].valueContrastId).toBeNull();
  });
});

describe('judge reads where the previous chapter left off', () => {
  test('the judge brief carries the previous ending and the prompt names the sequence check', () => {
    const brief = buildJudgeBrief({
      premise, bible: baseBible(), cycle: cycle(), chapterNumber: 8, title: 'Chương tám', prose: 'x'.repeat(900),
      previousChapter: 'Đầu chương. '.repeat(400) + '“Đưa ba bản về đây trước. Sau đó Đội Tro Tàn đi săn.”',
    });
    expect(brief.doanCuoiChuongTruoc).toMatch(/Đưa ba bản về đây trước/);
    expect(brief.doanCuoiChuongTruoc.split(/\s+/).length).toBeLessThanOrEqual(300);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/doanCuoiChuongTruoc[\s\S]*timeline/);
  });
});

describe('judge review binding', () => {
  const chapter = {
    chapterNumber: 4,
    title: '“Tôi sẽ làm điểm giao dịch lớn nhất Đông Hà!”',
    content: 'Tô Vãn đặt bút ký. “Thành Vệ không cần lời quảng cáo — ta cần hàng đúng phẩm, đúng hẹn,” nàng nói, rồi nhìn Lâm Việt thật lâu trước khi quay đi.',
  };

  test('a re-typed passage with straight quotes and spacing still proves the draft was read', () => {
    const excerpt = '"Thành Vệ không cần lời quảng cáo - ta cần hàng đúng phẩm, đúng hẹn," nàng nói, rồi nhìn Lâm Việt';
    expect(reviewBindingMismatch({ chapterNumber: 4, title: 'Tôi sẽ làm điểm giao dịch lớn nhất Đông Hà!', excerpt }, chapter)).toBeNull();
  });

  test('an invented passage, a wrong title or a wrong chapter does not', () => {
    const excerpt = 'Lâm Việt mở kho ở Thanh Lô Phường và đếm lại toàn bộ đan dược còn trên kệ gỗ.';
    expect(reviewBindingMismatch({ chapterNumber: 4, title: chapter.title, excerpt }, chapter)).toMatch(/excerpt not found/);
    expect(reviewBindingMismatch({ chapterNumber: 4, title: 'Một tên khác', excerpt: chapter.content.slice(0, 60) }, chapter)).toMatch(/title/);
    expect(reviewBindingMismatch({ chapterNumber: 3, title: chapter.title, excerpt: chapter.content.slice(0, 60) }, chapter)).toMatch(/chapterNumber/);
  });
});

describe('opening findings: local ones are fixed in place, structural ones replan', () => {
  const opening = Array.from({ length: 4 }, (_, index) => ({
    chapterNumber: index + 1, title: `Chương thử ${index + 1}`, content: `Nội dung chương ${index + 1}. `.repeat(40),
  }));
  const timeline = {
    kind: 'timeline' as const, chapterNumber: 3, quote: 'Nội dung chương 3.',
    explain: 'Đội săn mang chiến lợi phẩm về trước khi nhận bí tịch đã hẹn.', repair: 'Giao bí tịch đầu chương ba.',
  };

  test('a timeline slip is local; a late golden finger is structural', () => {
    const { structural, local } = splitOpeningFindings({
      passed: false, summary: 's',
      findings: [timeline, { ...timeline, kind: 'golden_finger_late', chapterNumber: 2 }],
    });
    expect(local.map(finding => finding.kind)).toEqual(['timeline']);
    expect(structural.map(finding => finding.kind)).toEqual(['golden_finger_late']);
  });

  test('only the flagged chapter is revised, with the editor note in hand', async () => {
    const provider = stubProvider({ writer: [draft({ title: 'Chương thử 3', content: 'Bản đã sửa. '.repeat(80) })] });
    const result = await repairOpeningChapters({ provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: opening, findings: [timeline] });
    expect(provider.calls).toEqual(['writer']);
    expect(result.repaired).toEqual([3]);
    expect(result.chapters[2].content).toMatch(/Bản đã sửa/);
    expect(result.chapters.filter(chapter => chapter.chapterNumber !== 3)).toEqual(opening.filter(chapter => chapter.chapterNumber !== 3));
  });
});

describe('opening repair follows a fix that moved the problem next door', () => {
  const opening = Array.from({ length: 4 }, (_, index) => ({
    chapterNumber: index + 1, title: `Chương thử ${index + 1}`,
    content: `Nội dung chương ${index + 1}. `.repeat(40) + '\n\n【Giao dịch hoàn tất】',
  }));
  const finding = (chapterNumber: number) => ({
    kind: 'timeline' as const, chapterNumber, quote: `Nội dung chương ${chapterNumber}.`,
    explain: 'Trình tự giao hàng mâu thuẫn.', repair: 'Chỉ giữ một lần giao.',
  });

  test('a second round repairs the neighbour, then stops', async () => {
    const fixed = (n: number) => draft({ title: `Chương thử ${n}`, content: `Bản sửa ${n}. `.repeat(80) + '\n\n【Giao dịch hoàn tất】' });
    const provider = stubProvider({
      writer: [fixed(3), fixed(4)],
      auditor: [
        { passed: false, summary: 'Chương 4 giao lại.', findings: [finding(4)] },
        { passed: true, summary: 'Sạch.', findings: [] },
      ],
    });
    const saved: number[][] = [];
    const result = await repairOpeningUntilClean({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: opening,
      audit: { passed: false, summary: 'Chương 3 sai trình tự.', findings: [finding(3)] },
      onRepaired: (_chapters, numbers) => { saved.push(numbers); },
    });
    expect(saved).toEqual([[3], [4]]);
    expect(provider.calls).toEqual(['writer', 'auditor', 'writer', 'auditor']);
    expect(result.audit.passed).toBe(true);
    expect(result.repaired).toEqual([3, 4]);
  });

  test('structural findings are never patched', async () => {
    const provider = stubProvider({});
    const result = await repairOpeningUntilClean({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise, chapters: opening,
      audit: { passed: false, summary: 's', findings: [{ ...finding(2), kind: 'title_promise_unpaid' }] },
    });
    expect(provider.calls).toEqual([]);
    expect(result.rounds).toEqual([]);
  });
});

describe('the customer loop belongs to commerce archetypes', () => {
  test('a commerce plan without a loop costs one retry; another archetype drops an invented one', async () => {
    const withoutLoop = { ...cycle(), customerLoop: null };
    const commerce = stubProvider({ planner: [withoutLoop, cycle()] });
    await planNextCycle({
      provider: commerce, routes: DEFAULT_SERIAL_ROUTES, premise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(commerce.calls).toEqual(['planner', 'planner']);

    const beastPremise = { ...premise, archetype: 'beast_taming' };
    const beastPlanner = promptsFor('beast_taming').planner;
    const calls: string[] = [];
    const beastProvider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string }) {
        calls.push(input.system === beastPlanner ? 'beast-planner' : 'other');
        return { value: cycle() as T, usage: usage(input.model) };
      },
    } as StoryModelProvider;
    const result = await planNextCycle({
      provider: beastProvider, routes: DEFAULT_SERIAL_ROUTES, premise: beastPremise, bible: baseBible(),
      previousCycle: null, cycleNumber: 2, volumeNumber: 1, startChapter: 8, recentVerdicts: [],
    });
    expect(calls).toEqual(['beast-planner']);
    expect(result.cycle.customerLoop).toBeNull();
  });
});
