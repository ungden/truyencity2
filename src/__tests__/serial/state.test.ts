import { readFileSync } from 'node:fs';
import {
  PremiseSchema, CyclePlanSchema, scorecardAverage, type ChapterDigest,
} from '@/services/serial/contracts';
import {
  applyDigest, assertPayoffRotation, assertStanceHeld, overdueHooks, recentPayoffKinds, seedBible, SerialStateError, tierIndex,
} from '@/services/serial/state';
import { WRITER_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT, PREMISE_SYSTEM_PROMPT } from '@/services/serial/prompts';
import { payoffKindIds, activeRules, staleRules } from '@/services/serial/playbook';
import { premise, baseBible, digest, cycle } from './fixtures';

describe('serial contracts', () => {
  test('a premise must climb four dimensions of conflict, not one dimension four times', () => {
    // Comparable serials die around chapter 300-500 because they run out of kinds of
    // problem. The old engine's novels were fighting the same market rival at 90 as at 9.
    expect(Object.keys(premise.conflictLadder)).toEqual(['survival', 'rules', 'ideology', 'self']);
    expect(premise.hiddenThread.length).toBeGreaterThan(40);
    expect(() => PremiseSchema.parse({ ...premise, conflictLadder: undefined })).toThrow();
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/XUNG ĐỘT PHẢI ĐỔI CHIỀU, KHÔNG PHẢI ĐỔI CỠ/);
  });

  test('a premise must name six or more cast members with two antagonist classes', () => {
    const classes = new Set(premise.castSeed.filter(m => m.role === 'antagonist').map(m => m.antagonistClass));
    expect(premise.castSeed.length).toBeGreaterThanOrEqual(6);
    expect(classes.size).toBeGreaterThanOrEqual(2);
    expect(() => PremiseSchema.parse({ ...premise, castSeed: premise.castSeed.slice(0, 3) })).toThrow();
  });

  test('the advantage is bounded by scope, never billed to the protagonist', () => {
    // The field this replaced was called `limit` and asked what the advantage cost.
    // That wording produced systems that charge the protagonist in lifespan, debt or
    // injury — the thing readers now quit over.
    expect(premise.goldenFinger).not.toHaveProperty('limit');
    expect(premise.goldenFinger.scope).toBeTruthy();
    expect(premise.oppositionEngine).toMatch(/mất tiền khi hắn thắng|đoạt|cắt mất phần/);
    expect(() => PremiseSchema.parse({ ...premise, oppositionEngine: undefined })).toThrow();
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
    // Open registry, not a closed enum: today's craft note added a beat the old
    // fifteen could not express — an ally winning with something the protagonist gave them.
    expect(payoffKindIds()).toContain('hau_truong');
    expect(payoffKindIds().length).toBeGreaterThan(15);
    expect(() => cycle({ climax: { payoffKind: 'khong_co_trong_playbook' } })).toThrow(/Unknown payoff kind/);
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

  test('the premise prompt bans advantages that punish their owner', () => {
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/TUYỆT ĐỐI KHÔNG thiết kế kim thủ chỉ quay lại cắn chủ nhân/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/trừ thọ nguyên, rút máu, gánh ngược bệnh tật/);
    // Tension has to come from people, and the business has to jump rather than crawl.
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/oppositionEngine mới là nguồn căng thẳng/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/nhảy bậc chứ không bò từng bước/);
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

describe('seeding a story', () => {
  test('a launch Bible is derived entirely from the approved premise', () => {
    const bible = seedBible({ premise, startLocationId: 'cho_cu', startLocationNote: 'Khu chợ đồ cũ lớn nhất thành phố.' });
    expect(bible.symbolicCore.chapterNumber).toBe(0);
    expect(bible.symbolicCore.storyDay).toBe(0);
    expect(bible.symbolicCore.mc.tierId).toBe('tier_hoc_viec');
    expect(bible.symbolicCore.cast.every(member => member.alive)).toBe(true);
    expect(bible.symbolicCore.openHooks).toEqual([]);
    // Only the protagonist starts knowing about the advantage.
    expect(bible.symbolicCore.cast.filter(member => member.knowsFinger).map(member => member.id)).toEqual(['khang']);
    expect(bible.castSheet).toHaveLength(premise.castSeed.length);
  });

  test('the first chapter merges onto a seeded Bible', () => {
    const seeded = seedBible({ premise, startLocationId: 'cho_cu', startLocationNote: 'Chợ Cũ.' });
    const next = applyDigest({ premise, bible: seeded, digest: digest({ chapterNumber: 1 }) });
    expect(next.symbolicCore.chapterNumber).toBe(1);
    expect(next.recentSummary).toHaveLength(1);
  });

  test('a premise with no protagonist cannot seed a story', () => {
    const headless = { ...premise, castSeed: premise.castSeed.map(m => ({ ...m, role: 'ally' as const })) };
    expect(() => seedBible({ premise: headless, startLocationId: 'cho_cu', startLocationNote: 'Chợ Cũ.' }))
      .toThrow(/no character with role/);
  });
});

describe('craft playbook', () => {
  test('taste lives in data, so a craft correction is not a code change', () => {
    const writer = activeRules('writer');
    expect(writer.length).toBeGreaterThan(5);
    // Every rule carries where it came from and when that was last checked.
    for (const rule of writer) {
      expect(rule.evidence.length).toBeGreaterThan(3);
      expect(rule.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(WRITER_SYSTEM_PROMPT).toContain(writer[0].text.split('\n')[0]);
  });

  test('stale rules surface by age instead of rotting silently', () => {
    const future = new Date('2027-06-01');
    expect(staleRules(120, future).length).toBeGreaterThan(0);
    expect(staleRules(120, new Date('2026-09-20'))).toEqual([]);
  });

  test('the premise prompt carries the genre conventions it kept inventing around', () => {
    // The bug this caught: a premise priced spirit stones in Vietnamese dong. Earth has
    // no spirit-stone market, no buyer and no reference price, and a convert reader sees
    // that in one line.
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/Linh thạch là tiền tệ nội bộ/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/Nêu đích danh người mua ở mỗi đầu/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/Luyện Khí|Trúc Cơ|Kim Đan/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/hạ phẩm.*trung phẩm.*thượng phẩm/);
  });

  test('the corrections from this session are recorded as rules with evidence', () => {
    const ids = activeRules('premise').map(rule => rule.id);
    expect(ids).toEqual(expect.arrayContaining([
      'no_self_punishing_power',   // advantages must not bill their owner
      'business_jumps',            // commerce jumps a tier per cycle
      'asymmetry_is_the_engine',   // no gimmick conditions bolted onto the premise
      'economy_must_close',        // name a real buyer on each side
      'modern_side_is_parallel',   // invented city, no real places to nitpick
      'protagonist_needs_contrast',// a tag and a contrast, visible in chapter one
      'product_against_agony',     // one named product against one named suffering
    ]));
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/THẾ GIỚI SONG SONG, KHÔNG PHẢI VIỆT NAM THẬT/);
    // Naming the language would invent the very question the parallel world avoids.
    expect(WRITER_SYSTEM_PROMPT).toMatch(/NGÔN NGỮ KHÔNG BAO GIỜ LÀ MỘT CHỦ ĐỀ/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/không phiên dịch/);
    // The shipped seed premise has to obey the rule it ships with.
    expect(premise.arena).toMatch(/thế giới song song/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/KHÔNG gắn thêm điều kiện vặt/);
  });
});

describe('broker stance', () => {
  const climax = (performedBy: 'protagonist' | 'ally', attribution: 'public' | 'hidden' = 'public') =>
    ({ performedBy, attribution } as const);

  test('a broker story that keeps putting the protagonist on stage is caught', () => {
    expect(() => assertStanceHeld({
      stance: 'broker',
      recentCycles: [climax('ally'), climax('protagonist'), climax('protagonist'), climax('protagonist')],
    })).toThrow(/performing 3 of the last 4/);

    expect(() => assertStanceHeld({
      stance: 'broker',
      recentCycles: [climax('ally'), climax('ally'), climax('protagonist')],
    })).not.toThrow();
  });

  test('a broker story where nobody ever finds out is caught too', () => {
    expect(() => assertStanceHeld({
      stance: 'broker',
      recentCycles: [climax('ally', 'hidden'), climax('ally', 'hidden'), climax('faction' as 'ally', 'hidden')],
    })).toThrow(/nothing to hold on to/);
  });

  test('a front story is left alone, and so is a story with too little history', () => {
    expect(() => assertStanceHeld({
      stance: 'front',
      recentCycles: [climax('protagonist'), climax('protagonist'), climax('protagonist')],
    })).not.toThrow();
    expect(() => assertStanceHeld({ stance: 'broker', recentCycles: [climax('protagonist')] })).not.toThrow();
  });
});
