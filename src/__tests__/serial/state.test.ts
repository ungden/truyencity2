import { readFileSync } from 'node:fs';
import {
  PremiseSchema, CyclePlanSchema, scorecardAverage, type ChapterDigest,
} from '@/services/serial/contracts';
import {
  applyDigest, assertBibleCoherence, assertCycleAssetCoherence, assertPayoffRotation, assertStanceHeld, overdueHooks, progressionRankIndex,
  rebuildBibleFromDigests, recentPayoffKinds, seedBible, SerialStateError,
} from '@/services/serial/state';
import { WRITER_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT, PREMISE_SYSTEM_PROMPT } from '@/services/serial/prompts';
import { payoffKindIds, activeRules, staleRules } from '@/services/serial/playbook';
import { premise, baseBible, digest, cycle } from './fixtures';

describe('serial contracts', () => {
  test('a premise offers four directions for expansion', () => {
    expect(Object.keys(premise.conflictLadder)).toEqual(['survival', 'rules', 'ideology', 'self']);
    expect(premise.hiddenThread.length).toBeGreaterThan(40);
    expect(() => PremiseSchema.parse({ ...premise, conflictLadder: undefined })).toThrow();
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/bốn hướng để chọn theo truyện/);
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
    expect(premise.oppositionEngine).toMatch(/mất người mua|quyền định giá/);
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

  test('scorecard averages reading and craft dimensions', () => {
    expect(scorecardAverage({
      continuity: [], repetition: [], aiFlavor: [], steering: [],
      scorecard: { opening: 5, anticipation: 4, payoff: 4, newness: 3, endHook: 4 },
      craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 5, dialogueNaturalness: 3, structuralFreshness: 4 },
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
    const killed = applyDigest({ premise, bible: baseBible(), digest: digest({ coreChanges: { died: ['cao_nguyen'] } }) });
    expect(killed.symbolicCore.cast.find(c => c.id === 'cao_nguyen')?.alive).toBe(false);

    for (const change of <Array<Partial<ChapterDigest['coreChanges']>>>[
      { moved: [{ characterId: 'cao_nguyen', toLocationId: 'cho_tinh_hach' }] },
      { progressionChanges: [{ subjectId: 'cao_nguyen', systemId: 'tien_hoa_mat_the', trackId: null, toRankId: 'tam_giai', toMinorStageId: 'so_ky', why: 'thăng cấp' }] },
      { died: ['cao_nguyen'] },
    ]) {
      expect(() => applyDigest({
        premise, bible: killed,
        digest: digest({ chapterNumber: 9, coreChanges: change }),
      })).toThrow(SerialStateError);
    }
  });

  test('each progression axis advances sequentially and independently', () => {
    expect(progressionRankIndex(premise, 'tu_tien', 'luyen_khi_4')).toBe(3);
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { progressionChanges: [{ subjectId: 'lam_viet', systemId: 'tu_tien', trackId: null, toRankId: 'luyen_khi_3', toMinorStageId: null, why: 'bị giáng' }] } }),
    })).toThrow(/regresses/);

    const promoted = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { progressionChanges: [{ subjectId: 'lam_viet', systemId: 'nghe_tu_tien', trackId: 'luyen_dan_su', toRankId: 'nghe_nhat_giai', toMinorStageId: null, why: 'thi nghề thành công' }] } }),
    });
    expect(promoted.symbolicCore.progressions.find(state => state.subjectId === 'lam_viet' && state.systemId === 'nghe_tu_tien')?.rankId).toBe('nghe_nhat_giai');
    expect(promoted.symbolicCore.progressions.find(state => state.subjectId === 'lam_viet' && state.systemId === 'tu_tien')?.rankId).toBe('luyen_khi_4');

    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { progressionChanges: [{ subjectId: 'chu_da', systemId: 'tu_tien', trackId: null, toRankId: 'luyen_khi_3', toMinorStageId: null, why: 'nhảy cấp' }] } }),
    })).toThrow(/first rank/);
  });

  test('a hook can only be paid once, and only after it is planted', () => {
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPaid: ['hook_khong_co'] } }),
    })).toThrow(/unplanted hook/);

    const paid = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPaid: ['hook_dao_van'] } }),
    });
    expect(paid.symbolicCore.openHooks[0].status).toBe('paid');
    expect(() => applyDigest({
      premise, bible: paid,
      digest: digest({ chapterNumber: 9, coreChanges: { hooksPaid: ['hook_dao_van'] } }),
    })).toThrow(/already paid/);
  });

  test('a hook planted with a deadline in the past is rejected', () => {
    expect(() => applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { hooksPlanted: [{ id: 'hook_moi', what: 'Người lạ theo dõi Lâm Việt.', dueByChapter: 8 }] } }),
    })).toThrow(/due at chapter 8/);
  });

  test('knowing the secret is one-way, and new cast arrive with a sheet', () => {
    const next = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: {
        learnedFinger: ['han_duoc_su'],
        newCast: [{ id: 'ba_lam', name: 'Bà Lâm', sheet: 'Thương nhân mới tới Đông Hà.', role: 'antagonist', locationId: 'pho_dong_ha', startingProgressions: [] }],
      } }),
    });
    expect(next.symbolicCore.cast.find(c => c.id === 'han_duoc_su')?.knowsFinger).toBe(true);
    expect(next.castSheet.find(c => c.id === 'ba_lam')?.sheet).toMatch(/Thương nhân/);
    expect(() => applyDigest({
      premise, bible: next,
      digest: digest({ chapterNumber: 9, coreChanges: { newCast: [{ id: 'ba_lam', name: 'Bà Lâm', sheet: 'Trùng id.', role: 'antagonist', locationId: 'pho_dong_ha', startingProgressions: [] }] } }),
    })).toThrow(/re-introduces/);
  });

  test('the living world records only canonical entities revealed on the page', () => {
    const seeded = seedBible({ premise });
    expect(seeded.world).toEqual([]);
    const next = applyDigest({
      premise,
      bible: seeded,
      digest: digest({ chapterNumber: 1, coreChanges: { worldFactsRevealed: [{ id: 'pho_dong_ha', note: 'Cửa hàng mở quầy trước đám đông Đông Hà.' }] } }),
    });
    expect(next.world).toEqual([{ id: 'pho_dong_ha', name: 'Phố Thương Điếm Đông Hà', note: 'Cửa hàng mở quầy trước đám đông Đông Hà.' }]);
    expect(() => applyDigest({
      premise,
      bible: seeded,
      digest: digest({ chapterNumber: 1, coreChanges: { worldFactsRevealed: [{ id: 'dia_diem_bia', note: 'Không có trong canon.' }] } }),
    })).toThrow(/unknown world entity/);
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

  test('a stale store checkpoint is rejected before planning or writing', () => {
    const stale = baseBible();
    stale.symbolicCore.mc.goldenFingerRungId = 'kho_thu_mua';
    expect(() => assertBibleCoherence(premise, stale)).toThrow(/golden finger is kho_thu_mua/);
  });

  test('replaying chapter digests rebuilds deterministic state', () => {
    const first = digest({ chapterNumber: 1, title: 'Một', summary: 'Mở cửa hàng.', coreChanges: { storyDayDelta: 1 } });
    const second = digest({ chapterNumber: 2, title: 'Hai', summary: 'Bán lô tiếp.', coreChanges: { storyDayDelta: 2 } });
    const rebuilt = rebuildBibleFromDigests({ premise, digests: [first, second], throughChapter: 2 });
    expect(rebuilt.symbolicCore.chapterNumber).toBe(2);
    expect(rebuilt.symbolicCore.storyDay).toBe(3);
    expect(rebuilt.recentSummary.map(item => item.title)).toEqual(['Một', 'Hai']);
  });

  test('asset lots move and disappear deterministically across chapters', () => {
    const acquired = applyDigest({
      premise,
      bible: baseBible(),
      digest: digest({ coreChanges: { assetEvents: [{
        eventId: 'c8_nhap_ho_than_01', kind: 'acquire', assetId: 'ho_than_phu',
        assetName: 'Hộ Thân Phù số 01', quantity: 1, unit: 'lá', fungible: false,
        sourceLotId: null, fromOwnerId: null, fromOwnerName: 'Quầy phù Thanh Lô',
        toOwnerId: 'bach_tan', toOwnerName: 'Bạch Tẫn', note: 'Bạch Tẫn mua một lá có nguồn tại quầy.',
      }] } }),
    });
    expect(acquired.symbolicCore.activeAssetLots).toEqual(expect.arrayContaining([
      expect.objectContaining({ lotId: 'c8_nhap_ho_than_01', ownerId: 'bach_tan', quantity: 1 }),
    ]));

    const consumed = applyDigest({
      premise,
      bible: acquired,
      digest: digest({ chapterNumber: 9, coreChanges: { assetEvents: [{
        eventId: 'c9_dung_ho_than_01', kind: 'consume', assetId: 'ho_than_phu',
        assetName: 'Hộ Thân Phù số 01', quantity: 1, unit: 'lá', fungible: false,
        sourceLotId: 'c8_nhap_ho_than_01', fromOwnerId: 'bach_tan', fromOwnerName: 'Bạch Tẫn',
        toOwnerId: null, toOwnerName: null, note: 'Lá phù kích phát rồi vỡ.',
      }] } }),
    });
    expect(consumed.symbolicCore.activeAssetLots).toHaveLength(0);
    expect(consumed.symbolicCore.recentAssetEvents.at(-1)).toEqual(expect.objectContaining({
      eventId: 'c9_dung_ho_than_01', kind: 'consume', chapterNumber: 9,
    }));
    expect(() => applyDigest({
      premise,
      bible: consumed,
      digest: digest({ chapterNumber: 10, coreChanges: { assetEvents: [{
        eventId: 'c10_dung_lai_ho_than_01', kind: 'consume', assetId: 'ho_than_phu',
        assetName: 'Hộ Thân Phù số 01', quantity: 1, unit: 'lá', fungible: false,
        sourceLotId: 'c8_nhap_ho_than_01', fromOwnerId: 'bach_tan', fromOwnerName: 'Bạch Tẫn',
        toOwnerId: null, toOwnerName: null, note: 'Dùng lại lá đã vỡ.',
      }] } }),
    })).toThrow(/unavailable lot/);
  });

  test('a customer loop cannot sell an owned asset as a first purchase or fake the same item as an upgrade', () => {
    const bible = baseBible();
    bible.symbolicCore.activeAssetLots = [{
      lotId: 'c4_bach_nhan_man_nguu',
      assetId: 'man_nguu_luyen_the_quyet_nhat_giai_trung_pham',
      assetName: 'Man Ngưu Luyện Thể Quyết Nhất giai trung phẩm',
      ownerId: 'bay_thach', ownerName: 'Bảy Thạch', quantity: 1, unit: 'bản', fungible: false,
      provenance: 'Đã mua và nhận ở chương 4.', acquiredChapter: 4, updatedChapter: 4,
    }];
    const baseline = cycle().customerLoop;

    expect(() => assertCycleAssetCoherence(bible, cycle({ customerLoop: {
      ...baseline,
      purchaseAssetId: 'man_nguu_luyen_the_quyet_nhat_giai_trung_pham',
      purchaseMode: 'first_acquisition',
    } }))).toThrow(/already owns/);

    expect(() => assertCycleAssetCoherence(bible, cycle({ customerLoop: {
      ...baseline,
      purchaseAssetId: 'ho_than_phu_nhat_giai_ha_pham',
      purchaseMode: 'first_acquisition',
      returnUpgradeAssetId: 'ho_than_phu_nhat_giai_ha_pham',
      returnUpgradeMode: 'higher_grade',
    } }))).toThrow(/repeats/);

    expect(() => assertCycleAssetCoherence(bible, cycle({ customerLoop: {
      ...baseline,
      purchaseAssetId: 'ho_than_phu_nhat_giai_ha_pham',
      purchaseMode: 'first_acquisition',
      returnUpgradeAssetId: 'ho_than_phu_nhat_giai_trung_pham',
      returnUpgradeMode: 'higher_grade',
    } }))).not.toThrow();
  });

  test('asset transfers cannot overspend a lot or debit the wrong owner', () => {
    const acquired = applyDigest({
      premise, bible: baseBible(),
      digest: digest({ coreChanges: { assetEvents: [{
        eventId: 'c8_nhap_hach_diem', kind: 'acquire', assetId: 'hach_diem_song_gioi',
        assetName: 'Hạch điểm Song Giới', quantity: 4, unit: 'điểm', fungible: true,
        sourceLotId: null, fromOwnerId: null, fromOwnerName: 'Song Giới Thương Điếm',
        toOwnerId: 'bach_tan', toOwnerName: 'Bạch Tẫn', note: 'Điểm săn đã đối chiếu.',
      }] } }),
    });
    const transfer = (quantity: number, fromOwnerId = 'bach_tan') => digest({
      chapterNumber: 9,
      coreChanges: { assetEvents: [{
        eventId: 'c9_tra_hach_diem', kind: 'transfer' as const, assetId: 'hach_diem_song_gioi',
        assetName: 'Hạch điểm Song Giới', quantity, unit: 'điểm', fungible: true,
        sourceLotId: 'c8_nhap_hach_diem', fromOwnerId, fromOwnerName: 'Bạch Tẫn',
        toOwnerId: 'lam_viet', toOwnerName: 'Lâm Việt', note: 'Thanh toán tại quầy.',
      }] },
    });
    expect(() => applyDigest({ premise, bible: acquired, digest: transfer(5) })).toThrow(/needs 5 điểm/);
    expect(() => applyDigest({ premise, bible: acquired, digest: transfer(4, 'phan_kha') })).toThrow(/belongs to bach_tan/);
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
      { id: 'hook_dao_van', what: 'Đạo văn giống nhau trên hai viên tinh hạch.', dueByChapter: 12 },
    ]);
  });

  test('recent payoff kinds come back newest first for the planner to rotate away from', () => {
    expect(recentPayoffKinds(baseBible())).toEqual(['kho_bau', 'va_mat']);
    // The registry stays data-owned; the runtime schema exposes its exact ids to the model.
    expect(payoffKindIds()).toContain('hau_truong');
    expect(payoffKindIds().length).toBeGreaterThan(15);
    expect(() => cycle({ climax: { payoffKind: 'khong_co_trong_playbook' } })).toThrow(/Invalid enum value/);
  });
});

