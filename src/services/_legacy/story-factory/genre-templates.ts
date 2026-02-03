/**
 * Genre Templates Library - Kho bí kíp của Đại Thần
 * Chứa công thức viết truyện cho từng thể loại
 */

import {
  GenreTemplate,
  GenreType,
  ArcTemplate,
  ProtagonistTemplate,
  AntagonistTemplate,
  PowerSystemTemplate,
  DopaminePattern
} from './types';

// ==================== DOPAMINE PATTERNS ====================

export const DOPAMINE_PATTERNS: Record<string, DopaminePattern> = {
  face_slap: {
    name: 'Tát mặt',
    description: 'MC đánh bại kẻ coi thường mình',
    frequency: 'every_chapter',
    intensity: 'high',
    setup: 'Villain coi thường/xúc phạm MC',
    payoff: 'MC đánh bại villain một cách ngoạn mục',
  },
  power_reveal: {
    name: 'Lộ sức mạnh',
    description: 'MC tiết lộ thực lực khiến mọi người sốc',
    frequency: 'every_3_chapters',
    intensity: 'very_high',
    setup: 'Mọi người đánh giá thấp MC',
    payoff: 'MC thể hiện sức mạnh vượt xa dự đoán',
  },
  treasure_gain: {
    name: 'Nhặt kho báu',
    description: 'MC có được vật phẩm quý hiếm',
    frequency: 'every_5_chapters',
    intensity: 'medium',
    setup: 'Phát hiện địa điểm/cơ hội bí mật',
    payoff: 'Thu hoạch tài nguyên quý giá',
  },
  breakthrough: {
    name: 'Đột phá',
    description: 'MC lên cảnh giới mới',
    frequency: 'every_arc',
    intensity: 'very_high',
    setup: 'Tích lũy đủ, gặp khó khăn kích thích',
    payoff: 'Đột phá thành công, sức mạnh tăng vọt',
  },
  revenge: {
    name: 'Trả thù',
    description: 'MC đánh bại kẻ thù cũ',
    frequency: 'arc_end',
    intensity: 'extreme',
    setup: 'Nhớ lại mối hận cũ',
    payoff: 'Đánh bại kẻ thù một cách thỏa mãn',
  },
  recognition: {
    name: 'Được công nhận',
    description: 'Người khác nhận ra giá trị của MC',
    frequency: 'every_10_chapters',
    intensity: 'medium',
    setup: 'MC bị hiểu lầm hoặc bỏ qua',
    payoff: 'Người quan trọng công nhận tài năng MC',
  },
  beauty_encounter: {
    name: 'Gặp mỹ nhân',
    description: 'MC gặp và gây ấn tượng với nữ chính/nữ phụ',
    frequency: 'every_arc',
    intensity: 'medium',
    setup: 'Hoàn cảnh bất ngờ gặp gỡ',
    payoff: 'Tạo ấn tượng tốt, hint romance',
  },
  secret_identity: {
    name: 'Thân phận bí ẩn',
    description: 'Lộ ra MC có background khủng',
    frequency: 'major_arc',
    intensity: 'extreme',
    setup: 'Manh mối về quá khứ MC',
    payoff: 'Tiết lộ thân phận choáng váng',
  }
};

// ==================== PROTAGONIST TEMPLATES ====================

