/**
 * Story Writing Factory - Genre Templates
 *
 * Tinh hoa từ: _legacy/story-factory/genre-templates.ts
 * Chứa templates cho các thể loại, dopamine patterns, protagonist/antagonist types
 */

import { GenreType, DopamineType, StyleBible, PowerSystem } from './types';

// ============================================================================
// DOPAMINE PATTERNS - Công thức tạo sảng khoái
// ============================================================================

export interface DopaminePattern {
  type: DopamineType;
  name: string;
  description: string;
  frequency: 'every_chapter' | 'every_3_chapters' | 'every_arc' | 'arc_end';
  intensity: 'medium' | 'high' | 'very_high' | 'extreme';
  setup: string;
  payoff: string;
}

export const DOPAMINE_PATTERNS: Record<DopamineType, DopaminePattern> = {
  face_slap: {
    type: 'face_slap',
    name: 'Tát mặt',
    description: 'MC đánh bại kẻ coi thường mình',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Villain coi thường/xúc phạm MC',
    payoff: 'MC đánh bại villain ngoạn mục',
  },
  power_reveal: {
    type: 'power_reveal',
    name: 'Lộ sức mạnh',
    description: 'MC tiết lộ thực lực khiến mọi người sốc',
    frequency: 'every_3_chapters',
    intensity: 'very_high',
    setup: 'Mọi người đánh giá thấp MC',
    payoff: 'MC thể hiện sức mạnh vượt xa dự đoán',
  },
  treasure_gain: {
    type: 'treasure_gain',
    name: 'Nhặt kho báu',
    description: 'MC có được vật phẩm quý hiếm',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'Phát hiện địa điểm/cơ hội bí mật',
    payoff: 'Thu hoạch tài nguyên quý giá',
  },
  breakthrough: {
    type: 'breakthrough',
    name: 'Đột phá',
    description: 'MC lên cảnh giới mới',
    frequency: 'every_arc',
    intensity: 'very_high',
    setup: 'Tích lũy đủ, gặp khó khăn kích thích',
    payoff: 'Đột phá thành công, sức mạnh tăng vọt',
  },
  revenge: {
    type: 'revenge',
    name: 'Trả thù',
    description: 'MC đánh bại kẻ thù cũ',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Nhớ lại mối hận cũ',
    payoff: 'Đánh bại kẻ thù thỏa mãn',
  },
  recognition: {
    type: 'recognition',
    name: 'Được công nhận',
    description: 'Người khác nhận ra giá trị của MC',
    frequency: 'every_3_chapters',
    intensity: 'medium',
    setup: 'MC bị hiểu lầm hoặc bỏ qua',
    payoff: 'Người quan trọng công nhận tài năng',
  },
  beauty_encounter: {
    type: 'beauty_encounter',
    name: 'Gặp mỹ nhân',
    description: 'MC gặp và gây ấn tượng với nữ nhân vật',
    frequency: 'every_arc',
    intensity: 'medium',
    setup: 'Hoàn cảnh bất ngờ gặp gỡ',
    payoff: 'Tạo ấn tượng tốt, hint romance',
  },
  secret_identity: {
    type: 'secret_identity',
    name: 'Thân phận bí ẩn',
    description: 'Lộ ra MC có background khủng',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Manh mối về quá khứ MC',
    payoff: 'Tiết lộ thân phận choáng váng',
  },
};

// ============================================================================
// GENRE STYLE CONFIGS
// ============================================================================

