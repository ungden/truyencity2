import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema,
  type Bible, type ChapterDigest, type CyclePlan, type Premise,
} from '@/services/serial/contracts';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';
import { seedBible } from '@/services/serial/state';

/** Shared v2 fixture: the approved cultivation/apocalypse pilot, mid-cycle at chapter seven. */
export const premise: Premise = SERIAL_PREMISE_CATALOG[0].premise;

export const baseBible = (): Bible => {
  const seeded = seedBible({ premise });
  return BibleSchema.parse({
    ...seeded,
    symbolicCore: {
      ...seeded.symbolicCore,
      storyDay: 3,
      chapterNumber: 7,
      mc: { ...seeded.symbolicCore.mc, locationId: 'pho_dong_ha', keyAssetIds: ['song_gioi_thuong_diem'] },
      cast: seeded.symbolicCore.cast.map(member => member.id === 'lam_viet'
        ? { ...member, locationId: 'pho_dong_ha', lastSeenChapter: 7 }
        : member),
      progressions: seeded.symbolicCore.progressions.map(state =>
        state.subjectId === 'lam_viet' && state.systemId === 'tu_tien'
          ? { ...state, rankId: 'luyen_khi_4' }
          : state),
      openHooks: [
        { id: 'hook_dao_van', what: 'Đạo văn giống nhau trên hai viên tinh hạch.', plantedChapter: 4, dueByChapter: 12, status: 'open' },
      ],
    },
    world: [
      { id: 'pho_dong_ha', name: 'Phố Thương Điếm Đông Hà', note: 'Cửa hàng đang bán đan dược và bí tịch công khai.' },
      { id: 'kho_lam_viet', name: 'Kho của Lâm Việt', note: 'Cửa sau nối về Thanh Huyền Giới.' },
    ],
    recentSummary: [
      { chapterNumber: 6, title: 'Ai cho anh bán công pháp?', summary: 'Cao Nguyên ép đội săn không giao tinh hạch.', payoffKind: 'va_mat', endedOn: 'Tô Vãn bước vào cửa hàng.' },
      { chapterNumber: 7, title: 'Đơn này, Thành Vệ ký', summary: 'Tô Vãn đề nghị hợp đồng tổ chức.', payoffKind: 'kho_bau', endedOn: 'Lâm Việt mở bảng giá mới.' },
    ],
    styleMemory: ['ánh mắt sắc như dao'],
  });
};

export const digest = (
  over: Partial<Omit<ChapterDigest, 'coreChanges'>> & { coreChanges?: Partial<ChapterDigest['coreChanges']> } = {},
): ChapterDigest => {
  const { coreChanges, ...rest } = over;
  return ChapterDigestSchema.parse({
    chapterNumber: 8,
    title: 'Nhị giai cũng phải xếp hàng',
    summary: 'Lâm Việt công khai giá lô phù mới trước mặt Cao Nguyên.',
    payoffKind: 'va_mat',
    endedOn: 'Tô Vãn đặt bút ký đơn cho cả đội.',
    newNamedThings: ['Hợp đồng Thành Vệ Đông Hà'],
    ...rest,
    coreChanges: {
      storyDayDelta: 1,
      died: [], progressionChanges: [], goldenFingerRungChange: null,
      moved: [], worldFactsRevealed: [], newCast: [], hooksPlanted: [], hooksPaid: [], learnedFinger: [],
      ...coreChanges,
    },
  });
};

export const cycle = (
  over: Partial<Omit<CyclePlan, 'climax'>> & { climax?: Partial<CyclePlan['climax']> } = {},
): CyclePlan => {
  const { climax, ...rest } = over;
  return CyclePlanSchema.parse({
    schemaVersion: 1,
    cycleNumber: 2, volumeNumber: 1, startChapter: 8, plannedEndChapter: 16,
    pressure: 'Tô Vãn mở cơ hội ký hợp đồng Thành Vệ trong lúc Cao Nguyên muốn giữ độc quyền tinh hạch.',
    escalation: ['Lâm Việt trình lô phù', 'Đội săn công khai kết quả dùng thử', 'Hai bên tranh quyền ưu tiên'],
    aftermath: 'Cửa hàng có khách tổ chức đầu tiên, Cao Nguyên buộc phải nâng quy mô cạnh tranh.',
    nextHook: 'Hàn Dược Sư gửi giá mua một loại tinh hạch chưa ai ở Đông Hà coi trọng.',
    beatSheets: [{
      chapterNumber: 8,
      beats: ['Lâm Việt trình lô phù trước Thành Vệ', 'Tô Vãn và Cao Nguyên cùng hô giá'],
      emotionalTarget: 'Hả hê vì quy mô giao dịch tăng cấp.',
      newNamedThing: 'Hợp đồng Thành Vệ Đông Hà',
      endHookKind: 'opportunity',
    }],
    ...rest,
    climax: {
      payoffKind: 'tri_thang',
      result: 'Lâm Việt ký hợp đồng bán phù và đan cho toàn đội Thành Vệ Đông Hà.',
      witnesses: ['Tô Vãn', 'Cao Nguyên', 'các đội săn'],
      ...climax,
    },
  });
};
