import {
  extractMainCharacterNameFromWorld,
  validateSetupCanon,
} from '../../services/story-engine/plan/setup-quality-gate';

function makeWorld(overrides: Partial<Record<'name' | 'opening' | 'phase1' | 'goldenFinger', string>> = {}): string {
  const name = overrides.name || 'Nguyễn An Bình';
  const goldenFinger = overrides.goldenFinger || `- Tên hệ thống/năng lực: Sổ Tay Cơ Hội Phố Cũ
- Cơ chế hoạt động: Khi ${name} ghi nhận một vấn đề thật trong cửa hàng, sổ tay hiện ba dữ kiện nhỏ về nhu cầu khách, biên lợi nhuận và lỗi vận hành. Nó không cho tiền mặt, chỉ giúp ${name} nhìn rõ một lựa chọn kinh doanh có thể thử ngay trong ngày.
- Trigger kích hoạt: kích hoạt khi ${name} hoàn thành một giao dịch thật với khách hàng và tự ghi lại kết quả.
- Đường tăng trưởng: Sơ cấp mở báo cáo khách quen, Trung cấp mở tối ưu nhập hàng, Cao cấp mở mô phỏng chi nhánh.
- Điểm yếu: mỗi ngày chỉ phân tích tối đa ba giao dịch; dữ kiện sai nếu ${name} không trực tiếp phục vụ khách.`;
  const opening = overrides.opening || `- Location: quầy bánh mì nhỏ trước chợ Bình Minh lúc sáu giờ sáng.
- MC đang làm gì khi mở chương: ${name} đang nướng mẻ bánh đầu tiên, chỉnh lại tỉ lệ pate để khách văn phòng ăn không ngấy.
- Hook event đầu chương: một khách quen đặt thử hai mươi suất cho phòng kế toán, tạo cơ hội nhỏ để ${name} test quy trình giao hàng.
- Câu mở đầu mẫu (1 câu): Mùi bơ nóng vừa chạm mặt chảo, ${name} đã biết hôm nay quầy bánh của mình có thể bán hơn mọi ngày.`;
  const phase1 = overrides.phase1 || `PHASE 1 (1-100): Quầy nhỏ thành điểm hẹn — Goal: ổn định 80 suất/ngày — Milestone cuối: thuê thêm một phụ bếp — Stakes: tiền thuê mặt bằng và uy tín với khách quen.`;

  const filler = Array.from({ length: 24 }, (_, i) =>
    `Chi tiết vận hành ${i + 1}: khu chợ có nhịp khách rõ ràng, người bán nhớ mặt nhau, mỗi quyết định của ${name} đều tạo phản hồi nhỏ trong phạm vi một con phố.`
  ).join(' ');

  return `### STORY ENGINE
- Reader Promise: reader đọc để xem ${name} biến một quầy bánh nhỏ thành thương hiệu tử tế bằng món ngon, dữ kiện khách quen và các payoff kinh doanh hữu hình.
- Core Loop: ${name} phục vụ khách thật → nhận feedback từ Sổ Tay Cơ Hội → tối ưu món hoặc quy trình → thấy doanh thu/công nhận tăng ngay trong vài chương.
- Phase 1 Playground: quầy bánh trước chợ Bình Minh, phòng kế toán tòa Lạc Việt, bãi xe của chú Tâm, nguồn hàng thịt nguội của anh Dũng.
- Dopamine Cadence: mỗi 2-3 chương có một đơn hàng, một món được tối ưu, một khách quen công nhận, hoặc một chỉ số doanh thu tăng.
- Novelty Plan: mỗi 20 chương mở thêm khách mới, khung giờ mới, món mới, đối thủ cùng phố, hoặc một vấn đề vận hành mới.

### BỐI CẢNH
Năm 2026, phố Bình Minh nằm giữa khu văn phòng và chợ dân sinh của Phượng Đô. ${name} thuê một quầy bánh mì tám mét vuông, mở cửa từ sáng sớm đến đầu giờ chiều, cạnh tiệm trà đá của cô Hòa và bãi gửi xe của chú Tâm. ${filler}

### NHÂN VẬT CHÍNH
- Tên: ${name}
- Tuổi: 26
- Nghề/Trạng thái: chủ quầy bánh mì mới mở sau ba năm làm phụ bếp khách sạn
- Tài sản hiện tại: tài khoản còn 12 triệu đồng, đủ xoay nguyên liệu trong mười ngày
- Tính cách: kiên nhẫn, giỏi quan sát khẩu vị, kín tiếng nhưng nhớ rất lâu từng lời góp ý của khách
- Điểm yếu: ngại đàm phán giá thuê và dễ ôm việc một mình khi quán đông

### GOLDEN FINGER
${goldenFinger}

### CAST CHÍNH (≥4 nhân vật named)
- Trần Minh Khánh — bạn học nghề cũ — bạn thân với ${name} — giúp giao đơn lớn từ chương 8
- Lê Hoài Thu — kế toán tòa nhà Lạc Việt — khách quen — đặt suất đầu tiên cho cả phòng từ chương 3
- Cô Hòa — chủ quán trà đá — hàng xóm — giới thiệu nhóm khách sáng và nghe tin chợ từ chương 2
- Phạm Quốc Dũng — nhà cung cấp thịt nguội — đối tác — cho ${name} thử nguồn hàng sạch từ chương 12

### ANTAGONISTS (≥2 đối thủ named)
- Bánh Mì Nóng 24h — cạnh tranh giảm giá — xuất hiện chương 20, đối đầu trực tiếp chương 45
- Chủ mặt bằng Lâm — muốn tăng tiền thuê — gây sức ép chương 60 sau khi quầy đông khách

### PHASE ROADMAP (4 phase × chương range)
${phase1}
PHASE 2 (101-300): Cửa hàng đầu tiên — Goal: mở điểm bán trong hẻm văn phòng — Milestone: có đội giao hàng nhỏ — Stakes: giữ chất lượng khi tăng đơn.
PHASE 3 (301-700): Chuỗi trong thành phố — Goal: chuẩn hóa bếp trung tâm — Milestone: ký hợp đồng với ba tòa nhà — Stakes: danh tiếng ngành F&B địa phương.
PHASE 4 (701-1000): Thương hiệu quốc dân — Goal: xây học viện nghề bánh — Milestone cuối truyện: chuỗi bền vững và cộng đồng đầu bếp trẻ.

### OPENING SCENE (Chương 1 cụ thể)
${opening}

### WORLD RULES (3-5 quy tắc thế giới)
- Sổ tay chỉ đọc dữ kiện từ giao dịch thật, không dự đoán xổ số hay thị trường chứng khoán.
- Mọi nâng cấp món ăn cần ${name} tự nấu đủ một số lần và nghe phản hồi khách.
- Tiền trong truyện đến từ doanh thu, đặt cọc và hợp đồng; không có thưởng tiền mặt vô căn cứ.
- Đối thủ chỉ chú ý khi quầy tạo thành tích nhìn thấy trong phạm vi phố.

### TONE & ANTI-PATTERNS
- TONE: proactive ratio 82%, comedy density medium, pacing medium.
- ANTI-PATTERNS:
  • KHÔNG combat, không tu tiên, không hắc bang.
  • KHÔNG harem, quan hệ tình cảm đi chậm qua việc làm chung.
  • KHÔNG instant master, mọi món mới cần thử, sai, sửa.
  • KHÔNG thế lực bí ẩn theo dõi từ đầu truyện.`;
}