export const PROTAGONIST_TEMPLATES: Record<string, ProtagonistTemplate> = {
  reborn_genius: {
    id: 'reborn_genius',
    name: 'Thiên Tài Trọng Sinh',
    role: 'protagonist',
    description: 'Trọng sinh về quá khứ với ký ức tương lai',
    personalityTraits: ['lạnh lùng', 'tính toán', 'bảo vệ người thân', 'ghét kẻ phản bội'],
    backgroundTemplates: [
      'Kiếp trước bị phản bội chết thảm, trọng sinh về {X} năm trước',
      'Kiếp trước là cao thủ tuyệt đỉnh, bị hãm hại, trọng sinh làm lại'
    ],
    growthArc: 'Từ phế vật → thiên tài → đỉnh phong',
    typicalAbilities: ['Biết trước tương lai', 'Kinh nghiệm kiếp trước', 'Biết vị trí kho báu'],
    weaknesses: ['Butterfly effect', 'Kẻ thù cũng có thể trọng sinh'],
    catchphrases: ['Kiếp này, sẽ không ai có thể bắt nạt người ta muốn bảo vệ'],
    relationshipPatterns: {},
    goldenFingerType: 'Ký ức tương lai + có thể là hệ thống',
    startingCondition: 'reborn',
    motivationType: 'revenge',
    growthRate: 'explosive'
  },

  system_holder: {
    id: 'system_holder',
    name: 'Chủ Hệ Thống',
    role: 'protagonist',
    description: 'Được hệ thống chọn, có thể nâng cấp như game',
    personalityTraits: ['thực dụng', 'ham mạnh', 'biết nắm bắt cơ hội'],
    backgroundTemplates: [
      'Sinh viên/nhân viên bình thường, đột nhiên được hệ thống',
      'Xuyên không đến thế giới khác, mang theo hệ thống'
    ],
    growthArc: 'Từ noob → pro player → game master',
    typicalAbilities: ['Hệ thống nhiệm vụ', 'Cửa hàng mua skill', 'Quay gacha'],
    weaknesses: ['Phụ thuộc hệ thống', 'Nhiệm vụ bắt buộc'],
    catchphrases: ['Ding! Nhiệm vụ hoàn thành!'],
    relationshipPatterns: {},
    goldenFingerType: 'Game system với quest và rewards',
    startingCondition: 'weak',
    motivationType: 'power',
    growthRate: 'steady'
  },

  hidden_expert: {
    id: 'hidden_expert',
    name: 'Cao Thủ Ẩn Danh',
    role: 'protagonist',
    description: 'Thực ra rất mạnh nhưng giả vờ bình thường',
    personalityTraits: ['thâm trầm', 'lười biếng bề ngoài', 'cực kỳ mạnh'],
    backgroundTemplates: [
      'Ẩn cư sau khi đạt đỉnh phong, bị lôi kéo trở lại',
      'Cao thủ tuyệt thế ngụy trang thành người bình thường'
    ],
    growthArc: 'Từ ẩn danh → lộ thân phận → quay lại đỉnh',
    typicalAbilities: ['Thực lực khủng khiếp', 'Nhân mạch rộng', 'Danh tiếng cũ'],
    weaknesses: ['Kẻ thù cũ quay lại', 'Bảo vệ người thân'],
    catchphrases: ['Ta chỉ muốn sống yên tĩnh...'],
    relationshipPatterns: {},
    goldenFingerType: 'Sức mạnh sẵn có, chờ thời cơ bộc lộ',
    startingCondition: 'fallen',
    motivationType: 'protection',
    growthRate: 'slow_then_fast'
  },

  trash_to_legend: {
    id: 'trash_to_legend',
    name: 'Phế Vật Thành Thần',
    role: 'protagonist',
    description: 'Bị coi là phế vật, thực ra có tiềm năng vô hạn',
    personalityTraits: ['kiên trì', 'ẩn nhẫn', 'bùng nổ khi cần'],
    backgroundTemplates: [
      'Bị chẩn đoán không thể tu luyện, phát hiện thể chất đặc biệt',
      'Bị cả gia tộc khinh thường, được lão quái chọn làm đệ tử'
    ],
    growthArc: 'Từ bị khinh → tích lũy âm thầm → bùng nổ',
    typicalAbilities: ['Thể chất đặc biệt', 'Ngộ tính cao', 'Được cao nhân dạy'],
    weaknesses: ['Xuất phát điểm thấp', 'Nhiều kẻ thù từ đầu'],
    catchphrases: ['Hôm nay ngươi coi ta không ra gì, ngày mai ta sẽ khiến ngươi không thể cao với!'],
    relationshipPatterns: {},
    goldenFingerType: 'Thể chất đặc biệt + cơ duyên liên tục',
    startingCondition: 'crippled',
    motivationType: 'power',
    growthRate: 'explosive'
  }
};

// ==================== ANTAGONIST TEMPLATES ====================