export const GENRE_STYLES: Record<GenreType, StyleBible> = {
  'tien-hiep': {
    authorVoice: 'Giọng văn thâm trầm, cổ kính, nhiều miêu tả tu luyện và chiến đấu',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['thâm trầm', 'huyền bí', 'bá đạo', 'ngạo thế'],
    avoidKeywords: ['cute', 'kawaii', 'hiện đại quá mức'],
    dialogueRatio: [30, 45],
    descriptionRatio: [30, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'fast',
    genreConventions: [
      'Luôn có đột phá cảnh giới',
      'Thiếu gia kiêu ngạo xuất hiện để bị đánh mặt',
      'Bí cảnh/phế tích chứa cơ duyên',
    ],
  },
  'huyen-huyen': {
    authorVoice: 'Giọng văn hoành tráng, miêu tả chiến đấu chi tiết, hot blood',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['huyền bí', 'hoành tráng', 'nhiệt huyết', 'bá khí'],
    avoidKeywords: ['hiện đại', 'khoa học'],
    dialogueRatio: [30, 40],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [10, 20],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: [
      'Hệ sức mạnh rõ ràng',
      'Chiến đấu epic scale',
      'Tournament arcs',
    ],
  },
  'do-thi': {
    authorVoice: 'Giọng văn hiện đại, nhanh gọn, nhiều hội thoại sắc bén',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['sảng văn', 'hiện đại', 'đô thị', 'phong lưu'],
    avoidKeywords: ['cổ trang', 'tu luyện'],
    dialogueRatio: [40, 50],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 15],
    pacingStyle: 'fast',
    genreConventions: [
      'MC có thân phận bí ẩn/backing khủng',
      'Đánh mặt thiếu gia/phú nhị đại',
      'Thể hiện tài năng bất ngờ',
    ],
  },
  'kiem-hiep': {
    authorVoice: 'Giọng văn cổ điển, nhiều miêu tả võ công và giang hồ',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['hiệp nghĩa', 'giang hồ', 'ân oán', 'tình thù'],
    avoidKeywords: ['hiện đại', 'công nghệ'],
    dialogueRatio: [35, 45],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [15, 20],
    actionRatio: [15, 25],
    pacingStyle: 'medium',
    genreConventions: ['Ân oán rõ ràng', 'Võ công miêu tả chi tiết'],
  },
  'lich-su': {
    authorVoice: 'Giọng văn trang trọng, nhiều chi tiết lịch sử',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['cổ trang', 'quyền mưu', 'triều đình'],
    avoidKeywords: ['hiện đại', 'công nghệ'],
    dialogueRatio: [35, 45],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [5, 15],
    pacingStyle: 'medium',
    genreConventions: ['Chính trị phức tạp', 'Mưu kế thông minh'],
  },
  'khoa-huyen': {
    authorVoice: 'Giọng văn hiện đại, logic, nhiều chi tiết công nghệ',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['công nghệ', 'vũ trụ', 'tương lai'],
    avoidKeywords: ['phép thuật', 'tu luyện'],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 20],
    actionRatio: [10, 20],
    pacingStyle: 'medium',
    genreConventions: ['Hard sci-fi logic', 'Công nghệ sáng tạo'],
  },
  'vong-du': {
    authorVoice: 'Giọng văn gaming, nhiều thuật ngữ game',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['game', 'level up', 'boss', 'raid'],
    avoidKeywords: [],
    dialogueRatio: [30, 40],
    descriptionRatio: [30, 35],
    innerThoughtRatio: [15, 25],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: ['System/stats rõ ràng', 'Boss fights epic'],
  },
  'dong-nhan': {
    authorVoice: 'Giọng văn tùy thuộc original, có twist',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['original callbacks', 'twist', 'butterfly effect'],
    avoidKeywords: [],
    dialogueRatio: [35, 45],
    descriptionRatio: [30, 40],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'medium',
    genreConventions: ['Callbacks tới original', 'Thay đổi số phận'],
  },
  'mat-the': {
    authorVoice: 'Giọng văn căng thẳng, survival horror',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['sinh tồn', 'zombie', 'tận thế', 'căng thẳng'],
    avoidKeywords: ['vui vẻ', 'nhẹ nhàng'],
    dialogueRatio: [25, 35],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [15, 25],
    pacingStyle: 'fast',
    genreConventions: ['Stakes cao', 'Character deaths có thể'],
  },
  'linh-di': {
    authorVoice: 'Giọng văn rùng rợn, mystery',
    narrativeStyle: 'first_person',
    toneKeywords: ['kinh dị', 'ma quỷ', 'huyền bí', 'rùng rợn'],
    avoidKeywords: ['vui vẻ', 'hài hước'],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 50],
    innerThoughtRatio: [20, 30],
    actionRatio: [5, 15],
    pacingStyle: 'slow',
    genreConventions: ['Atmosphere quan trọng', 'Plot twists'],
  },
  'quan-truong': {
    authorVoice: 'Giọng văn chính trị, nhiều mưu kế',
    narrativeStyle: 'third_person_omniscient',
    toneKeywords: ['quyền mưu', 'chính trị', 'thăng tiến'],
    avoidKeywords: ['siêu nhiên', 'phép thuật'],
    dialogueRatio: [45, 55],
    descriptionRatio: [25, 35],
    innerThoughtRatio: [20, 30],
    actionRatio: [5, 10],
    pacingStyle: 'medium',
    genreConventions: ['Chính trị phức tạp', 'Thăng tiến từng bước'],
  },
  'di-gioi': {
    authorVoice: 'Giọng văn adventure, khám phá',
    narrativeStyle: 'third_person_limited',
    toneKeywords: ['xuyên không', 'thế giới khác', 'sinh tồn'],
    avoidKeywords: [],
    dialogueRatio: [30, 40],
    descriptionRatio: [35, 45],
    innerThoughtRatio: [15, 25],
    actionRatio: [10, 20],
    pacingStyle: 'fast',
    genreConventions: ['Worldbuilding quan trọng', 'Adaptation arc'],
  },
};

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
};

