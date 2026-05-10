import type { GenreType } from '../types';

export const GENRE_KNOWLEDGE_PACK_VERSION = 'genre-knowledge-v1-2026-05-08';

export type KnowledgeAlignmentVerdict = 'pass' | 'revise' | 'block';

export interface BenchmarkNovel {
  title: string;
  platform: string;
  genreFamily: string;
  sourceNote: string;
  benchmarkUse: string[];
}

export interface GenreMarketSignal {
  source: string;
  date: string;
  signal: string;
  implication: string;
}

export interface TropeGrammar {
  readerFantasy: string[];
  topicSeedGrammar: string[];
  mcArchetypeMenu: string[];
  openingTemplates: string[];
  payoffGrammar: string[];
}

export interface SetupActivationProfile {
  coreLoop: string;
  worldbuildingIngredients: string[];
  powerEconomySocialLadder: string[];
  thousandChapterSustainabilityPlan: string[];
  adaptationHooks: string[];
}

interface KeywordGroup {
  label: string;
  keywords: string[];
  required?: boolean;
}

export interface GenreKnowledgePack {
  version: string;
  genre: GenreType;
  cnTaxonomy: string;
  sourceMetadata: Array<{ title: string; url: string; note: string }>;
  marketSignals: GenreMarketSignal[];
  benchmarkNovels: BenchmarkNovel[];
  tropeGrammar: TropeGrammar;
  activationProfile: SetupActivationProfile;
  antiPatterns: string[];
  modernFatigueTraps: string[];
  riskNotes: string[];
  keywordGroups: KeywordGroup[];
}

export interface KnowledgeAlignmentIssue {
  code: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
}

export interface KnowledgeAlignmentReport {
  verdict: KnowledgeAlignmentVerdict;
  packVersion: string;
  genre: GenreType;
  subGenres: string[];
  benchmarkFamilies: string[];
  riskNotes: string[];
  issues: KnowledgeAlignmentIssue[];
}

interface StorySetupForKnowledge {
  title?: string;
  genres: string[];
  subGenres?: string[];
  worldDescription: string;
  setupKernel: unknown;
  masterOutline: unknown;
  storyOutline: unknown;
  arcPlan: unknown[];
}

const SOURCE_METADATA = [
  {
    title: 'NPPA/CASS web literature industry report coverage',
    url: 'https://www.nppa.gov.cn/xxfb/ywdt/202505/t20250512_894767.html',
    note: 'Market-level signal: tradition/guofeng, IP, cultural tourism, AI-assisted production, overseas expansion.',
  },
  {
    title: 'CADPA digital publishing/web literature category signal',
    url: 'https://www.cadpa.org.cn/3277/202507/41753.html',
    note: 'Category heat signal: romance, urban workplace, fantasy baseline, suspense growth, history/military potential.',
  },
  {
    title: 'CASS literature 2024 web literature synthesis',
    url: 'https://literature.cass.cn/yw/202505/t20250515_5874161.shtml',
    note: 'Macro signal: IP conversion, overseas reach, genre diversification, technology-assisted creation.',
  },
  {
    title: 'Qidian monthly ranking/category benchmark',
    url: 'https://www.qidian.com/rank/chn21/year2025-month05-/',
    note: 'Benchmark source for category families and current platform taste; do not copy novel prose.',
  },
  {
    title: 'Academic web literature genre/process reference',
    url: 'https://www.tsyzm.com/fileup/1004-2229/NEWS/20220622104210.pdf',
    note: 'Background reference for genre evolution and platformized long-form grammar.',
  },
] as const;

const MARKET_SIGNALS: GenreMarketSignal[] = [
  {
    source: 'NPPA/CASS 2025',
    date: '2025',
    signal: 'Tradition, guofeng, cultural-tourism and IP conversion keep rising.',
    implication: 'Prefer specific cultural objects, places, crafts, food, institutions and visual hooks over generic worlds.',
  },
  {
    source: 'CADPA 2025',
    date: '2025',
    signal: 'Urban workplace, ancient/modern romance and xuanhuan remain large buckets; suspense/mystery is growing.',
    implication: 'Each genre needs its own ladder and payoff cadence rather than one universal hot-story formula.',
  },
  {
    source: 'Qidian ranking/category snapshots',
    date: '2025-05',
    signal: 'Top lists are category-specific; broad heat is less useful than benchmark families per genre.',
    implication: 'Activate benchmark families inside the story factory prompt and audit alignment at setup time.',
  },
];

export const ALL_GENRE_TYPES: GenreType[] = [
  'tien-hiep',
  'huyen-huyen',
  'do-thi',
  'kiem-hiep',
  'lich-su',
  'khoa-huyen',
  'vong-du',
  'dong-nhan',
  'mat-the',
  'linh-di',
  'quan-truong',
  'di-gioi',
  'ngon-tinh',
  'quy-tac-quai-dam',
  'ngu-thu-tien-hoa',
  'khoai-xuyen',
];

function pack(input: Omit<GenreKnowledgePack, 'version' | 'sourceMetadata' | 'marketSignals'>): GenreKnowledgePack {
  return {
    version: GENRE_KNOWLEDGE_PACK_VERSION,
    sourceMetadata: SOURCE_METADATA.map((source) => ({ ...source })),
    marketSignals: MARKET_SIGNALS.map((signal) => ({ ...signal })),
    ...input,
  };
}

const baseAntiPatterns = [
  'Mở đầu phế vật bị nhục kéo dài không có năng lực chủ động.',
  'Mất trí nhớ, ngất xỉu, reset premise hoặc cheat xuất hiện quá muộn.',
  'Kẻ thù vũ trụ xuất hiện quá sớm làm vỡ thang leo dài hạn.',
  'Worldbuilding chỉ là tên địa danh chung chung, không có tài nguyên, tổ chức, luật chơi.',
];

