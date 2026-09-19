import { readFileSync } from 'node:fs';
import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema, PremiseSchema, PAYOFF_KINDS,
  scorecardAverage, type Bible, type ChapterDigest, type CyclePlan, type Premise,
} from '@/services/serial/contracts';
import {
  applyDigest, assertPayoffRotation, overdueHooks, recentPayoffKinds, SerialStateError, tierIndex,
} from '@/services/serial/state';
import { WRITER_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT } from '@/services/serial/prompts';

const premise: Premise = PremiseSchema.parse({
  schemaVersion: 1,
  lane: 'he_thong_do_thi',
  title: 'Hệ Thống Thẩm Định: Ta Nhìn Một Cái Là Biết Giá Trời',
  hook: 'Một cái liếc mắt định giá cả gia sản, và cả kẻ đang khinh thường hắn.',
  blurb: 'Trần Khang bị đuổi khỏi tiệm cầm đồ đúng ngày mẹ nhập viện, trong túi còn đúng hai trăm nghìn. '
    + 'Rồi một bảng chữ xanh hiện ra trước mắt: mọi món đồ hắn nhìn vào đều lộ ra giá thật và lai lịch thật. '
    + 'Ngay chiều hôm đó hắn mua lại cái chén sứt mẻ bị cả chợ chê với giá ba trăm nghìn, và bán nó đi bằng một con số khiến chủ tiệm cũ phải chạy tới tận nơi. '
    + 'Nhưng thứ mà hệ thống nhìn thấy không dừng ở đồ vật, và giới thẩm định của thành phố này không ưa người lạ.',
  readerFantasy: 'Biết thứ người khác không biết, rồi được trả tiền vì điều đó ngay trước mặt họ.',
  goldenFinger: {
    name: 'Hệ Thống Thẩm Định Vạn Vật',
    rule: 'Nhìn vào một món đồ là thấy tên thật, niên đại thật và giá trị thật của nó hiện lên thành bảng.',
    limit: 'Mỗi ngày chỉ dùng được số lần bằng cấp bậc hiện tại, và thẩm định đồ giả sẽ khiến hắn đau đầu dữ dội.',
    evolution: [
      { id: 'ev1', name: 'Thẩm định đồ vật', changesUse: 'Chỉ thấy giá và niên đại.' },
      { id: 'ev2', name: 'Thẩm định lai lịch', changesUse: 'Thấy món đồ từng qua tay ai.' },
      { id: 'ev3', name: 'Thẩm định người', changesUse: 'Thấy năng lực thật của một người.' },
      { id: 'ev4', name: 'Thẩm định vận', changesUse: 'Thấy món đồ sẽ đổi giá thế nào.' },
      { id: 'ev5', name: 'Thẩm định địa mạch', changesUse: 'Thấy cả một khu đất, không chỉ một món.' },
      { id: 'ev6', name: 'Thẩm định nhân quả', changesUse: 'Thấy ai sẽ tranh món đồ này với hắn.' },
    ],
  },
  tierLadder: [
    { id: 'tier_hoc_viec', name: 'Học việc' },
    { id: 'tier_tho_xem', name: 'Thợ xem' },
    { id: 'tier_chuong_quay', name: 'Chưởng quầy' },
    { id: 'tier_giam_dinh_su', name: 'Giám định sư' },
    { id: 'tier_dai_su', name: 'Đại sư' },
    { id: 'tier_tong_giam', name: 'Tổng giám' },
  ],
  castSeed: [
    { id: 'khang', name: 'Trần Khang', role: 'protagonist', agenda: 'Kiếm đủ tiền chữa bệnh cho mẹ.' },
    { id: 'me_khang', name: 'Bà Tư', role: 'family', agenda: 'Không muốn con trai dính vào giới buôn đồ cổ.' },
    { id: 'lao_hoa', name: 'Lão Hoà', role: 'ally', agenda: 'Tìm người nối nghiệp tiệm cầm đồ sắp sập.' },
    { id: 'chu_tiem', name: 'Bảy Thạch', role: 'antagonist', agenda: 'Giữ độc quyền thu mua ở chợ Cũ.', antagonistClass: 'chủ tiệm địa phương' },
    { id: 'ba_lam', name: 'Bà Lâm', role: 'antagonist', agenda: 'Thâu tóm cả tuyến hàng cổ vật của thành phố.', antagonistClass: 'hội trưởng hội thẩm định' },
    { id: 'tieu_my', name: 'Tiểu Mỹ', role: 'rival', agenda: 'Chứng minh bằng cấp hơn con mắt.' },
  ],
  arena: 'Giới buôn và thẩm định đồ cổ ở một thành phố lớn.',
  novelty: 'Hệ thống định giá được cả người chứ không chỉ đồ vật.',
  endingDirection: 'Trần Khang lập ra sàn thẩm định công khai, phá thế độc quyền định giá của các hội kín.',
  voiceSheet: {
    pov: 'third_limited',
    register: 'Thông tục, tự giễu, nhiều thoại, câu ngắn.',
    chapterTitleRule: 'Một câu nói hoặc câu nghĩ có thái độ, trích từ cuối chương.',
    showsSystemPanel: true,
    taboos: ['Không nhắc chính trị', 'Không mô tả bạo lực với trẻ em'],
  },
});

