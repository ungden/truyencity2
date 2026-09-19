import {
  BibleSchema, ChapterDigestSchema, CyclePlanSchema, PremiseSchema,
  type Bible, type ChapterDigest, type CyclePlan, type Premise,
} from '@/services/serial/contracts';

/** Shared fixtures. One small urban-system premise, mid-cycle, at chapter seven. */
export const premise: Premise = PremiseSchema.parse({
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
    scope: 'Chỉ đọc được đồ vật, không đọc được ý định của người đang cầm nó; và chỉ khi hắn chạm tay vào.',
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
    { id: 'ba_lam', name: 'Bà Lâm', role: 'antagonist', agenda: 'Thâu tóm cả tuyến hàng cổ vật của Vân Cảng.', antagonistClass: 'hội trưởng hội thẩm định' },
    { id: 'tieu_my', name: 'Tiểu Mỹ', role: 'rival', agenda: 'Chứng minh bằng cấp hơn con mắt.' },
  ],
  oppositionEngine: 'Ai định giá thì người đó cầm quyền chia tiền. Khang định giá đúng là cắt phần của cả một dây chuyền ăn chênh lệch, nên từ chủ sạp tới hội thẩm định đều mất tiền khi hắn thắng.',
  conflictLadder: {"survival": "Khang phải kiếm đủ tiền đợt điều trị cho mẹ trước khi bệnh viện cắt phác đồ.", "rules": "Không có chứng chỉ thì định giá của hắn không được công nhận ở bất cứ phiên đấu nào.", "ideology": "Định giá nên là thứ công khai ai cũng tra được, hay là đặc quyền của vài người ngồi trong phòng kín.", "self": "Khi hắn nói một món đồ đáng bao nhiêu thì cả thành phố tin — và hắn bắt đầu thấy mình thích cảm giác đó."},
  hiddenThread: "Cuốn sổ cũ trong tiệm Lão Hoà ghi giá của những món đã qua tay ba mươi năm. Nó gieo từ chương bốn như một kỷ vật, giữa truyện lộ ra là bằng chứng một dây định giá khống, và cuối cùng là thứ Khang dùng để dựng sàn công khai.",
  arena: 'Giới buôn và thẩm định đồ cổ ở Vân Cảng, một thành phố cảng của thế giới song song.',
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

export const baseBible = (): Bible => BibleSchema.parse({
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

export const digest = (
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

export const cycle = (
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

