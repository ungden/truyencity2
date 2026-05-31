import type { GenreType } from '../types';

export type GenreContractCode =
  | 'secret_leak'
  | 'public_oracle_service'
  | 'fanfic_no_canon_recall'
  | 'foreknowledge_unused'
  | 'resource_loop_missing'
  | 'territory_build_loop_missing'
  | 'clan_orchestrator_missing'
  | 'pet_bond_missing'
  | 'pet_evolution_process_missing'
  | 'wrong_conflict_channel'
  | 'fantasy_power_world_missing'
  | 'wuxia_jianghu_missing'
  | 'historical_institution_missing'
  | 'sci_fi_constraint_missing'
  | 'game_mechanic_missing'
  | 'apocalypse_resource_base_missing'
  | 'mystery_rule_missing'
  | 'political_policy_missing'
  | 'romance_emotional_contract_missing'
  | 'quick_transmigration_mission_missing';

export interface GenreSignalGroup {
  code: GenreContractCode;
  label: string;
  keywords: string[];
  requiredEveryChapter?: boolean;
  requiredInSetup?: boolean;
  severity: 'moderate' | 'major' | 'critical';
  message: string;
}

export interface GenreForbiddenPattern {
  code: GenreContractCode;
  label: string;
  patterns: RegExp[];
  severity: 'moderate' | 'major' | 'critical';
  message: string;
}

export interface GenreContract {
  genre: GenreType;
  promise: string;
  coreLoop: string;
  chapterMustHave: GenreSignalGroup[];
  setupMustHave: GenreSignalGroup[];
  forbidden: GenreForbiddenPattern[];
  criticChecklist: string[];
}

const SECRET_PATTERNS: RegExp[] = [
  // Leak = MC chủ động NÓI bí mật cho NGƯỜI KHÁC. Bắt buộc có listener bên ngoài
  // ("với/cho + ai") để KHÔNG bắn nhầm narration nội tâm / MC tự suy nghĩ về năng lực
  // (đặc biệt với genre đọc-tâm-tư / quy-tắc-quái-đàm, nơi cảm-nhận-bí-mật là cơ chế lõi).
  /(?:nói|kể|tiết lộ|thú nhận|thừa nhận|chia sẻ|giải thích)\s+(?:với|cho)\s+[^.!?\n]{0,60}(?:hệ thống|bàn tay vàng|kim thủ chỉ|xuyên việt|xuyên không|trọng sinh|kiếp trước|tiền kiếp|thiên cơ bàn|lộ tuyến ẩn|thần nhãn|địa cầu|trái đất|thế giới khác|người tương lai|biết trước)/i,
  /(?:ta|tôi|anh|hắn|y)[^.!?\n]{0,40}(?:có|sở hữu|mang theo)[^.!?\n]{0,60}(?:hệ thống|bàn tay vàng|kim thủ chỉ|thiên cơ bàn|thần nhãn|vô hạn lộ tuyến|ký ức kiếp trước|ký ức tương lai)/i,
  /(?:ngươi|ông|bà|cô|anh|em|họ|bọn họ)[^.!?\n]{0,80}(?:biết|đã biết|phát hiện|nghi ngờ)[^.!?\n]{0,60}(?:hệ thống|xuyên việt|xuyên không|trọng sinh|bí mật của ta|bàn tay vàng|kim thủ chỉ|đến từ địa cầu|đến từ trái đất|thế giới khác|người tương lai)/i,
];

const ORACLE_SERVICE_PATTERNS: RegExp[] = [
  /(?:xem quẻ|gieo quẻ|bói|bói toán|xem bói|phán quẻ|xem vận|xem mệnh|xem phong thủy|bấm quẻ)[^.!?\n]{0,60}(?:cho|giúp)[^.!?\n]{0,40}(?:người lạ|khách qua đường|người qua đường|người đi đường|bà lão|ông lão|người nghèo|miễn phí|không lấy tiền|không lấy phí)/i,
  /(?:mở sạp|lập quầy|ngồi sạp|bày sạp|ngồi quầy)[^.!?\n]{0,60}(?:bói|xem quẻ|xem vận|xem mệnh|xem bói|phong thủy)/i,
  /(?:cứu giúp|giúp đỡ|ra tay giúp|bói quẻ|xem quẻ)[^.!?\n]{0,80}(?:người lạ|khách qua đường|người qua đường|người xa lạ)[^.!?\n]{0,80}(?:không lấy|miễn phí|không lấy tiền|không lấy phí|không cần báo đáp)/i,
];


const NON_COMBAT_DRIFT_PATTERNS: RegExp[] = [
  /huyết chiến|tử chiến|đấu sinh tử|mở đường máu|đánh nhau trong hẻm|truy sát ngoài hẻm/i,
  /(?:xã hội đen|hắc bang|giang hồ)[^.!?\n]{0,80}(?:mai phục|chặn đường|đánh|truy sát)/i,
];

const setup = (code: GenreContractCode, label: string, keywords: string[], message: string): GenreSignalGroup => ({
  code,
  label,
  keywords,
  requiredInSetup: true,
  severity: 'major',
  message,
});

const chapter = (code: GenreContractCode, label: string, keywords: string[], message: string, severity: 'moderate' | 'major' | 'critical' = 'major'): GenreSignalGroup => ({
  code,
  label,
  keywords,
  requiredEveryChapter: true,
  severity,
  message,
});

// setupSoft = NAMED canonical dimension that ENRICHES the spine but is advisory
// (moderate → không hard-block foundation review, chỉ feed AI reviewer report).
// Dùng cho texture/dimension phụ; spine cốt lõi vẫn dùng `setup` (major, hard-block).
const setupSoft = (code: GenreContractCode, label: string, keywords: string[], message: string): GenreSignalGroup => ({
  code,
  label,
  keywords,
  requiredInSetup: true,
  severity: 'moderate',
  message,
});