const baseBible = (): Bible => BibleSchema.parse({
  schemaVersion: 1,
  symbolicCore: {
    storyDay: 3,
    chapterNumber: 7,
    mc: { tierId: 'tier_tho_xem', locationId: 'cho_cu', keyAssetIds: ['chen_su'] },
    cast: [
      { id: 'khang', alive: true, tierId: 'tier_tho_xem', locationId: 'cho_cu', lastSeenChapter: 7, knowsFinger: true },
      { id: 'chu_tiem', alive: true, tierId: 'tier_chuong_quay', locationId: 'cho_cu', lastSeenChapter: 6, knowsFinger: false },
      { id: 'lao_hoa', alive: true, tierId: null, locationId: 'tiem_cam_do', lastSeenChapter: 5, knowsFinger: false },
    ],
    openHooks: [
      { id: 'hook_giay_to', what: 'Tờ giấy chứng nhận trong đáy hộp chưa ai đọc.', plantedChapter: 4, dueByChapter: 12, status: 'open' },
    ],
  },
  castSheet: [
    { id: 'khang', name: 'Trần Khang', sheet: 'Hai mươi ba tuổi, bỏ học giữa chừng, mắt tinh nhưng không có bằng cấp.' },
    { id: 'chu_tiem', name: 'Bảy Thạch', sheet: 'Chủ tiệm lớn nhất chợ Cũ, quen ép giá người mới.' },
    { id: 'lao_hoa', name: 'Lão Hoà', sheet: 'Chủ tiệm cầm đồ già, nợ ngập đầu, còn giữ một cuốn sổ cũ.' },
  ],
  world: [{ id: 'cho_cu', name: 'Chợ Cũ', note: 'Khu chợ đồ cũ lớn nhất thành phố, Bảy Thạch nắm phần lớn sạp.' }],
  recentSummary: [
    { chapterNumber: 6, title: 'Ai cho anh định giá?', summary: 'Khang bị Bảy Thạch đuổi khỏi sạp.', payoffKind: 'va_mat', endedOn: 'Bảy Thạch hẹn gặp lại ở phiên đấu.' },
    { chapterNumber: 7, title: 'Cái chén này không sứt', summary: 'Khang mua lại chiếc chén bị cả chợ chê.', payoffKind: 'kho_bau', endedOn: 'Một người lạ đứng nhìn hắn rất lâu.' },
  ],
  volumeSummaries: [],
  styleMemory: ['ánh mắt sắc như dao'],
});