export const ANTAGONIST_TEMPLATES: Record<string, AntagonistTemplate> = {
  arrogant_young_master: {
    id: 'arrogant_young_master',
    name: 'Thiếu Gia Kiêu Ngạo',
    role: 'antagonist',
    description: 'Con nhà giàu, cậy thế ức hiếp người',
    personalityTraits: ['kiêu ngạo', 'tàn nhẫn', 'háo sắc', 'ngu xuẩn'],
    backgroundTemplates: [
      'Thiếu gia của {Thế Lực}, được nuông chiều từ nhỏ',
      'Đệ tử cưng của trưởng lão, quen được bao che'
    ],
    growthArc: 'Kiêu ngạo → bị đánh mặt → gọi backup → bị đánh tiếp → chết',
    typicalAbilities: ['Tài nguyên dồi dào', 'Hộ vệ theo sau', 'Bảo vật gia truyền'],
    weaknesses: ['Thực lực yếu so với background', 'Dễ tức giận', 'Coi thường đối thủ'],
    catchphrases: ['Ngươi biết ta là ai không?!', 'Cha ta sẽ không tha cho ngươi!'],
    relationshipPatterns: {},
    villainType: 'arrogant_young_master',
    threatLevel: 'minor',
    defeatMethod: 'combat'
  },

  scheming_elder: {
    id: 'scheming_elder',
    name: 'Trưởng Lão Âm Mưu',
    role: 'antagonist',
    description: 'Lão già thâm độc, tính toán nhiều đời',
    personalityTraits: ['thâm trầm', 'tàn nhẫn', 'kiên nhẫn', 'tham lam'],
    backgroundTemplates: [
      'Trưởng lão của tông môn, muốn đoạt quyền chưởng môn',
      'Cao thủ ẩn giấu, đứng sau điều khiển mọi thứ'
    ],
    growthArc: 'Ẩn trong bóng tối → lộ mặt → bị lật tẩy → desperate → thất bại',
    typicalAbilities: ['Thực lực cao', 'Nhân mạch rộng', 'Âm mưu phức tạp'],
    weaknesses: ['Quá tự tin', 'Có điểm yếu chí mạng bị giấu'],
    catchphrases: ['Mọi thứ đều trong tính toán của lão phu...'],
    relationshipPatterns: {},
    villainType: 'scheming_elder',
    threatLevel: 'arc_boss',
    defeatMethod: 'expose'
  },

  fallen_genius: {
    id: 'fallen_genius',
    name: 'Thiên Tài Sa Đọa',
    role: 'antagonist',
    description: 'Từng là thiên tài, vì ghen tị/thù hận mà trở thành phản diện',
    personalityTraits: ['ghen tị', 'tự ti trong kiêu ngạo', 'cực đoan'],
    backgroundTemplates: [
      'Sư huynh của MC, từng được coi là thiên tài số một',
      'Rival từ nhỏ của MC, luôn bị MC vượt qua'
    ],
    growthArc: 'Đỉnh cao → bị vượt qua → tha hóa → đối đầu → thất bại/cứu chuộc',
    typicalAbilities: ['Tài năng thực sự', 'Hiểu rõ MC', 'Có thể dự đoán MC'],
    weaknesses: ['Bị ám ảnh bởi MC', 'Tâm ma', 'Không chấp nhận thất bại'],
    catchphrases: ['Tại sao?! Ta mới là thiên tài thực sự!'],
    relationshipPatterns: {},
    villainType: 'jealous_peer',
    threatLevel: 'major',
    defeatMethod: 'combat'
  }
};

// ==================== POWER SYSTEM TEMPLATES ====================

