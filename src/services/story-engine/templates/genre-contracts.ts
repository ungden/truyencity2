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
  /(?:nói|kể|tiết lộ|thú nhận|cho biết|giải thích)[^.!?\n]{0,80}(?:hệ thống|bàn tay vàng|xuyên việt|trọng sinh|kiếp trước|thiên cơ bàn|lộ tuyến ẩn|thần nhãn)/i,
  /(?:ta|tôi|anh|hắn)[^.!?\n]{0,40}(?:có|sở hữu)[^.!?\n]{0,50}(?:hệ thống|bàn tay vàng|thiên cơ bàn|thần nhãn|vô hạn lộ tuyến)/i,
  /(?:ngươi|ông|bà|cô|anh|em)[^.!?\n]{0,80}(?:biết|đã biết|phát hiện)[^.!?\n]{0,50}(?:hệ thống|xuyên việt|trọng sinh|bí mật của ta|bàn tay vàng)/i,
];

const ORACLE_SERVICE_PATTERNS: RegExp[] = [
  /(?:xem quẻ|gieo quẻ|bói|phán quẻ|xem vận)[^.!?\n]{0,60}(?:cho|giúp)[^.!?\n]{0,30}(?:người lạ|khách qua đường|bà lão|ông lão|người nghèo|miễn phí)/i,
  /(?:mở sạp|lập quầy|ngồi quầy)[^.!?\n]{0,50}(?:bói|xem quẻ|xem vận)/i,
  /(?:cứu giúp|giúp đỡ|ra tay giúp)[^.!?\n]{0,70}(?:người lạ|khách qua đường|người xa lạ)[^.!?\n]{0,80}(?:không lấy|miễn phí|không cần báo đáp)/i,
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

export const GENRE_CONTRACTS: Record<GenreType, GenreContract> = {
  'do-thi': {
    genre: 'do-thi',
    promise: 'MC dùng năng lực nghề/ngành, dữ liệu, quan hệ và quẻ/hệ thống để tăng tiền, hàng, hợp đồng, uy tín gia đình.',
    coreLoop: 'quẻ/tín hiệu/cơ hội -> suy luận thị trường -> hành động kinh doanh -> tiền/hàng/hợp đồng/uy tín -> mở cơ hội lớn hơn',
    setupMustHave: [
      setup('resource_loop_missing', 'business resource loop', ['doanh thu', 'hợp đồng', 'nguồn hàng', 'lợi nhuận', 'khách hàng', 'thị trường', 'vốn'], 'Đô thị/kinh doanh phải setup vòng tiền-hàng-khách-hợp đồng rõ.'),
    ],
    chapterMustHave: [
      chapter('resource_loop_missing', 'visible business/resource payoff', ['doanh thu', 'hợp đồng', 'nguồn hàng', 'lợi nhuận', 'đơn hàng', 'khách hàng', 'kho', 'hàng hóa', 'đặt cọc'], 'Chương đô thị phải có payoff tài nguyên/kinh doanh/uy tín cụ thể, không chỉ áp lực hoặc cứu người.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'golden finger leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ hệ thống/quẻ/bí mật cho người khác.' },
      { code: 'public_oracle_service', label: 'public oracle service', patterns: ORACLE_SERVICE_PATTERNS, severity: 'major', message: 'Quẻ/huyền học bị biến thành dịch vụ công ích cho người lạ thay vì công cụ gom tài nguyên cho MC.' },
      { code: 'wrong_conflict_channel', label: 'non-combat genre physical violence', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Đô thị/kinh doanh lệch sang combat/hắc bang; conflict phải qua thị trường, hợp đồng, pháp lý, PR.' },
    ],
    criticChecklist: ['Mỗi quẻ/tín hiệu phải chuyển thành lợi ích đo được.', 'Không bói miễn phí cho người lạ.', 'Đối thủ phản ứng qua thị trường/hợp đồng, không truy sát.'],
  },
  'dong-nhan': {
    genre: 'dong-nhan',
    promise: 'MC dùng canon/meta knowledge để can thiệp sự kiện quen thuộc, tạo butterfly effect và khiến nhân vật canon phản ứng mới.',
    coreLoop: 'recognized canon setup -> MC recall/meta plan -> intervention -> canon character reaction -> divergence consequence',
    setupMustHave: [
      setup('fanfic_no_canon_recall', 'canon grammar', ['canon', 'nguyên tác', 'Đường Tam', 'Vũ Hồn Điện', 'Đại Sư', 'route', 'butterfly', 'cốt truyện gốc'], 'Đồng nhân phải setup canon/route/nguyên tác cụ thể để reader nhận ra.'),
    ],
    chapterMustHave: [
      chapter('fanfic_no_canon_recall', 'canon recall/reaction', ['nguyên tác', 'canon', 'cốt truyện gốc', 'Đường Tam', 'Vũ Hồn Điện', 'Đại Sư', 'butterfly', 'biến số', 'tuyến'], 'Chương đồng nhân phải có canon recall hoặc phản ứng nhân vật canon, không được thành fantasy generic.'),
      chapter('foreknowledge_unused', 'foreknowledge exploitation', ['biết trước', 'nhớ rõ', 'theo nguyên tác', 'đáng lẽ', 'trước khi', 'cơ duyên', 'quẻ', 'tọa độ'], 'MC đồng nhân phải dùng biết trước/meta knowledge để lấy cơ duyên hoặc né nguy hiểm.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'meta/golden finger leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ xuyên việt/hệ thống/meta knowledge cho nhân vật trong truyện.' },
    ],
    criticChecklist: ['Có callback canon/nguyên tác.', 'Có can thiệp làm lệch tuyến hoặc lấy cơ duyên.', 'Nhân vật canon phản ứng theo tính cách đã biết.'],
  },
  'di-gioi': {
    genre: 'di-gioi',
    promise: 'MC dùng kiến thức hiện đại/tài nguyên đặc thù để xây lãnh địa, sản xuất, thương mại và governance.',
    coreLoop: 'resource/culture gap -> technical adaptation -> production/trade payoff -> territory upgrade -> faction reaction',
    setupMustHave: [
      setup('territory_build_loop_missing', 'territory/resource loop', ['lãnh địa', 'sản lượng', 'thương hội', 'mỏ', 'xưởng', 'dân', 'thuế', 'thương mại', 'tài nguyên'], 'Dị giới lãnh chúa phải setup vòng tài nguyên-sản xuất-dân-thương mại.'),
    ],
    chapterMustHave: [
      chapter('territory_build_loop_missing', 'territory production payoff', ['sản lượng', 'mỏ', 'xưởng', 'muối', 'dân', 'thương đội', 'doanh thu', 'kho', 'thuế', 'lãnh địa', 'bản thiết kế'], 'Chương lãnh chúa/dị giới phải tiến một chỉ số lãnh địa/sản xuất/thương mại cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'system/transmigration leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ xuyên việt/hệ thống/kiến thức hiện đại là bí mật.' },
    ],
    criticChecklist: ['Có tiến độ sản xuất/lãnh địa đo được.', 'Người ngoài chỉ thấy MC thông minh/may mắn.', 'Đối thủ chú ý theo thành tích, không tự nhiên biết bí mật.'],
  },
  'tien-hiep': {
    genre: 'tien-hiep',
    promise: 'MC tiến cảnh giới/tài nguyên/đạo nghiệp theo luật tu tiên rõ, với bí mật/golden finger được che kín.',
    coreLoop: 'cultivation constraint -> resource/person investment -> breakthrough or asset gain -> social reaction -> larger realm/sect pressure',
    setupMustHave: [
      setup('resource_loop_missing', 'cultivation resource spine', ['cảnh giới', 'luyện khí', 'linh thạch', 'linh mạch', 'đan dược', 'công pháp', 'gia tộc', 'tông môn'], 'Tiên hiệp phải có cảnh giới + tài nguyên + spine tông môn/gia tộc.'),
    ],
    chapterMustHave: [
      chapter('resource_loop_missing', 'cultivation/resource payoff', ['cảnh giới', 'đột phá', 'linh thạch', 'linh mạch', 'đan dược', 'công pháp', 'tộc vận', 'hậu bối', 'gia tộc'], 'Chương tiên hiệp phải tăng tài nguyên/tu vi/công pháp/gia tộc hoặc đóng một bước tu luyện rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'system leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ hệ thống/thần nhãn/bí mật xuyên không.' },
    ],
    criticChecklist: ['Có tài nguyên/cảnh giới/công pháp cụ thể.', 'Không lộ hệ thống.', 'Nếu là gia tộc, MC ưu tiên điều phối hậu bối/tài sản hơn tự tay đánh tiểu lâu la.'],
  },
  'ngu-thu-tien-hoa': {
    genre: 'ngu-thu-tien-hoa',
    promise: 'MC dùng tuyến tiến hóa ẩn, chăm sóc/training và vật liệu đúng để biến linh thú yếu thành át chủ bài.',
    coreLoop: 'beast problem -> bond/care/research -> material recipe -> evolution/skill payoff -> market/pro reaction',
    setupMustHave: [
      setup('pet_evolution_process_missing', 'evolution recipe', ['linh thú', 'tiến hóa', 'lộ tuyến', 'vật liệu', 'kỹ năng', 'khế ước', 'bồi dưỡng'], 'Ngự thú phải setup linh thú + lộ tuyến tiến hóa + vật liệu/kỹ năng/bond.'),
    ],
    chapterMustHave: [
      chapter('pet_bond_missing', 'pet bond/personality', ['linh thú', 'khế ước', 'tin tưởng', 'rúc vào', 'gầm gừ', 'cọ vào', 'bond', 'trung thành', 'phản ứng'], 'Chương ngự thú cần linh thú có phản ứng/tính cách/bond, không chỉ là skill list.'),
      chapter('pet_evolution_process_missing', 'evolution/training process', ['tiến hóa', 'lộ tuyến', 'vật liệu', 'bồi dưỡng', 'kỹ năng', 'huấn luyện', 'huyết mạch', 'công thức'], 'Chương ngự thú cần process chăm sóc/huấn luyện/vật liệu/tiến hóa rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'hidden route leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ năng lực nhìn tuyến tiến hóa ẩn.' },
    ],
    criticChecklist: ['Linh thú có tính cách/bond.', 'Có công thức/vật liệu/training cụ thể.', 'Payoff là tiến hóa/kỹ năng/phản ứng chuyên môn.'],
  },
  'huyen-huyen': {
    genre: 'huyen-huyen',
    promise: 'MC khai thác một hệ sức mạnh/luật thế giới cụ thể, mở rộng từ địa vực nhỏ lên đại lục/thượng giới.',
    coreLoop: 'world law pressure -> unique path/resource -> power/social payoff -> new territory/faction opens',
    setupMustHave: [
      setup('fantasy_power_world_missing', 'fantasy power/world spine', ['huyết mạch', 'cấp bậc', 'đại lục', 'học viện', 'tông tộc', 'di tích', 'ma thú', 'linh lực'], 'Huyền huyễn phải có hệ sức mạnh + địa vực + tài nguyên/chủng tộc rõ.'),
    ],
    chapterMustHave: [
      chapter('fantasy_power_world_missing', 'power/world progression payoff', ['huyết mạch', 'cấp bậc', 'linh lực', 'di tích', 'ma thú', 'tông tộc', 'đại lục', 'tài nguyên'], 'Chương huyền huyễn phải tiến hệ sức mạnh, tài nguyên, địa vực hoặc faction rõ.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'artifact/bloodline secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ nguồn gốc cheat/huyết mạch/cổ vật quá sớm.' },
    ],
    criticChecklist: ['Có luật sức mạnh cụ thể.', 'Có tài nguyên/địa vực/faction mới hoặc payoff.', 'Không nhảy boss thượng giới quá sớm.'],
  },
  'kiem-hiep': {
    genre: 'kiem-hiep',
    promise: 'MC giải quyết ân oán giang hồ bằng võ công, nghĩa khí, điều tra và danh dự, không biến thành tiên hiệp jargon.',
    coreLoop: 'jianghu oath/problem -> investigation/duel -> moral choice -> reputation/skill payoff',
    setupMustHave: [
      setup('wuxia_jianghu_missing', 'jianghu spine', ['giang hồ', 'môn phái', 'võ công', 'kiếm pháp', 'bí kíp', 'ân oán', 'nghĩa khí'], 'Kiếm hiệp phải có giang hồ/môn phái/võ công/ân oán rõ.'),
    ],
    chapterMustHave: [
      chapter('wuxia_jianghu_missing', 'jianghu martial payoff', ['giang hồ', 'võ công', 'kiếm pháp', 'chiêu thức', 'môn phái', 'ân oán', 'danh dự', 'bí kíp'], 'Chương kiếm hiệp phải có võ học/ân oán/danh dự hoặc tiến triển danh tiếng giang hồ.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'xianxia leak into wuxia', patterns: [/nguyên anh|kim đan|trúc cơ|luyện khí|pháp bảo|linh thạch/i], severity: 'major', message: 'Kiếm hiệp bị leak tiên hiệp/cảnh giới tu chân nặng.' },
      { code: 'secret_leak', label: 'hidden martial secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ bí mật/tâm pháp/golden finger quá dễ.' },
    ],
    criticChecklist: ['Combat phải có chiêu thức/body movement.', 'Conflict theo ân oán/danh dự/giang hồ.', 'Không dùng cảnh giới tiên hiệp thay võ công.'],
  },
  'lich-su': {
    genre: 'lich-su',
    promise: 'MC dùng hiểu biết, hậu cần, thể chế và cải cách nhỏ để đổi cục diện trong bối cảnh lịch sử/giả sử.',
    coreLoop: 'historical constraint -> practical reform/logistics -> local payoff -> political/military consequence',
    setupMustHave: [
      setup('historical_institution_missing', 'historical institution/logistics spine', ['triều', 'huyện', 'quan phủ', 'thuế', 'lương thực', 'quân', 'quan chế', 'dân sinh'], 'Lịch sử phải có thể chế, hậu cần, thuế/lương/quân hoặc địa phương cụ thể.'),
    ],
    chapterMustHave: [
      chapter('historical_institution_missing', 'institution/logistics payoff', ['quan phủ', 'thuế', 'lương thực', 'quân', 'huyện', 'chính sách', 'dân', 'kho', 'hộ tịch'], 'Chương lịch sử phải có payoff thể chế/hậu cần/chính sách/nhân tâm cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'future/transmigration leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ xuyên việt/trọng sinh/biết trước lịch sử.' },
    ],
    criticChecklist: ['Có chi tiết thời đại/thể chế.', 'Payoff đến từ hậu cần/chính sách/nhân tâm.', 'Không phát minh mọi thứ vô hạn hoặc phá logic thời đại.'],
  },
  'khoa-huyen': {
    genre: 'khoa-huyen',
    promise: 'MC khai thác một nguyên lý công nghệ/khoa học có giới hạn, tạo dữ liệu/prototype và mở rộng hệ thống.',
    coreLoop: 'technical anomaly -> hypothesis/test -> constraint payoff -> wider system risk',
    setupMustHave: [
      setup('sci_fi_constraint_missing', 'science/constraint spine', ['công nghệ', 'dữ liệu', 'AI', 'thí nghiệm', 'năng lượng', 'giao thức', 'mô phỏng', 'giới hạn'], 'Khoa huyễn phải có công nghệ/nguyên lý + giới hạn/kiểm chứng rõ.'),
    ],
    chapterMustHave: [
      chapter('sci_fi_constraint_missing', 'technical proof payoff', ['dữ liệu', 'thí nghiệm', 'prototype', 'AI', 'năng lượng', 'mô phỏng', 'thuật toán', 'kiểm chứng'], 'Chương khoa huyễn phải có kiểm chứng, dữ liệu, prototype hoặc constraint payoff.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'glitch/tech secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ năng lực/glitch/biết trước công nghệ quá dễ.' },
    ],
    criticChecklist: ['Có nguyên lý kỹ thuật và giới hạn.', 'Payoff được chứng minh bằng dữ liệu/prototype.', 'Không biến tech thành ma pháp vô hạn.'],
  },
  'vong-du': {
    genre: 'vong-du',
    promise: 'MC thắng nhờ hiểu cơ chế game, build, timing, market và guild/rank ladder.',
    coreLoop: 'mechanic read -> build/resource choice -> instance/pvp/market payoff -> meta escalates',
    setupMustHave: [
      setup('game_mechanic_missing', 'game mechanic spine', ['server', 'class', 'skill', 'build', 'level', 'boss', 'phó bản', 'guild', 'loot'], 'Võng du phải có cơ chế game, class/build, progression và economy/rank.'),
    ],
    chapterMustHave: [
      chapter('game_mechanic_missing', 'gameplay payoff', ['level', 'skill', 'build', 'boss', 'loot', 'phó bản', 'guild', 'rank', 'market', 'trang bị'], 'Chương võng du phải có payoff gameplay/build/loot/rank/market cụ thể.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'rebirth/meta leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/meta/late-game knowledge.' },
    ],
    criticChecklist: ['Có cơ chế game cụ thể.', 'MC thắng bằng build/timing/economy.', 'Không hack vô hạn làm mất luật game.'],
  },
  'mat-the': {
    genre: 'mat-the',
    promise: 'MC sống sót bằng chuẩn bị, tài nguyên, căn cứ, đội nhóm và quyết định khó trong thảm họa.',
    coreLoop: 'scarcity/threat -> plan/risk -> resource/base payoff -> bigger survival pressure',
    setupMustHave: [
      setup('apocalypse_resource_base_missing', 'survival resource/base spine', ['thảm họa', 'zombie', 'dịch', 'tài nguyên', 'nước', 'thức ăn', 'thuốc', 'căn cứ', 'kho'], 'Mạt thế phải có threat + tài nguyên sinh tồn + căn cứ/đội nhóm.'),
    ],
    chapterMustHave: [
      chapter('apocalypse_resource_base_missing', 'survival resource/base payoff', ['nước', 'thức ăn', 'thuốc', 'nhiên liệu', 'kho', 'căn cứ', 'hàng rào', 'đội', 'vùng an toàn'], 'Chương mạt thế phải tăng tài nguyên/căn cứ/an toàn/đội nhóm hoặc đóng một threat sinh tồn.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'future/shelter secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ biết trước mạt thế/kho/hầm trú ẩn quá sớm.' },
    ],
    criticChecklist: ['Có ledger tài nguyên/căn cứ.', 'Threat phục vụ resource logic.', 'Không bạo lực vô nghĩa không payoff.'],
  },
  'linh-di': {
    genre: 'linh-di',
    promise: 'MC đọc manh mối, quy luật dị thường và giải case bằng suy luận/ritual, không chỉ la hét/combat.',
    coreLoop: 'anomaly -> clue/rule hypothesis -> risky test -> partial answer -> deeper mystery',
    setupMustHave: [
      setup('mystery_rule_missing', 'mystery/rule spine', ['dị thường', 'manh mối', 'điều tra', 'hồ sơ', 'nghi thức', 'quy tắc', 'cấm kỵ'], 'Linh dị phải có dị thường + manh mối/quy tắc/nghi thức để suy luận.'),
    ],
    chapterMustHave: [
      chapter('mystery_rule_missing', 'clue/rule payoff', ['manh mối', 'quy tắc', 'cấm kỵ', 'dị thường', 'hồ sơ', 'nghi thức', 'suy luận', 'dấu vết'], 'Chương linh dị phải có manh mối/quy tắc/suy luận hoặc partial answer.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'horror combat drift', patterns: [/đấm bay ma|chém chết quỷ|solo quái|đánh quái như/i], severity: 'major', message: 'Linh dị bị combat hóa; phải giải bằng luật/manh mối/nghi thức.' },
      { code: 'secret_leak', label: 'spiritual secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ năng lực/bí mật dị thường quá sớm.' },
    ],
    criticChecklist: ['Mỗi chương trả ít nhất một manh mối thật.', 'Nỗi sợ đến từ rule/case, không jump scare rỗng.', 'Không combat hóa ma quái.'],
  },
  'quan-truong': {
    genre: 'quan-truong',
    promise: 'MC leo chính trường bằng hồ sơ, chính sách, bằng chứng, mạng lưới và xử lý vấn đề dân sinh.',
    coreLoop: 'institutional problem -> evidence/network play -> policy payoff -> higher political pressure',
    setupMustHave: [
      setup('political_policy_missing', 'policy/institution spine', ['chức vụ', 'ủy ban', 'hồ sơ', 'chính sách', 'ngân sách', 'dân sinh', 'cấp trên', 'thanh tra'], 'Quan trường phải có chức vụ/thể chế/hồ sơ/chính sách/network risk.'),
    ],
    chapterMustHave: [
      chapter('political_policy_missing', 'policy/evidence payoff', ['hồ sơ', 'chính sách', 'ngân sách', 'dân sinh', 'bằng chứng', 'cấp trên', 'quy trình', 'thanh tra'], 'Chương quan trường phải có payoff chính sách/hồ sơ/bằng chứng/network, không phải đánh nhau.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'officialdom violence drift', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Quan trường lệch sang bạo lực/hắc bang; conflict phải qua thể chế, hồ sơ, thanh tra, network.' },
      { code: 'secret_leak', label: 'future memory leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/biết trước chính sách.' },
    ],
    criticChecklist: ['Có hồ sơ/chính sách/bằng chứng.', 'Đối thủ vận hành qua thể chế/network.', 'Không biến thành combat hoặc gangster.'],
  },
  'ngon-tinh': {
    genre: 'ngon-tinh',
    promise: 'Quan hệ tiến triển bằng agency, ranh giới, vulnerability và payoff cảm xúc/sự nghiệp rõ.',
    coreLoop: 'emotional/social problem -> agency choice -> relationship/career payoff -> deeper vulnerability',
    setupMustHave: [
      setup('romance_emotional_contract_missing', 'relationship/agency spine', ['quan hệ', 'tin tưởng', 'ranh giới', 'hiểu lầm', 'sự nghiệp', 'gia đình', 'danh tiếng', 'lựa chọn'], 'Ngôn tình phải có emotional contract + agency + relationship ladder.'),
    ],
    chapterMustHave: [
      chapter('romance_emotional_contract_missing', 'relationship/agency payoff', ['tin tưởng', 'ranh giới', 'hiểu lầm', 'lựa chọn', 'sự nghiệp', 'gia đình', 'danh tiếng', 'tình cảm'], 'Chương ngôn tình phải đổi trạng thái quan hệ/cảm xúc/agency hoặc sự nghiệp, không chỉ drama lặp.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'romance violence drift', patterns: NON_COMBAT_DRIFT_PATTERNS, severity: 'major', message: 'Ngôn tình lệch sang combat/hắc bang; conflict phải qua cảm xúc, gia đình, xã hội, sự nghiệp.' },
      { code: 'secret_leak', label: 'rebirth/system secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ trọng sinh/hệ thống quá sớm.' },
    ],
    criticChecklist: ['Có agency và ranh giới.', 'Hiểu lầm phải có bằng chứng/tiến triển.', 'Không romanticize toxic behavior không phản tư.'],
  },
  'quy-tac-quai-dam': {
    genre: 'quy-tac-quai-dam',
    promise: 'MC sống sót bằng đọc luật, phân biệt rule thật/giả, test mạo hiểm và giải puzzle phó bản.',
    coreLoop: 'ruleset -> contradiction -> risky test -> survival payoff -> deeper ruleset',
    setupMustHave: [
      setup('mystery_rule_missing', 'rules horror spine', ['quy tắc', 'điều khoản', 'cấm kỵ', 'vi phạm', 'manh mối', 'phó bản', 'giám sát'], 'Quy tắc quái đàm phải có bảng luật/cấm kỵ/mâu thuẫn/phó bản.'),
    ],
    chapterMustHave: [
      chapter('mystery_rule_missing', 'rule/puzzle payoff', ['quy tắc', 'điều khoản', 'cấm kỵ', 'vi phạm', 'manh mối', 'mâu thuẫn', 'kiểm chứng', 'puzzle'], 'Chương quy tắc quái đàm phải xác nhận/phá/né ít nhất một rule hoặc puzzle.'),
    ],
    forbidden: [
      { code: 'wrong_conflict_channel', label: 'rules horror combat drift', patterns: [/đấm bay|chém chết|solo boss|dùng sức mạnh nghiền nát/i], severity: 'major', message: 'Quy tắc quái đàm bị combat hóa; thắng phải qua luật/suy luận.' },
      { code: 'secret_leak', label: 'instance identity secret leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ bí mật/hệ thống phó bản quá sớm.' },
    ],
    criticChecklist: ['Có rule cụ thể.', 'Có suy luận thật/giả.', 'Payoff là sống sót/item/partial answer, không đánh quái thuần.'],
  },
  'khoai-xuyen': {
    genre: 'khoai-xuyen',
    promise: 'MC vào từng thế giới nhỏ, sửa số phận/host wound bằng nhiệm vụ có điều kiện clear và giữ meta-continuity.',
    coreLoop: 'mission/world trope -> diagnose host wound -> intervention -> emotional/system payoff -> next world/meta reveal',
    setupMustHave: [
      setup('quick_transmigration_mission_missing', 'mission/world spine', ['nhiệm vụ', 'hệ thống', 'thế giới nhỏ', 'host', 'route', 'clear', 'danh tiếng', 'hảo cảm'], 'Khoái xuyên phải có nhiệm vụ + thế giới nhỏ + host wound + điều kiện clear.'),
    ],
    chapterMustHave: [
      chapter('quick_transmigration_mission_missing', 'mission progress payoff', ['nhiệm vụ', 'host', 'thế giới nhỏ', 'route', 'clear', 'hảo cảm', 'danh tiếng', 'điểm'], 'Chương khoái xuyên phải tiến nhiệm vụ/host reputation/target route hoặc meta-system.'),
    ],
    forbidden: [
      { code: 'secret_leak', label: 'transmigration/system leak', patterns: SECRET_PATTERNS, severity: 'critical', message: 'MC để lộ nhiệm vụ/xuyên nhanh/hệ thống cho nhân vật thế giới nhỏ.' },
    ],
    criticChecklist: ['Có mission progress đo được.', 'Có host wound/route consequence.', 'Không reset cảm xúc trắng giữa các world.'],
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