const digest = (
  over: Partial<Omit<ChapterDigest, 'coreChanges'>> & { coreChanges?: Partial<ChapterDigest['coreChanges']> } = {},
): ChapterDigest => {
  const { coreChanges, ...rest } = over;
  return ChapterDigestSchema.parse({
    chapterNumber: 8,
    title: 'Anh vừa nói ba trăm triệu à?',
    summary: 'Khang định giá công khai món đồ Bảy Thạch vừa bán hớ.',
    payoffKind: 'va_mat',
    endedOn: 'Bà Lâm cho người mời hắn lên hội quán.',
    newNamedThings: ['Hội quán Thẩm Định Đông Thành'],
    ...rest,
    coreChanges: {
      storyDayDelta: 1,
      died: [], tierChanges: [], moved: [], newCast: [],
      hooksPlanted: [], hooksPaid: [], learnedFinger: [],
      ...coreChanges,
    },
  });
};

const cycle = (
  over: Partial<Omit<CyclePlan, 'climax'>> & { climax?: Partial<CyclePlan['climax']> } = {},
): CyclePlan => {
  const { climax, ...rest } = over;
  return CyclePlanSchema.parse({
    schemaVersion: 1,
    cycleNumber: 2, volumeNumber: 1, startChapter: 8, plannedEndChapter: 16,
    pressure: 'Bảy Thạch cấm mọi sạp bán hàng cho Khang, cắt nguồn hàng của hắn.',
    escalation: ['Khang mất mối cuối cùng', 'Tiền viện phí đến hạn', 'Bà Lâm gửi lời mời có điều kiện'],
    aftermath: 'Bảy Thạch mất mặt nhưng giữ được tuyến hàng, quay sang bắt tay Bà Lâm.',
    nextHook: 'Phiên đấu kín có một món đồ mà hệ thống không đọc được.',
    beatSheets: [{
      chapterNumber: 8,
      beats: ['Khang bị chặn mua hàng', 'Hắn định giá công khai ngay giữa chợ'],
      emotionalTarget: 'Hả hê nhưng thấy ngay nguy hiểm mới.',
      newNamedThing: 'Hội quán Thẩm Định Đông Thành',
      endHookKind: 'threat',
    }],
    ...rest,
    climax: {
      payoffKind: 'tri_thang',
      result: 'Khang định giá đúng món đồ cả hội quán định sai, giành suất dự phiên đấu kín.',
      witnesses: ['Hội quán Đông Thành', 'Bảy Thạch', 'Tiểu Mỹ'],
      ...climax,
    },
  });
};

describe('serial contracts', () => {
  test('a premise must name six or more cast members with two antagonist classes', () => {
    const classes = new Set(premise.castSeed.filter(m => m.role === 'antagonist').map(m => m.antagonistClass));
    expect(premise.castSeed.length).toBeGreaterThanOrEqual(6);
    expect(classes.size).toBeGreaterThanOrEqual(2);
    expect(() => PremiseSchema.parse({ ...premise, castSeed: premise.castSeed.slice(0, 3) })).toThrow();
  });

  test('the golden finger evolves by changing its use, six to eight times', () => {
    expect(premise.goldenFinger.evolution).toHaveLength(6);
    expect(() => PremiseSchema.parse({
      ...premise,
      goldenFinger: { ...premise.goldenFinger, evolution: premise.goldenFinger.evolution.slice(0, 4) },
    })).toThrow();
  });

  test('a cycle spans five to fifteen chapters', () => {
    expect(() => cycle({ plannedEndChapter: 12 })).not.toThrow();   // 8..12 = 5
    expect(() => cycle({ plannedEndChapter: 22 })).not.toThrow();   // 8..22 = 15
    expect(() => cycle({ plannedEndChapter: 11 })).toThrow(/5-15 chapters/);  // 4
    expect(() => cycle({ plannedEndChapter: 23 })).toThrow(/5-15 chapters/);  // 16
  });

  test('beat sheets are rolling and carry no mechanical state', () => {
    const sheet = cycle().beatSheets[0];
    expect(cycle().beatSheets.length).toBeLessThanOrEqual(3);
    expect(Object.keys(sheet).sort()).toEqual(['beats', 'chapterNumber', 'emotionalTarget', 'endHookKind', 'newNamedThing']);
  });

  test('scorecard averages the five reading dimensions', () => {
    expect(scorecardAverage({
      continuity: [], repetition: [], aiFlavor: [], steering: [],
      scorecard: { opening: 5, anticipation: 4, payoff: 4, newness: 3, endHook: 4 },
    })).toBe(4);
  });
});

