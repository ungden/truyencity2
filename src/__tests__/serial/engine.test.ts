import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import type { ChapterDigest, ChapterDraft, CyclePlan, JudgeVerdict, OpeningAudit } from '@/services/serial/contracts';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import {
  auditFourChapterOpening, cycleReadyToClose, foldVolume, planNextCycle, readingHealth, writeOneChapter,
} from '@/services/serial/engine';
import { normalizeChapterDraft } from '@/services/serial/agents';
import { assetLedgerSlice, buildCyclePlannerBrief, buildExtractorBrief, buildJudgeBrief, buildWriterBrief, collectSteering, refreshStyleMemory, relevantCast } from '@/services/serial/context';
import { seedBible } from '@/services/serial/state';
import { premise, baseBible, cycle } from './fixtures';
import {
  CYCLE_PLANNER_SYSTEM_PROMPT, EXTRACTOR_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT,
  OPENING_AUDITOR_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT,
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
    async json<T>(input: { model: string; system: string }): Promise<{ value: T; usage: ProviderUsage }> {
      const role = roleOf(input.system);
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

  test('prose the reader accepts but state cannot absorb replans rather than committing a wrong Bible', async () => {
    const invalid = { ...goodDigest, coreChanges: { ...goodDigest.coreChanges, hooksPaid: ['hook_khong_ton_tai'] } };
    const provider = stubProvider({
      writer: [draft()], judge: [cleanVerdict()],
      extractor: [invalid, invalid],
    });
    const result = await writeOneChapter(chapterInput(provider));

    expect(result.status).toBe('needs_replan');
    if (result.status !== 'needs_replan') return;
    expect(result.reason).toMatch(/unknown_hook/);
    expect(provider.calls.filter(call => call === 'extractor')).toHaveLength(2);
  });

  test('a bad extractor id gets one cheap repair without rewriting valid prose', async () => {
    const provider = stubProvider({
      writer: [draft()], judge: [cleanVerdict()],
      extractor: [
        { ...goodDigest, coreChanges: { ...goodDigest.coreChanges, worldFactsRevealed: [{ id: 'doi_tam_thoi', note: 'Một đội vừa ký đơn.' }] } },
        goodDigest,
      ],
    });
    const result = await writeOneChapter(chapterInput(provider));
    expect(result.status).toBe('committed');
    expect(provider.calls.filter(call => call === 'writer')).toHaveLength(1);
    expect(provider.calls.filter(call => call === 'extractor')).toHaveLength(2);
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
    content: 'Một giao dịch có nguồn hàng và thanh toán rõ ràng. '.repeat(30),
  }));

  test('requires a named supplier and consideration, not a floating system receipt', () => {
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).toContain('không cho biết thu từ ai và đổi lấy gì không đủ chứng minh nguồn');
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).toContain('vượt quá giá niêm yết');
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).toContain('Sổ giao dịch chuẩn');
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

  test('a rolling planner changes recent scene modes outside locked customer milestones', async () => {
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
    expect(result.cycle.beatSheets.map(sheet => sheet.sceneMode)).toEqual(['transaction', 'investigation', 'crafting']);
    expect(result.usages).toHaveLength(2);
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
    expect(extractor.soTaiSanDauChuong.activeLots[0].lotId).toBe('c7_ho_than_01');
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
