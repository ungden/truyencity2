/**
 * Story Engine v2 — Genre Templates
 *
 * Migrated from story-writing-factory/templates.ts (Phase 7 cleanup).
 * Pure data — no business logic dependencies.
 */

import { GenreType, DopamineType, StyleBible, PowerSystem } from './types';

// Phase 28 TIER 2: Re-imports from extracted template modules.
import { GENRE_STYLES } from './templates/genre-styles';
import { DOPAMINE_PATTERNS, type DopaminePattern } from './templates/dopamine-patterns';
import { GENRE_BOUNDARIES } from './templates/genre-boundaries';
import { SUB_GENRE_RULES } from './templates/sub-genre-rules';

// ============================================================================
// DOPAMINE PATTERNS - Công thức tạo sảng khoái
// ============================================================================



// ============================================================================
// POWER SYSTEM TEMPLATES
// ============================================================================

export const POWER_SYSTEMS: Record<string, PowerSystem> = {
  cultivation_standard: {
    name: 'Tu Tiên Chuẩn',
    realms: [
      { name: 'Luyện Khí', rank: 1, subLevels: 9, description: '9 tầng', abilities: ['Phi kiếm', 'Pháp thuật cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Trúc Cơ', rank: 2, subLevels: 9, description: '9 tầng', abilities: ['Ngự vật phi hành', 'Pháp thuật trung cấp'], breakthroughDifficulty: 'medium' },
      { name: 'Kim Đan', rank: 3, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Bản mệnh pháp bảo', 'Lôi thuật'], breakthroughDifficulty: 'hard' },
      { name: 'Nguyên Anh', rank: 4, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Nguyên anh xuất khiếu'], breakthroughDifficulty: 'hard' },
      { name: 'Hóa Thần', rank: 5, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Xé không gian'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Hợp Thể', rank: 6, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Thiên địa pháp tướng'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Đại Thừa', rank: 7, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Trường sinh'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Độ Kiếp', rank: 8, subLevels: 9, description: 'Vượt thiên kiếp', abilities: ['Phi thăng'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Linh thạch', 'Linh đan', 'Pháp bảo', 'Bí tịch'],
    techniqueGrades: ['Phàm', 'Hoàng', 'Huyền', 'Địa', 'Thiên', 'Thánh', 'Thần'],
    itemGrades: ['Phàm', 'Linh', 'Địa', 'Thiên', 'Thánh', 'Thần'],
    currencies: [
      { name: 'Linh thạch hạ phẩm', value: 1, description: 'Cơ bản' },
      { name: 'Linh thạch trung phẩm', value: 100, description: '100 hạ phẩm' },
      { name: 'Linh thạch thượng phẩm', value: 10000, description: '100 trung phẩm' },
    ],
  },
  martial_world: {
    name: 'Võ Đạo Giang Hồ',
    realms: [
      { name: 'Hậu Thiên', rank: 1, subLevels: 9, description: '9 trọng', abilities: ['Kình lực'], breakthroughDifficulty: 'easy' },
      { name: 'Tiên Thiên', rank: 2, subLevels: 9, description: '9 trọng', abilities: ['Chân khí', 'Khinh công'], breakthroughDifficulty: 'medium' },
      { name: 'Vương Cấp', rank: 3, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Ý cảnh', 'Vương khí'], breakthroughDifficulty: 'hard' },
      { name: 'Hoàng Cấp', rank: 4, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Hoàng áp'], breakthroughDifficulty: 'hard' },
      { name: 'Đế Cấp', rank: 5, subLevels: 3, description: 'Sơ-Trung-Hậu', abilities: ['Đế uy'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thánh Cấp', rank: 6, subLevels: 3, description: 'Bất tử', abilities: ['Bất diệt'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Võ học bí tịch', 'Linh dược', 'Thần binh'],
    techniqueGrades: ['Phàm', 'Hoàng', 'Huyền', 'Địa', 'Thiên', 'Thánh'],
    itemGrades: ['Phàm binh', 'Bảo binh', 'Linh binh', 'Thần binh'],
    currencies: [
      { name: 'Lượng bạc', value: 1, description: 'Cơ bản' },
      { name: 'Lượng vàng', value: 10, description: '10 bạc' },
    ],
  },
  urban_system: {
    name: 'Đô Thị Hệ Thống',
    realms: [
      { name: 'Cấp F', rank: 1, subLevels: 10, description: 'Người thường', abilities: ['Thể chất tăng nhẹ'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp E', rank: 2, subLevels: 10, description: 'Siêu phàm sơ cấp', abilities: ['Năng lực yếu'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp D', rank: 3, subLevels: 10, description: 'Cấp thấp', abilities: ['Năng lực ổn định'], breakthroughDifficulty: 'medium' },
      { name: 'Cấp C', rank: 4, subLevels: 10, description: 'Cấp trung', abilities: ['Năng lực mạnh'], breakthroughDifficulty: 'medium' },
      { name: 'Cấp B', rank: 5, subLevels: 10, description: 'Cấp cao', abilities: ['Rất mạnh'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp A', rank: 6, subLevels: 10, description: 'Đỉnh quốc gia', abilities: ['Cấp thảm họa'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp S', rank: 7, subLevels: 10, description: 'Đứng đầu thế giới', abilities: ['Cấp thần'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Cấp SSS', rank: 8, subLevels: 3, description: 'Siêu việt', abilities: ['Gần toàn năng'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Tinh thể năng lượng', 'Thuốc tăng cường', 'Thiết bị'],
    techniqueGrades: ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
    itemGrades: ['Thường', 'Hiếm', 'Sử thi', 'Huyền thoại', 'Thần khí'],
    currencies: [
      { name: 'Tiền', value: 1, description: 'Tiền thường' },
      { name: 'Điểm hệ thống', value: 100, description: 'Tiền tệ hệ thống' },
    ],
  },
  beast_taming: {
    name: 'Ngự Thú Sư',
    realms: [
      { name: 'Ngự Thú Đồ Tể', rank: 1, subLevels: 9, description: 'Mới khế ước thú', abilities: ['Câu thông tinh thần'], breakthroughDifficulty: 'easy' },
      { name: 'Sơ Cấp', rank: 2, subLevels: 9, description: 'Khế ước 2 thú', abilities: ['Sủng thú dung hợp (yếu)'], breakthroughDifficulty: 'easy' },
      { name: 'Trung Cấp', rank: 3, subLevels: 9, description: 'Lĩnh vực ngự thú', abilities: ['Chia sẻ sinh mệnh'], breakthroughDifficulty: 'medium' },
      { name: 'Cao Cấp', rank: 4, subLevels: 9, description: 'Trọng sinh sủng thú', abilities: ['Triệu hồi không gian'], breakthroughDifficulty: 'medium' },
      { name: 'Đại Sư', rank: 5, subLevels: 9, description: 'Tiến hóa ẩn', abilities: ['Khế ước Thần Thú'], breakthroughDifficulty: 'hard' },
      { name: 'Truyền Thuyết', rank: 6, subLevels: 3, description: 'Đứng đầu thế giới', abilities: ['Tạo quy tắc mới'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thần Thoại', rank: 7, subLevels: 3, description: 'Bất hủ', abilities: ['Sáng thế'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Vật liệu tiến hóa', 'Lõi năng lượng', 'Mảnh vỡ tinh thạch'],
    techniqueGrades: ['Thức tỉnh', 'Siêu phàm', 'Thống lĩnh', 'Quân vương', 'Bá chủ', 'Thần thoại'],
    itemGrades: ['Thường', 'Cấp cao', 'Đỉnh phong', 'Sử thi', 'Truyền thuyết'],
    currencies: [
      { name: 'Ngự thú tệ', value: 1, description: 'Tiền mặt' },
      { name: 'Điểm cống hiến', value: 1000, description: 'Mua tài nguyên hiếm' },
    ],
  },
  rules_horror: {
    name: 'Quy Tắc Quái Đàm',
    realms: [
      { name: 'Người sống sót mới', rank: 1, subLevels: 1, description: 'Chỉ có cái mạng', abilities: ['Suy luận cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Kẻ phá đảo', rank: 2, subLevels: 3, description: 'Qua 3 phó bản', abilities: ['Nhìn thấu ảo ảnh (Hạn chế)'], breakthroughDifficulty: 'medium' },
      { name: 'Kẻ nắm giữ quy tắc', rank: 3, subLevels: 3, description: 'Qua 10 phó bản', abilities: ['Sửa 1 dòng quy tắc', 'Dùng quỷ dị làm vũ khí'], breakthroughDifficulty: 'hard' },
      { name: 'Chủ Quái Đàm', rank: 4, subLevels: 3, description: 'Chiếm phó bản', abilities: ['Tạo phó bản mới', 'Miễn nhiễm ô nhiễm tinh thần'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Cthulhu', rank: 5, subLevels: 1, description: 'Cấm kỵ', abilities: ['Đọc tâm trí quỷ', 'Nuốt chửng ác thần'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Điểm san trị (Sanity)', 'Đạo cụ quỷ dị', 'Mảnh vỡ quy tắc'],
    techniqueGrades: ['Cấp D', 'Cấp C', 'Cấp B', 'Cấp A', 'Cấp S (Vô giải)'],
    itemGrades: ['Đồ thường', 'Đồ bị nguyền rủa', 'Vật phẩm cấm kỵ'],
    currencies: [
      { name: 'Quỷ tệ', value: 1, description: 'Giao dịch với thế giới bên kia' },
      { name: 'Tuổi thọ', value: 9999, description: 'Đánh đổi để lấy cơ hội' },
    ],
  },
  lord_building: {
    name: 'Lãnh Chúa Cầu Sinh',
    realms: [
      { name: 'Thôn Trưởng', rank: 1, subLevels: 3, description: 'Nhà tranh vách đất', abilities: ['Chiêu mộ nông dân'], breakthroughDifficulty: 'easy' },
      { name: 'Trấn Trưởng', rank: 2, subLevels: 5, description: 'Trấn nhỏ, có dân binh', abilities: ['Chiêu binh', 'Xây chợ'], breakthroughDifficulty: 'medium' },
      { name: 'Thành Chủ', rank: 3, subLevels: 5, description: 'Thành phố vững chắc', abilities: ['Mở rào chắn phép thuật', 'Tướng lĩnh cấp sử thi'], breakthroughDifficulty: 'hard' },
      { name: 'Lĩnh Chủ Tối Cao', rank: 4, subLevels: 3, description: 'Đế quốc rộng lớn', abilities: ['Đội quân bay', 'Dịch chuyển không gian'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thần Chủ', rank: 5, subLevels: 3, description: 'Kiểm soát thế giới', abilities: ['Tạo anh hùng mới', 'Nâng cấp vạn vật'], breakthroughDifficulty: 'bottleneck' },
    ],
    resources: ['Gỗ', 'Đá', 'Lương thực', 'Quặng sắt', 'Bản đồ xây dựng', 'Lệnh bài chiêu mộ'],
    techniqueGrades: ['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Cấp 5'],
    itemGrades: ['Rách nát', 'Thường', 'Tinh xảo', 'Hoàn mỹ', 'Truyền Thuyết', 'Thần Thoại'],
    currencies: [
      { name: 'Đồng xu', value: 1, description: 'Trao đổi kênh chat' },
      { name: 'Linh thạch năng lượng', value: 500, description: 'Nâng cấp kiến trúc lõi' },
    ],
  },
};

// ============================================================================
// GOLDEN CHAPTER REQUIREMENTS (3 chương đầu)
// ============================================================================

export const GOLDEN_CHAPTER_REQUIREMENTS = {
  chapter1: {
    mustHave: [
      '5-BEAT OPENING (BẮT BUỘC — pattern audit 8 top TQ webnovels 2026): scene 1 trong ~400 từ đầu PHẢI đi đúng 5 beat theo thứ tự: (1) sensory anchor 1 câu NGẮN 4-7 từ — thị/khứu/thính giác cụ thể; (2) MC physical action/position 1-2 câu — show MC trong cảnh; (3) MC voice/interior 1 câu — worldview leak ngắn; (4) world friction 1-2 câu — điều gì OFF/lạ/khác; (5) hook entity (vật/người/event) xuất hiện trước từ 400 — pull MC vào plot. CẤM mở chương bằng dialogue. CẤM mở bằng exposition rộng. CẤM câu mở > 10 từ.',
      'WARM BASELINE OPENING (BẮT BUỘC — TQ trend 2024-2026 "稳健流/暖开局"): MC mở chương ở trạng thái CÓ functional baseline rồi — đã có shop/studio/squad/skill/golden finger ĐANG VẬN HÀNH, KHÔNG phải rock bottom. MC đang LÀM CHỦ domain nhỏ của mình ngay trang 1.',
      'MC trong domain CỦA MÌNH = competence-leader (vô địch trong phạm vi nhỏ): chủ quán net biết mọi PC, dev biết mọi engine, lãnh chúa biết mọi thuộc hạ. Thiếu chỉ là quy mô (small ops), KHÔNG phải competence.',
      'FIRST WOW BY SCENE 2 (BẮT BUỘC — retain reader): Scene 2 PHẢI có dopamine event đầu tiên — small face-slap (1 customer khinh thường → MC giải quyết → choáng), casual competence shock (MC fix vấn đề người thường thấy khó), smooth opportunity grabbed (deal nhỏ ký nhanh), hoặc recognition (1 nhân vật uy tín nhận ra MC). KHÔNG để reader đọc 50% chương 1 mới có payoff.',
      'BIG WOW AT SCENE 4-5: Scene cuối chương 1 PHẢI có wow lớn hơn small wow scene 2 — milestone đạt được rõ (deal lớn ký, đối thủ uy tín bị nghiền, recognition mass-witnessed).',
      'Hook chương 1 = OPPORTUNITY-driven, KHÔNG threat-driven: 1 customer giàu bước vào, 1 deal hiện ra, 1 manh mối lộ ra, 1 lựa chọn xuất hiện — KHÔNG phải "MC bị đánh / mất việc / hết tiền / sắp chết".',
      'Mục tiêu rõ ràng của MC (mở rộng quy mô, chốt deal, cứu một người cụ thể, dùng cơ hội mới hé lộ)',
      'Demo competence/golden finger ngay scene 1-2: MC quan sát/thao tác đúng kiểu chuyên gia, bystander react với expertise đó.',
      'Giới thiệu thiết lập thế giới qua HÀNH ĐỘNG (MC vận hành, customer hỏi, deal đến) — KHÔNG dump exposition',
    ],
    avoid: [
      'Mở đầu chậm, lan man',
      'Worldbuilding dump',
      'MC thụ động không làm gì',
      'ROCK-BOTTOM OPENING (CẤM TUYỆT ĐỐI): MC nghèo đói + bị đuổi việc + bị đánh + bị bỏ + nợ ngập đầu + ngất xỉu + mất trí nhớ + khóc lóc tủi thân → đây là "凄惨开局" TQ đã chán từ 2022',
      'Pre-action backstory dump: dành >150 từ đầu kể past suffering của MC trước khi vào action — TUYỆT ĐỐI CẤM',
      'MC vừa xuyên không "không biết gì", "chưa có gì", "phải tự lực từ con số 0" — modern trend là MC arrive WITH golden finger ACTIVATED + tools in hand',
    ],
  },
  chapter2: {
    mustHave: [
      'BIG WOW MOMENT (BẮT BUỘC): Chương 2 PHẢI có ≥1 face-slap mass-witnessed HOẶC deal lớn ký kết HOẶC competence shock đỉnh — bystander kinh ngạc rõ rệt. Reader phải có "khoảnh khắc hooked" trong chương 2.',
      'EARLY WOW IN-CHAPTER: First dopamine peak ≤50% chương (small face-slap hoặc opportunity grabbed). KHÔNG để chương 2 toàn build-up.',
      'Thành quả nhân đôi từ chương 1 — MC unlock thêm 1 capability/network/resource visible.',
      'Nhân vật mới xuất hiện thông qua MC competence (1 nhân vật uy tín nghe đồn → tự tìm đến MC).',
      'Mini-conflict mức nhẹ (competitor noticed, supplier hỏi giá, customer khó tính) — MC giải quyết ngay TRONG chương, KHÔNG để dây dưa.',
      'Hook cho chapter tiếp.',
    ],
    avoid: ['Chỉ training/giải thích không hành động', 'Cốt truyện dậm chân', 'Đột ngột chuyển sang dark tone (giang hồ/bạo lực/villain dập)', 'Setup-only chương — phải có payoff trong cùng chương'],
  },
  chapter3: {
    mustHave: [
      'DEFINING WOW MOMENT: Chương 3 PHẢI có moment "đóng đinh" — face-slap quy mô lớn hơn ch.2 / deal khủng / recognition tầm city-level / breakthrough cảnh giới rõ. Đây là chương "quyết định reader có theo truyện không".',
      'EARLY DOPAMINE: First peak ≤40% chương (sớm hơn ch.1-2 vì reader đã hooked).',
      'Growth visible (revenue tăng X-lần, quy mô +1 cấp, network mở rộng, capability mới).',
      'Hint về plot/quy mô thế giới lớn hơn (tập đoàn lớn để ý / quan chức ghé / nhân vật quan trọng nghe đồn).',
      'Reader bị hook bằng OPPORTUNITY (deal lớn sắp đến / nhân vật quan trọng sẽ tìm MC) chứ KHÔNG phải THREAT.',
    ],
    avoid: ['Giải quyết quá dễ dàng (cần show MC khéo léo, không phải GF deus ex machina)', 'Không stakes/hậu quả', 'Ép villain hard-conflict ngay khi MC mới có 2-3 chương baseline', '"Kìm nén" — full setup không payoff'],
  },
};

// ============================================================================
// CHAPTER TITLE RULES - Quy tắc đặt tên chương hấp dẫn
// ============================================================================

export interface TitleTemplate {
  id: string;
  name: string;
  pattern: string;
  examples: string[];
  description: string;
}

export const TITLE_TEMPLATES: TitleTemplate[] = [
  {
    id: 'mystery_question',
    name: 'Nghi Vấn/Kích Thích Tò Mò',
    pattern: '[Đối tượng] + [Hành động bí ẩn]?',
    examples: ['Giao Dịch? Các Người Không Đủ Tư Cách!', 'Ai Đang Nói Dối?', 'Chuyện Gì Xảy Ra Trong Đêm Đó?'],
    description: 'Tạo câu hỏi khiến người đọc muốn tìm câu trả lời',
  },
  {
    id: 'action_location',
    name: 'Nửa Kín Nửa Hở',
    pattern: '[Hành động kịch tính] + [Địa điểm/Tình huống]',
    examples: ['Biến Số Đêm Đấu Giá, Vạn Kim Khó Cầu', 'Huyết Chiến Vạn Thú Sơn', 'Cuộc Gặp Gỡ Bất Ngờ'],
    description: 'Chỉ hé lộ một nửa sự kiện quan trọng',
  },
  {
    id: 'power_moment',
    name: 'Quyền Lực Áp Đảo',
    pattern: '[Đối tượng] + [Thể hiện sức mạnh]',
    examples: ['Quỳ Xuống!', 'Một Kiếm Trảm Thiên Địa', 'Đừng Ép Ta Phải Ra Tay'],
    description: 'Thích hợp cho chương có face-slap hoặc breakthrough',
  },
  {
    id: 'character_focus',
    name: 'Tiêu Điểm Nhân Vật',
    pattern: '[Đặc điểm] + [Tên/Danh xưng]',
    examples: ['Sự Lựa Chọn Của Kẻ Mạnh', 'Nước Mắt Của Ác Ma', 'Nụ Cười Bí Ẩn'],
    description: 'Dành cho chương phát triển nội tâm hoặc nhân vật mới',
  },
  {
    id: 'turning_point',
    name: 'Bước Ngoặt Bất Ngờ',
    pattern: '[Tình huống] + [Kết quả bất ngờ]',
    examples: ['Lật Ngược Thế Cờ', 'Kế Hoạch Đổ Vỡ', 'Sự Thật Phơi Bày'],
    description: 'Dùng cho chương có plot twist hoặc revelation',
  },
  {
    id: 'foreshadowing',
    name: 'Điềm Báo/Gợi Ý',
    pattern: '[Sự vật/Sự kiện] + [Hệ quả tương lai]',
    examples: ['Bão Tố Sắp Bắt Đầu', 'Bóng Đen Đang Đến Gần', 'Cái Giá Của Quyền Lực'],
    description: 'Tạo tension cho những chương setup',
  },
  {
    id: 'declaration',
    name: 'Tuyên Bố Sốc/Mệnh Lệnh',
    pattern: '[Câu nói ấn tượng]',
    examples: ['Ta Sẽ Trở Lại!', 'Từ Nay Về Sau, Ta Là Luật!', 'Đừng Cản Đường Ta!'],
    description: 'Chương có quyết định mạnh mẽ của MC',
  },
  {
    id: 'emotion_atmosphere',
    name: 'Cảm Xúc/Bầu Không Khí',
    pattern: '[Cảm xúc/Không khí ấn tượng]',
    examples: ['Giọt Lệ Của Kẻ Mạnh', 'Đêm Dài Không Ngủ', 'Tiếng Cười Trong Mưa Máu'],
    description: 'Thích hợp cho chương cảm xúc mạnh, romance, bi kịch',
  },
  {
    id: 'countdown_urgency',
    name: 'Đếm Ngược/Cấp Bách',
    pattern: '[Thời gian/Deadline] + [Nguy hiểm]',
    examples: ['Ba Ngày Trước Đại Chiến', 'Giờ Phút Sinh Tử', 'Trước Khi Đan Dược Hết Hạn'],
    description: 'Tạo urgency, thích hợp cho chương tension cao',
  },
  {
    id: 'ironic_contrast',
    name: 'Tương Phản/Nghịch Lý',
    pattern: '[Tương phản gây sốc]',
    examples: ['Tên Ăn Mày Và Bản Hợp Đồng Ngàn Tỷ', 'Phế Vật? Thiên Tài!', 'Kẻ Cứu Thế Hay Ác Ma', 'Ân Nhân Chính Là Kẻ Thù'],
    description: 'Tạo twist, gợi tò mò bằng mâu thuẫn',
  },
];

export const CHAPTER_TITLE_RULES = {
  // Quy tắc chung
  general: [
    'Tên chương mang phong cách CLICKBAIT Qidian, phải có LỰC CLICK (CTR cao)',
    'Tên chương phải NGẮN GỌN (3-10 từ), ẤN TƯỢNG, gợi TÒ MÒ tột độ',
    'KHÔNG dùng mẫu tóm tắt nội dung hiền lành (VD: "Giao dịch thành công", "Đột phá Kim Đan")',
    'Mỗi tên chương phải KHÁC BIỆT rõ ràng với các chương trước',
    'Ưu tiên: lời thoại nghênh ngang, câu hỏi nghi vấn, tương phản sốc, hoặc mệnh lệnh',
    'Có thể dùng: lời thoại, câu hỏi, hình ảnh mạnh, tương phản',
  ],

  // Anti-patterns cần tránh
  antiPatterns: [
    'Chương tóm tắt nhàm chán (VD: "Cuộc gặp gỡ", "Đi mua đồ", "Đột phá Kim Đan")',
    'X Và Sự Y (VD: "Linh Kiện Phế Thải Và Sự Sỉ Nhục")',
    'Sự [Danh từ] Của [Đối tượng]',
    'Nghịch Lý Của X',
    'Quy Luật Của X',
    'Định Luật Của X',
    'Sự Trỗi Dậy Của X',
    'Sự Kinh Ngạc Của X',
    'Bí Mật Của X (dùng tối đa 1 lần/20 chương)',
    'Lặp cùng keyword giữa 2 chương liên tiếp',
  ],

  // Quy tắc đa dạng
  diversityRules: {
    maxSamePatternConsecutive: 2,
    maxSamePatternPer20: 4,
    maxSameKeywordPer10: 2,
    minUniquePatterns: 5,
  },

  // Mẫu title theo loại chương
  chapterTypeTitleGuide: {
    action: ['declaration', 'power_moment', 'action_location'] as string[],
    revelation: ['mystery_question', 'turning_point', 'ironic_contrast'] as string[],
    cultivation: ['power_moment', 'turning_point', 'ironic_contrast'] as string[],
    romance: ['emotion_atmosphere', 'character_focus', 'foreshadowing'] as string[],
    tension: ['countdown_urgency', 'foreshadowing', 'mystery_question'] as string[],
    comedy: ['declaration', 'ironic_contrast', 'mystery_question'] as string[],
  },
};

// ============================================================================
// ENGAGEMENT CHECKLIST - Yếu tố hấp dẫn truyện TQ (Qidian-style)
// ============================================================================

export const ENGAGEMENT_CHECKLIST = {
  // Yếu tố BẮT BUỘC mỗi chương — SẢNG VĂN MÌ-ĂN-LIỀN (snappy delivery)
  perChapter: [
    'MICRO-HOOK + EARLY WOW: ≥1 micro-hook trong 500 từ đầu, VÀ first dopamine peak (small face-slap, casual competence shock, recognition, smooth opportunity unlock) PHẢI xuất hiện trong scene 1-2 (≤50% chương). CẤM để reader chờ payoff đến scene cuối.',
    'DOPAMINE PEAKS: Mỗi chương PHẢI có ≥2 dopamine moments rõ rệt — không phải "1 hint cuối chương". Phân bố: 1 small wow ở 30-50% chương + 1 bigger wow ở 70-90% chương. Mì-ăn-liền pacing.',
    'PAYOFF DOMINANT: Setup beats ≤30% nội dung chương. Payoff/win/recognition/face-slap chiếm ≥40%. CẤM "kìm nén" pattern (3+ setup beats không kèm payoff trong cùng chương).',
    'Ending hợp lý — 4 loại ending hợp lệ:',
    '  • Plot cliffhanger (~1/3 chương): tình huống nguy hiểm/bất ngờ — cho chương climax/villain_focus/revelation',
    '  • Reveal/seed ending: hé lộ thông tin lớn (face-slap victim choáng váng, deal lớn ký kết, milestone đạt được) — DOPAMINE-positive ending',
    '  • Triumph/payoff ending: chương kết thúc bằng MC vừa thắng/thu hoạch/recognition đỉnh — KHÔNG cliffhanger nguy hiểm nhưng vẫn hấp dẫn vì reader muốn xem MC tận hưởng',
    '  • Emotional/comfort ending: cho aftermath/breathing — đóng note ấm áp',
    'CẤM dùng cliffhanger nguy hiểm 3 chương liên tiếp — cliffhanger fatigue.',
    'CẤM 1 chương full-setup với 0 payoff (ALL build-up, 0 victory) — đây là "kìm nén" pattern reader bỏ truyện. Setup + payoff PHẢI nằm CÙNG chương.',
    'Worldbuilding qua action/cảm xúc, KHÔNG info-dump.',
    'Emotional contrast: cảm xúc phải thay đổi ít nhất 1 lần.',
  ],

  // Yếu tố BẮT BUỘC mỗi 5 chương — DOPAMINE FLOOR (Sảng Văn cadence cao)
  per5Chapters: [
    'BIG WOW MOMENT: ≥1 big face-slap (đối thủ choáng váng) HOẶC milestone lớn (deal ký, breakthrough, network mở rộng, recognition mass-scale). KHÔNG được skip 5 chương không có wow lớn.',
    'SMALL WOW CADENCE: ≥3 small wow moments rải đều (recognition cá nhân, casual competence shock, smooth opportunity grabbed, harvest). Cadence dày — mì-ăn-liền retain reader.',
    'MC tiến bộ rõ ràng (sức mạnh, địa vị, doanh thu, network) — visible progress mỗi 5 chương.',
    'Ít nhất 1 face-slap/power reveal/business win mass-witnessed (≥3 bystanders chứng kiến + react). Solo win không tính.',
    'CẤM TUYỆT ĐỐI 2 GIAI ĐOẠN ngược liên tiếp không có breathing ở giữa.',
    'Giới thiệu ít nhất 1 yếu tố mới (nhân vật, địa danh, kỹ thuật, opportunity).',
    'Ít nhất 1 hint/foreshadowing cho plot lớn hơn.',
  ],

  // Yếu tố BẮT BUỘC mỗi arc (15-30 chương)
  perArc: [
    'MC đột phá cảnh giới hoặc có power-up đáng kể',
    'Đánh bại boss/kẻ thù chính của arc',
    'Ít nhất 1 major revelation (thân phận, thế giới, hoặc hệ thống)',
    'Relationship development (romance, huynh đệ, hoặc sư đồ)',
    'Mở rộng thế giới: MC tiến vào khu vực/tầng mới',
    'Emotional climax: moment khiến người đọc rung động',
  ],

  // Yếu tố "gây nghiện" đặc trưng TQ webnovel
  addictiveElements: {
    faceSlapFormula: {
      name: 'Công Thức Tát Mặt (Sảng Văn dopamine engine)',
      description: 'PROACTIVE (ưu tiên cho do-thi/quan-truong/kinh-doanh): MC hành động → đạt kết quả → đối thủ kinh ngạc → cố phản kháng nhưng quá muộn → câm lặng nể phục. REACTIVE (cho fantasy/wuxia): kẻ thù coi thường → MC ẩn nhẫn → kẻ thù ra tay → MC nghiền nát → bàng quan kinh ngạc. ĐÂY LÀ DOPAMINE EVENT, KHÔNG phải adversity event — MC KHÔNG thực sự khổ, đối thủ chỉ là bystander để contrast competence.',
      frequency: 'BẮT BUỘC cadence cao: ≥1 small face-slap mỗi 1-2 chương (bystander shock cá nhân, đối thủ kinh ngạc nhỏ) + ≥1 big face-slap mỗi 5 chương (mass-witnessed, đối thủ uy tín bị nghiền). Đây là Sảng Văn engine retain reader — KHÔNG bị xếp vào "adversity" hay "tự ngược" vì MC không hề khổ. Đối thủ trong face-slap có thể là customer khinh thường, supplier ép giá, đối thủ kinh doanh phỏng vấn cùng MC, fan ghen tị — KHÔNG bắt buộc villain hardcore.',
      escalation: 'Mỗi 5 chương face-slap quy mô tăng: chương 1-5 cá nhân (1 bystander shock) → chương 5-10 nhóm (table/team shock) → chương 10-15 mass (cộng đồng/báo chí biết) → chương 15+ nationwide. Truyện kinh doanh leo thang qua scale doanh nghiệp + reputation, KHÔNG cần combat.',
    },
    businessEmpire: {
      name: 'Đế Chế Kinh Doanh',
      description: 'Tính toán chi phí/lợi nhuận → Chống ép giá/đối thủ → Tung sản phẩm/mưu kế → Đối thủ sụp đổ/khách hàng cuồng nhiệt',
      frequency: 'Mỗi arc một thương vụ lớn hoặc mở rộng sản phẩm mới',
    },
    cozyFarming: {
      name: 'Điền Viên Chữa Lành',
      description: 'Lao động chăm sóc → Khó khăn sinh hoạt/kẻ gian phá → Giải quyết khéo léo → Thu hoạch bùng nổ/đồ ăn ngon/hài hước',
      frequency: 'Mỗi 2-3 chương có một thu hoạch nhỏ hoặc cảnh ăn ngon ấm áp',
    },
    powerFantasyLoop: {
      name: 'Vòng Lặp Sức Mạnh / Trí Tuệ',
      description: 'Encounter → Bị khinh thường → Training/Cơ duyên/Chuẩn bị → Đột phá/Thành công → Thể hiện → Chấn kinh',
      frequency: 'Vòng lặp 10-15 chương, mỗi vòng scale lớn hơn',
    },
    treasureHunt: {
      name: 'Săn Kho Báu',
      description: 'Manh mối → Bí cảnh → Thử thách → Boss → Thu hoạch → Kẻ thù đuổi theo',
      frequency: 'Mỗi arc 1 bí cảnh/treasure hunt',
    },
    mysteryReveal: {
      name: 'Bí Mật Từng Lớp',
      description: 'Hint nhỏ → Manh mối → Nghi ngờ → Xác nhận → Sốc → Hệ quả',
      layers: ['Thân phận MC', 'Bí mật thế giới', 'Âm mưu lớn', 'Kẻ đứng sau tất cả'],
    },
    haremTeasing: {
      name: 'Tình Cảm Mờ Ảo',
      description: 'Gặp gỡ ấn tượng → Xung đột → Cứu giúp → Hint tình cảm → Chia ly tạm → Hội ngộ',
      rule: 'Mỗi arc giới thiệu 1 nữ nhân vật, mỗi 5 chương có 1 sweet moment nhẹ',
    },
    statusFlex: {
      name: 'Flex Địa Vị',
      description: 'Đặc biệt trong đô thị: siêu xe, biệt thự, VIP, nhân mạch khủng',
      rule: 'Mỗi 10 chương có 1 scene MC flex tài sản/quyền lực khiến kẻ khinh câm lặng',
    },
  },

  // Nguyên tắc "ngược trước sảng sau" — anti-self-torture (CHỐNG TỰ NGƯỢC)
  // QUAN TRỌNG: Tư duy theo GIAI ĐOẠN/SỰ KIỆN, không đếm theo chương.
  // 1 giai đoạn ngược (event) có thể trải dài 1-3 chương — diễn biến tự nhiên, KHÔNG cắt vụn.
  // Sau mỗi giai đoạn ngược kết thúc → BẮT BUỘC giai đoạn breathing trước khi sự kiện ngược tiếp theo.
  adversityToTriumphRatio: {
    description: 'SẢNG VĂN MÌ-ĂN-LIỀN: MC ít khổ + dopamine cadence CAO. Conflict (MC suffer) ít, NHƯNG face-slap/recognition/milestone (dopamine events, MC không khổ) DÀY ĐẶC. KHÔNG nhầm 2 thứ — face-slap KHÔNG phải adversity, đó là dopamine.',
    idealRatio: '10% chương MC thực sự suffer → 90% chương dopamine flow (smooth wins / face-slap / milestone / recognition / breakthrough). Trong 90% dopamine flow, mỗi chương PHẢI có 2-3 dopamine peaks rải đều.',
    hardRules: [
      'DOPAMINE CADENCE FLOOR: ≥2 dopamine peaks mỗi chương (small face-slap / casual competence shock / recognition / smooth opportunity / harvest / breakthrough). First peak ≤50% chương — KHÔNG để reader đợi đến cuối.',
      'BIG WOW FLOOR: ≥1 big wow moment mỗi 3-5 chương (deal lớn ký, big face-slap mass-witnessed, milestone đỉnh, breakthrough cảnh giới). KHÔNG để 5 chương trôi qua mà không có wow lớn.',
      'CẤM "kìm nén" pattern: chương full-setup không có payoff trong cùng chương → REWRITE. Setup beats và payoff PHẢI nằm CÙNG chương (ngoại trừ multi-chapter event natural span).',
      'TƯ DUY THEO GIAI ĐOẠN: 1 sự kiện adversity (MC bị truy sát, đối đầu villain, gặp tai nạn) có thể trải 1-3 chương — diễn biến tự nhiên. Adversity event hiếm — chỉ ~10% chapters.',
      'CẤM 2 GIAI ĐOẠN adversity liên tiếp KHÔNG breathing ở giữa.',
      'Mỗi GIAI ĐOẠN adversity resolve trong tối đa 2-3 chương cho non-combat genres / 3-5 chương cho combat genres. KHÔNG kéo dài lê thê.',
      'Mỗi arc ≥60% chương Sảng Văn flow — face-slap stream + casual competence + recognition + milestone progression. Face-slap KHÔNG bị xếp vào adversity ratio.',
    ],
    antiPattern: '(1) TỰ NGƯỢC — chuỗi adversity liên tiếp; (2) KÌM NÉN — chương full-setup không payoff; (3) DOPAMINE THIẾU — chương trôi qua không có face-slap/milestone/recognition. Cả 3 đều khiến reader bỏ truyện.',
  },

  // Density cap theo GIAI ĐOẠN — KHÔNG đếm theo chương (vì 1 sự kiện có thể span nhiều chương)
  conflictDensityCap: {
    description: 'Giới hạn tần suất GIAI ĐOẠN ngược — không đếm chương. Giữa 2 giai đoạn ngược cần giai đoạn breathing.',
    perGenre: {
      // breathingChaptersBetweenEvents: số chương breathing TỐI THIỂU giữa 2 giai đoạn ngược
      // maxEventLengthChapters: chiều dài tối đa của 1 giai đoạn ngược (chương)
      'do-thi':       { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'ngon-tinh':    { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'quan-truong':  { breathingChaptersBetweenEvents: 2, maxEventLengthChapters: 3 },
      'tien-hiep':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'huyen-huyen':  { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'kiem-hiep':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'khoa-huyen':   { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'vong-du':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'dong-nhan':    { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'di-gioi':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'lich-su':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      'mat-the':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 5 },
      'linh-di':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 5 },
      // Quy-tac-quai-dam: phó bản 20-chương đóng → mỗi sự kiện căng tối đa 4 chương trong 1 hồi, BẮT BUỘC ≥1 chương breathing giữa 2 hồi để san trị MC hồi phục
      'quy-tac-quai-dam': { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      // Ngự Thú: combat pet vs pet, mỗi giải đấu/raid 3-5 chương căng, breathing 1-2 chương sau
      'ngu-thu-tien-hoa': { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
      // Khoái Xuyên: thế giới mới reset modular, mỗi sự kiện trong thế giới căng tối đa 4 chương
      'khoai-xuyen':      { breathingChaptersBetweenEvents: 1, maxEventLengthChapters: 4 },
    },
    hardCap: 'KHÔNG genre nào được phép 1 giai đoạn ngược kéo dài 6+ chương, hoặc 2 giai đoạn ngược back-to-back không có breathing ở giữa.',
  },

  // Ngân sách sức mạnh — chống power creep trong truyện dài
  powerBudget: {
    description: 'Kiểm soát tốc độ tăng sức mạnh để giữ tension bền vững cho truyện 1000-2000 chương',
    perArcRules: {
      maxPowerUps: 3,
      maxBreakthroughs: 1,
      nonPowerChapters: 'Tối thiểu 17/20 chương phát triển qua chiến lược, quan hệ, worldbuilding, mưu kế, khám phá',
    },
    deceleratingFrequency: {
      earlyArcs: 'Arc 1-5: power-up mỗi 7 chương; breakthrough tối đa 1 lần/arc',
      midArcs: 'Arc 6-15: power-up mỗi 10 chương; breakthrough tối đa 1 lần/2 arc',
      lateArcs: 'Arc 16-30: power-up mỗi 15 chương; breakthrough tối đa 1 lần/3 arc',
      endArcs: 'Arc 31+: power-up mỗi 20 chương; breakthrough chỉ tại climax arc',
    },
    antiPowerCreep: [
      'KHÔNG tăng sức mạnh mỗi chương',
      'Mỗi power-up CẦN lý do rõ ràng (milestone đạt được, insight, tài nguyên, đồng đội hỗ trợ). "Cái giá phải trả" là TÙY CHỌN — Sảng Văn cho phép MC earn power-up qua intelligence/timing mà KHÔNG cần sacrifice/wound. CẤM ép MC bị thương/tốn tài nguyên nặng để "cân bằng" mỗi lần mạnh lên.',
      'Kẻ thù/trở ngại CÓ THỂ leo thang HOẶC MC chọn target dễ hơn / outmaneuver bằng kế. Áp lực KHÔNG phải nguồn engagement duy nhất — Sảng Văn lấy engagement từ stream of victories, recognition, scale-up.',
      'Sau breakthrough cần 3-5 chương thích nghi thay vì breakthrough liên tiếp',
    ],
  },
};

/**
 * Genre-specific title examples — injected into title rules to guide genre-appropriate naming.
 * Each genre has 6 example titles that capture the genre's unique flavor.
 */
export const GENRE_TITLE_EXAMPLES: Record<GenreType, string[]> = {
  'tien-hiep': ['Một Kiếm Phá Thiên', 'Quỳ Xuống!', 'Đan Thành, Thiên Kiếp Giáng', 'Ai Dám Coi Thường?', 'Chín Tầng Trời Rung Chuyển', 'Kẻ Không Xứng Đứng Đây'],
  'huyen-huyen': ['Thức Tỉnh Huyết Mạch', 'Đừng Ép Ta Ra Tay', 'Bí Mật Trong Hư Không', 'Thiên Đạo Sợ Ta?', 'Khế Ước Với Bóng Tối', 'Vạn Pháp Thần Giới'],
  'do-thi': ['Thẻ Đen Và Nụ Cười', 'Ai Cho Ngươi Quyền?', 'Chốt Deal Ngàn Tỷ', 'Kẻ Đứng Sau Tất Cả', 'Giao Dịch? Không Đủ Tư Cách!', 'Nước Cờ Kinh Thiên'],
  'khoa-huyen': ['Mã Gen Thứ 13', 'Hệ Thống Đã Thức Tỉnh', 'Vũ Trụ Đang Sợ', 'Tiến Hóa Bất Khả Nghịch', 'Trạm Không Gian Số 7', 'Tín Hiệu Từ Hư Vô'],
  'lich-su': ['Long Bào Dưới Áo Rách', 'Mưu Kế Trong Tiệc Rượu', 'Ai Mới Là Quân Sư?', 'Nước Cờ Cuối Cùng', 'Máu Đổ Trước Ngọ Môn', 'Lệnh Hổ Phù Đã Ban'],
  'dong-nhan': ['Nguyên Tác? Đã Vỡ', 'Ta Không Theo Kịch Bản', 'Hắn Biết Kết Cục Của Ngươi', 'Cướp Cơ Duyên? Chậm Rồi!', 'Nhân Vật Phụ Phản Kích', 'Thiên Mệnh Không Thuộc Về Hắn'],
  'vong-du': ['Hidden Quest: ???', 'Toàn Server Chấn Động', 'Bug Hay Cố Ý?', 'PK Tại Vùng An Toàn', 'First Blood Đẫm Máu', 'Top 1 Không Phải Để Chơi'],
  'kiem-hiep': ['Một Kiếm Xé Mây', 'Giang Hồ Ai Xứng Đệ Nhất?', 'Huyết Ảnh Dưới Trăng', 'Rượu Cạn, Kiếm Tuốt', 'Ân Oán Mười Năm', 'Thanh Kiếm Không Tên'],
  'mat-the': ['Ngày Thứ 47', 'Tiếng Gầm Trong Bóng Tối', 'Đồ Ăn Còn 3 Ngày', 'Ai Đang Theo Dõi?', 'Bức Tường Cuối Cùng', 'Sống Sót Bằng Mọi Giá'],
  'linh-di': ['Đừng Nhìn Lại', 'Căn Phòng Số 444', 'Xương Cốt Dưới Giếng', 'Nửa Đêm Có Người Gõ Cửa', 'Bóng Ma Trong Gương', 'Lời Nguyền Thứ Bảy'],
  'quan-truong': ['Ai Đứng Sau Bản Báo Cáo?', 'Cuộc Họp Kín', 'Thăng Chức Hay Bẫy?', 'Nước Cờ Của Kẻ Nhẫn', 'Phong Thanh Từ Tầng Trên', 'Lá Phiếu Quyết Định'],
  'di-gioi': ['Lãnh Chúa Bất Đắc Dĩ', 'Đất Mới, Luật Mới', 'Thổ Dân Quỳ Gối?', 'Xây Thành Từ Hoang Vu', 'Chiến Tranh Đầu Tiên', 'Vương Quốc Phôi Thai'],
  'ngon-tinh': ['Anh Ấy Lại Đến', 'Nụ Cười Và Nước Mắt', 'Đêm Mưa Không Ngủ', 'Ai Đang Giấu Bí Mật?', 'Trái Tim Không Nói Dối', 'Hoa Rơi Trước Cửa Nhà'],
  'quy-tac-quai-dam': ['Đừng Trả Lời Sau 3h Sáng', 'Tầng 13 Không Tồn Tại', 'Quy Tắc Số 7 Là Giả', 'Đồng Nghiệp Có 6 Ngón', 'Phòng 444 Không Bao Giờ Trống', 'Áo Mưa Đỏ Sau 2h'],
  'ngu-thu-tien-hoa': ['Slime Của Ta Nuốt Cả Rồng', 'Phế Vật Tiến Hóa Thành Thần', 'Đột Biến Cấp SSS!', 'Ngươi Khinh Con Cáo Của Ta?', 'Hệ Thống Đột Biến Vô Địch', 'Vạn Linh Đồ Thượng Cổ'],
  'khoai-xuyen': ['Pháo Hôi Phản Công', 'Ta Là Phản Diện Cứu Thế', 'Hệ Thống Lại Phái Ta Đi Cứu', 'Nguyên Tác Đã Sụp Đổ', 'Khí Vận Chi Tử Chết Rồi', 'Đăng Xuất Trước Khi Yêu'],
};

/**
 * Genre-specific engagement items — supplement the generic ENGAGEMENT_CHECKLIST.perChapter
 * with items tailored to each genre's reader expectations.
 */
export const GENRE_ENGAGEMENT: Record<GenreType, string[]> = {
  'tien-hiep': [
    'Mỗi arc CÓ THỂ có vài khoảnh khắc face-slap HOẶC casual victory (recognition, smooth competence). KHÔNG ép cadence "mỗi 2-3 chương 1 face-slap" — Sảng Văn cho phép chuỗi small wins liên tiếp không cần adversity setup.',
    'Tu luyện phải có chi tiết cụ thể (cảm giác thể xác, biến hóa linh khí) — KHÔNG chỉ nói "đột phá"',
    'Đan dược/pháp khí phải có tên riêng và hiệu quả rõ ràng',
  ],
  'huyen-huyen': [
    'Hệ thống sức mạnh phải có quy tắc rõ ràng — người đọc phải hiểu MC mạnh cỡ nào so với kẻ thù',
    'Mỗi arc phải mở rộng thế giới (tầng mới, vùng đất mới, cảnh giới mới)',
    'Cơ duyên ƯU TIÊN compound advantage (MC earn nhiều, mất ít). Giá phải trả TÙY CHỌN — Sảng Văn cho phép "free lunch" khi MC may mắn/destined/timing đúng. CẤM ép sacrifice cho mỗi cơ duyên.',
  ],
  'do-thi': [
    'Flex tài sản/quyền lực phải cụ thể (con số, thương hiệu, vị trí) — KHÔNG chỉ nói "giàu"',
    'Mỗi 5 chương CÓ THỂ có 1 scene đối đầu xã hội (đàm phán, lật kèo, chốt deal) — phần lớn chương ưu tiên smooth wins (chốt deal mượt, tìm được nhân tài, khoảnh khắc gia đình ấm áp, flex không gặp resistance)',
    'Tình cảm có thể smooth progression (gặp gỡ → ấn tượng tốt → gần gũi tự nhiên), KHÔNG bắt buộc tam giác/hiểu lầm/khoảng cách giai cấp',
    'MC tránh confront đối thủ chính diện trừ khi arc plan yêu cầu — ưu tiên thắng bằng tài năng/quan hệ/thông tin',
  ],
  'khoa-huyen': [
    'Công nghệ/hệ thống phải có chi tiết kỹ thuật hấp dẫn — không quá khô nhưng phải "có vẻ thật"',
    'Mỗi arc phải có 1 khám phá khoa học hoặc technology reveal gây WOW',
    'Mối đe dọa phải leo thang (cá nhân → hành tinh → vũ trụ)',
  ],
  'lich-su': [
    'Chi tiết lịch sử phải chính xác (triều đại, phong tục, xưng hô) — sai 1 chi tiết mất uy tín',
    'Mưu kế chính trị phải nhiều lớp (mưu trong mưu, kẻ hưởng lợi bất ngờ)',
    'Nhân vật lịch sử thật phải có chiều sâu — không chỉ là NPC',
  ],
  'dong-nhan': [
    'Nhân vật gốc phải IN-CHARACTER — fan sẽ phát hiện ngay nếu OOC',
    'MC phải tận dụng "meta knowledge" một cách thông minh (không quá OP nhưng cũng không ngu)',
    'Butterfly effect: hành động MC phải tạo hệ quả khác nguyên tác',
  ],
  'vong-du': [
    'Game mechanics phải nhất quán (stats, skills, rules) — KHÔNG thay đổi tùy tiện',
    '≥1 "thao tác thần thánh" (exploit system, PvP outplay, hidden quest) per arc — KHÔNG ép cadence cứng. Sảng Văn cho phép arc full smooth grinding/farming nếu pacing yêu cầu.',
    'Players phải có hành vi giống game thật (trade, PK, guild drama)',
  ],
  'kiem-hiep': [
    'Chiêu thức kiếm pháp phải có tên và mô tả cảm quan (không chỉ "vung kiếm")',
    'Giang hồ phải có quy tắc (nghĩa khí, thù hận, tôn ti bang phái)',
    '≥1 đại hội/tỷ thí hoặc ân oán giang hồ trong 2-3 arcs — KHÔNG bắt buộc mỗi arc. Breathing arc (luyện công, kết giao, du lịch giang hồ) hoàn toàn hợp lệ.',
  ],
  'mat-the': [
    'Sinh tồn phải có chi tiết cụ thể (tìm nước, xây trại, chế tạo vũ khí)',
    'Đe dọa mới (dị thú, thiên tai, phe phái thù địch) đến KHI world state escalate tự nhiên — KHÔNG ép cadence cứng. MC có thể có chuỗi chương khám phá/build base / tích trữ tài nguyên không gặp threat mới.',
    'Base building phải có tiến triển rõ ràng qua từng arc',
  ],
  'linh-di': [
    'Horror phải có atmosphere — miêu tả 5 giác quan, đặc biệt thính giác và xúc giác',
    'Bí ẩn phải có manh mối hợp lý — người đọc có thể đoán nếu chú ý',
    '≥1 revelation/plot twist mỗi 2-3 arcs (KHÔNG bắt buộc "kinh hoàng" — có thể là hé lộ thân thế, lý do hành động kẻ thù, mảnh ghép quá khứ). Breathing arc cho phép MC củng cố sức mạnh / quan hệ không cần twist.',
  ],
  'quan-truong': [
    'Quan hệ quyền lực phải rõ ràng (ai bảo kê ai, phe phái nào chống phe nào)',
    '≥1 mưu kế chính trị hoàn chỉnh per arc (KHÔNG ép mỗi 5 chương). Cho phép arc thuần "ngồi ghế cao quan sát" hoặc "thu lợi từ mưu kế trước đó vận hành" mà không cần mưu kế mới.',
    'Thăng tiến phải có logic (công trạng, quan hệ, thời cơ) — KHÔNG may mắn suông',
  ],
  'di-gioi': [
    'Thế giới mới phải có quy tắc khác biệt rõ ràng (MC phải thích nghi)',
    'Xây dựng lãnh địa phải có milestone cụ thể qua từng arc',
    'Dân bản địa phải có văn hóa riêng — KHÔNG chỉ là NPC vô hồn',
  ],
  'ngon-tinh': [
    'Tình cảm có thể có push-pull nhẹ — KHÔNG bắt buộc tiến 1 lùi 2; smooth progression cũng được nếu hợp ngữ cảnh',
    'Mỗi 2-3 chương phải có 1 sweet moment hoặc heart-fluttering scene (tăng tần suất so với trước)',
    'Side couples phải có câu chuyện riêng — không chỉ là background',
  ],
  'quy-tac-quai-dam': [
    'Mỗi PHÓ BẢN = 1 arc 20 chương theo cấu trúc 4 hồi (5+5+7+3). KHÔNG nén phó bản dưới 15 chương — sẽ mất Hồi 3 căng thẳng. KHÔNG kéo trên 25 chương — reader bão hoà.',
    'Tờ quy tắc đầu tiên xuất hiện CHẬM NHẤT chương 2. Quy tắc giả ≥1 nhưng ≤2 trong mỗi bộ. Phá giải quy tắc giả = dopamine peak BẮT BUỘC ở Hồi 3-4.',
    '≥1 NPC chết vì vi phạm quy tắc trong 5 chương đầu mỗi phó bản — DẠY độc giả luật chơi. NHƯNG: NPC đó phải có tên + 1-2 dòng tính cách trước khi chết, để cái chết có trọng lượng.',
    'Quái vật KHÔNG bao giờ bị MC đánh chết bằng vũ lực. Chiến thắng = tuân thủ đúng + né + lừa quái vật vi phạm chính quy tắc của nó. Nếu Critic phát hiện MC vung dao/súng/bùa giết quái → REWRITE.',
    'San trị MC tracking: mỗi quy tắc vi phạm hoặc gặp Uncanny event nặng = -5 đến -15 san trị. Hồi phục = scene đời thường ngoài phó bản (mì gói nóng, tin nhắn mẹ, ngủ trưa). KHÔNG bỏ qua resource economy này.',
    'Atmospheric horror qua chi tiết Uncanny Valley nhỏ (đèn neon flicker, đồng hồ chậm 0.3s, đồng nghiệp 6 ngón). KHÔNG dùng máu/xương/quan tài/nghĩa địa cliché.',
  ],
  'ngu-thu-tien-hoa': [
    'Mỗi giải đấu / cuộc săn / boss raid = mini-arc 3-15 chương: setup + thực chiến + loot + harvest. Combat = pet vs pet, KHÔNG MC vs đối thủ tay đôi.',
    'Mỗi pet phải có DATA RÕ RÀNG xuyên truyện: tên, cấp, skill gốc + đột biến tiềm năng, công thức tiến hóa (3-5 nguyên liệu), tính cách. KHÔNG quên skill / KHÔNG nâng cấp tự phát.',
    'Đột biến skill theo 3 quy tắc: khuếch đại số/phạm vi, xoá cooldown/cost, bẻ cong logic. Mô tả CỤ THỂ skill cũ vs skill mới + phản ứng đối thủ "không thể tin" — đây là dopamine peak chính.',
    '≥1 face-slap / casual competence / collection moment per chapter (đồng cấp với Sảng văn cadence). Pet "phế vật" thực chiến đè bẹp pet "huyết mạch quý" của đối thủ.',
    'NPC reactions ≥30% chương: bạn cùng lớp ngạc nhiên, đối thủ tài phiệt sụp đổ, thầy giáo nhìn ra giấu nghề, fan girl cuồng nhiệt. KHÔNG bỏ qua "phản ứng đám đông".',
    'Pet có nhân cách rõ + arc cảm xúc riêng. Tránh "công cụ chiến đấu" thuần. Ít nhất 1 pet mỗi 50 chương có moment cảm xúc với MC (pet hi sinh, pet trưởng thành, pet biết ơn).',
  ],
  'khoai-xuyen': [
    'Mỗi thế giới = arc 30-50 chương đóng. Hồi 1 (5-7ch): đồng bộ kịch bản gốc + nhận task + làm quen thân phận. Hồi 2 (12-15ch): lật ngược thiết lập + rời nguyên kịch bản. Hồi 3 (12-15ch): phá vỡ kịch bản + vả mặt khí vận chi tử. Hồi 4 (5-10ch): hoàn thành KPI + thu hoạch + đăng xuất.',
    'Khí vận chi tử (nguyên chủ chính của tiểu thuyết MC xuyên vào) phải bị vạch trần là KẺ ĐẠO ĐỨC GIẢ qua chứng cớ + tình huống cụ thể. KHÔNG được "ác hiển nhiên từ đầu" — phải reveal qua arc.',
    'Pháp hôi / phản phái MC nhập vai phải có CHIỀU SÂU + lý do bị tổn thương. KHÔNG phải "phế vật ngu ngốc". Cứu vớt = chữa lành tâm lý + thay đổi quyết định bi thảm cụ thể.',
    'Hub Space giữa 2 thế giới: 1-2 chương "thở", tổng kết điểm + mua kỹ năng + setup thế giới tiếp theo. KHÔNG bỏ qua — đây là nhịp engine của thể loại.',
    'Skill stacking = MC senior level: tích lũy y thuật cổ đại + hacker hiện đại + chiến thuật mạt thế. Nhưng MỖI thế giới có challenge mới skill cũ không tự giải. KHÔNG để Mary Sue.',
    'Tone tùy thế giới: đô thị (sảng văn business), cổ đại (cung đấu mưu kế), mạt thế (sinh tồn căng), ngôn tình (slice-of-life ngọt). MC adapt voice nhưng nội tâm nhất quán deadpan + professional.',
  ],
};

/**
 * AI-cliché blacklist Vietnamese-specific (mùi convert thô + mùi AI).
 * Tier 1 (HARD CAP = 0): các cụm reader-VN ghét tuyệt đối, Critic auto-rewrite nếu phát hiện.
 * Tier 2 (CAP ≤2/chương): cho phép hạn chế.
 */
export const AI_CLICHE_BLACKLIST_HARD: string[] = [
  'khẽ nhếch mép', 'khóe miệng nhếch lên một nụ cười', 'không khỏi',
  'chỉ thấy', 'không nói nên lời', 'ánh mắt phức tạp',
  'trong lòng thầm nghĩ', 'không thể tin nổi', 'khẽ thở dài một hơi',
  'cảm giác như có một dòng điện chạy qua', 'một cảm giác lạ lùng',
];
export const AI_CLICHE_BLACKLIST_SOFT: string[] = [
  'đột nhiên', 'hít một ngụm khí lạnh', 'dường như', 'như thể',
  'khẽ', 'một cái',
];

/**
 * Vietnamese pronoun whitelist per genre cluster.
 * Forces appropriate pronouns: hắn/y/lão/nàng for cổ trang, anh/cô for hiện đại.
 */
export const VN_PRONOUN_GUIDE: Record<GenreType, string> = {
  'tien-hiep': 'hắn (MC + nam đồng cấp), y (nam đối thủ), lão (cao niên), nàng (nữ MC/nữ chính), gã (nam phản diện khinh miệt), bà (nữ cao niên). CẤM "anh ta", "cô ta".',
  'huyen-huyen': 'hắn / y / lão / nàng / gã / bà. CẤM "anh ta", "cô ta".',
  'kiem-hiep': 'hắn / y / lão / nàng / gã / bà / hảo hán / đại hiệp. CẤM "anh ta".',
  'do-thi': 'anh / cô / chị / em / chú / bác (HIỆN ĐẠI). DÙNG "anh/cô" cho MC + người trẻ; "chú/bác" cho người lớn tuổi. CẤM "hắn/nàng/y" (cổ trang).',
  'ngon-tinh': 'anh / cô / chị / em (HIỆN ĐẠI tổng tài) HOẶC hắn / nàng (cổ trang ngôn tình tùy bối cảnh). KHÔNG mix 2 hệ.',
  'quy-tac-quai-dam': 'tôi / anh / cô / em / chú / bác (HIỆN ĐẠI). Default first-person "tôi" cho MC. CẤM "hắn / nàng / y / lão" (cổ trang). NPC quái dị xưng hô bình thường nhưng SAI 1 chi tiết (gọi tên MC khi MC chưa giới thiệu, dùng kính ngữ kiểu cũ trong văn phòng hiện đại).',
  'ngu-thu-tien-hoa': 'hắn / nàng / y / lão / sư phụ (cổ trang ngự thú); hoặc anh / cô / em / thầy (hiện đại học viện). CHỌN 1 hệ theo bối cảnh topic. Pet luôn xưng hô qua tên riêng + tiếng kêu/biểu cảm.',
  'khoai-xuyen': 'TÙY THẾ GIỚI: thế giới hiện đại đô thị → anh/cô/em/chú/bác; thế giới cổ đại cung đấu → hắn/nàng/y/lão/bệ hạ/công công; thế giới mạt thế → cô/em/đồng đội; thế giới ngôn tình → anh/cô. MC giữ first-person "ta/tôi" trong nội tâm xuyên suốt mọi thế giới (giọng senior nhất quán).',
  'quan-truong': 'anh / cô / chú / bác / đồng chí / lãnh đạo (HIỆN ĐẠI). CẤM "hắn/nàng/y".',
  'lich-su': 'hắn / y / lão / nàng / gã / bệ hạ / công công / nương nương / vương / hầu (theo cấp bậc).',
  'mat-the': 'hắn / cô / em (post-apocalypse mix) — choose by character age + tone.',
  'linh-di': 'hắn / cô / anh / em (hiện đại horror) — flexible.',
  'di-gioi': 'hắn / nàng / lãnh chúa / chủ nhân (tuỳ vai vế trong dị giới).',
  'khoa-huyen': 'anh / cô / hắn / nàng (sci-fi mix). Default modern: "anh/cô"; future-far: "hắn/nàng".',
  'vong-du': 'anh / cô / em / hắn (game mix) — modern player default "anh/cô".',
  'dong-nhan': 'theo nguyên tác. Tu tiên: hắn/nàng/y; modern fanfic: anh/cô.',
};


/**
 * Universal anti-pattern blacklist — TQ 2024-2026 đã chán/loại bỏ các trigger sến.
 * Engine CẤM tạo những setup này trong Architect outline + Writer content.
 * Áp dụng cross-genre.
 */
export const UNIVERSAL_ANTI_SEEDS: string[] = [
  'CẤM "Mẹ MC ung thư / bệnh nặng cần tiền cứu" làm trigger động lực — sến, đã chán từ 2020',
  'CẤM "Bạn gái/người yêu bỏ MC vì nghèo" làm setup chương 1 — overused, đã thành meme',
  'CẤM "MC bị họ hàng/gia đình giàu khinh ra mặt, ăn cơm thừa" — xa lông, không relate cho reader 2024+',
  'CẤM "Tai nạn xe tải khiến MC xuyên không/trọng sinh" — meme đùa, dùng nghiêm túc thì cringe',
  'CẤM "Hôn ước bị hủy" làm trigger DUY NHẤT — overused; có thể dùng nếu kết hợp motif khác sâu hơn',
  'CẤM scene khóc lóc tủi thân kéo dài >1 đoạn (>200 từ) — TQ premium reader đã chán "凄惨开局"',
  'CẤM "MC mồ côi từ nhỏ + bị bạn cùng lớp bắt nạt + được lão gia trong nhẫn cứu" — formula cliché 2015-2018',
  'CẤM lạm dụng "tổng tài lạnh lùng + nữ chính ngây thơ + hợp đồng hôn nhân ép buộc" — TQ 女频 2024 đã reverse trend',
  // ── Anti-tragic-opening (TQ trend 2024-2026: "稳健流" / "暖开局" thay thế "凄惨开局") ──
  'CẤM "MC vừa xuyên không/trọng sinh đã ngất xỉu vì đói/lạnh/bị đánh/bị bán làm nô lệ" — modern trend là MC arrive WITH golden finger ACTIVATED, có ngay 1 thứ trong tay (shop, studio, squad, cheat function visible)',
  'CẤM "MC mất trí nhớ chương 1, không biết mình là ai" làm hook — đã chán, lazy worldbuilding',
  'CẤM "MC bị đuổi việc + nợ chồng chất + người yêu bỏ + mèo chết" cluster suffering làm trigger chương 1 — pile-on cringe, TQ đã reverse',
  'CẤM "MC bị truy sát ngoài hẻm tối / bị thủ đoạn lưu manh dập" trong 5 chương đầu — đây là combat drift cho non-combat genre, modern reader bỏ truyện ngay',
  'CẤM "MC tỉnh dậy ở dị giới với 0 tài nguyên, 0 kiến thức, phải tự lực từ con số 0" — modern isekai 2024-2026 MC arrive với INFRASTRUCTURE/INVENTORY/SYSTEM đã activated',
  'CẤM "5-10 chương đầu MC chỉ ăn cơm cám, ngủ đường, làm cu li" trước khi golden finger kích hoạt — golden finger PHẢI active từ chương 1, MC PHẢI có visible advantage ngay',
];

/**
 * Universal anti-self-torture rules — appended to EVERY genre via getGenreEngagement().
 * Triết lý: Tư duy theo GIAI ĐOẠN/SỰ KIỆN, không đếm chương. Giữa các giai đoạn ngược cần breathing.
 */
export const ANTI_SELF_TORTURE_RULES: string[] = [
  'TƯ DUY THEO GIAI ĐOẠN: 1 sự kiện ngược (truy sát, đối đầu villain, tai nạn) có thể trải 1-3 chương theo diễn biến tự nhiên — KHÔNG cắt vụn giữa sự kiện để chèn breathing',
  'CẤM 2 GIAI ĐOẠN ngược liên tiếp không có breathing ở giữa. Sau khi sự kiện ngược kết thúc → ≥1-3 chương breathing trước sự kiện ngược mới',
  'Giai đoạn ngược resolve trong tối đa 3-5 chương. KHÔNG kéo dài 6+ chương lê thê',
  'Mỗi chương dù thuộc giai đoạn ngược cũng PHẢI có ≥2 breathing moments để cân bằng',
  'Dopamine không cần adversity setup — smooth opportunity, casual competence, peaceful growth đều hợp lệ',
];

/**
 * Get genre-specific engagement items to inject into Architect prompt.
 * Always appends ANTI_SELF_TORTURE_RULES — these apply cross-genre.
 */
export function getGenreEngagement(genre: GenreType): string[] {
  const genreItems = GENRE_ENGAGEMENT[genre] || [];
  return [...genreItems, ...ANTI_SELF_TORTURE_RULES];
}

/**
 * Genre blending — merge engagement items from primary + sub-genres.
 * Modern hits 2024-2026 are cross-genre (urban+xianxia, Cthulhu+Đạo gia, etc.).
 * De-duplicates exact-match items.
 */
export function getBlendedGenreEngagement(primary: GenreType, subGenres: GenreType[] = []): string[] {
  const allGenres = [primary, ...subGenres.filter(g => g !== primary)];
  const items: string[] = [];
  const seen = new Set<string>();

  for (const g of allGenres) {
    const genreItems = GENRE_ENGAGEMENT[g] || [];
    for (const item of genreItems) {
      if (!seen.has(item)) {
        seen.add(item);
        items.push(item);
      }
    }
  }

  // Anti-self-torture rules apply cross-genre
  for (const rule of ANTI_SELF_TORTURE_RULES) {
    if (!seen.has(rule)) {
      seen.add(rule);
      items.push(rule);
    }
  }

  return items;
}

/**
 * Genre blending — merge dopamine patterns from primary + sub-genres.
 * Primary genre's patterns appear first, then unique patterns from sub-genres.
 */
export function getBlendedDopaminePatterns(primary: GenreType, subGenres: GenreType[] = []): DopaminePattern[] {
  const seen = new Set<DopamineType>();
  const result: DopaminePattern[] = [];

  // Primary genre first (its patterns dominate)
  for (const p of getDopaminePatternsByGenre(primary)) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }

  // Sub-genre patterns appended (skip duplicates)
  for (const sub of subGenres) {
    if (sub === primary) continue;
    for (const p of getDopaminePatternsByGenre(sub)) {
      if (!seen.has(p.type)) {
        seen.add(p.type);
        result.push(p);
      }
    }
  }

  return result;
}

/**
 * Build a hint string warning Architect about the current event/phase status.
 * Tư duy theo GIAI ĐOẠN, không đếm chương.
 *
 * @param genre - The story genre
 * @param currentEventLength - Số chương consecutive đang trong cùng 1 giai đoạn ngược (0 nếu chương trước là breathing)
 * @param chaptersSinceLastEventEnded - Số chương breathing kể từ khi giai đoạn ngược gần nhất kết thúc (Infinity nếu chưa từng có event)
 * @returns String warning or empty string if no constraint applies
 */
export function getConflictDensityHint(
  genre: GenreType,
  currentEventLength: number,
  chaptersSinceLastEventEnded: number,
): string {
  const cap = (ENGAGEMENT_CHECKLIST as { conflictDensityCap?: { perGenre: Record<string, { breathingChaptersBetweenEvents: number; maxEventLengthChapters: number }> } }).conflictDensityCap?.perGenre?.[genre];
  if (!cap) return '';

  // Trường hợp 1: Đang trong giai đoạn ngược kéo dài quá lâu
  if (currentEventLength >= cap.maxEventLengthChapters) {
    return `⚠️ EVENT QUÁ DÀI: Giai đoạn ngược hiện tại đã kéo dài ${currentEventLength} chương (max ${cap.maxEventLengthChapters}). Chương này BẮT BUỘC bắt đầu RESOLUTION — MC thắng, thua nhưng sống, hoặc tìm được lối thoát. KHÔNG được tiếp tục dập.`;
  }

  // Trường hợp 2: Vừa mới hết giai đoạn ngược, chưa đủ breathing chapters
  if (chaptersSinceLastEventEnded >= 0 && chaptersSinceLastEventEnded < cap.breathingChaptersBetweenEvents) {
    return `⚠️ THIẾU BREATHING: Mới ${chaptersSinceLastEventEnded} chương breathing kể từ giai đoạn ngược trước (cần ≥${cap.breathingChaptersBetweenEvents}). Chương này PHẢI là breathing/easy-win, CẤM mở giai đoạn ngược mới.`;
  }

  return '';
}

/**
 * Build title rules string for injection into AI prompts
 */
export function buildTitleRulesPrompt(previousTitles?: string[], genre?: GenreType): string {
  const titleExamples = TITLE_TEMPLATES
    .map(t => `  - ${t.name}: ${t.examples.slice(0, 2).join(', ')}`)
    .join('\n');

  const antiExamples = CHAPTER_TITLE_RULES.antiPatterns.slice(0, 5).join(', ');

  // Genre-specific title examples
  const genreTitleSection = genre && GENRE_TITLE_EXAMPLES[genre]
    ? `\n- VÍ DỤ TỐT CHO THỂ LOẠI ${genre}: ${GENRE_TITLE_EXAMPLES[genre].slice(0, 6).map(t => `"${t}"`).join(', ')}`
    : '';

  let prompt = `QUY TẮC ĐẶT TÊN CHƯƠNG (BẮT BUỘC):
- Ngắn gọn 3-10 từ, gợi tò mò, có lực click
- CẤM TUYỆT ĐỐI lặp lại hoặc tương tự bất kỳ tên chương nào đã viết trước đó
- CẤM dùng các mẫu nhàm chán: ${antiExamples}
- Mỗi tên chương phải là DUY NHẤT — không được trùng keyword chính với chương trước
- Nếu 2 từ khóa chính trùng với tên chương cũ → ĐỔI NGAY
- Có thể chọn 1 trong 10 mẫu đa dạng:
${titleExamples}${genreTitleSection}
- VÍ DỤ NÊN TRÁNH: "Sự Sỉ Nhục Và Sự Trỗi Dậy", "Nghịch Lý Của Linh Áp", "Quy Luật Của Những Con Số", "X Và Sự Y"`;

  if (previousTitles && previousTitles.length > 0) {
    // Cap at 50 most recent titles to avoid context bloat (was unlimited/500)
    const recentTitles = previousTitles.slice(0, 50);
    prompt += `\n\n⚠️ DANH SÁCH ${recentTitles.length} TÊN CHƯƠNG GẦN NHẤT (CẤM LẶP LẠI):
[${recentTitles.join(' | ')}]

KHÔNG ĐƯỢC đặt tên giống hoặc tương tự bất kỳ tên nào ở trên. Tên chương mới phải HOÀN TOÀN KHÁC BIỆT về ý nghĩa và từ khóa.`;
  }

  return prompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getStyleByGenre(genre: GenreType): StyleBible {
  return GENRE_STYLES[genre] || GENRE_STYLES['huyen-huyen'];
}

export function getPowerSystemByGenre(genre: GenreType): PowerSystem {
  switch (genre) {
    case 'tien-hiep':
      return POWER_SYSTEMS.cultivation_standard;
    case 'huyen-huyen':
      return POWER_SYSTEMS.cultivation_standard;
    case 'kiem-hiep':
      return POWER_SYSTEMS.martial_world;
    case 'do-thi':
    case 'quan-truong':
      return POWER_SYSTEMS.urban_system;
    case 'vong-du':
      return POWER_SYSTEMS.urban_system;
    case 'mat-the':
      return POWER_SYSTEMS.urban_system;
    case 'khoa-huyen':
      return POWER_SYSTEMS.urban_system;
    case 'linh-di':
      return POWER_SYSTEMS.rules_horror;
    case 'quy-tac-quai-dam':
      return POWER_SYSTEMS.rules_horror;
    case 'ngu-thu-tien-hoa':
      // Ngự thú: pet evolution là power system. Chưa có dedicated power system, dùng cultivation_standard với mô tả qua prompt
      return POWER_SYSTEMS.cultivation_standard;
    case 'khoai-xuyen':
      // Khoái xuyên: power system theo từng thế giới (modular). Default urban_system cho thế giới hiện đại, override qua prompt cho cổ đại/dị giới
      return POWER_SYSTEMS.urban_system;
    case 'di-gioi':
      return POWER_SYSTEMS.lord_building;
    case 'dong-nhan':
      // dong-nhan depends on the original work; default to cultivation
      return POWER_SYSTEMS.cultivation_standard;
    case 'lich-su':
      // lich-su: power = political/military, no fantasy power; use urban as closest analog
      return POWER_SYSTEMS.urban_system;
    case 'ngon-tinh':
      // ngon-tinh: no combat power system; use urban as closest (social status)
      return POWER_SYSTEMS.urban_system;
    default:
      return POWER_SYSTEMS.cultivation_standard;
  }
}

// Combat patterns — exclude entirely from non-combat genres
const COMBAT_PATTERN_TYPES: DopamineType[] = [
  'face_slap', 'power_reveal', 'breakthrough', 'revenge', 'flex_power_casual',
  'monster_evolution', 'master_flex', 'simulate_success',
];

// Non-combat genres: do-thi (urban), ngon-tinh (romance), quan-truong (office politics)
// — these should NEVER receive combat-based dopamine unless arc plan explicitly requires.
// Single source of truth for genre predicates. P3 alignment 2026-04-30:
// previously NON_COMBAT_GENRES + PROACTIVE_GENRES were defined separately
// across templates.ts + master-outline.ts and risked drift. Now consolidated.
export const NON_COMBAT_GENRES: GenreType[] = ['do-thi', 'ngon-tinh', 'quan-truong', 'quy-tac-quai-dam'];
export const PROACTIVE_GENRES: GenreType[] = ['do-thi', 'quan-truong', 'ngon-tinh'];

export function isProactiveGenre(genre: GenreType): boolean {
  return PROACTIVE_GENRES.includes(genre);
}

export function isNonCombatGenre(genre: GenreType): boolean {
  return NON_COMBAT_GENRES.includes(genre);
}

// Genres set in modern/parallel-world Vietnam where currency MUST be VND.
// Used by Critic to flag fake currency ("xu" / "nguyên" / "lượng vàng") that
// leaks from TQ webnovel templates into Vietnamese-set business stories.
// Excludes pure-fantasy worlds (huyen-huyen / tien-hiep / kiem-hiep) where
// "đồng vàng / linh thạch / bạc" are canonical.
const VND_CURRENCY_GENRES: GenreType[] = ['do-thi', 'quan-truong'];

// Pure non-VN genres — story is intentionally set in another world / cosmos /
// fantasy realm. Even if world_description contains VN markers (which can leak
// from voice anchor templates or careless seeding), VN currency lock should
// NEVER apply. di-gioi = isekai (other world), tien-hiep / huyen-huyen =
// cultivation cosmos, khoai-xuyen = multi-world, dong-nhan = per-IP canon,
// ngu-thu-tien-hoa = beast world.
export const NON_VN_GENRES: GenreType[] = [
  'di-gioi', 'tien-hiep', 'huyen-huyen', 'kiem-hiep',
  'khoai-xuyen', 'dong-nhan', 'ngu-thu-tien-hoa',
];

/**
 * Whether this genre is a Vietnamese setting where VN city annotation +
 * VND currency apply. Returns false for pure-fantasy / other-world genres.
 */
export function isVnSettingGenre(genre: GenreType): boolean {
  return !NON_VN_GENRES.includes(genre);
}

export function requiresVndCurrency(genre: GenreType, worldDescription?: string | null): boolean {
  // 2026-04-30 fix: pure-fantasy genres are NEVER VN-locked, regardless of any
  // VN markers leaked into world_description. di-gioi/tien-hiep/etc. should
  // describe another world entirely.
  if (NON_VN_GENRES.includes(genre)) return false;
  if (VND_CURRENCY_GENRES.includes(genre)) return true;
  // linh-di / lich-su / mat-the / khoa-huyen CAN be Vietnam-set (Dân Quốc /
  // Đại Việt / VN modern) — sniff world description for VN markers to enable
  // VND rule selectively.
  if (worldDescription && /Đại Nam|Hải Long Đô|Phượng Đô|Trung Đô|Sài Gòn|Hà Nội|Việt Nam|Dân Quốc|Đại Việt/i.test(worldDescription)) {
    return true;
  }
  return false;
}

export function getDopaminePatternsByGenre(genre: GenreType): DopaminePattern[] {
  // Anti-self-torture + Modern golden-finger patterns: prepended for non-combat genres
  const SMOOTH_HEAD = [DOPAMINE_PATTERNS.smooth_opportunity, DOPAMINE_PATTERNS.casual_competence, DOPAMINE_PATTERNS.peaceful_growth];
  const GOLDEN_FINGER = [
    DOPAMINE_PATTERNS.knowledge_leverage,
    DOPAMINE_PATTERNS.network_payoff,
    DOPAMINE_PATTERNS.business_pivot,
    DOPAMINE_PATTERNS.quiet_competence,
    DOPAMINE_PATTERNS.insider_advantage,
  ];

  switch (genre) {
    case 'tien-hiep':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.face_slap];
    case 'huyen-huyen':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge];
    case 'do-thi':
      // NON-COMBAT genre: golden finger + business cycle. ZERO combat patterns.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.flex_wealth, DOPAMINE_PATTERNS.harvest, DOPAMINE_PATTERNS.comfort, DOPAMINE_PATTERNS.beauty_encounter];
    case 'kiem-hiep':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge, DOPAMINE_PATTERNS.secret_identity];
    case 'lich-su':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge];
    case 'khoa-huyen':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.secret_identity];
    case 'vong-du':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.player_exploitation, DOPAMINE_PATTERNS.face_slap];
    case 'dong-nhan':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.steal_luck, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap];
    case 'mat-the':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.monster_evolution, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.revenge];
    case 'linh-di':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.revenge];
    case 'quy-tac-quai-dam':
      // NON-COMBAT: dopamine = phá giải quy tắc giả + thoát phó bản + sống sót. ZERO combat.
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.knowledge_leverage, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.harvest];
    case 'ngu-thu-tien-hoa':
      // Pet evolution + collection: face_slap qua pet (chứ không phải MC), recognition khi pet đột biến trước đám đông
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.harvest];
    case 'khoai-xuyen':
      // Modular reset: dopamine = vạch trần khí vận chi tử + cứu vớt nguyên chủ + thu hoạch điểm Hub
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.knowledge_leverage, DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.tears_of_regret, DOPAMINE_PATTERNS.secret_identity, DOPAMINE_PATTERNS.harvest];
    case 'quan-truong':
      // NON-COMBAT genre: political mưu kế thắng bằng kiến thức/quan hệ, KHÔNG combat.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.business_success, DOPAMINE_PATTERNS.flex_wealth, DOPAMINE_PATTERNS.harvest];
    case 'di-gioi':
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain, DOPAMINE_PATTERNS.two_world_shock, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.face_slap];
    case 'ngon-tinh':
      // NON-COMBAT genre: emotional + 大女主 career arc. ZERO combat patterns.
      return [...SMOOTH_HEAD, ...GOLDEN_FINGER, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.beauty_encounter, DOPAMINE_PATTERNS.comfort, DOPAMINE_PATTERNS.comedy_misunderstanding, DOPAMINE_PATTERNS.tears_of_regret];
    default:
      return [...SMOOTH_HEAD, DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.power_reveal];
  }
}

// ============================================================================
// SCENE EXPANSION RULES - "CÂU CHƯƠNG" OPTIMIZATION
// ============================================================================

export const SCENE_EXPANSION_RULES = {
  antiSpeed: {
    description: 'Prevent summarizing instead of experiencing',
    forbidden: [
      'Tóm tắt cảnh bằng câu tường thuật ngắn',
      'Liệt kê sự kiện thay vì mô tả chi tiết',
      'Dùng từ "sau đó", "rồi", "tiếp theo" quá nhiều',
      'Chuyển cảnh quá nhanh (trong 1 đoạn)',
    ],
    required: [
      'Mỗi scene kéo dài ít nhất 800-1200 từ',
      'Mô tả 5 giác quan cho mỗi không gian',
      'Nội tâm nhiều lớp: surface → deeper → deepest',
      'Xen kẽ flashback khi MC đau đớn/suy tư',
    ],
  },

  scenePacing: {
    action: {
      sentenceLength: { min: 5, max: 15 },
      paragraphLength: { min: 2, max: 5 },
      description: 'Ngắn, nhanh, dứt khoát',
    },
    emotional: {
      sentenceLength: { min: 15, max: 35 },
      paragraphLength: { min: 5, max: 10 },
      description: 'Dài, chậm, sâu sắc',
    },
    dialogue: {
      sentenceLength: { min: 8, max: 25 },
      paragraphLength: { min: 3, max: 8 },
      description: 'Vừa phải, xen kẽ hành động',
    },
  },

  wordCountTargets: {
    'opening_scene': { min: 500, max: 800 },
    'beating_scene': { min: 800, max: 1200 },
    'despair_scene': { min: 800, max: 1200 },
    'dialogue_scene': { min: 600, max: 1000 },
    'transformation_scene': { min: 500, max: 800 },
    'cliffhanger_scene': { min: 200, max: 400 },
  },

  expansionTechniques: [
    {
      name: 'FiveSenses',
      description: 'Mô tả bằng 5 giác quan',
      example: 'Mùi ẩm mốc nồng nặc. Tiếng chuột chạy. Ánh đèn vàng rung rinh. Lạnh. Rất lạnh.',
    },
    {
      name: 'InnerMonologueLayers',
      description: 'Nhiều lớp nội tâm',
      example: 'Surface: "Đau quá" → Deeper: "Ta sẽ chết?" → Deepest: "Không ai nhớ đến ta..."',
    },
    {
      name: 'BystanderReactions',
      description: 'Phản ứng đám đông',
      example: 'Kẻ cười nhạo, người xót xa, kẻ quay đi, trẻ con sợ hãi',
    },
    {
      name: 'FlashbackIntercutting',
      description: 'Xen kẽ quá khứ',
      example: 'Khi bị đánh, nhớ về nụ cười của mẹ, lời hứa của cha',
    },
    {
      name: 'MicroActionDetail',
      description: 'Phân rã hành động',
      example: 'Nắm tay siết chặt → Cơ bắp căng → Vai xoay → Lực từ hông → Bắn ra',
    },
    {
      name: 'EnvironmentalMirror',
      description: 'Môi trường phản chiếu cảm xúc',
      example: 'Tuyệt vọng → Mưa bão. Tức giận → Sấm chớp. Buồn → Hoàng hôn.',
    },
  ],

  chapter1Rules: {
    structure: [
      { part: 'Opening', percent: 20, minWords: 600 },
      { part: 'Beating/Humiliation', percent: 30, minWords: 900 },
      { part: 'Despair', percent: 30, minWords: 900 },
      { part: 'Transformation', percent: 15, minWords: 450 },
      { part: 'Cliffhanger', percent: 5, minWords: 150 },
    ],
    totalMinWords: 3000,
    totalMaxWords: 5000,
    forbidden: [
      'MC trả thù ngay trong chương 1',
      'Antagonist nói cliché ("Ngươi là phế vật")',
      'Hệ thống game thân thiện ("Chúc mừng bạn...")',
      'Loading percentage bars',
      'Resolution/Ending hạnh phúc',
    ],
  },

  villainDialogue: {
    forbidden: [
      'Ngươi chỉ là con kiến',
      'Tìm chết',
      'Ngươi dám',
      'Đồ phế vật',
      'Cút đi',
      'Biến',
      'Muốn chết sao',
      'Không biết trời cao đất dày',
      'Ếch ngồi đáy giếng',
      'Cũng dám mơ',
    ],
    recommended: [
      'Xử lý sạch sẽ',
      'Đừng để chết trong tông môn, phiền phức',
      'Ngươi nên cảm ơn ta. Ít nhất, ngươi còn được đứng đây',
      'Ở thành phố này, công lý chỉ là một công cụ. Vấn đề là... ai cầm nó',
      'Cường giả vi tôn. Đây là quy luật',
    ],
  },
};


/**
 * Check if chapter follows scene expansion rules.
 */
// ============================================================================
// ANTI-CLICHÉ DICTIONARY - Triệt tiêu văn phong AI
// ============================================================================

/**
 * Genre-specific anti-cliche blacklists — phrases that mark AI writing in each genre.
 * Supplements the generic ANTI_CLICHE_RULES.blacklist with genre-appropriate bans.
 */
export const GENRE_ANTI_CLICHE: Record<GenreType, string[]> = {
  'tien-hiep': [
    'cảnh giới kinh người', 'linh khí cuộn cuộn', 'chân khí tràn ngập',
    'thiên địa biến sắc', 'uy áp trùm xuống', 'một chưởng phá thiên',
    'trong mắt lóe lên sát ý', 'khí tức hùng hồn', 'tu vi cao thâm mạt trắc',
  ],
  'huyen-huyen': [
    'phóng ra một cỗ lực lượng', 'cảm nhận được một sức mạnh', 'hỗn loạn lan ra',
    'ánh sáng chói lóa', 'đại trận pháp vận hành', 'vẫn mang vẻ bình tĩnh',
    'toàn thân tỏa ra khí tức', 'chỉ là phế vật', 'mắt lạnh nhìn xuống',
  ],
  'do-thi': [
    'anh ta chỉ mỉm cười bí ẩn', 'mọi người sửng sốt', 'không ngờ anh ta lại',
    'cả hội trường im lặng', 'điện thoại đột nhiên reo', 'tài khoản có thêm',
    'tất cả mọi người quay đầu lại', 'siêu xe đỗ trước cửa', 'thẻ đen VIP',
  ],
  'khoa-huyen': [
    'hệ thống phát ra tiếng cảnh báo', 'năng lượng tăng vọt', 'dữ liệu cho thấy',
    'AI phân tích xong', 'công nghệ vượt thời đại', 'tế bào đang biến đổi',
    'con số trên màn hình', 'sức mạnh tăng theo cấp số nhân', 'tiến hóa hoàn hảo',
  ],
  'lich-su': [
    'hoàng thượng sáng suốt', 'thần xin tâu', 'một mưu kế hoàn hảo',
    'triều thần kinh ngạc', 'long nhan đại duyệt', 'tất cả là nằm trong tính toán',
    'muôn năm muôn năm muôn muôn năm', 'thiên hạ đệ nhất', 'vận nước sắp đổi thay',
  ],
  'dong-nhan': [
    'nguyên tác sẽ không xảy ra nữa', 'hắn biết tương lai', 'butterfly effect',
    'cốt truyện đã thay đổi', 'ta sẽ cứu tất cả', 'lịch sử đã rẽ nhánh',
    'nhân vật chính nguyên tác', 'ta biết kết cục của ngươi', 'thiên mệnh đã đổi',
  ],
  'vong-du': [
    'hệ thống thông báo', 'kinh nghiệm +100', 'level up', 'hidden quest triggered',
    'congratulations player', 'stats tăng vọt', 'first kill reward', 'bug hệ thống',
    'server announcement', 'toàn server chấn động', 'top bảng xếp hạng',
  ],
  'kiem-hiep': [
    'kiếm khí tung hoành', 'chiêu thức tinh diệu', 'giang hồ nghĩa khí',
    'huynh đệ xin nhận thua', 'một kiếm xé gió', 'đao quang kiếm ảnh',
    'nội công thâm hậu', 'vận khí đẩy chưởng', 'cao thủ ẩn thế',
  ],
  'mat-the': [
    'cấp bách sinh tồn', 'tìm được nguồn nước sạch', 'dị thú cấp X',
    'base đã nâng cấp', 'nhân loại cuối cùng', 'virus biến đổi',
    'tận thế đã đến', 'chỉ còn N ngày', 'kho vũ khí bí mật',
  ],
  'linh-di': [
    'một luồng khí lạnh', 'bóng đen lướt qua', 'tiếng cười ghê rợn',
    'máu tươi chảy ngược', 'linh hồn oán hận', 'ngôi mộ cổ',
    'đừng nhìn lại phía sau', 'hắn đã chết từ lâu', 'lời nguyền truyền đời',
  ],
  'quan-truong': [
    'đồng chí yên tâm', 'tổ chức đã quyết định', 'một bước lên mây',
    'quan lộ hanh thông', 'bàn tay vô hình phía sau', 'hắn chỉ mỉm cười ý nhị',
    'cuộc họp kết thúc trong im lặng', 'người đứng sau tất cả', 'thế cờ đã rõ',
  ],
  'di-gioi': [
    'thế giới này thật lạ', 'quy tắc khác hẳn', 'lãnh địa phát triển',
    'dân bản địa quỳ lạy', 'xây dựng từ số không', 'vương quốc sẽ hùng mạnh',
    'tài nguyên vô tận', 'sức mạnh thần bí', 'cánh cổng xuyên không',
  ],
  'ngon-tinh': [
    'tim đập thình thịch', 'má ửng hồng', 'cảm giác lạ lùng',
    'anh ấy thật khác biệt', 'nụ cười ấm áp', 'không hiểu sao lại',
    'trái tim rung động', 'đêm đó không ngủ được', 'tình yêu sét đánh',
  ],
  'ngu-thu-tien-hoa': [
    'tiến hóa hoàn mỹ', 'huyết mạch viễn cổ thức tỉnh', 'cấp SSS bạo kích',
    'ngươi thật sự là phế vật', 'một con slime nhỏ nuốt rồng', 'thiên phú ẩn lộ ra',
    'nhìn xuyên quy luật vạn vật', 'pet của ta là vô địch', 'đột biến vượt khái niệm',
  ],
  'khoai-xuyen': [
    'hệ thống lại giáng task', 'khí vận chi tử lộ chân tướng', 'kịch bản nguyên tác đã sụp đổ',
    'đăng xuất khỏi thế giới này', 'pháo hôi không bao giờ đáng pháo hôi', 'cứu vớt thành công 100%',
    'đa vũ trụ thật là phiền', 'điểm hệ thống tăng vọt', 'tâm nguyện cuối cùng đã hoàn thành',
  ],
  'quy-tac-quai-dam': [
    'lạnh sống lưng', 'gáy tóc dựng đứng', 'một luồng khí lạnh chạy dọc',
    'không khí như đông cứng', 'thời gian như ngừng trôi', 'tim đập thình thịch trong lồng ngực',
    'cảm giác bị theo dõi', 'một dự cảm chẳng lành', 'âm thanh kỳ lạ vang lên',
    'bóng đen lướt qua khóe mắt', 'thứ gì đó không đúng', 'mọi thứ trông bình thường nhưng',
  ],
};

/**
 * Get genre-specific anti-cliche phrases.
 */
export function getGenreAntiCliche(genre: GenreType): string[] {
  return GENRE_ANTI_CLICHE[genre] || [];
}

export const ANTI_CLICHE_RULES = {
  description: 'Tránh sử dụng các cụm từ sáo rỗng, lặp đi lặp lại mang đậm dấu vết AI.',
  blacklist: [
    'Hít một ngụm khí lạnh',
    'Không thể tin nổi',
    'Đột nhiên',
    'Khẽ nhếch mép',
    'Ánh mắt kiên định',
    'Một cỗ lực lượng vô hình',
    'Khí tức khủng bố',
    'Mỉm cười thâm ý',
    'Không hẹn mà cùng',
    'Đồng tử co rụt lại (nếu dùng quá 1 lần/chương)',
    'Trong chớp mắt',
    'Không ai biết rằng',
    'Chỉ thấy',
    'Cảm thấy một luồng',
    'Siết chặt nắm tay',
    'Mồ hôi lạnh túa ra',
    'Da gà nổi lên',
    'Đôi mắt lóe lên tia sáng',
    'Ánh mắt sắc lẹm',
    'Nghiến răng (nếu dùng quá 1 lần/chương)',
    'Hít một hơi thật sâu (nếu dùng quá 1 lần/chương)',
    'Gầm lên',
    'Khóe môi nhếch lên (nếu dùng quá 1 lần/chương)',
  ],
  guidance: 'Thay vì dùng các từ cấm, hãy MÔ TẢ hệ quả của chúng. Ví dụ: thay vì "hít một ngụm khí lạnh", tả "sắc mặt tái nhợt, lùi lại nửa bước". Thay vì "đột nhiên", tả trực tiếp âm thanh/hình ảnh cắt ngang.',
  colorRepetitionRule: `QUY TẮC LẶP MÀU SẮC & TÍNH TỪ (CỰC KỲ QUAN TRỌNG):
- KHÔNG dùng cùng một tính từ/trạng từ/cụm miêu tả màu sắc quá 3 lần trong MỘT chương.
- Sau lần thứ 3, BẮT BUỘC dùng từ đồng nghĩa, ẩn dụ, hoặc miêu tả gián tiếp.
- Ví dụ thay thế:
  + "tím sẫm" lần 4+ → "màu bầm tím trên da", "sắc hoàng hôn pha loãng", "như mực cũ loang trên giấy", "tối như đáy vực"
  + "vàng kim" lần 4+ → "màu nắng chói chang", "rực như hoàng hôn sa mạc", "sắc mật ong đặc quánh", "lấp lánh tựa kim sa"
  + "rực rỡ" lần 4+ → "chói mắt", "tỏa sáng rạng ngời", "lóa mắt", "rực lửa"
  + "kinh hoàng" lần 4+ → "ớn lạnh", "máu đông cứng", "hồn vía lên mây", "tim nhảy khỏi lồng ngực"
  + "pixel hóa" lần 4+ → "tan rã thành điểm ảnh", "vỡ vụn thành hạt sáng", "phân giải", "bị số hóa cưỡng ép"
- Các từ THƯỜNG BỊ LẶP cần chú ý: rỉ sét, ken két, rực rỡ, đặc quánh, mờ ảo, chập chờn, kinh hoàng, kinh ngạc, khủng bố, sững sờ
- CẤU TRÚC AI THƯỜNG LẶP: "là một" (thay: bỏ hoặc dùng gạch ngang), "bắt đầu" (thay: dùng động từ trực tiếp), "mang theo" (thay: pha lẫn, nhuốm), "tỏa ra" (thay: lan tỏa, phả ra), "đôi mắt" (thay: mắt, cặp mắt, tròng mắt, ánh nhìn)
- TUYỆT ĐỐI KHÔNG dùng cùng tính từ 2 lần trong 1 đoạn văn (paragraph).`,
};

// ============================================================================
// SUBTEXT DIALOGUE RULES - Hội thoại kẹp dao
// ============================================================================

export const SUBTEXT_DIALOGUE_RULES = {
  description: 'Hội thoại nhiều tầng nghĩa, không nói thẳng, kẹp dao trong nụ cười.',
  rules: [
    'Phản diện cấp cao KHÔNG chửi bới, KHÔNG dùng từ ngữ hạ cấp. Nói lời lịch sự nhưng đầy sát khí, uy hiếp ngầm.',
    'Nhân vật mưu mô KHÔNG bao giờ nói thẳng mục đích. Dùng ẩn dụ (metaphor), mượn vật nói người (chỉ trà, chỉ cây, chỉ thời tiết).',
    'Mọi đoạn hội thoại quan trọng PHẢI đi kèm vi biểu cảm (micro-expressions) hoặc hành động nhỏ để che giấu nội tâm (nhấp trà, vuốt nếp áo, nhìn bâng quơ, gõ ngón tay).',
    'Tránh kiểu hỏi đáp QA (Hỏi 1 câu, trả lời 1 câu đầy đủ). Trả lời bằng câu hỏi ngược lại, sự im lặng, hoặc trả lời lạc đề có chủ đích.',
    'Lời nói và suy nghĩ nội tâm có thể trái ngược hoàn toàn (ví dụ: cười nói khen ngợi nhưng trong lòng đang tính toán cách giết).',
  ]
};

// ============================================================================
// COMEDY MECHANICS RULES - Kỹ thuật tấu hài webnovel
// ============================================================================

export const COMEDY_MECHANICS_RULES = {
  description: 'Kỹ thuật tạo tiếng cười qua tình huống và tính cách, CẤM dùng trò đùa chơi chữ phương Tây.',
  mechanics: [
    {
      name: 'Não Bổ (Suy Diễn)',
      description: 'MC làm một hành động lãng xẹt/vô tình/tham tiền. Người xung quanh (đặc biệt là cao thủ) tự suy diễn đó là nước đi cao thâm mạt trắc, tự dọa mình sợ.',
    },
    {
      name: 'Vô Sỉ (Shameless)',
      description: 'Phá vỡ hình tượng hoàn mỹ. MC tỏ ra đạo mạo nhưng lại lật lọng, sợ chết, tham món lợi nhỏ, chối bỏ trách nhiệm với khuôn mặt tỉnh bơ.',
    },
    {
      name: 'Phản Kém (Gap Moe)',
      description: 'Tạo tương phản cực gắt: Ma đầu giết người không chớp mắt nhưng cực sợ vợ; Thần khí uy chấn thiên hạ nhưng lải nhải chửi bậy như trẻ trâu.',
    },
    {
      name: 'Hệ Thống Troll',
      description: 'Hệ thống không đưa quà ngoan ngoãn mà đưa ra các lựa chọn mất mặt (VD: Cứu người được 10 xu, vứt liêm sỉ bỏ chạy được Thần binh).',
    }
  ],
  forbidden: [
    'Tự nhiên kể một câu chuyện cười/tiếu lâm',
    'Chơi chữ, gieo vần gượng ép',
    'Tạo tiếng cười đùa cợt trong lúc nhân vật khác đang bi kịch/chết chóc (làm hỏng mood)',
  ]
};

export function checkSceneExpansion(
  content: string,
  chapterNumber: number
): { valid: boolean; issues: string[]; wordCount: number } {
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).length;

  if (chapterNumber === 1) {
    if (wordCount < SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords) {
      issues.push(`Chương 1 quá ngắn: ${wordCount} từ (cần ${SCENE_EXPANSION_RULES.chapter1Rules.totalMinWords}+)`);
    }
  }

  const forbiddenPatterns = [
    /sau đó[^\.,;]{0,30}sau đó/i,
    /tiếp theo[^\.,;]{0,30}tiếp theo/i,
    /rồi[^\.,;]{0,20}rồi[^\.,;]{0,20}rồi/i,
  ];

  forbiddenPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push('Phát hiện tóm tắt nhanh - cần mô tả chi tiết hơn');
    }
  });

  SCENE_EXPANSION_RULES.villainDialogue.forbidden.forEach(phrase => {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push(`Phát hiện cliché villain: "${phrase}" - cần viết lại`);
    }
  });

  if (/\d+%.*\d+%.*100%/.test(content) || /Chúc mừng.*nhận được/i.test(content)) {
    issues.push('Phát hiện hệ thống game - cần viết lại theo phong cách kinh dị/huyền bí');
  }

  if (chapterNumber === 1) {
    const revengePatterns = [
      /trả thù.*ngay/i,
      /đánh lại.*ngay/i,
      /phản kháng.*thành công/i,
    ];
    revengePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push('Chương 1 có cảnh trả thù ngay - cần kéo dài xây dựng');
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    wordCount,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 28 TIER 2 — SUB_GENRE_RULES extracted to ./templates/sub-genre-rules.ts
// ──────────────────────────────────────────────────────────────────────────────
export { SUB_GENRE_RULES } from "./templates/sub-genre-rules";


// Phase 28 TIER 2 — GENRE_BOUNDARIES extracted to ./templates/genre-boundaries.ts
export { GENRE_BOUNDARIES, getGenreBoundaryText } from "./templates/genre-boundaries";
export type { GenreBoundary } from "./templates/genre-boundaries";


// Phase 28 TIER 2 — GENRE_STYLES extracted to ./templates/genre-styles.ts
export { GENRE_STYLES } from "./templates/genre-styles";


// Phase 28 TIER 2 — DOPAMINE_PATTERNS extracted to ./templates/dopamine-patterns.ts
export { DOPAMINE_PATTERNS } from "./templates/dopamine-patterns";
export type { DopaminePattern } from "./templates/dopamine-patterns";