export const GENRE_KNOWLEDGE_PACKS: Record<GenreType, GenreKnowledgePack> = {
  'do-thi': pack({
    genre: 'do-thi',
    cnTaxonomy: '都市 / 职场 / 商业',
    benchmarkNovels: [
      {
        title: 'Urban workplace/business benchmark family',
        platform: 'Qidian/Fanqie category observation',
        genreFamily: '都市职场/商业升级',
        sourceNote: 'Use only as category benchmark metadata, not prose.',
        benchmarkUse: ['realistic city pressure', 'business ladder', 'social proof payoff'],
      },
    ],
    tropeGrammar: {
      readerFantasy: ['Từ một lợi thế nghề nghiệp cụ thể, MC đổi đời bằng quyết định thông minh.', 'Được công nhận qua khách hàng, hợp đồng, dữ liệu, cộng đồng.'],
      topicSeedGrammar: ['ngành nghề cụ thể + điểm nghẽn thị trường + lợi thế hiếm của MC', 'cửa hàng/xưởng/startup + khách thật + đối thủ thương mại'],
      mcArchetypeMenu: ['professional underdog', 'rebirth operator', 'quiet competence founder', 'family pillar'],
      openingTemplates: ['MC thấy một lỗ hổng kinh doanh ngay trong ngày đầu.', 'Một khách hàng/đơn hàng khó buộc MC chứng minh tay nghề.'],
      payoffGrammar: ['doanh thu tăng', 'hợp đồng ký', 'khách quay lại', 'đối thủ phải điều chỉnh', 'gia đình/cộng đồng đổi thái độ'],
    },
    activationProfile: {
      coreLoop: 'problem in city market -> MC diagnoses with expertise/data -> concrete action -> measurable payoff -> bigger market pressure',
      worldbuildingIngredients: ['thành phố', 'ngành nghề', 'khách hàng', 'nhà cung cấp', 'đối thủ', 'giá/vốn/doanh thu', 'luật/ngạch cửa nghề'],
      powerEconomySocialLadder: ['cá nhân', 'cửa hàng/xưởng', 'khu phố/quận', 'chuỗi cung ứng', 'thành phố', 'quốc gia'],
      thousandChapterSustainabilityPlan: ['mỗi 50 chương mở một tầng thị trường mới', 'giữ ledger tài chính/quan hệ', 'thay đổi bài toán từ sống sót sang thương hiệu/IP'],
      adaptationHooks: ['short drama face-slap qua hợp đồng', 'food/business cover art', 'audio dễ bám theo case theo arc'],
    },
    antiPatterns: [...baseAntiPatterns, 'Đô thị nhưng payoff toàn đánh nhau hoặc hắc bang thay vì năng lực nghề/nghiệp vụ.'],
    modernFatigueTraps: ['tổng tài sáo rỗng', 'system tiền vô hạn', 'rock-bottom poverty porn', 'trả thù ex-girlfriend kéo dài'],
    riskNotes: ['Cần số liệu và business ladder, nếu không sẽ thành generic slice-of-life.'],
    keywordGroups: [
      { label: 'city', keywords: ['thành phố', 'sài gòn', 'hà nội', 'quận', 'khu phố', 'đô thị'], required: true },
      { label: 'business', keywords: ['doanh thu', 'hợp đồng', 'khách hàng', 'lợi nhuận', 'đơn hàng', 'thị trường', 'giá', 'vốn'], required: true },
      { label: 'career', keywords: ['nghề', 'xưởng', 'cửa hàng', 'công ty', 'startup', 'nhà hàng', 'sản phẩm'] },
      { label: 'social-proof', keywords: ['danh tiếng', 'cộng đồng', 'review', 'truyền miệng', 'chứng nhận', 'báo chí'] },
      { label: 'supplier', keywords: ['nhà cung cấp', 'chuỗi cung ứng', 'vật tư', 'nguồn hàng', 'đối tác'] },
    ],
  }),
  'tien-hiep': pack({
    genre: 'tien-hiep',
    cnTaxonomy: '仙侠',
    benchmarkNovels: [
      { title: 'Cultivation benchmark family', platform: 'Qidian category observation', genreFamily: '仙侠/修真升级', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['realm ladder', 'sect pressure', 'secret realm payoff'] },
    ],
    tropeGrammar: {
      readerFantasy: ['Từ tiểu tu sĩ có não, MC leo cảnh giới bằng lựa chọn và tài nguyên cụ thể.', 'Cảm giác đại đạo, tông môn, bí cảnh, pháp bảo mở dần.'],
      topicSeedGrammar: ['căn cốt/lộ tuyến tu luyện + tông môn + tài nguyên khan hiếm', 'bí cảnh/local sect conflict + đạo tâm riêng'],
      mcArchetypeMenu: ['cẩn thận thông minh', 'đạo tâm nghịch lưu', 'luyện đan/trận pháp specialist', 'family pillar cultivator'],
      openingTemplates: ['MC phát hiện một luật nhỏ của linh khí/tông môn giúp đổi ván.', 'Một nhiệm vụ ngoại môn buộc MC dùng não thay vì brute force.'],
      payoffGrammar: ['đột phá cảnh giới', 'giành tài nguyên', 'giải trận', 'được trưởng lão chú ý', 'mở bí cảnh hoặc pháp bảo'],
    },
    activationProfile: {
      coreLoop: 'cultivation constraint -> sect/resource conflict -> smart risk -> realm/resource payoff -> wider dao consequence',
      worldbuildingIngredients: ['cảnh giới', 'tông môn', 'linh khí', 'bí cảnh', 'đan dược', 'pháp bảo', 'trận pháp'],
      powerEconomySocialLadder: ['phàm nhân', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'hóa thần', 'đại đạo/cửu thiên'],
      thousandChapterSustainabilityPlan: ['mỗi đại arc mở một cảnh giới + địa vực + đạo tranh mới', 'giữ ledger pháp bảo/đan dược', 'đạo tâm MC phải tiến hóa'],
      adaptationHooks: ['cover art cảnh giới/bí cảnh', 'game progression', 'audio arc tu luyện rõ nhịp'],
    },
    antiPatterns: [...baseAntiPatterns, 'Đột phá không có giá, không có tài nguyên hoặc không có hậu quả.'],
    modernFatigueTraps: ['vô địch ngay chương 1', 'tournament spam', 'lão tổ xuất hiện giải quyết thay MC'],
    riskNotes: ['Bắt buộc có cảnh giới, tông môn, bí cảnh/tài nguyên và luật power rõ.'],
    keywordGroups: [
      { label: 'realm', keywords: ['cảnh giới', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 'tu vi'], required: true },
      { label: 'sect', keywords: ['tông môn', 'ngoại môn', 'nội môn', 'trưởng lão', 'sư huynh', 'đệ tử'], required: true },
      { label: 'secret-realm', keywords: ['bí cảnh', 'di tích', 'động phủ', 'cấm địa', 'linh mạch'], required: true },
      { label: 'resource', keywords: ['đan', 'linh thạch', 'pháp bảo', 'trận pháp', 'linh khí', 'công pháp'] },
    ],
  }),
  'huyen-huyen': pack({
    genre: 'huyen-huyen',
    cnTaxonomy: '玄幻 / 奇幻',
    benchmarkNovels: [
      { title: 'Eastern fantasy progression family', platform: 'Qidian category observation', genreFamily: '玄幻升级/异世大陆', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['power ladder', 'bloodline/system law', 'continent-scale escalation'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC mở khóa một con đường sức mạnh riêng trong thế giới có luật mạnh rõ.', 'Mỗi tầng mở thêm lãnh thổ, chủng tộc, bí mật nguồn gốc.'],
      topicSeedGrammar: ['huyết mạch/cổ vật/luật năng lượng + địa vực cụ thể + giai cấp sức mạnh'],
      mcArchetypeMenu: ['resourceful underdog', 'fallen noble with agency', 'artifact interpreter', 'beast/bloodline specialist'],
      openingTemplates: ['Một nghi thức/khảo hạch cho thấy luật sức mạnh có kẽ hở.', 'MC dùng hiểu biết nhỏ để thắng thử thách không cần buff vô hạn.'],
      payoffGrammar: ['mở cấp năng lượng', 'thu phục đồng minh', 'giải bí mật huyết mạch', 'chiếm tài nguyên địa vực'],
    },
    activationProfile: {
      coreLoop: 'world law pressure -> MC exploits unique path -> visible power/social payoff -> larger territory opens',
      worldbuildingIngredients: ['đại lục', 'huyết mạch', 'ma thú/chủng tộc', 'cấp bậc', 'học viện/tông tộc', 'di tích'],
      powerEconomySocialLadder: ['làng/thành', 'học viện/tông tộc', 'vương quốc', 'đế quốc', 'đại lục', 'thượng giới'],
      thousandChapterSustainabilityPlan: ['giữ map địa vực', 'mỗi 100 chương đổi quy mô nhưng không reset luật', 'đan xen huyết mạch/tài nguyên/đồng minh'],
      adaptationHooks: ['game RPG', 'cover fantasy spectacle', 'audio battle progression'],
    },
    antiPatterns: [...baseAntiPatterns, 'Power level đổi tên liên tục không có logic kinh tế/tài nguyên.'],
    modernFatigueTraps: ['thiên tài bị phế sáo mòn', 'gia tộc khinh thường một màu', 'boss quá to quá sớm'],
    riskNotes: ['Huyền huyễn đang có fatigue, cần hook năng lực/thế giới cụ thể hơn trope cũ.'],
    keywordGroups: [
      { label: 'power', keywords: ['cấp bậc', 'huyết mạch', 'linh lực', 'ma lực', 'thức tỉnh', 'cảnh giới'], required: true },
      { label: 'world', keywords: ['đại lục', 'vương quốc', 'học viện', 'tông tộc', 'chủng tộc', 'di tích'], required: true },
      { label: 'resource', keywords: ['tài nguyên', 'ma thú', 'cổ vật', 'bí bảo', 'mỏ', 'đấu giá'] },
    ],
  }),
  'kiem-hiep': pack({
    genre: 'kiem-hiep',
    cnTaxonomy: '武侠',
    benchmarkNovels: [
      { title: 'Jianghu chivalry benchmark family', platform: 'Classic wuxia/category observation', genreFamily: '武侠/江湖恩怨', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['jianghu code', 'martial school politics', 'honor/payoff'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC giữ nghĩa khí và trí tuệ giữa giang hồ nhiều luật ngầm.', 'Chiến thắng không chỉ là mạnh hơn mà là hiểu người, hiểu môn phái, hiểu lời hứa.'],
      topicSeedGrammar: ['môn phái + bí kíp/ân oán + địa phương cụ thể + lời hứa cá nhân'],
      mcArchetypeMenu: ['young constable', 'wandering swordsman', 'family avenger with restraint', 'doctor/scholar martial artist'],
      openingTemplates: ['Một vụ án/ân oán nhỏ hé lộ luật giang hồ.', 'MC cứu một người bằng võ công và lựa chọn đạo nghĩa.'],
      payoffGrammar: ['giải oan', 'giữ lời hứa', 'thắng chiêu thức bằng hiểu biết', 'mở bí kíp/quan hệ môn phái'],
    },
    activationProfile: {
      coreLoop: 'jianghu oath/problem -> investigation/duel -> moral choice -> reputation/skill payoff',
      worldbuildingIngredients: ['giang hồ', 'môn phái', 'võ công', 'bí kíp', 'tiêu cục/quán trọ', 'quan phủ'],
      powerEconomySocialLadder: ['địa phương', 'môn phái', 'liên minh giang hồ', 'triều đình', 'biên cương'],
      thousandChapterSustainabilityPlan: ['ân oán nối ân oán', 'mỗi arc đóng một lời hứa', 'danh tiếng tạo ràng buộc mới'],
      adaptationHooks: ['audio kiếm hiệp', 'short drama nghĩa khí', 'cover giang hồ'],
    },
    antiPatterns: [...baseAntiPatterns, 'Kiếm hiệp biến thành tiên hiệp cấp số quá sớm.'],
    modernFatigueTraps: ['đấu võ đài lặp', 'môn phái não phẳng', 'MC chỉ chém không điều tra/đàm phán'],
    riskNotes: ['Cần luật giang hồ và ràng buộc đạo nghĩa, nếu không sẽ thành combat generic.'],
    keywordGroups: [
      { label: 'jianghu', keywords: ['giang hồ', 'môn phái', 'võ lâm', 'tiêu cục', 'quán trọ'], required: true },
      { label: 'martial', keywords: ['võ công', 'kiếm pháp', 'chưởng pháp', 'khinh công', 'bí kíp'], required: true },
      { label: 'honor', keywords: ['nghĩa khí', 'lời hứa', 'ân oán', 'danh dự', 'giải oan'] },
    ],
  }),
  'lich-su': pack({
    genre: 'lich-su',
    cnTaxonomy: '历史 / 军事',
    benchmarkNovels: [
      { title: 'Historical governance/military benchmark family', platform: 'Qidian category observation', genreFamily: '历史架空/军事经营', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['institutional constraints', 'logistics', 'period detail'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC dùng hiểu biết và tổ chức để sống trong thời đại có ràng buộc thật.', 'Payoff đến từ hậu cần, chính sách, nhân tâm, kỹ thuật nhỏ.'],
      topicSeedGrammar: ['mốc triều đại/địa phương + chức phận MC + bài toán lương thực/thuế/quân'],
      mcArchetypeMenu: ['minor official', 'craft/engineering specialist', 'merchant-advisor', 'border commander'],
      openingTemplates: ['Một khủng hoảng lương thực/thuế/địa phương cần giải ngay.', 'MC thấy chi tiết lịch sử tạo cơ hội nhưng phải trả giá.'],
      payoffGrammar: ['kho lương ổn', 'dân tin', 'quân giữ thành', 'triều đình chú ý', 'kỹ thuật nhỏ tăng sản lượng'],
    },
    activationProfile: {
      coreLoop: 'historical constraint -> practical reform/logistics -> local payoff -> political consequence',
      worldbuildingIngredients: ['triều đại', 'quan chế', 'lương thực', 'thuế', 'quân đội', 'địa phương', 'giai tầng'],
      powerEconomySocialLadder: ['làng/huyện', 'phủ', 'tỉnh/đạo', 'triều đình', 'biên cương', 'thiên hạ'],
      thousandChapterSustainabilityPlan: ['tăng quy mô quản trị', 'giữ timeline và logistics', 'mỗi cải cách có phản lực chính trị'],
      adaptationHooks: ['historical IP/cultural tourism', 'short drama chính trị', 'audio mưu lược'],
    },
    antiPatterns: [...baseAntiPatterns, 'Modern knowledge unlimited phá logic thời đại.'],
    modernFatigueTraps: ['copy Tam Quốc không góc mới', 'MC phát minh mọi thứ một mình', 'chiến tranh không hậu cần'],
    riskNotes: ['Lịch sử/quân sự có tiềm năng nhưng phải có chi tiết thể chế và logistics.'],
    keywordGroups: [
      { label: 'period', keywords: ['triều', 'đời', 'niên hiệu', 'quan phủ', 'huyện', 'phủ'], required: true },
      { label: 'institution', keywords: ['quan chế', 'thuế', 'lương thực', 'quân', 'hộ tịch', 'đồn điền'], required: true },
      { label: 'politics', keywords: ['triều đình', 'sĩ tộc', 'dân phu', 'biên cương', 'chính sách'] },
    ],
  }),
  'khoa-huyen': pack({
    genre: 'khoa-huyen',
    cnTaxonomy: '科幻',
    benchmarkNovels: [
      { title: 'Speculative systems benchmark family', platform: 'Qidian/category observation', genreFamily: '科幻/未来技术/星际', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['tech premise', 'system constraint', 'escalating scope'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC khai thác một nguyên lý công nghệ/khoa học với giới hạn rõ.', 'Sense of wonder đi cùng bài toán sinh tồn/xã hội.'],
      topicSeedGrammar: ['công nghệ lõi + giới hạn vật lý/xã hội + tổ chức kiểm soát'],
      mcArchetypeMenu: ['systems engineer', 'researcher operator', 'salvage captain', 'AI governance fixer'],
      openingTemplates: ['Một thí nghiệm/lỗi hệ thống gây hậu quả thật.', 'MC phát hiện constraint kỹ thuật mà tổ chức bỏ qua.'],
      payoffGrammar: ['prototype chạy', 'dữ liệu chứng minh', 'tàu/căn cứ sống sót', 'AI/quy trình được kiểm soát'],
    },
    activationProfile: {
      coreLoop: 'technical anomaly -> hypothesis/test -> constraint payoff -> wider system risk',
      worldbuildingIngredients: ['công nghệ', 'dữ liệu', 'AI', 'năng lượng', 'tàu/căn cứ', 'thí nghiệm', 'tập đoàn/viện'],
      powerEconomySocialLadder: ['lab/team', 'công ty/căn cứ', 'thành phố', 'hành tinh', 'liên minh sao', 'văn minh'],
      thousandChapterSustainabilityPlan: ['mỗi arc mở một constraint khoa học mới', 'giữ ledger công nghệ', 'đừng biến tech thành ma pháp vô hạn'],
      adaptationHooks: ['game/system UI', 'cover hard-sci spectacle', 'audio mystery-tech'],
    },
    antiPatterns: [...baseAntiPatterns, 'Tech babble không có rule, dữ liệu hoặc hậu quả.'],
    modernFatigueTraps: ['AI toàn năng', 'dị năng thay khoa học', 'space opera không logistics'],
    riskNotes: ['Cần premise kỹ thuật cụ thể và giới hạn rõ để không thành huyền huyễn đổi tên.'],
    keywordGroups: [
      { label: 'tech', keywords: ['công nghệ', 'AI', 'dữ liệu', 'thuật toán', 'năng lượng', 'thí nghiệm'], required: true },
      { label: 'constraint', keywords: ['giới hạn', 'rủi ro', 'mô phỏng', 'giao thức', 'lỗi hệ thống', 'kiểm chứng'], required: true },
      { label: 'scale', keywords: ['căn cứ', 'tàu', 'trạm', 'hành tinh', 'tập đoàn', 'viện nghiên cứu'] },
    ],
  }),
  'vong-du': pack({
    genre: 'vong-du',
    cnTaxonomy: '游戏 / 网游',
    benchmarkNovels: [
      { title: 'Game progression benchmark family', platform: 'Qidian/category observation', genreFamily: '游戏竞技/网游经营', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['build theory', 'economy exploit', 'guild/social payoff'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC thắng nhờ hiểu cơ chế game, build, timing và kinh tế người chơi.', 'Payoff là loot, rank, guild, market edge.'],
      topicSeedGrammar: ['game mechanic + meta shift + guild/market pressure'],
      mcArchetypeMenu: ['theorycrafter', 'rebirth pro player', 'market trader', 'guild tactician'],
      openingTemplates: ['MC chọn một build bị chê nhưng hiểu breakpoint.', 'Một event server đầu tiên mở cửa cho người biết meta.'],
      payoffGrammar: ['clear boss', 'loot hiếm', 'rank tăng', 'guild recruit', 'market flip có lời'],
    },
    activationProfile: {
      coreLoop: 'mechanic read -> build/resource choice -> instance/pvp/market payoff -> meta escalates',
      worldbuildingIngredients: ['server', 'class/build', 'skill tree', 'guild', 'boss/phó bản', 'auction/market'],
      powerEconomySocialLadder: ['solo', 'party', 'guild', 'server', 'league', 'pro scene/cross-server'],
      thousandChapterSustainabilityPlan: ['mỗi season mở mechanic mới', 'giữ inventory/build ledger', 'tránh MC hack game vô lý'],
      adaptationHooks: ['game adaptation native', 'streamer/short drama reaction', 'cover UI/game world'],
    },
    antiPatterns: [...baseAntiPatterns, 'MC hack/bug vô hạn làm game mất luật.'],
    modernFatigueTraps: ['VR full-dive chung chung', 'loot list dài không cảm xúc', 'guild war không chiến thuật'],
    riskNotes: ['Cần rules, economy và ladder rank rõ.'],
    keywordGroups: [
      { label: 'game', keywords: ['server', 'game', 'class', 'skill', 'build', 'phó bản'], required: true },
      { label: 'progression', keywords: ['rank', 'level', 'boss', 'loot', 'guild', 'đấu giá'], required: true },
      { label: 'economy', keywords: ['market', 'chợ', 'vật phẩm', 'giá', 'giao dịch', 'meta'] },
    ],
  }),
  'dong-nhan': pack({
    genre: 'dong-nhan',
    cnTaxonomy: '同人',
    benchmarkNovels: [
      { title: 'Fanfic transformation benchmark family', platform: 'Category observation', genreFamily: '同人/世界再解释', sourceNote: 'Metadata-only; respect IP boundaries.', benchmarkUse: ['canon divergence', 'reader recognition', 'fresh role'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC dùng hiểu biết canon để tạo butterfly effect hợp logic.', 'Người đọc được thưởng bằng recognition + twist mới.'],
      topicSeedGrammar: ['canon-like world grammar + divergence point + MC role không phá nền'],
      mcArchetypeMenu: ['side-character fixer', 'canon-aware operator', 'craft specialist', 'villain-route repairer'],
      openingTemplates: ['Một sự kiện quen thuộc bị lệch bởi lựa chọn nhỏ của MC.', 'MC nhận ra mình đứng ở vị trí phụ nhưng có đòn bẩy.'],
      payoffGrammar: ['canon event đổi hướng', 'nhân vật quen phản ứng mới', 'route mới mở', 'butterfly consequence'],
    },
    activationProfile: {
      coreLoop: 'recognized setup -> MC intervention -> canon reaction -> divergence consequence',
      worldbuildingIngredients: ['canon grammar', 'route', 'butterfly effect', 'faction/cast role', 'rule boundary'],
      powerEconomySocialLadder: ['side scene', 'main cast orbit', 'faction route', 'world route', 'final canon divergence'],
      thousandChapterSustainabilityPlan: ['không rely mãi vào cameo', 'mỗi arc có divergence ledger', 'giữ cast motivation nhất quán'],
      adaptationHooks: ['fan recognition', 'audio callback', 'cover motif'],
    },
    antiPatterns: [...baseAntiPatterns, 'Copy plot/cảnh nguyên bản thay vì phân tích trope và viết mới.'],
    modernFatigueTraps: ['MC biết hết và thắng hết', 'cameo parade', 'canon character OOC'],
    riskNotes: ['Không copy nội dung có bản quyền; chỉ dùng grammar và original transformation.'],
    keywordGroups: [
      { label: 'canon', keywords: ['canon', 'route', 'nguyên tác', 'butterfly', 'nhân vật quen'], required: true },
      { label: 'divergence', keywords: ['lệch', 'biến số', 'can thiệp', 'hậu quả', 'tuyến mới'], required: true },
      { label: 'role', keywords: ['phe', 'vai trò', 'nhóm', 'cast', 'faction'] },
    ],
  }),
  'mat-the': pack({
    genre: 'mat-the',
    cnTaxonomy: '末世',
    benchmarkNovels: [
      { title: 'Post-apocalypse survival benchmark family', platform: 'Category observation', genreFamily: '末世生存/基地经营', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['resource scarcity', 'base building', 'human pressure'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC sống sót bằng chuẩn bị, tổ chức và quyết định khó.', 'Payoff là tài nguyên, căn cứ, đồng đội đáng tin.'],
      topicSeedGrammar: ['thảm họa cụ thể + resource bottleneck + base/social rule'],
      mcArchetypeMenu: ['planner survivor', 'base builder', 'medic/engineer', 'rebirth logistician'],
      openingTemplates: ['Dấu hiệu thảm họa đầu tiên cho MC 24 giờ chuẩn bị.', 'Một điểm phân phối tài nguyên buộc MC chọn ưu tiên.'],
      payoffGrammar: ['thu tài nguyên', 'cứu người có giá trị', 'củng cố căn cứ', 'đẩy lùi threat', 'mở bản đồ an toàn'],
    },
    activationProfile: {
      coreLoop: 'scarcity/threat -> plan/risk -> resource/base payoff -> bigger survival pressure',
      worldbuildingIngredients: ['thảm họa', 'tài nguyên', 'căn cứ', 'đội nhóm', 'zombie/quái/dịch', 'bản đồ an toàn'],
      powerEconomySocialLadder: ['nhà/kho', 'khu phố', 'căn cứ', 'liên minh', 'vùng an toàn', 'tái thiết'],
      thousandChapterSustainabilityPlan: ['ledger tài nguyên', 'faction ecology', 'threat tiến hóa theo vùng'],
      adaptationHooks: ['survival game', 'short drama crisis', 'cover base/apocalypse'],
    },
    antiPatterns: [...baseAntiPatterns, 'Bạo lực vô nghĩa không có resource logic.'],
    modernFatigueTraps: ['zombie generic', 'trữ hàng vô hạn', 'đồng đội ngu để MC sáng'],
    riskNotes: ['Cần resource ledger và moral pressure để chạy dài.'],
    keywordGroups: [
      { label: 'threat', keywords: ['thảm họa', 'dịch', 'zombie', 'quái', 'sụp đổ'], required: true },
      { label: 'resource', keywords: ['tài nguyên', 'nước', 'thức ăn', 'thuốc', 'nhiên liệu', 'kho'], required: true },
      { label: 'base', keywords: ['căn cứ', 'đội', 'vùng an toàn', 'hàng rào', 'bản đồ'] },
    ],
  }),
  'linh-di': pack({
    genre: 'linh-di',
    cnTaxonomy: '悬疑 / 灵异',
    benchmarkNovels: [
      { title: 'Suspense-supernatural benchmark family', platform: 'Qidian/CADPA category signal', genreFamily: '悬疑推理/灵异规则', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['mystery cadence', 'rule reveal', 'clue ledger'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC đọc được quy luật dị thường và sống sót/giải án bằng manh mối.', 'Sợ hãi đến từ luật chơi rõ dần, không phải jump scare rỗng.'],
      topicSeedGrammar: ['dị thường cụ thể + quy tắc/cấm kỵ + mystery ledger + tổ chức điều tra'],
      mcArchetypeMenu: ['rational investigator', 'folklore archivist', 'survivor analyst', 'ritual specialist'],
      openingTemplates: ['Một chi tiết đời thường vi phạm quy tắc đầu tiên.', 'MC nhận một hồ sơ có manh mối sai lệch nguy hiểm.'],
      payoffGrammar: ['tìm manh mối', 'xác nhận quy tắc', 'tránh cấm kỵ', 'giải một lớp án', 'mở câu hỏi lớn hơn'],
    },
    activationProfile: {
      coreLoop: 'anomaly -> clue/rule hypothesis -> risky test -> partial answer -> deeper mystery',
      worldbuildingIngredients: ['dị thường', 'quy tắc', 'cấm kỵ', 'manh mối', 'hồ sơ', 'nghi thức', 'đội điều tra'],
      powerEconomySocialLadder: ['case lẻ', 'chuỗi case', 'tổ chức', 'thành phố dị thường', 'nguồn gốc luật'],
      thousandChapterSustainabilityPlan: ['clue ledger', 'case-of-arc', 'mỗi 5 chương trả một manh mối thật'],
      adaptationHooks: ['audio suspense', 'short drama mystery', 'cover ritual/object'],
    },
    antiPatterns: [...baseAntiPatterns, 'Kinh dị chỉ la hét mà không có rule/mystery cadence.'],
    modernFatigueTraps: ['dream fakeout', 'ma hiện đánh nhau như quái thường', 'manh mối không payoff'],
    riskNotes: ['悬疑推理 tăng mạnh; cần rule system và cadence manh mối thật.'],
    keywordGroups: [
      { label: 'rule', keywords: ['quy tắc', 'cấm kỵ', 'luật', 'điều cấm', 'nghi thức'], required: true },
      { label: 'mystery', keywords: ['manh mối', 'điều tra', 'hồ sơ', 'án', 'dấu vết'], required: true },
      { label: 'anomaly', keywords: ['dị thường', 'linh dị', 'bóng', 'tiếng động', 'ám', 'hiện tượng'] },
    ],
  }),
  'quan-truong': pack({
    genre: 'quan-truong',
    cnTaxonomy: '官场 / 职场政治',
    benchmarkNovels: [
      { title: 'Bureaucratic ladder benchmark family', platform: 'Category observation', genreFamily: '官场/基层治理', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['institutional ladder', 'policy payoff', 'network risk'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC giải quyết vấn đề thật trong bộ máy và leo bằng năng lực/chính sách.', 'Sướng ở mưu lược, quy trình, chứng cứ, liên minh.'],
      topicSeedGrammar: ['chức vụ cơ sở + điểm nghẽn dân sinh + pressure cấp trên/cấp dưới'],
      mcArchetypeMenu: ['grassroots official', 'policy analyst', 'anti-corruption operator', 'district fixer'],
      openingTemplates: ['Một vụ việc dân sinh có số liệu sai đe dọa vị trí MC.', 'MC phải chọn giữa an toàn chính trị và giải pháp đúng.'],
      payoffGrammar: ['chính sách chạy', 'dân tin', 'bằng chứng giữ được', 'đối thủ lộ sơ hở', 'cấp trên ghi nhận'],
    },
    activationProfile: {
      coreLoop: 'institutional problem -> evidence/network play -> policy payoff -> higher political pressure',
      worldbuildingIngredients: ['chức vụ', 'hồ sơ', 'chính sách', 'ngân sách', 'dân sinh', 'cấp trên', 'đối thủ chính trị'],
      powerEconomySocialLadder: ['xã/phường', 'huyện/quận', 'tỉnh/thành', 'bộ/ngành', 'trung ương'],
      thousandChapterSustainabilityPlan: ['case governance theo arc', 'network ledger', 'mỗi thăng cấp đổi quy mô vấn đề'],
      adaptationHooks: ['short drama chính trị', 'audio mưu lược', 'realistic workplace'],
    },
    antiPatterns: [...baseAntiPatterns, 'Quan trường biến thành combat/hắc bang thay vì thể chế và bằng chứng.'],
    modernFatigueTraps: ['quan chức toàn ngu', 'MC nói một câu ai cũng phục', 'tham nhũng đơn tuyến'],
    riskNotes: ['Cần số liệu, hồ sơ, policy và network risk.'],
    keywordGroups: [
      { label: 'office', keywords: ['chức vụ', 'ủy ban', 'phòng ban', 'cấp trên', 'cấp dưới'], required: true },
      { label: 'policy', keywords: ['chính sách', 'hồ sơ', 'ngân sách', 'dân sinh', 'dự án'], required: true },
      { label: 'politics', keywords: ['liên minh', 'đối thủ', 'bằng chứng', 'thanh tra', 'quy trình'] },
    ],
  }),
  'di-gioi': pack({
    genre: 'di-gioi',
    cnTaxonomy: '异界 / 穿越奇幻',
    benchmarkNovels: [
      { title: 'Otherworld kingdom/business benchmark family', platform: 'Category observation', genreFamily: '异界经营/领主建设', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['culture clash', 'modern knowledge gap', 'territory building'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC dùng kiến thức hiện đại vừa đủ để thay đổi một vùng đất lạ.', 'Sướng ở culture clash, build, thương mại/kỹ thuật cụ thể.'],
      topicSeedGrammar: ['world gap + local institution + modern skill/resource arbitrage'],
      mcArchetypeMenu: ['craft uplift operator', 'merchant-lord builder', 'translator diplomat', 'engineer in magic society'],
      openingTemplates: ['MC nhận ra một nhu cầu địa phương mà kiến thức cũ giải được.', 'Một giao dịch/culture clash đầu tiên chứng minh giá trị MC.'],
      payoffGrammar: ['sản phẩm chạy', 'lãnh địa ổn', 'người bản địa tin', 'kỹ thuật nhỏ tạo lợi thế'],
    },
    activationProfile: {
      coreLoop: 'culture/resource gap -> practical adaptation -> local payoff -> territory/faction escalation',
      worldbuildingIngredients: ['dị giới', 'lãnh địa', 'thương hội', 'ma pháp/kỹ thuật', 'văn hóa', 'tài nguyên địa phương'],
      powerEconomySocialLadder: ['làng', 'thị trấn', 'lãnh địa', 'vương quốc', 'liên minh', 'liên lục địa'],
      thousandChapterSustainabilityPlan: ['tech tree vừa phải', 'relationship/faction ledger', 'mỗi arc đổi bài toán governance'],
      adaptationHooks: ['isekai business', 'cover territory/culture clash', 'game lord-building'],
    },
    antiPatterns: [...baseAntiPatterns, 'Modern knowledge vô hạn khiến dân bản địa thành nền ngu.'],
    modernFatigueTraps: ['isekai tỉnh dậy generic', 'invent everything instantly', 'nô lệ/harem economy'],
    riskNotes: ['Cần culture clash và resource constraint, không chỉ cheat hiện đại.'],
    keywordGroups: [
      { label: 'otherworld', keywords: ['dị giới', 'lãnh địa', 'vương quốc', 'ma pháp', 'thương hội'], required: true },
      { label: 'culture', keywords: ['văn hóa', 'ngôn ngữ', 'phong tục', 'giao dịch', 'địa phương'], required: true },
      { label: 'uplift', keywords: ['kỹ thuật', 'sản phẩm', 'tài nguyên', 'xưởng', 'canh tác', 'thương mại'] },
    ],
  }),
  'ngon-tinh': pack({
    genre: 'ngon-tinh',
    cnTaxonomy: '言情 / 古言 / 现言',
    benchmarkNovels: [
      { title: 'Modern/ancient romance benchmark family', platform: 'CADPA/category observation', genreFamily: '现言/古言/大女主', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['emotional contract', 'relationship ladder', 'female agency'] },
    ],
    tropeGrammar: {
      readerFantasy: ['Cảm xúc tiến triển có lựa chọn, tôn trọng agency và đời sống cụ thể.', 'Payoff là hiểu lầm được xử lý, năng lực cá nhân được công nhận, quan hệ đổi trạng thái.'],
      topicSeedGrammar: ['nghề/địa vị + wound/desire + relationship contract + social pressure'],
      mcArchetypeMenu: ['career-driven heroine', 'quiet resilient lead', 'rebirth repairer', 'ancient-household strategist'],
      openingTemplates: ['Một tình huống nghề nghiệp/gia đình buộc hai người lộ tính cách thật.', 'Nữ chính tự giải một việc trước khi romance can thiệp.'],
      payoffGrammar: ['tin tưởng tăng', 'ranh giới rõ', 'sự nghiệp tiến', 'hiểu lầm có bằng chứng', 'gia đình/xã hội phản ứng'],
    },
    activationProfile: {
      coreLoop: 'emotional/social problem -> agency choice -> relationship/career payoff -> deeper vulnerability',
      worldbuildingIngredients: ['nghề nghiệp/gia đình', 'quan hệ', 'ranh giới', 'danh tiếng', 'mâu thuẫn xã hội', 'đời sống cụ thể'],
      powerEconomySocialLadder: ['cá nhân', 'gia đình/nhóm', 'công ty/phủ đệ', 'xã hội thượng lưu/cộng đồng', 'public reputation'],
      thousandChapterSustainabilityPlan: ['relationship state ledger', 'career/gia đình song tuyến', 'không kéo hiểu lầm giả quá lâu'],
      adaptationHooks: ['short drama mạnh', 'audio romance', 'cover nhân vật rõ'],
    },
    antiPatterns: [...baseAntiPatterns, 'Nam/nữ chính toxic nhưng được romanticize không phản tư.'],
    modernFatigueTraps: ['tổng tài lạnh lùng một màu', 'miscommunication kéo vô hạn', 'female lead mất agency'],
    riskNotes: ['Cổ ngôn/hiện ngôn vẫn lớn; phải có agency và emotional ladder sạch.'],
    keywordGroups: [
      { label: 'relationship', keywords: ['quan hệ', 'tin tưởng', 'ranh giới', 'hiểu lầm', 'tình cảm'], required: true },
      { label: 'agency', keywords: ['lựa chọn', 'sự nghiệp', 'gia đình', 'danh tiếng', 'tự quyết'], required: true },
      { label: 'social', keywords: ['công ty', 'phủ', 'xã hội', 'cộng đồng', 'hôn ước'] },
    ],
  }),
  'quy-tac-quai-dam': pack({
    genre: 'quy-tac-quai-dam',
    cnTaxonomy: '规则怪谈',
    benchmarkNovels: [
      { title: 'Rule-horror survival benchmark family', platform: 'Category observation', genreFamily: '规则怪谈/副本求生', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['rule system', 'survival puzzle', 'cadenced reveal'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC sống sót bằng đọc luật, kiểm chứng, phát hiện rule giả/thật.', 'Mỗi chương phải có puzzle, clue, risk và payoff.'],
      topicSeedGrammar: ['địa điểm đời thường + bảng quy tắc + cấm kỵ mâu thuẫn + survival objective'],
      mcArchetypeMenu: ['paranoid analyst', 'calm rule tester', 'archive survivor', 'team tactician'],
      openingTemplates: ['MC đọc một bộ quy tắc có điều khoản tự mâu thuẫn.', 'Một người phá luật ngay trước mặt MC tạo bằng chứng đầu tiên.'],
      payoffGrammar: ['xác nhận rule thật', 'né rule giả', 'đổi vị trí an toàn', 'giải puzzle', 'mở tầng rule sâu hơn'],
    },
    activationProfile: {
      coreLoop: 'ruleset -> contradiction -> risky test -> survival payoff -> deeper ruleset',
      worldbuildingIngredients: ['quy tắc', 'cấm kỵ', 'điều khoản', 'manh mối', 'phó bản/địa điểm', 'người vi phạm', 'giám sát'],
      powerEconomySocialLadder: ['room/location', 'building', 'district instance', 'organization', 'root rules'],
      thousandChapterSustainabilityPlan: ['rule ledger bắt buộc', 'mỗi instance 5-20 chương', 'không giải bằng đánh quái thuần'],
      adaptationHooks: ['short drama/puzzle', 'audio suspense', 'cover object/rules poster'],
    },
    antiPatterns: [...baseAntiPatterns, 'Rule horror nhưng rule tùy tiện, không thể suy luận.'],
    modernFatigueTraps: ['rule list dài để dọa', 'MC đoán bừa vẫn đúng', 'combat hóa quái đàm'],
    riskNotes: ['Bắt buộc rule system và mystery cadence; đây là genre rất dễ hỏng continuity.'],
    keywordGroups: [
      { label: 'rules', keywords: ['quy tắc', 'điều khoản', 'luật', 'cấm kỵ', 'vi phạm'], required: true },
      { label: 'mystery', keywords: ['manh mối', 'mâu thuẫn', 'suy luận', 'kiểm chứng', 'puzzle'], required: true },
      { label: 'instance', keywords: ['phó bản', 'địa điểm', 'căn phòng', 'trường học', 'bệnh viện', 'giám sát'] },
    ],
  }),
  'ngu-thu-tien-hoa': pack({
    genre: 'ngu-thu-tien-hoa',
    cnTaxonomy: '御兽 / 进化',
    benchmarkNovels: [
      { title: 'Beast taming/evolution benchmark family', platform: 'Qidian/category observation', genreFamily: '御兽进化/学院经营', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['beast roster', 'evolution path', 'tournament/resource cadence'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC nuôi/tối ưu linh thú bằng hiểu biết tiến hóa và tình cảm đồng đội.', 'Payoff là evolution, skill combo, bond, tài nguyên hiếm.'],
      topicSeedGrammar: ['beast species + evolution bottleneck + academy/market/guild'],
      mcArchetypeMenu: ['beast researcher', 'underdog tamer', 'business tamer', 'field explorer'],
      openingTemplates: ['MC nhận ra một thú bị chê có đường tiến hóa ẩn.', 'Một bài kiểm tra huấn luyện lộ lợi thế quan sát của MC.'],
      payoffGrammar: ['tiến hóa', 'mở kỹ năng', 'bond tăng', 'thắng challenge', 'bán/đổi tài nguyên'],
    },
    activationProfile: {
      coreLoop: 'beast problem -> care/research/training -> evolution/skill payoff -> bigger roster/ecology',
      worldbuildingIngredients: ['linh thú', 'tiến hóa', 'kỹ năng', 'khế ước', 'học viện/guild', 'vật liệu tiến hóa'],
      powerEconomySocialLadder: ['pet đầu', 'team nhỏ', 'academy/guild', 'regional league', 'rare ecosystem', 'mythic ecology'],
      thousandChapterSustainabilityPlan: ['beast roster ledger', 'evolution tree', 'mỗi pet có arc cảm xúc và kỹ năng'],
      adaptationHooks: ['game/merch', 'cover creature', 'audio team-bond'],
    },
    antiPatterns: [...baseAntiPatterns, 'Thú chỉ là skill list, không có tính cách/bond.'],
    modernFatigueTraps: ['pokemon clone chung chung', 'evolution quá dễ', 'roster quá đông không ai nhớ'],
    riskNotes: ['Cần evolution tree + item ledger + bond để giữ dài hạn.'],
    keywordGroups: [
      { label: 'beast', keywords: ['linh thú', 'thú', 'khế ước', 'triệu hồi', 'pet'], required: true },
      { label: 'evolution', keywords: ['tiến hóa', 'kỹ năng', 'huyết mạch', 'vật liệu', 'bồi dưỡng'], required: true },
      { label: 'institution', keywords: ['học viện', 'guild', 'giải đấu', 'rừng', 'sinh thái'] },
    ],
  }),
  'khoai-xuyen': pack({
    genre: 'khoai-xuyen',
    cnTaxonomy: '快穿',
    benchmarkNovels: [
      { title: 'Quick-transmigration mission benchmark family', platform: 'Category observation', genreFamily: '快穿任务/系统修复', sourceNote: 'Metadata-only benchmark.', benchmarkUse: ['mission ladder', 'world reset control', 'emotional closure'] },
    ],
    tropeGrammar: {
      readerFantasy: ['MC vào nhiều thế giới, sửa số phận/cốt truyện bằng trí tuệ và cảm xúc.', 'Payoff là mission clear, nhân vật phụ được cứu, meta-story tiến.'],
      topicSeedGrammar: ['mission objective + world trope + host wound + system constraint'],
      mcArchetypeMenu: ['world fixer', 'villain route corrector', 'career savior', 'emotionally restrained executor'],
      openingTemplates: ['MC nhận nhiệm vụ với mục tiêu tưởng đơn giản nhưng có bug cảm xúc.', 'Host body có một ràng buộc xã hội khiến nhiệm vụ khó hơn.'],
      payoffGrammar: ['mission progress', 'host reputation repair', 'target character changes', 'system unlock', 'world closure'],
    },
    activationProfile: {
      coreLoop: 'mission/world trope -> diagnose host wound -> intervention -> emotional/system payoff -> next world/meta reveal',
      worldbuildingIngredients: ['nhiệm vụ', 'hệ thống', 'thế giới nhỏ', 'host', 'độ hảo cảm/danh tiếng', 'điều kiện clear'],
      powerEconomySocialLadder: ['world task', 'arc cluster', 'system rank', 'main-space faction', 'root mission'],
      thousandChapterSustainabilityPlan: ['world bible per arc', 'meta mystery mỗi 3-5 worlds', 'không reset cảm xúc MC hoàn toàn'],
      adaptationHooks: ['short drama anthology', 'audio arc-contained', 'cover female lead/world portal'],
    },
    antiPatterns: [...baseAntiPatterns, 'Mỗi world reset trắng làm mất continuity cảm xúc.'],
    modernFatigueTraps: ['system nhiệm vụ điểm số childish', 'harem route lặp', 'world quá ngắn không payoff'],
    riskNotes: ['Cần meta-continuity, nếu không 1000 chương rời rạc.'],
    keywordGroups: [
      { label: 'mission', keywords: ['nhiệm vụ', 'hệ thống', 'clear', 'điểm', 'host'], required: true },
      { label: 'world', keywords: ['thế giới nhỏ', 'xuyên', 'route', 'kịch bản', 'vai phụ'], required: true },
      { label: 'emotion', keywords: ['danh tiếng', 'hảo cảm', 'vết thương', 'số phận', 'cứu'] },
    ],
  }),
};

const SUBGENRE_OVERLAYS: Record<string, Partial<GenreKnowledgePack>> = {
  'kinh-doanh': {
    tropeGrammar: {
      readerFantasy: ['MC thắng bằng số liệu, cashflow, hợp đồng và thị trường thật.'],
      topicSeedGrammar: ['business niche + unit economics + customer segment + distribution channel'],
      mcArchetypeMenu: ['operator founder', 'market analyst', 'supply-chain fixer'],
      openingTemplates: ['Một đơn hàng/khách hàng đầu tiên buộc MC chứng minh ROI.'],
      payoffGrammar: ['doanh thu', 'biên lợi nhuận', 'hợp đồng', 'khách quay lại', 'market share'],
    },
    activationProfile: {
      coreLoop: 'market bottleneck -> unit-economics decision -> customer proof -> capital/scale pressure',
      worldbuildingIngredients: ['doanh thu', 'vốn', 'hợp đồng', 'khách hàng', 'biên lợi nhuận', 'đối tác', 'kênh bán'],
      powerEconomySocialLadder: ['first order', 'repeat customers', 'local brand', 'regional chain', 'national platform'],
      thousandChapterSustainabilityPlan: ['ledger tài chính', 'mở chuỗi cung ứng', 'mỗi arc có metric trước/sau'],
      adaptationHooks: ['business short drama', 'cover product/founder', 'audio case arc'],
    },
    keywordGroups: [
      { label: 'business-metrics', keywords: ['doanh thu', 'lợi nhuận', 'vốn', 'hợp đồng', 'khách hàng', 'giá', 'thị trường', 'dữ liệu'], required: true },
    ],
    riskNotes: ['Subgenre kinh-doanh yêu cầu số liệu/business ladder rõ trong setup.'],
  },
  'trong-sinh': {
    tropeGrammar: {
      readerFantasy: ['MC có ký ức tương lai nhưng phải kiểm chứng vì thế giới có biến số.'],
      topicSeedGrammar: ['specific year/event window + limited foreknowledge + personal debt'],
      mcArchetypeMenu: ['rebirth operator', 'second-chance professional'],
      openingTemplates: ['MC nhận ra ngày/tháng cụ thể và chọn một hành động nhỏ tạo domino.'],
      payoffGrammar: ['tránh lỗi cũ', 'bắt timing thị trường', 'sửa quan hệ', 'foreknowledge bị thử thách'],
    },
    antiPatterns: ['Knowledge tương lai vô hạn làm MC thắng không cần trả giá.'],
    riskNotes: ['Foreknowledge phải có giới hạn và butterfly effect.'],
  },
  'gia-toc': {
    activationProfile: {
      coreLoop: 'family pressure -> resource/reputation action -> household payoff -> clan-level conflict',
      worldbuildingIngredients: ['gia tộc', 'tài sản', 'trưởng bối', 'danh tiếng', 'người thừa kế'],
      powerEconomySocialLadder: ['nhà nhỏ', 'chi nhánh', 'gia tộc chính', 'liên minh gia tộc', 'địa vực'],
      thousandChapterSustainabilityPlan: ['family ledger', 'inheritance/reputation arcs', 'ally/rival branches'],
      adaptationHooks: ['family drama', 'short drama conflict'],
    },
    keywordGroups: [
      { label: 'family-clan', keywords: ['gia tộc', 'trưởng bối', 'danh tiếng', 'thừa kế', 'chi nhánh'] },
    ],
  },
  'cung-dau': {
    activationProfile: {
      coreLoop: 'palace rule -> social read -> alliance/proof -> status payoff -> deeper court danger',
      worldbuildingIngredients: ['hậu cung', 'lễ nghi', 'phi tần', 'gia tộc ngoại thích', 'cung quy'],
      powerEconomySocialLadder: ['cung nữ/phi tần thấp', 'chủ cung', 'hậu cung', 'triều đình', 'ngoại thích'],
      thousandChapterSustainabilityPlan: ['relationship ledger', 'ritual/legal constraints', 'avoid poison-only plots'],
      adaptationHooks: ['short drama palace intrigue'],
    },
    keywordGroups: [
      { label: 'palace', keywords: ['hậu cung', 'lễ nghi', 'phi tần', 'cung quy', 'ngoại thích'] },
    ],
  },
  'isekai-trade': {
    activationProfile: {
      coreLoop: 'cross-world price gap -> logistics constraint -> trade payoff -> faction reaction',
      worldbuildingIngredients: ['hai thế giới', 'giá chênh', 'hậu cần', 'thương hội', 'hàng hóa'],
      powerEconomySocialLadder: ['small trade', 'route', 'warehouse', 'merchant guild', 'state monopoly'],
      thousandChapterSustainabilityPlan: ['price ledger', 'shipping constraints', 'political backlash'],
      adaptationHooks: ['business fantasy', 'game trade routes'],
    },
    keywordGroups: [
      { label: 'trade-arbitrage', keywords: ['giá chênh', 'hàng hóa', 'hậu cần', 'thương hội', 'hai thế giới'] },
    ],
  },
  'cultural-carry': {
    activationProfile: {
      coreLoop: 'cultural object -> local translation -> audience payoff -> IP/social expansion',
      worldbuildingIngredients: ['ẩm thực', 'thủ công', 'âm nhạc', 'lễ hội', 'guofeng/quốc phong', 'du lịch'],
      powerEconomySocialLadder: ['local audience', 'city brand', 'tourism/IP', 'national export'],
      thousandChapterSustainabilityPlan: ['cultural catalog', 'audience reaction', 'IP adaptation ladder'],
      adaptationHooks: ['cultural tourism', 'food/craft cover', 'audio lifestyle'],
    },
    keywordGroups: [
      { label: 'culture-ip', keywords: ['quốc phong', 'văn hóa', 'du lịch', 'ẩm thực', 'thủ công', 'lễ hội'] },
    ],
  },
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function mergeTropeGrammar(base: TropeGrammar, overlay?: TropeGrammar): TropeGrammar {
  if (!overlay) return { ...base, readerFantasy: [...base.readerFantasy], topicSeedGrammar: [...base.topicSeedGrammar], mcArchetypeMenu: [...base.mcArchetypeMenu], openingTemplates: [...base.openingTemplates], payoffGrammar: [...base.payoffGrammar] };
  return {
    readerFantasy: unique([...base.readerFantasy, ...(overlay.readerFantasy || [])]),
    topicSeedGrammar: unique([...base.topicSeedGrammar, ...(overlay.topicSeedGrammar || [])]),
    mcArchetypeMenu: unique([...base.mcArchetypeMenu, ...(overlay.mcArchetypeMenu || [])]),
    openingTemplates: unique([...base.openingTemplates, ...(overlay.openingTemplates || [])]),
    payoffGrammar: unique([...base.payoffGrammar, ...(overlay.payoffGrammar || [])]),
  };
}

function mergeActivationProfile(base: SetupActivationProfile, overlay?: SetupActivationProfile): SetupActivationProfile {
  if (!overlay) return {
    coreLoop: base.coreLoop,
    worldbuildingIngredients: [...base.worldbuildingIngredients],
    powerEconomySocialLadder: [...base.powerEconomySocialLadder],
    thousandChapterSustainabilityPlan: [...base.thousandChapterSustainabilityPlan],
    adaptationHooks: [...base.adaptationHooks],
  };
  return {
    coreLoop: `${base.coreLoop} | subgenre: ${overlay.coreLoop}`,
    worldbuildingIngredients: unique([...base.worldbuildingIngredients, ...(overlay.worldbuildingIngredients || [])]),
    powerEconomySocialLadder: unique([...base.powerEconomySocialLadder, ...(overlay.powerEconomySocialLadder || [])]),
    thousandChapterSustainabilityPlan: unique([...base.thousandChapterSustainabilityPlan, ...(overlay.thousandChapterSustainabilityPlan || [])]),
    adaptationHooks: unique([...base.adaptationHooks, ...(overlay.adaptationHooks || [])]),
  };
}

export function getGenreKnowledgePack(genre: GenreType, subGenres: string[] = []): GenreKnowledgePack {
  const base = GENRE_KNOWLEDGE_PACKS[genre];
  let merged: GenreKnowledgePack = {
    ...base,
    sourceMetadata: base.sourceMetadata.map((source) => ({ ...source })),
    marketSignals: base.marketSignals.map((signal) => ({ ...signal })),
    benchmarkNovels: base.benchmarkNovels.map((novel) => ({ ...novel, benchmarkUse: [...novel.benchmarkUse] })),
    tropeGrammar: mergeTropeGrammar(base.tropeGrammar),
    activationProfile: mergeActivationProfile(base.activationProfile),
    antiPatterns: [...base.antiPatterns],
    modernFatigueTraps: [...base.modernFatigueTraps],
    riskNotes: [...base.riskNotes],
    keywordGroups: base.keywordGroups.map((group) => ({ ...group, keywords: [...group.keywords] })),
  };

  for (const subGenre of subGenres) {
    const overlay = SUBGENRE_OVERLAYS[subGenre];
    if (!overlay) continue;
    merged = {
      ...merged,
      benchmarkNovels: unique([...merged.benchmarkNovels, ...(overlay.benchmarkNovels || [])]),
      tropeGrammar: mergeTropeGrammar(merged.tropeGrammar, overlay.tropeGrammar),
      activationProfile: mergeActivationProfile(merged.activationProfile, overlay.activationProfile),
      antiPatterns: unique([...merged.antiPatterns, ...(overlay.antiPatterns || [])]),
      modernFatigueTraps: unique([...merged.modernFatigueTraps, ...(overlay.modernFatigueTraps || [])]),
      riskNotes: unique([...merged.riskNotes, ...(overlay.riskNotes || [])]),
      keywordGroups: [...merged.keywordGroups, ...((overlay.keywordGroups || []).map((group) => ({ ...group, keywords: [...group.keywords] })))],
    };
  }

  return merged;
}

export function buildGenreKnowledgeContext(genre: GenreType, subGenres: string[] = []): string {
  const pack = getGenreKnowledgePack(genre, subGenres);
  return [
    `[GENRE KNOWLEDGE CORE ${pack.version}]`,
    `Primary genre: ${pack.genre} (${pack.cnTaxonomy})`,
    subGenres.length ? `Subgenres: ${subGenres.join(', ')}` : 'Subgenres: none selected yet',
    '',
    'Source-backed market signals:',
    ...pack.marketSignals.map((signal) => `- ${signal.source}: ${signal.signal} Implication: ${signal.implication}`),
    '',
    'Benchmark families (metadata only, do not copy prose):',
    ...pack.benchmarkNovels.map((novel) => `- ${novel.genreFamily} via ${novel.platform}: ${novel.benchmarkUse.join('; ')}`),
    '',
    'Reader fantasy:',
    ...pack.tropeGrammar.readerFantasy.map((item) => `- ${item}`),
    '',
    'Topic seed grammar:',
    ...pack.tropeGrammar.topicSeedGrammar.map((item) => `- ${item}`),
    '',
    'MC archetype menu:',
    ...pack.tropeGrammar.mcArchetypeMenu.map((item) => `- ${item}`),
    '',
    'Opening templates:',
    ...pack.tropeGrammar.openingTemplates.map((item) => `- ${item}`),
    '',
    'Worldbuilding ingredients:',
    ...pack.activationProfile.worldbuildingIngredients.map((item) => `- ${item}`),
    '',
    'Power/economy/social ladder:',
    ...pack.activationProfile.powerEconomySocialLadder.map((item) => `- ${item}`),
    '',
    '1000-chapter sustainability:',
    ...pack.activationProfile.thousandChapterSustainabilityPlan.map((item) => `- ${item}`),
    '',
    'Anti-patterns / modern fatigue traps:',
    ...[...pack.antiPatterns, ...pack.modernFatigueTraps].map((item) => `- ${item}`),
    '',
    'Risk notes:',
    ...pack.riskNotes.map((item) => `- ${item}`),
    '',
    'Validation keywords expected in setup:',
    ...pack.keywordGroups.map((group) => `- ${group.required ? 'REQUIRED ' : ''}${group.label}: ${group.keywords.join(', ')}`),
    '[/GENRE KNOWLEDGE CORE]',
  ].join('\n');
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFC');
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

const GLOBAL_HARD_BANS = [
  'mất trí nhớ',
  'ngất xỉu',
  'đói lạnh',
  'nô lệ',
  'bị phế',
  'bị đuổi khỏi',
  'diệt môn ngay chương 1',
  'kẻ thù vũ trụ',
  'hệ thống vô hạn',
];

export function validateKnowledgeCoverage(payload: StorySetupForKnowledge): KnowledgeAlignmentReport {
  const primary = (payload.genres[0] || 'do-thi') as GenreType;
  const subGenres = payload.subGenres || payload.genres.slice(1);
  const pack = getGenreKnowledgePack(primary, subGenres);
  const issues: KnowledgeAlignmentIssue[] = [];
  const worldText = normalizeText(payload.worldDescription || '');
  const setupText = normalizeText(asText(payload.setupKernel));
  const outlineText = normalizeText(`${asText(payload.masterOutline)} ${asText(payload.storyOutline)}`);
  const arcText = normalizeText(asText(payload.arcPlan));
  const allText = normalizeText(`${payload.title || ''} ${payload.worldDescription || ''} ${asText(payload.setupKernel)} ${asText(payload.masterOutline)} ${asText(payload.storyOutline)} ${asText(payload.arcPlan)}`);

  for (const ban of GLOBAL_HARD_BANS) {
    if (allText.includes(ban)) {
      issues.push({
        code: 'knowledge_hard_ban',
        severity: 'critical',
        message: `Setup contains tired/hard-banned opening or premise marker: "${ban}".`,
      });
    }
  }

  const matchedWorldGroups = pack.keywordGroups.filter((group) => hasAny(worldText, group.keywords));
  const missingRequired = pack.keywordGroups.filter((group) => group.required && !hasAny(`${worldText} ${setupText}`, group.keywords));
  for (const group of missingRequired) {
    issues.push({
      code: `knowledge_missing_required_${group.label}`,
      severity: 'major',
      message: `Setup must activate ${pack.genre} ${group.label}: ${group.keywords.join(', ')}.`,
    });
  }

  const minMatches = Math.min(3, Math.max(2, pack.keywordGroups.length - 2));
  if (matchedWorldGroups.length < minMatches) {
    issues.push({
      code: 'knowledge_worldbuilding_too_generic',
      severity: 'major',
      message: `worldDescription only matched ${matchedWorldGroups.length}/${pack.keywordGroups.length} genre ingredient groups; expected at least ${minMatches}.`,
    });
  }

  if (!pack.tropeGrammar.payoffGrammar.some((payoff) => hasAny(`${setupText} ${arcText}`, payoff.toLowerCase().split(/[\s/]+/).filter((part) => part.length >= 3)))) {
    issues.push({
      code: 'knowledge_payoff_loop_missing',
      severity: 'moderate',
      message: `setupKernel/arcPlan should name concrete payoff grammar for ${pack.genre}.`,
    });
  }

  const escalationKeywords = unique([
    ...pack.activationProfile.powerEconomySocialLadder.flatMap((item) => item.toLowerCase().split(/[\s/>\-]+/)),
    'arc',
    'phase',
    'volume',
    'chương',
    'tầng',
    'quy mô',
  ]).filter((item) => item.length >= 3);
  if (!hasAny(outlineText, escalationKeywords)) {
    issues.push({
      code: 'knowledge_escalation_missing',
      severity: 'moderate',
      message: `masterOutline/storyOutline should show genre-specific escalation ladder for ${pack.genre}.`,
    });
  }

  if (!hasAny(arcText, ['goal', 'conflict', 'payoff', 'hook', 'mục tiêu', 'xung đột', 'thu hoạch', 'lợi ích', 'mở', 'kết'])) {
    issues.push({
      code: 'knowledge_opening_arc_missing',
      severity: 'moderate',
      message: 'arcPlan should contain opening/payoff grammar, not just summary blurbs.',
    });
  }

  if (primary === 'do-thi' && subGenres.includes('kinh-doanh') && !hasAny(`${worldText} ${setupText}`, ['doanh thu', 'vốn', 'hợp đồng', 'khách hàng', 'thị trường', 'lợi nhuận', 'dữ liệu', 'giá'])) {
    issues.push({
      code: 'knowledge_business_ladder_missing',
      severity: 'major',
      message: 'do-thi + kinh-doanh requires numbers/business ladder: revenue, capital, contracts, customers, market, margin or pricing.',
    });
  }

  if (primary === 'tien-hiep' && !hasAny(`${worldText} ${setupText}`, ['cảnh giới', 'tông môn', 'bí cảnh', 'đan', 'pháp bảo', 'linh khí'])) {
    issues.push({
      code: 'knowledge_cultivation_spine_missing',
      severity: 'major',
      message: 'tien-hiep requires realm/sect/secret-realm/resource spine.',
    });
  }

  if ((primary === 'linh-di' || primary === 'quy-tac-quai-dam') && !hasAny(`${worldText} ${setupText}`, ['quy tắc', 'cấm kỵ', 'manh mối', 'điều tra', 'dị thường', 'nghi thức'])) {
    issues.push({
      code: 'knowledge_mystery_rule_spine_missing',
      severity: 'major',
      message: `${primary} requires rule system and mystery cadence.`,
    });
  }

  const hasCritical = issues.some((issue) => issue.severity === 'critical');
  const hasMajor = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: hasCritical ? 'block' : hasMajor || issues.length > 0 ? 'revise' : 'pass',
    packVersion: pack.version,
    genre: primary,
    subGenres,
    benchmarkFamilies: unique(pack.benchmarkNovels.map((novel) => novel.genreFamily)),
    riskNotes: pack.riskNotes,
    issues,
  };
}

export function formatKnowledgeAlignmentReport(report: KnowledgeAlignmentReport): string {
  const issueText = report.issues.length
    ? report.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`).join('\n')
    : '- ok';
  return [
    `Knowledge alignment: ${report.verdict} | pack=${report.packVersion} | genre=${report.genre} | subGenres=${report.subGenres.join(',') || 'none'}`,
    `Benchmark families: ${report.benchmarkFamilies.join('; ')}`,
    `Risk notes: ${report.riskNotes.join(' | ')}`,
    'Issues:',
    issueText,
  ].join('\n');
}