describe('writer prompt encodes the measured Faloo rules', () => {
  const craft = readFileSync('docs/FALOO_CRAFT.md', 'utf8');

  test('openings and endings center on what readers want to see', () => {
    expect(WRITER_SYSTEM_PROMPT).toMatch(/việc độc giả muốn thấy tiếp/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/MỖI CHƯƠNG PHẢI THÊM MỘT THỨ MỚI CÓ TÊN/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/phần thưởng sắp mở, khách lớn tìm đến/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/Tối đa ba dòng cho toàn bộ quá khứ/);
  });

  test('the Writer is told what it may not contradict, not what it must recite', () => {
    expect(WRITER_SYSTEM_PROMPT).toMatch(/Bạn được tự do bịa thêm/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/trạng thái ở đầu chương/);
    expect(WRITER_SYSTEM_PROMPT).toMatch(/không phải trần tiến triển/);
    expect(WRITER_SYSTEM_PROMPT).not.toMatch(/requiredChanges|requiredDeltas|delta|ledger/i);
  });

  test('the judge blocks only on quotable contradiction and never on the reading score', () => {
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/chỉ báo lỗi có bằng chứng nguyên văn/);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/golden_finger_scope/);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/transaction_contradiction/);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/activeLots là hàng còn tồn/);
    expect(JUDGE_SYSTEM_PROMPT).toMatch(/không bao giờ chặn chương/);
  });

  test('the premise starts from cumulative gains and concrete interests', () => {
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/thành quả tích lũy thành vốn/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/ai mất phần khi hắn thành công/);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/Kinh doanh tích lũy rồi mở rộng/);
  });

  test('the cycle planner is forbidden the mechanical vocabulary that produced process fiction', () => {
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/không ghi delta tài nguyên, không ghi lịch trình phút/);
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toMatch(/đấu trường lớn hơn có người chơi và lợi ích mới/);
  });

  test('the craft document these rules come from is still in the repo', () => {
    expect(craft).toMatch(/81 ký tự \(≈ 15 từ, ≈ 1 câu\)/);
    expect(craft).toMatch(/Hình thức văn xuôi của ta đã đạt chuẩn Faloo rồi/);
    expect(craft).toMatch(/Khác biệt nằm nguyên ở|khối lượng biến cố/);
  });
});