// ============================================================================
// GOLDEN CHAPTER REQUIREMENTS (3 chương đầu)
// ============================================================================

export const GOLDEN_CHAPTER_REQUIREMENTS = {
  chapter1: {
    mustHave: [
      'Golden finger/hệ thống xuất hiện',
      'Xung đột ngay lập tức',
      'Mục tiêu rõ ràng của MC',
      'Demo sức mạnh tiềm năng',
      'Giới thiệu thế giới tự nhiên',
    ],
    avoid: ['Mở đầu chậm', 'Worldbuilding dump', 'MC passive'],
  },
  chapter2: {
    mustHave: [
      'Chiến thắng nhỏ đầu tiên',
      'Mở rộng hệ thống/sức mạnh',
      'Nhân vật mới xuất hiện',
      'Reward/thu hoạch đầu tiên',
      'Hook cho chapter tiếp',
    ],
    avoid: ['Chỉ training không action', 'Không tiến triển'],
  },
  chapter3: {
    mustHave: [
      'Thử thách thực sự',
      'Face-slap hoặc đánh bại kẻ coi thường',
      'Growth rõ ràng của MC',
      'Hint về plot lớn hơn',
      'Reader bị hook',
    ],
    avoid: ['Giải quyết quá dễ', 'Không stakes'],
  },
};

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
    case 'kiem-hiep':
      return POWER_SYSTEMS.martial_world;
    case 'do-thi':
    case 'vong-du':
    case 'mat-the':
      return POWER_SYSTEMS.urban_system;
    default:
      return POWER_SYSTEMS.cultivation_standard;
  }
}

export function getDopaminePatternsByGenre(genre: GenreType): DopaminePattern[] {
  const common = [DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.power_reveal];

  switch (genre) {
    case 'tien-hiep':
    case 'huyen-huyen':
      return [...common, DOPAMINE_PATTERNS.breakthrough, DOPAMINE_PATTERNS.treasure_gain];
    case 'do-thi':
      return [...common, DOPAMINE_PATTERNS.beauty_encounter, DOPAMINE_PATTERNS.recognition];
    case 'mat-the':
      return [...common, DOPAMINE_PATTERNS.treasure_gain];
    default:
      return common;
  }
}