const storyOutline = {
  premise: 'Nguyễn An Bình dùng Sổ Tay Cơ Hội Phố Cũ để biến một quầy bánh mì nhỏ thành thương hiệu F&B tử tế, mỗi bước tăng trưởng đều xuất phát từ phục vụ khách thật và sửa lỗi vận hành cụ thể.',
  mainConflict: 'An Bình phải mở rộng mà không đánh mất chất lượng, trong khi đối thủ địa phương liên tục ép giá và tranh nguồn hàng.',
  protagonist: {
    name: 'Nguyễn An Bình',
    startingState: 'chủ quầy nhỏ tự làm mọi thứ',
    endGoal: 'xây chuỗi bánh mì sạch có học viện nghề',
    characterArc: 'từ người ôm việc thành người biết đào tạo đội ngũ',
  },
  majorPlotPoints: ['đơn phòng kế toán', 'thuê phụ bếp', 'mở cửa hàng đầu', 'ký hợp đồng tòa nhà'],
  readerPromise: 'Reader được xem một quầy bánh nhỏ tăng trưởng bằng năng lực thật, số liệu nhỏ, khách quen và payoff kinh doanh đều đặn.',
  openingExperience: { chapters1To3: 'routine quầy sáng và đơn lớn đầu tiên' },
  dopamineContract: { coreLoop: 'phục vụ khách -> nhận phản hồi -> tối ưu món -> tăng doanh thu' },
  conflictLadder: [{ phase: 1, chapterRange: '1-100', scale: 'local' }],
};