export const POWER_SYSTEMS: Record<string, PowerSystemTemplate> = {
  cultivation_standard: {
    id: 'cultivation_standard',
    name: 'Tu Tiên Chuẩn',
    type: 'cultivation',
    levels: [
      { name: 'Luyện Khí', rank: 1, description: '9 tầng', typicalAbilities: ['Phi kiếm', 'Pháp thuật cơ bản'], breakthroughDifficulty: 'easy' },
      { name: 'Trúc Cơ', rank: 2, description: '9 tầng', typicalAbilities: ['Ngự vật phi hành', 'Pháp thuật trung cấp'], breakthroughDifficulty: 'medium' },
      { name: 'Kim Đan', rank: 3, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Bản mệnh pháp bảo', 'Lôi thuật'], breakthroughDifficulty: 'hard' },
      { name: 'Nguyên Anh', rank: 4, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Nguyên anh xuất khiếu', 'Đại thần thông'], breakthroughDifficulty: 'hard' },
      { name: 'Hóa Thần', rank: 5, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Thần thức bao phủ ngàn dặm', 'Xé không gian'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Hợp Thể', rank: 6, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Thiên địa pháp tướng', 'Đại di chuyển'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Đại Thừa', rank: 7, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Trường sinh', 'Gần chạm thiên đạo'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Độ Kiếp', rank: 8, description: 'Vượt qua thiên kiếp', typicalAbilities: ['Phi thăng tiên giới'], breakthroughDifficulty: 'bottleneck' },
    ],
    specializations: ['Kiếm tu', 'Đan tu', 'Trận tu', 'Ma tu', 'Yêu tu', 'Thể tu'],
    resources: ['Linh thạch', 'Linh đan', 'Pháp bảo', 'Bí tịch', 'Thiên tài địa bảo'],
    limitations: ['Thiên kiếp', 'Tâm ma', 'Thọ mệnh', 'Tài nguyên'],
    breakthroughRequirements: ['Tu vi đủ', 'Cơ duyên', 'Ngộ tính', 'Đan dược hỗ trợ']
  },

  martial_world: {
    id: 'martial_world',
    name: 'Võ Đạo Tiêu Chuẩn',
    type: 'martial',
    levels: [
      { name: 'Hậu Thiên', rank: 1, description: '9 trọng', typicalAbilities: ['Kình lực', 'Kinh mạch thông'], breakthroughDifficulty: 'easy' },
      { name: 'Tiên Thiên', rank: 2, description: '9 trọng', typicalAbilities: ['Chân khí', 'Bay ngắn'], breakthroughDifficulty: 'medium' },
      { name: 'Vương Cấp', rank: 3, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Ý cảnh', 'Vương giả chi khí'], breakthroughDifficulty: 'hard' },
      { name: 'Hoàng Cấp', rank: 4, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Hoàng áp', 'Không chiến'], breakthroughDifficulty: 'hard' },
      { name: 'Đế Cấp', rank: 5, description: 'Sơ-Trung-Hậu kỳ', typicalAbilities: ['Đế uy', 'Xuyên không'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Thánh Cấp', rank: 6, description: 'Bất tử', typicalAbilities: ['Thánh uy', 'Bất diệt'], breakthroughDifficulty: 'bottleneck' },
    ],
    specializations: ['Kiếm đạo', 'Đao đạo', 'Quyền đạo', 'Chưởng đạo', 'Ám khí'],
    resources: ['Võ học bí tịch', 'Linh dược', 'Thần binh', 'Công pháp'],
    limitations: ['Thể chất', 'Ngộ tính', 'Cơ duyên', 'Tài nguyên'],
    breakthroughRequirements: ['Tu luyện đủ', 'Chiến đấu thực tế', 'Ngộ đạo', 'Linh dược']
  },

  urban_awakening: {
    id: 'urban_awakening',
    name: 'Đô Thị Giác Tỉnh',
    type: 'supernatural',
    levels: [
      { name: 'Giác Tỉnh', rank: 1, description: 'Mới có năng lực', typicalAbilities: ['Năng lực sơ cấp'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp D', rank: 2, description: 'Siêu phàm sơ cấp', typicalAbilities: ['Năng lực ổn định'], breakthroughDifficulty: 'easy' },
      { name: 'Cấp C', rank: 3, description: 'Siêu phàm trung cấp', typicalAbilities: ['Năng lực mạnh'], breakthroughDifficulty: 'medium' },
      { name: 'Cấp B', rank: 4, description: 'Siêu phàm cao cấp', typicalAbilities: ['Năng lực khủng'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp A', rank: 5, description: 'Đỉnh cao quốc gia', typicalAbilities: ['Năng lực cấp thảm họa'], breakthroughDifficulty: 'hard' },
      { name: 'Cấp S', rank: 6, description: 'Đứng đầu thế giới', typicalAbilities: ['Năng lực cấp thần'], breakthroughDifficulty: 'bottleneck' },
      { name: 'Cấp SSS', rank: 7, description: 'Siêu việt', typicalAbilities: ['Gần như toàn năng'], breakthroughDifficulty: 'bottleneck' },
    ],
    specializations: ['Lực lượng', 'Tốc độ', 'Tinh thần', 'Nguyên tố', 'Không gian', 'Thời gian'],
    resources: ['Tinh thể năng lượng', 'Vũ khí công nghệ', 'Thuốc tăng cường', 'Thiết bị'],
    limitations: ['Tiêu hao năng lượng', 'Phản phệ', 'Giới hạn thể chất'],
    breakthroughRequirements: ['Chiến đấu sinh tử', 'Tinh thể đặc biệt', 'Ngộ tính']
  }
};

// ==================== GENRE TEMPLATES ====================

export const GENRE_TEMPLATES: Record<GenreType, GenreTemplate> = {
  'tien-hiep': {
    genre: 'tien-hiep',
    name: 'Tu Tiên',
    description: 'Truyện tu tiên với hệ thống cảnh giới, môn phái, bí pháp',

    typicalArcs: [
      {
        name: 'Khởi Đầu - Gia Tộc',
        chapterRange: [1, 30],
        description: 'MC bắt đầu từ gia tộc nhỏ, lộ tài năng, đối mặt thử thách đầu',
        keyEvents: ['Phát hiện golden finger', 'Đánh bại đối thủ trong tộc', 'Vào tông môn'],
        tensionCurve: [30, 40, 50, 70, 90, 60],
        typicalTwists: ['Thân phận bí ẩn manh mối', 'Kẻ thù gia tộc xuất hiện']
      },
      {
        name: 'Tông Môn',
        chapterRange: [31, 100],
        description: 'MC phát triển trong tông môn, cạnh tranh với đồng môn',
        keyEvents: ['Nhập môn', 'Thi đấu nội môn', 'Đột phá cảnh giới', 'Lấy lòng sư phụ'],
        tensionCurve: [40, 50, 60, 70, 85, 95, 50],
        typicalTwists: ['Sư huynh/tỷ là gián điệp', 'Phát hiện bí mật tông môn']
      },
      {
        name: 'Bí Cảnh Mạo Hiểm',
        chapterRange: [101, 200],
        description: 'MC khám phá bí cảnh, thu hoạch cơ duyên lớn',
        keyEvents: ['Vào bí cảnh', 'Gặp nguy hiểm', 'Đại thu hoạch', 'Đánh bại boss bí cảnh'],
        tensionCurve: [50, 70, 80, 90, 95, 60],
        typicalTwists: ['Bí cảnh là di tích của người xưa liên quan MC', 'Gặp được kế thừa']
      }
    ],

    chapterFormula: {
      targetWordCount: 2800,
      minDialogueSegments: 4,
      requiredElements: ['tu luyện tiến bộ', 'xung đột', 'manh mối cốt truyện'],
      forbiddenElements: ['công nghệ hiện đại', 'ngôn ngữ hiện đại quá mức'],
      openingHookType: 'conflict',
      cliffhangerIntensity: 'intense'
    },

    pacingGuide: {
      chapterRanges: [
        { range: [1, 10], pace: 'very_fast', focus: 'hook và setup', dopamineFrequency: 'high' },
        { range: [11, 30], pace: 'fast', focus: 'xây dựng sức mạnh', dopamineFrequency: 'high' },
        { range: [31, 100], pace: 'medium', focus: 'phát triển', dopamineFrequency: 'medium' },
        { range: [101, 200], pace: 'medium', focus: 'mạo hiểm', dopamineFrequency: 'medium' }
      ]
    },

    protagonistTypes: [PROTAGONIST_TEMPLATES.reborn_genius, PROTAGONIST_TEMPLATES.trash_to_legend],
    antagonistTypes: [ANTAGONIST_TEMPLATES.arrogant_young_master, ANTAGONIST_TEMPLATES.scheming_elder],
    supportingTypes: [],

    settingTemplates: [
      {
        id: 'cultivation_sect',
        name: 'Tông Môn Tu Tiên',
        type: 'sect',
        description: 'Môn phái tu tiên với điện các và bí cảnh',
        hierarchyLevels: ['Ngoại môn đệ tử', 'Nội môn đệ tử', 'Chân truyền', 'Trưởng lão', 'Chưởng môn'],
        resources: ['Linh mạch', 'Linh điền', 'Tàng kinh các', 'Luyện đan đường'],
        conflicts: ['Cạnh tranh tài nguyên', 'Chọn truyền nhân', 'Môn phái đối địch'],
        atmosphere: 'Thần bí, cổ xưa, cạnh tranh khốc liệt'
      }
    ],

    powerSystems: [POWER_SYSTEMS.cultivation_standard],

    dopaminePatterns: [
      DOPAMINE_PATTERNS.face_slap,
      DOPAMINE_PATTERNS.breakthrough,
      DOPAMINE_PATTERNS.treasure_gain,
      DOPAMINE_PATTERNS.power_reveal
    ],

    cliffhangerTypes: [
      'Kẻ địch mạnh hơn xuất hiện',
      'Bí mật sắp được tiết lộ',
      'Đột phá bị gián đoạn',
      'Người thân gặp nguy',
      'Bị truy sát'
    ],

    toneKeywords: ['thâm trầm', 'huyền bí', 'bá đạo', 'ngạo thế'],
    avoidKeywords: ['cute', 'kawaii', 'hiện đại'],
    compositionRatio: {
      dialogue: 30,
      description: 35,
      innerThoughts: 20,
      action: 15
    }
  },

  'do-thi': {
    genre: 'do-thi',
    name: 'Đô Thị',
    description: 'Truyện bối cảnh hiện đại, có thể có yếu tố siêu nhiên',

    typicalArcs: [
      {
        name: 'Trở Về/Giác Tỉnh',
        chapterRange: [1, 30],
        description: 'MC trở về hoặc giác tỉnh năng lực, bắt đầu thay đổi cuộc sống',
        keyEvents: ['Sự kiện trigger', 'Thể hiện năng lực đầu', 'Đánh mặt kẻ bắt nạt', 'Gặp nữ chính'],
        tensionCurve: [40, 50, 70, 80, 90, 50],
        typicalTwists: ['Quá khứ bí ẩn', 'Gia đình có bối cảnh']
      },
      {
        name: 'Chinh Phục Thương Trường/Giang Hồ',
        chapterRange: [31, 100],
        description: 'MC xây dựng thế lực, đối đầu các thế lực lớn',
        keyEvents: ['Lập công ty', 'Đánh bại đối thủ', 'Thu phục đàn em', 'Romance phát triển'],
        tensionCurve: [50, 60, 70, 80, 90, 95, 60],
        typicalTwists: ['Kẻ thù lớn lộ mặt', 'Nữ chính gặp nguy']
      }
    ],

    chapterFormula: {
      targetWordCount: 2500,
      minDialogueSegments: 5,
      requiredElements: ['xung đột xã hội', 'thể hiện sức mạnh/tài năng', 'romance hint'],
      forbiddenElements: ['cảnh giới tu tiên', 'phép thuật quá fantasy'],
      openingHookType: 'conflict',
      cliffhangerIntensity: 'medium'
    },

    pacingGuide: {
      chapterRanges: [
        { range: [1, 10], pace: 'very_fast', focus: 'setup và hook', dopamineFrequency: 'high' },
        { range: [11, 50], pace: 'fast', focus: 'xây dựng thế lực', dopamineFrequency: 'high' },
        { range: [51, 100], pace: 'medium', focus: 'mở rộng', dopamineFrequency: 'medium' }
      ]
    },

    protagonistTypes: [PROTAGONIST_TEMPLATES.hidden_expert, PROTAGONIST_TEMPLATES.system_holder],
    antagonistTypes: [ANTAGONIST_TEMPLATES.arrogant_young_master],
    supportingTypes: [],

    settingTemplates: [
      {
        id: 'modern_city',
        name: 'Đô Thị Hiện Đại',
        type: 'city',
        description: 'Thành phố lớn với các thế lực ngầm và công ty tập đoàn',
        hierarchyLevels: ['Dân thường', 'Tiểu thiếu gia', 'Đại thiếu gia', 'Gia chủ', 'Ẩn thế gia tộc'],
        resources: ['Tiền', 'Quyền lực', 'Quan hệ', 'Năng lực đặc biệt'],
        conflicts: ['Thương trường', 'Tình cảm', 'Gia tộc', 'Chính trị ngầm'],
        atmosphere: 'Náo nhiệt, phức tạp, cạnh tranh'
      }
    ],

    powerSystems: [POWER_SYSTEMS.urban_awakening],

    dopaminePatterns: [
      DOPAMINE_PATTERNS.face_slap,
      DOPAMINE_PATTERNS.power_reveal,
      DOPAMINE_PATTERNS.beauty_encounter,
      DOPAMINE_PATTERNS.recognition
    ],

    cliffhangerTypes: [
      'Thân phận bị lộ',
      'Nữ chính gặp nguy',
      'Đối thủ mạnh xuất hiện',
      'Scandal sắp nổ',
      'Bí mật quá khứ'
    ],

    toneKeywords: ['sảng văn', 'hiện đại', 'đô thị', 'phong lưu'],
    avoidKeywords: ['cổ trang', 'tu luyện', 'kiếm thuật'],
    compositionRatio: {
      dialogue: 40,
      description: 25,
      innerThoughts: 20,
      action: 15
    }
  },

  'huyen-huyen': {
    genre: 'huyen-huyen',
    name: 'Huyền Huyễn',
    description: 'Thế giới fantasy với ma pháp, dị thú, và hệ thống sức mạnh độc đáo',

    typicalArcs: [
      {
        name: 'Khởi Điểm',
        chapterRange: [1, 50],
        description: 'MC bắt đầu từ điểm thấp, phát hiện tiềm năng',
        keyEvents: ['Giác tỉnh', 'Tu luyện đầu', 'Thắng thử thách', 'Gia nhập thế lực'],
        tensionCurve: [30, 50, 70, 90, 60],
        typicalTwists: ['Huyết mạch đặc biệt', 'Được cường giả chọn']
      },
      {
        name: 'Học Viện/Tông Môn',
        chapterRange: [51, 150],
        description: 'MC phát triển trong học viện/tông môn',
        keyEvents: ['Thi đấu', 'Đột phá', 'Kết bạn/Kết thù', 'Bí cảnh'],
        tensionCurve: [40, 60, 80, 95, 50],
        typicalTwists: ['Thân phận cao quý bị tiết lộ', 'Âm mưu lớn']
      }
    ],

    chapterFormula: {
      targetWordCount: 2800,
      minDialogueSegments: 4,
      requiredElements: ['chiến đấu/tu luyện', 'nâng cấp sức mạnh', 'world building'],
      forbiddenElements: ['công nghệ hiện đại'],
      openingHookType: 'action',
      cliffhangerIntensity: 'intense'
    },

    pacingGuide: {
      chapterRanges: [
        { range: [1, 20], pace: 'very_fast', focus: 'hook', dopamineFrequency: 'high' },
        { range: [21, 100], pace: 'fast', focus: 'phát triển', dopamineFrequency: 'high' },
        { range: [101, 200], pace: 'medium', focus: 'mở rộng thế giới', dopamineFrequency: 'medium' }
      ]
    },

    protagonistTypes: [PROTAGONIST_TEMPLATES.trash_to_legend, PROTAGONIST_TEMPLATES.system_holder],
    antagonistTypes: [ANTAGONIST_TEMPLATES.arrogant_young_master, ANTAGONIST_TEMPLATES.fallen_genius],
    supportingTypes: [],

    settingTemplates: [
      {
        id: 'magic_continent',
        name: 'Đại Lục Ma Pháp',
        type: 'realm',
        description: 'Đại lục rộng lớn với nhiều đế quốc và thế lực',
        hierarchyLevels: ['Thường dân', 'Chiến sĩ', 'Vương giả', 'Hoàng giả', 'Đế giả', 'Thánh giả'],
        resources: ['Tinh thạch', 'Huyết mạch', 'Thần thú', 'Di tích'],
        conflicts: ['Đế quốc', 'Tông môn', 'Chủng tộc', 'Thần linh'],
        atmosphere: 'Hùng vĩ, bí ẩn, nguy hiểm'
      }
    ],

    powerSystems: [POWER_SYSTEMS.martial_world],

    dopaminePatterns: [
      DOPAMINE_PATTERNS.face_slap,
      DOPAMINE_PATTERNS.breakthrough,
      DOPAMINE_PATTERNS.treasure_gain,
      DOPAMINE_PATTERNS.secret_identity
    ],

    cliffhangerTypes: [
      'Quái vật khủng bố xuất hiện',
      'Sắp đột phá',
      'Kẻ địch truy sát',
      'Bí cảnh mở cửa',
      'Thế lực lớn nhắm đến'
    ],

    toneKeywords: ['huyền bí', 'hoành tráng', 'nhiệt huyết', 'bá khí'],
    avoidKeywords: ['hiện đại', 'khoa học', 'công nghệ'],
    compositionRatio: {
      dialogue: 30,
      description: 35,
      innerThoughts: 15,
      action: 20
    }
  },

  // Các thể loại khác - simplified versions
  'kiem-hiep': {
    genre: 'kiem-hiep',
    name: 'Kiếm Hiệp',
    description: 'Giang hồ, võ lâm, hiệp khách',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 5, requiredElements: [], forbiddenElements: [], openingHookType: 'action', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [POWER_SYSTEMS.martial_world],
    dopaminePatterns: [DOPAMINE_PATTERNS.face_slap, DOPAMINE_PATTERNS.revenge],
    cliffhangerTypes: [],
    toneKeywords: ['hiệp nghĩa', 'giang hồ', 'ân oán'],
    avoidKeywords: ['hiện đại'],
    compositionRatio: { dialogue: 35, description: 30, innerThoughts: 15, action: 20 }
  },

  'dong-nhan': {
    genre: 'dong-nhan',
    name: 'Đồng Nhân',
    description: 'Fanfiction dựa trên tác phẩm nổi tiếng',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'mystery', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.face_slap],
    cliffhangerTypes: [],
    toneKeywords: ['original callbacks', 'twist'],
    avoidKeywords: [],
    compositionRatio: { dialogue: 35, description: 30, innerThoughts: 20, action: 15 }
  },

  'khoa-huyen': {
    genre: 'khoa-huyen',
    name: 'Khoa Huyễn',
    description: 'Khoa học viễn tưởng, vũ trụ, công nghệ',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2800, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'mystery', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain],
    cliffhangerTypes: [],
    toneKeywords: ['công nghệ', 'vũ trụ', 'tương lai'],
    avoidKeywords: ['phép thuật', 'tu luyện'],
    compositionRatio: { dialogue: 30, description: 40, innerThoughts: 15, action: 15 }
  },

  'lich-su': {
    genre: 'lich-su',
    name: 'Lịch Sử',
    description: 'Bối cảnh lịch sử, có thể có yếu tố xuyên không',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2800, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'mystery', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.revenge],
    cliffhangerTypes: [],
    toneKeywords: ['cổ trang', 'quyền mưu', 'triều đình'],
    avoidKeywords: ['hiện đại', 'công nghệ'],
    compositionRatio: { dialogue: 35, description: 35, innerThoughts: 20, action: 10 }
  },

  'quan-truong': {
    genre: 'quan-truong',
    name: 'Quan Trường',
    description: 'Chính trị, thăng tiến quan lộ',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 5, requiredElements: [], forbiddenElements: [], openingHookType: 'conflict', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.recognition, DOPAMINE_PATTERNS.face_slap],
    cliffhangerTypes: [],
    toneKeywords: ['quyền mưu', 'chính trị', 'thăng tiến'],
    avoidKeywords: ['siêu nhiên', 'phép thuật'],
    compositionRatio: { dialogue: 45, description: 25, innerThoughts: 25, action: 5 }
  },

  'vong-du': {
    genre: 'vong-du',
    name: 'Võng Du',
    description: 'Game, thế giới ảo, esports',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'action', cliffhangerIntensity: 'medium' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [PROTAGONIST_TEMPLATES.system_holder],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain],
    cliffhangerTypes: [],
    toneKeywords: ['game', 'level up', 'boss', 'raid'],
    avoidKeywords: [],
    compositionRatio: { dialogue: 30, description: 30, innerThoughts: 20, action: 20 }
  },

  'di-gioi': {
    genre: 'di-gioi',
    name: 'Dị Giới',
    description: 'Xuyên không đến thế giới khác',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2800, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'mystery', cliffhangerIntensity: 'intense' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [PROTAGONIST_TEMPLATES.system_holder, PROTAGONIST_TEMPLATES.reborn_genius],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain],
    cliffhangerTypes: [],
    toneKeywords: ['xuyên không', 'thế giới khác', 'sinh tồn'],
    avoidKeywords: [],
    compositionRatio: { dialogue: 30, description: 35, innerThoughts: 20, action: 15 }
  },

  'mat-the': {
    genre: 'mat-the',
    name: 'Mạt Thế',
    description: 'Ngày tận thế, zombie, sinh tồn',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'action', cliffhangerIntensity: 'intense' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [PROTAGONIST_TEMPLATES.reborn_genius],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [POWER_SYSTEMS.urban_awakening],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal, DOPAMINE_PATTERNS.treasure_gain],
    cliffhangerTypes: [],
    toneKeywords: ['sinh tồn', 'zombie', 'tận thế', 'căng thẳng'],
    avoidKeywords: [],
    compositionRatio: { dialogue: 25, description: 35, innerThoughts: 20, action: 20 }
  },

  'linh-di': {
    genre: 'linh-di',
    name: 'Linh Dị',
    description: 'Kinh dị, ma quỷ, huyền bí',
    typicalArcs: [],
    chapterFormula: { targetWordCount: 2500, minDialogueSegments: 4, requiredElements: [], forbiddenElements: [], openingHookType: 'mystery', cliffhangerIntensity: 'intense' },
    pacingGuide: { chapterRanges: [] },
    protagonistTypes: [],
    antagonistTypes: [],
    supportingTypes: [],
    settingTemplates: [],
    powerSystems: [],
    dopaminePatterns: [DOPAMINE_PATTERNS.power_reveal],
    cliffhangerTypes: [],
    toneKeywords: ['kinh dị', 'ma quỷ', 'huyền bí', 'rùng rợn'],
    avoidKeywords: ['vui vẻ', 'hài hước'],
    compositionRatio: { dialogue: 30, description: 40, innerThoughts: 25, action: 5 }
  }
};

// ==================== HELPER FUNCTIONS ====================

export function getGenreTemplate(genre: GenreType): GenreTemplate {
  return GENRE_TEMPLATES[genre];
}

export function getRandomProtagonist(genre: GenreType): ProtagonistTemplate {
  const template = GENRE_TEMPLATES[genre];
  if (template.protagonistTypes.length === 0) {
    // Return default
    return PROTAGONIST_TEMPLATES.trash_to_legend;
  }
  return template.protagonistTypes[Math.floor(Math.random() * template.protagonistTypes.length)];
}

export function getRandomAntagonist(genre: GenreType): AntagonistTemplate {
  const template = GENRE_TEMPLATES[genre];
  if (template.antagonistTypes.length === 0) {
    return ANTAGONIST_TEMPLATES.arrogant_young_master;
  }
  return template.antagonistTypes[Math.floor(Math.random() * template.antagonistTypes.length)];
}

export function getPowerSystem(genre: GenreType): PowerSystemTemplate {
  const template = GENRE_TEMPLATES[genre];
  if (template.powerSystems.length === 0) {
    return POWER_SYSTEMS.cultivation_standard;
  }
  return template.powerSystems[0];
}

export function getDopaminePattern(type: string): DopaminePattern | undefined {
  return DOPAMINE_PATTERNS[type];
}