export const GENRE_CONTRACTS: Record<GenreType, GenreContract> = {
  'do-thi': {
    genre: 'do-thi',
    promise: 'MC dùng năng lực nghề/ngành, dữ liệu, quan hệ và quẻ/hệ thống để tăng tiền, hàng, hợp đồng, uy tín gia đình.',
    coreLoop: 'quẻ/tín hiệu/cơ hội -> suy luận thị trường -> hành động kinh doanh -> tiền/hàng/hợp đồng/uy tín -> mở cơ hội lớn hơn',
    setupMustHave: [
      setup('resource_loop_missing', 'business resource loop', ['doanh thu', 'hợp đồng', 'nguồn hàng', 'lợi nhuận', 'khách hàng', 'thị trường', 'vốn'], 'Đô thị/kinh doanh phải setup vòng tiền-hàng-khách-hợp đồng rõ.'),
      setup('resource_loop_missing', 'named profession/industry', ['nghề', 'ngành', 'công ty', 'cửa hàng', 'studio', 'nhà hàng', 'xưởng', 'thương hiệu', 'phòng khám', 'quán'], 'Đô thị phải NÊU TÊN nghề/ngành/cơ sở kinh doanh cụ thể của MC (studio, nhà hàng, công ty, phòng khám...), không chung chung "làm ăn".'),
      setupSoft('resource_loop_missing', 'data/signal advantage source', ['quẻ', 'hệ thống', 'dữ liệu', 'bàn tay vàng', 'tín hiệu', 'mô phỏng', 'phân tích', 'trí nhớ', 'kinh nghiệm'], 'Nên nêu nguồn lợi thế (quẻ/hệ thống/dữ liệu/kinh nghiệm) mà MC dùng để đọc thị trường.'),
    ],
    chapterMustHave: [
      chapter('resource_loop_missing', 'visible business/resource payoff', ['doanh thu', 'hợp đồng', 'nguồn hàng', 'lợi nhuận', 'đơn hàng', 'khách hàng', 'kho', 'hàng hóa', 'đặt cọc'], 'Chương đô thị phải có payoff tài nguyên/kinh doanh/uy tín cụ thể, không chỉ áp lực hoặc cứu người.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'golden finger leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ hệ thống/quẻ/bí mật cho người khác.' },
      { code: 'public_oracle_service', label: 'public oracle service', patterns: ORACLE_SERVICE_PATTERNS, severity: 'major', message: 'Quẻ/huyền học bị biến thành dịch vụ công ích cho người lạ thay vì công cụ gom tài nguyên cho MC.' },
      { code: 'wrong_conflict_channel', label: 'non-combat genre physical violence', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Đô thị/kinh doanh lệch sang combat/hắc bang; conflict phải qua thị trường, hợp đồng, pháp lý, PR.' },
    ],
    criticChecklist: ['Mỗi quẻ/tín hiệu phải chuyển thành lợi ích đo được.', 'Không bói miễn phí cho người lạ.', 'Đối thủ phản ứng qua thị trường/hợp đồng, không truy sát.', 'Dùng signature trope đô thị (lật kèo deal / ra mắt sản phẩm chấn động / bị coi thường → công nhận ngược / M&A-chiến giá), face-slap qua số liệu không bạo lực.'],
  },
  'dong-nhan': {
    genre: 'dong-nhan',
    promise: 'MC dùng canon/meta knowledge để can thiệp sự kiện quen thuộc, tạo butterfly effect và khiến nhân vật canon phản ứng mới.',
    coreLoop: 'recognized canon setup -> MC recall/meta plan -> intervention -> canon character reaction -> divergence consequence',
    setupMustHave: [
      setup('fanfic_no_canon_recall', 'canon grammar', ['canon', 'nguyên tác', 'Đường Tam', 'Vũ Hồn Điện', 'Đại Sư', 'route', 'butterfly', 'cốt truyện gốc'], 'Đồng nhân phải setup canon/route/nguyên tác cụ thể để reader nhận ra.'),
      setupSoft('fanfic_no_canon_recall', 'named divergence point', ['biến số', 'điểm rẽ', 'lệch tuyến', 'butterfly', 'mốc thời gian', 'thời điểm nhập', 'kịch bản gốc', 'tiếng lòng'], 'Nên nêu MỐC nhập canon + cơ chế lệch tuyến (butterfly) HOẶC cơ chế đọc-tiếng-lòng để reader định vị.'),
    ],
    chapterMustHave: [
      // dong-nhan bao trùm CẢ fanfic-IP LẪN topic đọc-tiếng-lòng (dong-nhan-doc-tieng-long, Phase 20A).
      // Thêm nhóm keyword mind-reading như NHÁNH THỎA THAY THẾ: chương fanfic thật vẫn pass bằng canon
      // recall; chương đọc-tiếng-lòng pass bằng "tiếng lòng/tâm thanh/nội tâm". Fantasy generic (không có
      // cả hai nhóm) vẫn bị flag như cũ.
      chapter('fanfic_no_canon_recall', 'canon recall/reaction', ['nguyên tác', 'canon', 'cốt truyện gốc', 'Đường Tam', 'Vũ Hồn Điện', 'Đại Sư', 'butterfly', 'biến số', 'tuyến', 'tiếng lòng', 'tâm thanh', 'nội tâm', 'đọc được suy nghĩ', 'đọc vị'], 'Chương đồng nhân phải có canon recall/phản ứng nhân vật canon HOẶC khai thác đọc-tiếng-lòng, không được thành fantasy generic.'),
      chapter('foreknowledge_unused', 'foreknowledge exploitation', ['biết trước', 'nhớ rõ', 'theo nguyên tác', 'đáng lẽ', 'trước khi', 'cơ duyên', 'quẻ', 'tọa độ', 'tiếng lòng', 'tâm thanh', 'nội tâm', 'đọc được suy nghĩ', 'đọc vị', 'âm thanh trong lòng'], 'MC đồng nhân phải dùng biết trước/meta knowledge HOẶC đọc-tiếng-lòng để lấy cơ duyên hoặc né nguy hiểm.'),
    ],
    forbidden: [
      // moderate (không phải critical): đồng nhân bao gồm topic đọc-tiếng-lòng, nơi cảm-nhận-suy-nghĩ
      // người khác LÀ cơ chế lõi → narration nội tâm không phải leak. Chỉ cảnh báo khi MC NÓI bí mật ra.
      { code: 'secret_leak', label: 'meta/golden finger leak', patterns: SECRET_PATTERNS, severity: 'moderate', message: 'MC để lộ xuyên việt/hệ thống/meta knowledge cho nhân vật trong truyện.' },
    ],
    criticChecklist: ['Có callback canon/nguyên tác.', 'Có can thiệp làm lệch tuyến hoặc lấy cơ duyên.', 'Nhân vật canon phản ứng theo tính cách đã biết.', 'Dùng signature trope đồng nhân (nhập canon then chốt đổi kịch bản / dùng foreknowledge đón đầu kiếp nạn / butterfly lệch tuyến có hệ quả), không thành fantasy generic.'],
  },
  'di-gioi': {
    genre: 'di-gioi',
    promise: 'MC dùng kiến thức hiện đại/tài nguyên đặc thù để xây lãnh địa, sản xuất, thương mại và governance.',
    coreLoop: 'resource/culture gap -> technical adaptation -> production/trade payoff -> territory upgrade -> faction reaction',
    setupMustHave: [
      setup('territory_build_loop_missing', 'named territory/settlement', ['lãnh địa', 'bộ lạc', 'thành', 'lãnh thổ', 'vương quốc', 'làng', 'phong ấp', 'cứ điểm', 'dân'], 'Dị giới phải NÊU TÊN lãnh địa/bộ lạc/cứ điểm cụ thể MC gây dựng, không chung chung "vùng đất".'),
      setup('territory_build_loop_missing', 'production/economy loop', ['sản lượng', 'mỏ', 'xưởng', 'thuế', 'thương mại', 'thương hội', 'canh tác', 'luyện kim', 'kho'], 'Dị giới lãnh chúa phải setup vòng tài nguyên-sản xuất-thuế-thương mại đo được.'),
      setupSoft('territory_build_loop_missing', 'tech-uplift/governance', ['công nghệ', 'kiến thức', 'bản thiết kế', 'cải tiến', 'quý tộc', 'sắc phong', 'quản lý', 'chế tạo'], 'Nên có đòn bẩy tri thức hiện đại/tech-uplift hoặc nấc thang quý tộc/governance.'),
    ],
    chapterMustHave: [
      chapter('territory_build_loop_missing', 'territory production payoff', ['sản lượng', 'mỏ', 'xưởng', 'muối', 'dân', 'thương đội', 'doanh thu', 'kho', 'thuế', 'lãnh địa', 'bản thiết kế'], 'Chương lãnh chúa/dị giới phải tiến một chỉ số lãnh địa/sản xuất/thương mại cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'system/transmigration leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ xuyên việt/hệ thống/kiến thức hiện đại là bí mật.' },
    ],
    criticChecklist: ['Có tiến độ sản xuất/lãnh địa đo được.', 'Người ngoài chỉ thấy MC thông minh/may mắn.', 'Đối thủ chú ý theo thành tích, không tự nhiên biết bí mật.', 'Dùng signature trope dị giới (xây lãnh địa từ số 0 / tech uplift canh tác-luyện kim / chinh phục-liên minh bộ lạc / chống quái thú triều / thương đoàn xuyên vương quốc / leo bậc quý tộc).'],
  },
  'tien-hiep': {
    genre: 'tien-hiep',
    promise: 'MC tiến cảnh giới/tài nguyên/đạo nghiệp theo luật tu tiên rõ, với bí mật/golden finger được che kín.',
    coreLoop: 'cultivation constraint -> resource/person investment -> breakthrough or asset gain -> social reaction -> larger realm/sect pressure',
    setupMustHave: [
      setup('resource_loop_missing', 'named cảnh giới ladder', ['cảnh giới', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'hóa thần', 'tầng', 'trọng', 'kỳ'], 'Tiên hiệp phải NÊU TÊN thang cảnh giới cụ thể (Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh...), không chỉ "tu luyện tăng tiến" chung chung.'),
      setup('resource_loop_missing', 'named sect/clan hierarchy', ['tông môn', 'gia tộc', 'môn phái', 'tông phái', 'trưởng lão', 'tông chủ', 'gia chủ', 'đệ tử', 'chân truyền'], 'Tiên hiệp phải có tông môn/gia tộc CÓ TÊN + vai trò phân cấp (tông chủ/trưởng lão/đệ tử chân truyền).'),
      setupSoft('resource_loop_missing', 'đan/khí resource system', ['linh thạch', 'đan dược', 'đan phương', 'linh mạch', 'công pháp', 'pháp bảo', 'linh thảo', 'phẩm cấp'], 'Nên có hệ tài nguyên đan/khí/pháp bảo phân phẩm cấp rõ.'),
    ],
    chapterMustHave: [
      chapter('resource_loop_missing', 'cultivation/resource payoff', ['cảnh giới', 'đột phá', 'linh thạch', 'linh mạch', 'đan dược', 'công pháp', 'tộc vận', 'hậu bối', 'gia tộc'], 'Chương tiên hiệp phải tăng tài nguyên/tu vi/công pháp/gia tộc hoặc đóng một bước tu luyện rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'system leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ hệ thống/thần nhãn/bí mật xuyên không.' },
    ],
    criticChecklist: ['Có tài nguyên/cảnh giới/công pháp cụ thể.', 'Không lộ hệ thống.', 'Nếu là gia tộc, MC ưu tiên điều phối hậu bối/tài sản hơn tự tay đánh tiểu lâu la.', 'Dùng signature trope tiên hiệp đúng cadence (đại hội tỉ thí / bí cảnh / đan-luyện khí đại hội / đấu giá hội / thiên kiếp), không tu luyện đơn điệu.'],
  },
  'ngu-thu-tien-hoa': {
    genre: 'ngu-thu-tien-hoa',
    promise: 'MC dùng tuyến tiến hóa ẩn, chăm sóc/training và vật liệu đúng để biến linh thú yếu thành át chủ bài.',
    coreLoop: 'beast problem -> bond/care/research -> material recipe -> evolution/skill payoff -> market/pro reaction',
    setupMustHave: [
      setup('pet_bond_missing', 'named beast + contract', ['linh thú', 'khế ước', 'thú', 'sủng thú', 'ngự thú', 'huyết mạch', 'chủng'], 'Ngự thú phải có thú khế ước CÓ TÊN/chủng loại + cơ chế khế ước, không chỉ "con thú".'),
      setup('pet_evolution_process_missing', 'evolution route/material system', ['tiến hóa', 'tiến hoá', 'lộ tuyến', 'vật liệu', 'bồi dưỡng', 'công thức', 'giác tỉnh', 'kỹ năng'], 'Ngự thú phải setup lộ tuyến tiến hóa + vật liệu/công thức/kỹ năng rõ.'),
    ],
    chapterMustHave: [
      chapter('pet_bond_missing', 'pet bond/personality', ['linh thú', 'khế ước', 'tin tưởng', 'rúc vào', 'gầm gừ', 'cọ vào', 'bond', 'trung thành', 'phản ứng'], 'Chương ngự thú cần linh thú có phản ứng/tính cách/bond, không chỉ là skill list.'),
      chapter('pet_evolution_process_missing', 'evolution/training process', ['tiến hóa', 'lộ tuyến', 'vật liệu', 'bồi dưỡng', 'kỹ năng', 'huấn luyện', 'huyết mạch', 'công thức'], 'Chương ngự thú cần process chăm sóc/huấn luyện/vật liệu/tiến hóa rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'hidden route leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ năng lực nhìn tuyến tiến hóa ẩn.' },
    ],
    criticChecklist: ['Linh thú có tính cách/bond.', 'Có công thức/vật liệu/training cụ thể.', 'Payoff là tiến hóa/kỹ năng/phản ứng chuyên môn.', 'Dùng signature trope ngự thú (thuần thú khế ước mới / giác tỉnh huyết mạch ẩn / thi đấu pet-vs-pet / đoạt trứng cấm khu / đấu giá thú-vật liệu), combat là pet đấu pet không MC tay đôi.'],
  },
  'huyen-huyen': {
    genre: 'huyen-huyen',
    promise: 'MC khai thác một hệ sức mạnh/luật thế giới cụ thể, mở rộng từ địa vực nhỏ lên đại lục/thượng giới.',
    coreLoop: 'world law pressure -> unique path/resource -> power/social payoff -> new territory/faction opens',
    setupMustHave: [
      setup('fantasy_power_world_missing', 'named power tier ladder', ['cấp bậc', 'huyết mạch', 'linh lực', 'đẳng cấp', 'bậc', 'tinh', 'vương', 'tôn', 'đế', 'giai'], 'Huyền huyễn phải NÊU TÊN thang đẳng cấp sức mạnh (vd ...Vương → Tôn → Đế), không chỉ "mạnh lên".'),
      setup('fantasy_power_world_missing', 'named geography/faction', ['đại lục', 'học viện', 'tông tộc', 'thánh địa', 'đế tộc', 'vương triều', 'gia tộc', 'thế lực'], 'Huyền huyễn phải có đại lục/học viện/thánh địa/đế tộc CÓ TÊN + thế lực phân tầng.'),
      setupSoft('fantasy_power_world_missing', 'resource/relic system', ['di tích', 'ma thú', 'tài nguyên', 'thần binh', 'bảo vật', 'cơ duyên', 'đan', 'huyết mạch'], 'Nên có hệ tài nguyên/di tích/thần binh/cơ duyên rõ.'),
    ],
    chapterMustHave: [
      chapter('fantasy_power_world_missing', 'power/world progression payoff', ['huyết mạch', 'cấp bậc', 'linh lực', 'di tích', 'ma thú', 'tông tộc', 'đại lục', 'tài nguyên'], 'Chương huyền huyễn phải tiến hệ sức mạnh, tài nguyên, địa vực hoặc faction rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'artifact/bloodline secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ nguồn gốc cheat/huyết mạch/cổ vật quá sớm.' },
    ],
    criticChecklist: ['Có luật sức mạnh cụ thể.', 'Có tài nguyên/địa vực/faction mới hoặc payoff.', 'Không nhảy boss thượng giới quá sớm.', 'Dùng signature trope huyền huyễn (thiên kiêu bảng tranh phong / viễn cổ di tích khai mở / huyết mạch giác tỉnh / đế tộc truy sát / vạn tộc tranh bảo).'],
  },
  'kiem-hiep': {
    genre: 'kiem-hiep',
    promise: 'MC giải quyết ân oán giang hồ bằng võ công, nghĩa khí, điều tra và danh dự, không biến thành tiên hiệp jargon.',
    coreLoop: 'jianghu oath/problem -> investigation/duel -> moral choice -> reputation/skill payoff',
    setupMustHave: [
      setup('wuxia_jianghu_missing', 'named sect/faction', ['môn phái', 'bang phái', 'giang hồ', 'Thiếu Lâm', 'Võ Đang', 'Cái Bang', 'bang', 'phái', 'minh chủ'], 'Kiếm hiệp phải có môn phái/bang phái CÓ TÊN + cục diện võ lâm, không chỉ "giang hồ" chung.'),
      setup('wuxia_jianghu_missing', 'named martial system', ['võ công', 'kiếm pháp', 'nội công', 'chiêu thức', 'tâm pháp', 'tuyệt học', 'bí kíp', 'khinh công'], 'Kiếm hiệp phải có võ công/tâm pháp/tuyệt học CÓ TÊN tăng theo luyện tập-thực chiến.'),
      setupSoft('wuxia_jianghu_missing', 'grievance/honor spine', ['ân oán', 'huyết cừu', 'báo thù', 'nghĩa khí', 'danh dự', 'thâm cừu'], 'Nên có spine ân oán/báo thù/nghĩa khí làm động cơ xuyên suốt.'),
    ],
    chapterMustHave: [
      chapter('wuxia_jianghu_missing', 'jianghu martial payoff', ['giang hồ', 'võ công', 'kiếm pháp', 'chiêu thức', 'môn phái', 'ân oán', 'danh dự', 'bí kíp'], 'Chương kiếm hiệp phải có võ học/ân oán/danh dự hoặc tiến triển danh tiếng giang hồ.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'xianxia leak into wuxia', patterns: [/nguyên anh|kim đan|trúc cơ|luyện khí|pháp bảo|linh thạch/i], severity: 'major', message: 'Kiếm hiệp bị leak tiên hiệp/cảnh giới tu chân nặng.' },
      { code: 'secret_leak', label: 'hidden martial secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ bí mật/tâm pháp/golden finger quá dễ.' },
    ],
    criticChecklist: ['Combat phải có chiêu thức/body movement.', 'Conflict theo ân oán/danh dự/giang hồ.', 'Không dùng cảnh giới tiên hiệp thay võ công.', 'Dùng signature trope kiếm hiệp (tỉ võ-lôi đài / tranh đoạt bí kíp / huyết hải báo thù / minh chủ đại hội / kỳ ngộ liệu thương), giữ subplot ân oán xuyên suốt.'],
  },
  'lich-su': {
    genre: 'lich-su',
    promise: 'MC dùng hiểu biết, hậu cần, thể chế và cải cách nhỏ để đổi cục diện trong bối cảnh lịch sử/giả sử.',
    coreLoop: 'historical constraint -> practical reform/logistics -> local payoff -> political/military consequence',
    setupMustHave: [
      setup('historical_institution_missing', 'named era/institution', ['triều', 'quan phủ', 'quan chế', 'huyện', 'phủ', 'triều đình', 'hoàng đế', 'khoa cử', 'quận'], 'Lịch sử phải định vị triều đại/thể chế CÓ TÊN + cơ cấu quan chế, không "thời xưa" chung.'),
      setup('historical_institution_missing', 'logistics/policy instrument', ['thuế', 'lương thực', 'quân', 'binh', 'hộ tịch', 'chính sách', 'kho', 'điền', 'lương'], 'Lịch sử phải có đòn bẩy hậu cần/chính sách (thuế-lương-quân-hộ tịch) cụ thể.'),
      setupSoft('historical_institution_missing', 'statecraft conflict', ['phe', 'mưu phản', 'biên quan', 'chiến sự', 'cải cách', 'triều nghị', 'ngoại thích'], 'Nên có trục xung đột chính sự (phe phái/biên quan/cải cách/ngoại thích).'),
    ],
    chapterMustHave: [
      chapter('historical_institution_missing', 'institution/logistics payoff', ['quan phủ', 'thuế', 'lương thực', 'quân', 'huyện', 'chính sách', 'dân', 'kho', 'hộ tịch'], 'Chương lịch sử phải có payoff thể chế/hậu cần/chính sách/nhân tâm cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'future/transmigration leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ xuyên việt/trọng sinh/biết trước lịch sử.' },
    ],
    criticChecklist: ['Có chi tiết thời đại/thể chế.', 'Payoff đến từ hậu cần/chính sách/nhân tâm.', 'Không phát minh mọi thứ vô hạn hoặc phá logic thời đại.', 'Dùng signature trope lịch sử (triều nghị tranh biện / khoa cử thăng quan / biên quan chiến sự / cung đấu ngoại thích / cải cách chấn động / sứ thần bang giao).'],
  },
  'khoa-huyen': {
    genre: 'khoa-huyen',
    promise: 'MC khai thác một nguyên lý công nghệ/khoa học có giới hạn, tạo dữ liệu/prototype và mở rộng hệ thống.',
    coreLoop: 'technical anomaly -> hypothesis/test -> constraint payoff -> wider system risk',
    setupMustHave: [
      setup('sci_fi_constraint_missing', 'named tech principle', ['công nghệ', 'AI', 'năng lượng', 'thuật toán', 'giao thức', 'cơ chế', 'nguyên lý', 'hệ thống', 'mô phỏng'], 'Khoa huyễn phải NÊU TÊN công nghệ/nguyên lý lõi MC khai thác, không "khoa học" chung.'),
      setup('sci_fi_constraint_missing', 'constraint/verification', ['giới hạn', 'dữ liệu', 'thí nghiệm', 'kiểm chứng', 'prototype', 'rủi ro', 'chi phí', 'tham số'], 'Khoa huyễn phải có GIỚI HẠN + cơ chế kiểm chứng (dữ liệu/prototype), không ma pháp vô hạn.'),
    ],
    chapterMustHave: [
      chapter('sci_fi_constraint_missing', 'technical proof payoff', ['dữ liệu', 'thí nghiệm', 'prototype', 'AI', 'năng lượng', 'mô phỏng', 'thuật toán', 'kiểm chứng'], 'Chương khoa huyễn phải có kiểm chứng, dữ liệu, prototype hoặc constraint payoff.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'glitch/tech secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ năng lực/glitch/biết trước công nghệ quá dễ.' },
    ],
    criticChecklist: ['Có nguyên lý kỹ thuật và giới hạn.', 'Payoff được chứng minh bằng dữ liệu/prototype.', 'Không biến tech thành ma pháp vô hạn.', 'Dùng signature trope khoa huyễn (đột phá phát minh chấn động ngành / demo trước hội đồng-nhà đầu tư / gián điệp công nghiệp / AI vượt kiểm soát / giải cứu khủng hoảng kỹ thuật).'],
  },
  'vong-du': {
    genre: 'vong-du',
    promise: 'MC thắng nhờ hiểu cơ chế game, build, timing, market và guild/rank ladder.',
    coreLoop: 'mechanic read -> build/resource choice -> instance/pvp/market payoff -> meta escalates',
    setupMustHave: [
      setup('game_mechanic_missing', 'named game system', ['server', 'class', 'skill', 'build', 'level', 'phó bản', 'nghề', 'thuộc tính', 'cơ chế'], 'Võng du phải NÊU TÊN game/class/cơ chế lõi (nghề, hệ kỹ năng, bản đồ), không "một game" chung.'),
      setup('game_mechanic_missing', 'progression + economy/rank', ['boss', 'loot', 'guild', 'rank', 'bảng xếp hạng', 'trang bị', 'market', 'phó bản', 'đấu trường'], 'Võng du phải có progression (boss/phó bản/loot) + economy/rank (market/guild/bảng xếp hạng).'),
    ],
    chapterMustHave: [
      chapter('game_mechanic_missing', 'gameplay payoff', ['level', 'skill', 'build', 'boss', 'loot', 'phó bản', 'guild', 'rank', 'market', 'trang bị'], 'Chương võng du phải có payoff gameplay/build/loot/rank/market cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'rebirth/meta leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/meta/late-game knowledge.' },
    ],
    criticChecklist: ['Có cơ chế game cụ thể.', 'MC thắng bằng build/timing/economy.', 'Không hack vô hạn làm mất luật game.', 'Dùng signature trope võng du (first-clear phó bản server-first / công thành chiến-PK lớn / ẩn nghề-thần khí drop hiếm / leo top bảng + IRL fame / giải e-sport livestream).'],
  },
  'mat-the': {
    genre: 'mat-the',
    promise: 'MC sống sót bằng chuẩn bị, tài nguyên, căn cứ, đội nhóm và quyết định khó trong thảm họa.',
    coreLoop: 'scarcity/threat -> plan/risk -> resource/base payoff -> bigger survival pressure',
    setupMustHave: [
      setup('apocalypse_resource_base_missing', 'named disaster threat', ['thảm họa', 'zombie', 'dịch', 'tận thế', 'biến dị', 'quái', 'sóng', 'thiên tai', 'phóng xạ'], 'Mạt thế phải NÊU TÊN dạng thảm họa/threat cụ thể (zombie/biến dị/thiên tai...), không "nguy hiểm" chung.'),
      setup('apocalypse_resource_base_missing', 'survival resource/base', ['tài nguyên', 'nước', 'thức ăn', 'thuốc', 'căn cứ', 'kho', 'nhiên liệu', 'đội', 'hầm'], 'Mạt thế phải có spine tài nguyên sinh tồn + căn cứ/đội nhóm/kho.'),
    ],
    chapterMustHave: [
      chapter('apocalypse_resource_base_missing', 'survival resource/base payoff', ['nước', 'thức ăn', 'thuốc', 'nhiên liệu', 'kho', 'căn cứ', 'hàng rào', 'đội', 'vùng an toàn'], 'Chương mạt thế phải tăng tài nguyên/căn cứ/an toàn/đội nhóm hoặc đóng một threat sinh tồn.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'future/shelter secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ biết trước mạt thế/kho/hầm trú ẩn quá sớm.' },
    ],
    criticChecklist: ['Có ledger tài nguyên/căn cứ.', 'Threat phục vụ resource logic.', 'Không bạo lực vô nghĩa không payoff.', 'Dùng signature trope mạt thế (bùng phát-biến dị khởi đầu / tranh đoạt-tích trữ vật tư / phòng thủ căn cứ trước sóng quái / nội bộ phản bội tranh quyền / tiến hóa-dị năng giác tỉnh).'],
  },
  'linh-di': {
    genre: 'linh-di',
    promise: 'MC đọc manh mối, quy luật dị thường và giải case bằng suy luận/ritual, không chỉ la hét/combat.',
    coreLoop: 'anomaly -> clue/rule hypothesis -> risky test -> partial answer -> deeper mystery',
    setupMustHave: [
      setup('mystery_rule_missing', 'named anomaly/case type', ['dị thường', 'quái dị', 'oan hồn', 'lời nguyền', 'cấm kỵ', 'án', 'hiện tượng', 'u linh', 'tà'], 'Linh dị phải NÊU TÊN dạng dị thường/loại án (oan hồn/lời nguyền/cấm kỵ làng quê...), không "ma quái" chung.'),
      setup('mystery_rule_missing', 'clue/rule/ritual method', ['manh mối', 'điều tra', 'hồ sơ', 'nghi thức', 'quy tắc', 'suy luận', 'khám nghiệm', 'trấn yểm', 'phong thủy'], 'Linh dị phải có phương pháp manh mối/quy tắc/nghi thức để MC suy luận-giải, không chỉ la hét.'),
    ],
    chapterMustHave: [
      chapter('mystery_rule_missing', 'clue/rule payoff', ['manh mối', 'quy tắc', 'cấm kỵ', 'dị thường', 'hồ sơ', 'nghi thức', 'suy luận', 'dấu vết'], 'Chương linh dị phải có manh mối/quy tắc/suy luận hoặc partial answer.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'horror combat drift', patterns: [/đấm bay ma|chém chết quỷ|solo quái|đánh quái như/i], severity: 'major', message: 'Linh dị bị combat hóa; phải giải bằng luật/manh mối/nghi thức.' },
      // moderate (không phải critical): với linh dị, cảm-nhận/hành-động-trên dị thường LÀ cơ chế lõi.
      // Chỉ cảnh báo khi MC thực sự NÓI bí mật cho người khác (SECRET_PATTERNS đã siết yêu cầu listener).
      { code: 'secret_leak', label: 'spiritual secret leak', patterns: SECRET_PATTERNS, severity: 'moderate', message: 'MC để lộ năng lực/bí mật dị thường quá sớm.' },
    ],
    criticChecklist: ['Mỗi chương trả ít nhất một manh mối thật.', 'Nỗi sợ đến từ rule/case, không jump scare rỗng.', 'Không combat hóa ma quái.', 'Dùng signature trope linh dị (nhận án-uỷ thác điều tra / nghi thức trừ tà-trấn yểm / ngỗ tác khám nghiệm procedural / cấm kỵ dân gian / giải oan / nhập mộ-cổ trạch thám hiểm).'],
  },
  'quan-truong': {
    genre: 'quan-truong',
    promise: 'MC leo chính trường bằng hồ sơ, chính sách, bằng chứng, mạng lưới và xử lý vấn đề dân sinh.',
    coreLoop: 'institutional problem -> evidence/network play -> policy payoff -> higher political pressure',
    setupMustHave: [
      setup('political_policy_missing', 'named office/post', ['chức vụ', 'ủy ban', 'cấp trên', 'huyện', 'sở', 'cục', 'bí thư', 'chủ tịch', 'phòng ban', 'cơ quan'], 'Quan trường phải NÊU TÊN chức vụ/cơ quan cụ thể của MC + cấp bậc, không "làm quan" chung.'),
      setup('political_policy_missing', 'policy/evidence instrument', ['hồ sơ', 'chính sách', 'ngân sách', 'bằng chứng', 'quy trình', 'văn bản', 'dự án', 'báo cáo'], 'Quan trường phải có công cụ thể chế (hồ sơ/chính sách/bằng chứng/dự án) làm đòn bẩy.'),
      setupSoft('political_policy_missing', 'network/faction', ['phe phái', 'chống lưng', 'liên minh', 'thanh tra', 'quan hệ', 'hậu thuẫn', 'mạng lưới'], 'Nên có sơ đồ phe phái/chống lưng/network risk.'),
    ],
    chapterMustHave: [
      chapter('political_policy_missing', 'policy/evidence payoff', ['hồ sơ', 'chính sách', 'ngân sách', 'dân sinh', 'bằng chứng', 'cấp trên', 'quy trình', 'thanh tra'], 'Chương quan trường phải có payoff chính sách/hồ sơ/bằng chứng/network, không phải đánh nhau.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'officialdom violence drift', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Quan trường lệch sang bạo lực/hắc bang; conflict phải qua thể chế, hồ sơ, thanh tra, network.' },
      { code: 'secret_leak', label: 'future memory leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/biết trước chính sách.' },
    ],
    criticChecklist: ['Có hồ sơ/chính sách/bằng chứng.', 'Đối thủ vận hành qua thể chế/network.', 'Không biến thành combat hoặc gangster.', 'Dùng signature trope quan trường (thăng chức-điều động bất ngờ / dự án ghi điểm / phe phái gài bẫy qua văn bản / chống tham nhũng-thanh tra / cứu sự cố dân sinh).'],
  },
  'ngon-tinh': {
    genre: 'ngon-tinh',
    promise: 'Quan hệ tiến triển bằng agency, ranh giới, vulnerability và payoff cảm xúc/sự nghiệp rõ.',
    coreLoop: 'emotional/social problem -> agency choice -> relationship/career payoff -> deeper vulnerability',
    setupMustHave: [
      setup('romance_emotional_contract_missing', 'named relationship dynamic', ['quan hệ', 'hôn nhân', 'hợp đồng', 'thanh mai', 'tổng tài', 'theo đuổi', 'hiểu lầm', 'tình địch', 'môn đăng'], 'Ngôn tình phải định danh KIỂU quan hệ/dynamic (hôn nhân hợp đồng/tổng tài-trợ lý/thanh mai...), không "yêu nhau" chung.'),
      setup('romance_emotional_contract_missing', 'agency + relationship ladder', ['agency', 'lựa chọn', 'ranh giới', 'tin tưởng', 'sự nghiệp', 'danh tiếng', 'vulnerability', 'tổn thương', 'cam kết'], 'Ngôn tình phải có agency + ranh giới + thang tiến triển quan hệ/sự nghiệp.'),
    ],
    chapterMustHave: [
      chapter('romance_emotional_contract_missing', 'relationship/agency payoff', ['tin tưởng', 'ranh giới', 'hiểu lầm', 'lựa chọn', 'sự nghiệp', 'gia đình', 'danh tiếng', 'tình cảm'], 'Chương ngôn tình phải đổi trạng thái quan hệ/cảm xúc/agency hoặc sự nghiệp, không chỉ drama lặp.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'romance violence drift', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Ngôn tình lệch sang combat/hắc bang; conflict phải qua cảm xúc, gia đình, xã hội, sự nghiệp.' },
      { code: 'secret_leak', label: 'rebirth/system secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/hệ thống quá sớm.' },
    ],
    criticChecklist: ['Có agency và ranh giới.', 'Hiểu lầm phải có bằng chứng/tiến triển.', 'Không romanticize toxic behavior không phản tư.', 'Dùng signature trope ngôn tình (gặp gỡ định mệnh-hiểu lầm ban đầu / tình địch xen vào / chăm sóc lúc yếu đuối / môn đăng hộ đối phản đối / chia ly hiểu lầm → đoàn tụ / cột mốc cam kết).'],
  },
  'quy-tac-quai-dam': {
    genre: 'quy-tac-quai-dam',
    promise: 'MC sống sót bằng đọc luật, phân biệt rule thật/giả, test mạo hiểm và giải puzzle phó bản.',
    coreLoop: 'ruleset -> contradiction -> risky test -> survival payoff -> deeper ruleset',
    setupMustHave: [
      setup('mystery_rule_missing', 'named ruleset/instance', ['quy tắc', 'điều khoản', 'cấm kỵ', 'bảng luật', 'phó bản', 'vòng lặp', 'không gian', 'nhiệm vụ'], 'Quy tắc quái đàm phải có BẢNG LUẬT/phó bản đời thường biến dị CÓ TÊN (văn phòng/metro/bệnh viện...), không "nơi đáng sợ" chung.'),
      setup('mystery_rule_missing', 'rule contradiction + survival', ['vi phạm', 'mâu thuẫn', 'thật giả', 'manh mối', 'giám sát', 'kiểm chứng', 'sống sót', 'điều kiện thoát'], 'Quy tắc quái đàm phải có cơ chế rule thật/giả + mâu thuẫn + điều kiện sống sót/thoát.'),
    ],
    chapterMustHave: [
      chapter('mystery_rule_missing', 'rule/puzzle payoff', ['quy tắc', 'điều khoản', 'cấm kỵ', 'vi phạm', 'manh mối', 'mâu thuẫn', 'kiểm chứng', 'puzzle'], 'Chương quy tắc quái đàm phải xác nhận/phá/né ít nhất một rule hoặc puzzle.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'rules horror combat drift', patterns: [/đấm bay|chém chết|solo boss|dùng sức mạnh nghiền nát/i], severity: 'major', message: 'Quy tắc quái đàm bị combat hóa; thắng phải qua luật/suy luận.' },
      // moderate (không phải critical): cốt lõi quy-tắc-quái-đàm là đọc/test/hành-động-trên ruleset.
      // Chỉ cảnh báo khi MC thực sự NÓI bí mật phó bản cho người khác (SECRET_PATTERNS đã siết listener).
      { code: 'secret_leak', label: 'instance identity secret leak', patterns: SECRET_PATTERNS, severity: 'moderate', message: 'MC để lộ bí mật/hệ thống phó bản quá sớm.' },
    ],
    criticChecklist: ['Có rule cụ thể.', 'Có suy luận thật/giả.', 'Payoff là sống sót/item/partial answer, không đánh quái thuần.', 'Dùng signature trope quy tắc quái đàm (nhập phó bản đời thường biến dị + nhận bảng luật / phân biệt rule thật-giả / NPC quái dị tuân-phá luật / suy luận điều kiện thoát / phản quy tắc đoạt phần thưởng).'],
  },
  'khoai-xuyen': {
    genre: 'khoai-xuyen',
    promise: 'MC vào từng thế giới nhỏ, sửa số phận/host wound bằng nhiệm vụ có điều kiện clear và giữ meta-continuity.',
    coreLoop: 'mission/world trope -> diagnose host wound -> intervention -> emotional/system payoff -> next world/meta reveal',
    setupMustHave: [
      setup('quick_transmigration_mission_missing', 'system/mission spine', ['nhiệm vụ', 'hệ thống', 'thế giới nhỏ', 'điểm', 'clear', 'nguyên chủ', 'host', 'đạo cụ'], 'Khoái xuyên phải có HỆ THỐNG + nhiệm vụ + thế giới nhỏ + điều kiện clear rõ.'),
      setup('quick_transmigration_mission_missing', 'host wound + identity arc', ['host', 'nguyên chủ', 'pháo hôi', 'nữ phụ', 'phản diện', 'thân phận', 'route', 'hảo cảm', 'tiếc nuối'], 'Khoái xuyên phải định danh KIỂU thân phận/host wound mỗi thế giới (pháo hôi/nữ phụ/phản diện) + mục tiêu bù đắp.'),
    ],
    chapterMustHave: [
      chapter('quick_transmigration_mission_missing', 'mission progress payoff', ['nhiệm vụ', 'host', 'thế giới nhỏ', 'route', 'clear', 'hảo cảm', 'danh tiếng', 'điểm'], 'Chương khoái xuyên phải tiến nhiệm vụ/host reputation/target route hoặc meta-system.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'transmigration/system leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ nhiệm vụ/xuyên nhanh/hệ thống cho nhân vật thế giới nhỏ.' },
    ],
    criticChecklist: ['Có mission progress đo được.', 'Có host wound/route consequence.', 'Không reset cảm xúc trắng giữa các world.', 'Dùng signature trope khoái xuyên (nhập thân phận mới mỗi thế giới / bù đắp nguyên chủ-lật kịch bản pháo hôi / counter-play phản diện-nữ phụ / thu điểm-đạo cụ hệ thống / Hub Space nâng cấp / main couple xuyên suốt).'],
  },
};

export function getGenreContract(genre: GenreType): GenreContract {
  return GENRE_CONTRACTS[genre];
}

export function formatTypedGenreContractForPrompt(genre: GenreType): string {
  const contract = getGenreContract(genre);
  return [
    `[TYPED GENRE CONTRACT — ${genre}]`,
    `Promise: ${contract.promise}`,
    `Core loop: ${contract.coreLoop}`,
    'Chapter must prove:',
    ...contract.chapterMustHave.map((s) => `- ${s.label}: ${s.keywords.slice(0, 10).join(', ')}`),
    'Hard bans:',
    ...contract.forbidden.map((f) => `- [${f.severity}] ${f.label}: ${f.message}`),
    'Critic checklist:',
    ...contract.criticChecklist.map((item) => `- ${item}`),
    '[/TYPED GENRE CONTRACT]',
  ].join('\n');
}