describe('setup quality gate', () => {
  it('extracts canonical MC from world_description', () => {
    expect(extractMainCharacterNameFromWorld(makeWorld())).toBe('Nguyễn An Bình');
  });

  it('rejects project/world MC mismatch', () => {
    const result = validateSetupCanon({
      worldDescription: makeWorld(),
      mainCharacter: 'Lâm Phong',
    });
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.code === 'mc_world_mismatch')).toBe(true);
  });

  it('rejects a structurally complete world with active-threat opening', () => {
    const result = validateSetupCanon({
      worldDescription: makeWorld({
        opening: `- Location: căn phòng trọ tối.
- MC đang làm gì khi mở chương: Nguyễn An Bình bị truy sát ngay trước cửa chợ.
- Hook event đầu chương: sát thủ ép Nguyễn An Bình bỏ trốn khỏi thành phố.
- Câu mở đầu mẫu (1 câu): Nguyễn An Bình nghe tiếng dao kéo lê ngoài cửa.`,
      }),
      mainCharacter: 'Nguyễn An Bình',
    });
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.code === 'opening_not_warm')).toBe(true);
  });

  it('rejects Phase 1 cosmic threat even when section counts pass', () => {
    const result = validateSetupCanon({
      worldDescription: makeWorld({
        phase1: 'PHASE 1 (1-100): Đại Đế thức tỉnh — Goal: tránh Tối Thượng Đại Đế xóa sổ thế giới — Milestone cuối: sống sót — Stakes: sụp đổ vũ trụ.',
      }),
      mainCharacter: 'Nguyễn An Bình',
    });
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.code === 'phase1_cosmic_tier')).toBe(true);
    expect(result.issues.some(i => i.code === 'phase1_cosmic_stake')).toBe(true);
  });

  it('rejects missing master outline when the stage requires it', () => {
    const result = validateSetupCanon({
      worldDescription: makeWorld(),
      mainCharacter: 'Nguyễn An Bình',
      storyOutline,
      requireMasterOutline: true,
    });
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.code === 'master_outline_missing')).toBe(true);
  });

  it('passes a canonical setup with story and master outline', () => {
    const result = validateSetupCanon({
      worldDescription: makeWorld(),
      mainCharacter: 'Nguyễn An Bình',
      storyOutline,
      masterOutline: { volumes: [{ title: 'Quầy nhỏ' }], majorArcs: [{ name: 'Mở quầy' }] },
      requireStoryOutline: true,
      requireMasterOutline: true,
      strictContract: true,
    });
    expect(result.passed).toBe(true);
  });
});