describe('serial state merge', () => {
  test('a digest advances the Bible by exactly one chapter', () => {
    const next = applyDigest({ premise, bible: baseBible(), digest: digest() });
    expect(next.symbolicCore.chapterNumber).toBe(8);
    expect(next.symbolicCore.storyDay).toBe(4);
    expect(() => applyDigest({ premise, bible: baseBible(), digest: digest({ chapterNumber: 10 }) }))
      .toThrow(/Bible is at 7/);
  });

  test('the dead stay dead across every kind of change', () => {
    const killed = applyDigest({ premise, bible: baseBible(), digest: digest({ coreChanges: { died: ['chu_tiem'] } }) });
    expect(killed.symbolicCore.cast.find(c => c.id === 'chu_tiem')?.alive).toBe(false);

    for (const change of <Array<Partial<ChapterDigest['coreChanges']>>>[
      { moved: [{ characterId: 'chu_tiem', toLocationId: 'hoi_quan' }] },
      { tierChanges: [{ characterId: 'chu_tiem', toTierId: 'tier_dai_su', why: 'thăng chức' }] },
      { died: ['chu_tiem'] },
    ]) {
      expect(() => applyDigest({
        premise, bible: killed,
        digest: digest({ chapterNumber: 9, coreChanges: change }),
      })).toThrow(SerialStateError);
    }
  });

  test('rank never regresses down the named ladder', () => {
    expect(tierIndex(premise, 'tier_tho_xem')).toBe(1);
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { tierChanges: [{ characterId: 'khang', toTierId: 'tier_hoc_viec', why: 'bị giáng' }] } }),
    })).toThrow(/demotes khang/);

    const promoted = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { tierChanges: [{ characterId: 'khang', toTierId: 'tier_chuong_quay', why: 'thắng phiên đấu' }] } }),
    });
    expect(promoted.symbolicCore.mc.tierId).toBe('tier_chuong_quay');
  });

  test('a hook can only be paid once, and only after it is planted', () => {
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPaid: ['hook_khong_co'] } }),
    })).toThrow(/unplanted hook/);

    const paid = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPaid: ['hook_giay_to'] } }),
    });
    expect(paid.symbolicCore.openHooks[0].status).toBe('paid');
    expect(() => applyDigest({
      premise, bible: paid,
      digest: digest({ chapterNumber: 9, coreChanges: { hooksPaid: ['hook_giay_to'] } }),
    })).toThrow(/already paid/);
  });

  test('a hook planted with a deadline in the past is rejected', () => {
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPlanted: [{ id: 'hook_moi', what: 'Người lạ theo dõi Khang.', dueByChapter: 8 }] } }),
    })).toThrow(/due at chapter 8/);
  });

  test('knowing the secret is one-way, and new cast arrive with a sheet', () => {
    const next = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: {
        learnedFinger: ['lao_hoa'],
        newCast: [{ id: 'ba_lam', name: 'Bà Lâm', sheet: 'Hội trưởng hội thẩm định, nói ít, nhớ lâu.', role: 'antagonist' }],
      } }),
    });
    expect(next.symbolicCore.cast.find(c => c.id === 'lao_hoa')?.knowsFinger).toBe(true);
    expect(next.castSheet.find(c => c.id === 'ba_lam')?.sheet).toMatch(/Hội trưởng/);
    expect(() => applyDigest({
      premise, bible: next,
      digest: digest({ chapterNumber: 9, coreChanges: { newCast: [{ id: 'ba_lam', name: 'Bà Lâm', sheet: 'Trùng id.', role: 'antagonist' }] } }),
    })).toThrow(/re-introduces/);
  });

  test('recent memory stays a ten-chapter window', () => {
    let bible = baseBible();
    for (let chapter = 8; chapter <= 20; chapter += 1) {
      bible = applyDigest({ premise, bible, digest: digest({ chapterNumber: chapter }) });
    }
    expect(bible.recentSummary).toHaveLength(10);
    expect(bible.recentSummary[0].chapterNumber).toBe(11);
    expect(bible.symbolicCore.chapterNumber).toBe(20);
  });
});