describe('seeding a story', () => {
  test('a launch Bible is derived entirely from the approved premise', () => {
    const bible = seedBible({ premise });
    expect(bible.symbolicCore.chapterNumber).toBe(0);
    expect(bible.symbolicCore.storyDay).toBe(0);
    expect(bible.symbolicCore.mc.goldenFingerRungId).toBe('ke_ban_le');
    expect(bible.symbolicCore.progressions.find(state => state.subjectId === 'lam_viet' && state.systemId === 'tu_tien')?.rankId).toBe('luyen_khi_3');
    expect(bible.symbolicCore.cast.every(member => member.alive)).toBe(true);
    expect(bible.symbolicCore.openHooks).toEqual([]);
    expect(bible.world).toEqual([]);
    // Only the protagonist starts knowing about the advantage.
    expect(bible.symbolicCore.cast.filter(member => member.knowsFinger).map(member => member.id)).toEqual(['lam_viet']);
    expect(new Set(bible.symbolicCore.cast.map(member => member.locationId)).size).toBeGreaterThan(1);
    expect(bible.castSheet).toHaveLength(premise.castSeed.length);
  });

  test('the first chapter merges onto a seeded Bible', () => {
    const seeded = seedBible({ premise });
    const next = applyDigest({ premise, bible: seeded, digest: digest({ chapterNumber: 1 }) });
    expect(next.symbolicCore.chapterNumber).toBe(1);
    expect(next.recentSummary).toHaveLength(1);
  });

  test('a premise with no protagonist cannot seed a story', () => {
    const headless = { ...premise, castSeed: premise.castSeed.map(m => ({ ...m, role: 'ally' as const })) };
    expect(() => seedBible({ premise: headless }))
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
      'reader_promise',           // one editorial direction shared across roles
      'business_jumps',           // commerce reinvests gains into larger opportunities
      'asymmetry_is_the_engine',  // value flows both ways
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
    expect(premise.worldKernel.worlds).toHaveLength(2);
    expect(PREMISE_SYSTEM_PROMPT).toMatch(/Cửa xuyên là phương tiện đi lại tự do/);
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