describe('serial pacing rules', () => {
  test('a cycle may not lead on the payoff kind the previous cycle used', () => {
    const first = cycle({ cycleNumber: 1, startChapter: 1, plannedEndChapter: 7, climax: { payoffKind: 'nghich_tap' } });
    expect(() => assertPayoffRotation(first, cycle({ climax: { payoffKind: 'nghich_tap' } })))
      .toThrow(/repeats the payoff kind/);
    expect(() => assertPayoffRotation(first, cycle())).not.toThrow();
    expect(() => assertPayoffRotation(null, first)).not.toThrow();
  });

  test('overdue hooks surface before a cycle is allowed to end', () => {
    expect(overdueHooks(baseBible(), 11)).toHaveLength(0);
    expect(overdueHooks(baseBible(), 12)).toEqual([
      { id: 'hook_giay_to', what: 'Tờ giấy chứng nhận trong đáy hộp chưa ai đọc.', dueByChapter: 12 },
    ]);
  });

  test('recent payoff kinds come back newest first for the planner to rotate away from', () => {
    expect(recentPayoffKinds(baseBible())).toEqual(['kho_bau', 'va_mat']);
    expect(new Set(PAYOFF_KINDS).size).toBe(15);
  });
});

describe('writer prompt encodes the measured Faloo rules', () => {
  const craft = readFileSync('docs/FALOO_CRAFT.md', 'utf8');

  test('the opening ban, the named-thing rule and the end hook are all stated', () => {
    expect(WRITER_SYSTEM_PROMPT).toMatch(/không mở chương bằng thời tiết, mùi, ánh sáng/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/MỖI CHƯƠNG PHẢI THÊM MỘT THỨ MỚI CÓ TÊN/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/một mối đe doạ mới bước vào, một câu hỏi được đặt thẳng ra, hoặc một lời tuyên bố/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/Tối đa ba dòng cho toàn bộ quá khứ/);
  });

  test('the Writer is told what it may not contradict, not what it must recite', () => {
    expect(WRITER_SYSTEM_PROMPT).toMatch(/Bạn được tự do bịa thêm/);
    expect(WRITER_SYSTEM_PROMPT).not.toMatch(/requiredChanges|requiredDeltas|delta|ledger/i);
  });

  test('the judge blocks only on quotable contradiction and never on the reading score', () => {
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/chỉ khi bạn trích được nguyên văn/);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/không bao giờ chặn chương/);
  });

  test('the cycle planner is forbidden the mechanical vocabulary that produced process fiction', () => {
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/không ghi delta tài nguyên, không ghi lịch trình phút/);
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/đối thủ phải đổi giai cấp/);
  });

  test('the craft document these rules come from is still in the repo', () => {
    expect(craft).toMatch(/81 ký tự \(≈ 15 từ, ≈ 1 câu\)/);
    expect(craft).toMatch(/Hình thức văn xuôi của ta đã đạt chuẩn Faloo rồi/);
    expect(craft).toMatch(/Khác biệt nằm nguyên ở|khối lượng biến cố/);
  });
});
