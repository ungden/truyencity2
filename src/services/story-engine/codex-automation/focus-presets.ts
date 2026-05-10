import type { ContinuityExtractionPayload } from './contract';
import type { GenreType } from '../types';

export type FocusKey = 'song-xuyen-trade' | 'sang-the-than-minh' | 'thien-dao-thu-vien';
export type FocusPresetVerdict = 'pass' | 'revise' | 'block';

export interface FocusPreset {
  key: FocusKey;
  label: string;
  primaryGenre: GenreType;
  subGenres: string[];
  mcArchetype: string;
  antiTropes: string[];
  promptContext: string;
  coverPromptHints: string[];
  requiredSetupKeywords: Array<{ code: string; label: string; keywords: string[] }>;
}

export interface FocusPresetIssue {
  code: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
}

export interface FocusPresetValidationReport {
  verdict: FocusPresetVerdict;
  focusKey: FocusKey;
  issues: FocusPresetIssue[];
}

interface StorySetupForFocusPreset {
  genres: string[];
  subGenres?: string[];
  worldDescription: string;
  setupKernel: unknown;
  masterOutline: unknown;
  storyOutline: unknown;
  arcPlan: unknown[];
}

export const FOCUS_PRESETS: Record<FocusKey, FocusPreset> = {
  'thien-dao-thu-vien': {
    key: 'thien-dao-thu-vien',
    label: 'Thien Dao Thu Vien Author Progression',
    primaryGenre: 'di-gioi',
    subGenres: ['viet-van-sang-the', 'nho-dao', 'thien-dao-luu', 'vo-dao'],
    mcArchetype: 'author-dao transmigrator with Earth cultural memory',
    antiTropes: [
      'no_miserable_start',
      'no_primitive_copy_paste',
      'no_mc_combat_only',
      'no_reader_payoff_missing',
      'no_empty_ranking_reaction',
      'no_physical_manuscript_submission',
      'no_early_identity_exposure',
      'no_dark_org_investigation_loop',
      'no_pressure_stack_without_reward',
    ],
    promptContext: [
      '[FOCUS PRESET: thien-dao-thu-vien]',
      'Premise lock:',
      '- MC xuyên qua Đại Diễn Giới, một dị giới võ đạo nơi ai cũng là võ giả, nhưng Tác Gia là tầng lớp VIP được Thiên Đạo Thư Viện công nhận.',
      '- Thiên Đạo Thư Viện do Thiên Đạo tạo ra, là thư viện tinh thần/cosmic interface trong thức hải; mọi người gọi bằng ý niệm trong đầu, không phải một phân lâu vật lý.',
      '- Tác Gia dùng thần niệm/bút danh/ý niệm văn chương để khắc tác phẩm vào Thiên Đạo Thư Viện; tuyệt đối không có cảnh đi nộp bản thảo hoặc xếp hàng đăng bản thảo vật lý.',
      '- Độc giả gọi Thiên Đạo Thư Viện trong đầu để đọc/nhập tâm/lĩnh ngộ võ công, công pháp, thân pháp, trận pháp, binh pháp hoặc ý cảnh.',
      '- MC Lâm Mặc có kho văn minh Trái Đất: văn học, phim ảnh, game, thần thoại, lịch sử, kiếm hiệp, huyền huyễn và webnovel.',
      '- Bàn tay vàng Vạn Văn Ký Ức tái hiện các tác phẩm/ký ức Trái Đất theo kiểu "giữ hồn nguyên tác, đổi vỏ dị giới": giữ xương sống cốt truyện, archetype nhân vật, đại cảnh, nhịp cao trào và payoff; chỉ đổi tên/địa danh/pháp môn để hợp luật Thiên Đạo.',
      '- Core fantasy là dùng kỹ thuật kể chuyện hiện đại + kho văn minh Trái Đất để nghiền ép văn phong sơ khai của bản địa, khiến thiên hạ đọc mê, ngộ đạo, leo bảng và công nhận MC.',
      '- Mode Tác gia chủ đạo: MC thắng bằng sách, danh vọng, độc giả, Thiên Đạo công nhận và proxy võ học; võ đạo tự vệ chỉ tăng nhờ phản hồi độc giả, không biến thành thuần combat.',
      '- Lâm Mặc cực kỳ cẩn thận: giai đoạn đầu dùng bút danh/ảo ảnh thư viện/false trail, không lộ diện thật, không gặp địch trực tiếp, không tự chui vào âm mưu.',
      '- Sảng văn cadence kiểu đại thần: MC nắm quyền chủ động, đối thủ chỉ làm nền để tôn hắn; setback ngắn, face-slap bằng tác phẩm/chương mới/bảng xếp hạng/phản ứng độc giả; mỗi chương phải có payoff hữu hình cho MC.',
      '- Không stack áp lực lên MC. Mỗi chương cần ít nhất một đoạn độc giả/faction reaction làm người đọc sướng: kinh ngạc, tranh luận, lĩnh ngộ, bảng nhảy hạng, Thiên Đạo thưởng.',
      '',
      'Setup bắt buộc:',
      '- Có Thiên Đạo Thư Viện như hạ tầng tinh thần do Thiên Đạo tạo ra: gọi trong thức hải, bảng tân tác gia, điểm công nhận, ấn ký tác phẩm, quyền khắc tác phẩm, thư bình và reaction độc giả.',
      '- Có ladder Tác Gia: Bạch Bút -> Thanh Bút -> Kim Bút -> Tông Sư -> Văn Thánh -> Thiên Đạo Tác Gia.',
      '- Có cơ chế độc giả nhập tâm/lĩnh ngộ: tác phẩm nào sinh ra võ học/công pháp gì, ai đọc, phe nào phản ứng, danh vọng/tài nguyên nào quay về MC.',
      '- Có văn hóa bản địa viết sách còn sơ khai, đơn tuyến, thiếu nhân vật/nhịp hồi hộp/plot twist, để MC có lợi thế kể chuyện chính đáng.',
      '- Có ít nhất 3 dòng tác phẩm dài hạn: kiếm hiệp, chiến tranh/binh pháp, huyền huyễn/thần thoại, trinh thám võ đạo hoặc học viện pháp môn.',
      '- Có luật ẩn danh sớm: trước ch.100, MC không được lộ thân phận thật hoặc trực tiếp điều tra/đối đầu tổ chức đen nếu không có director override.',
      '- Có template ledger cho mỗi tác phẩm Trái Đất: nguồn cảm hứng, xương sống nguyên tác, các đại cảnh phải giữ, yếu tố đổi tên, võ học/công pháp dự kiến sinh ra.',
      '',
      'Chapter continuity bắt buộc:',
      '- Khi đăng chương/sách hoặc có độc giả lĩnh ngộ, continuity.json phải ghi tác phẩm đang viết, võ học/công pháp phát sinh, độc giả/faction phản ứng, danh vọng/tài nguyên Thiên Đạo và payoff cho MC.',
      '- Khi công bố tác phẩm, phải thể hiện đường đi tinh thần: thần niệm/bút danh -> Thiên Đạo Thư Viện trong thức hải -> độc giả gọi trong đầu -> nhập tâm/lĩnh ngộ.',
      '- Khi viết tác phẩm dựa trên nguyên tác Trái Đất, chương phải bám template ledger: không tự bẻ sang truyện mới nếu chưa có lý do trong Vạn Văn Ký Ức.',
      '- Không để tác phẩm tạo skill vô nguồn: phải có tác phẩm -> cảnh đọc/nhập tâm -> lĩnh ngộ -> phản ứng -> phần thưởng/danh vọng.',
      '- Không copy thô tên/plot nguyên bản quá lộ; tác phẩm công bố trong dị giới phải dùng tên mới, địa danh mới, võ học mới. Chỉ được nhắc tên nguyên bản Trái Đất cực ngắn trong nội tâm/Vạn Văn Ký Ức nếu cần.',
      '- Không kéo main khổ lâu; nếu bị nghi ngờ/chèn ép, phải có chương mới, bảng xếp hạng, thư bình hoặc độc giả ngộ võ phản đòn ngay trong window ngắn.',
      '- Không dùng các beat mở đầu kiểu Hắc Ám Văn Đàn, ám sát, đi trà quán điều tra, hoặc lão lục nối tiếp; conflict chính là văn đàn, độc giả, bảng xếp hạng và cách kể chuyện.',
      '- Không để đối thủ dồn dập. Early arc ưu tiên MC chủ động farm danh vọng ẩn danh; mỗi trở ngại phải bị hóa giải trong cùng chương hoặc tối đa 1-2 chương kèm thưởng.',
      '[/FOCUS PRESET]',
    ].join('\n'),
    coverPromptHints: [
      'premium Chinese webnovel cover, anonymous young author in simple robes before a celestial mental library of floating books',
      'readers meditate with glowing books inside their minds while martial arts silhouettes form from story illusions',
      'clear cool-neutral cinematic light, elegant ink-gold accents, crisp mobile thumbnail, 3:4 Vietnamese webnovel cover',
    ],
    requiredSetupKeywords: [
      { code: 'heavenly_library', label: 'Thiên Đạo Thư Viện', keywords: ['thiên đạo thư viện', 'thư viện thiên đạo', 'thiên đạo', 'thư viện'] },
      { code: 'author_class', label: 'Tác Gia VIP', keywords: ['tác gia', 'bạch bút', 'thanh bút', 'kim bút', 'văn thánh', 'thiên đạo tác gia'] },
      { code: 'reader_enlightenment', label: 'độc giả nhập tâm/lĩnh ngộ', keywords: ['độc giả', 'nhập tâm', 'lĩnh ngộ', 'đọc sách', 'thư bình'] },
      { code: 'martial_skills', label: 'võ đạo/công pháp', keywords: ['võ giả', 'võ đạo', 'võ công', 'công pháp', 'thân pháp', 'trận pháp', 'kiếm ý'] },
      { code: 'earth_culture', label: 'kho văn minh Trái Đất', keywords: ['trái đất', 'văn minh trái đất', 'văn học', 'phim ảnh', 'game', 'thần thoại', 'kiếp trước'] },
      { code: 'primitive_local_books', label: 'văn hóa viết sách sơ khai', keywords: ['sơ khai', 'đơn nhất', 'nhàm chán', 'thiếu hấp dẫn', 'văn phong bản địa'] },
      { code: 'recognition_ladder', label: 'bảng xếp hạng/điểm công nhận', keywords: ['bảng xếp hạng', 'điểm công nhận', 'danh vọng', 'ấn ký', 'tân tác gia'] },
      { code: 'mental_library_access', label: 'thư viện tinh thần/gọi trong đầu', keywords: ['thức hải', 'ý niệm', 'thần niệm', 'gọi trong đầu', 'thư viện tinh thần'] },
      { code: 'anonymous_author', label: 'MC ẩn danh/bút danh', keywords: ['ẩn danh', 'bút danh', 'không lộ diện', 'false trail', 'giấu thân phận'] },
      { code: 'earth_template_spine', label: 'xương sống nguyên tác Trái Đất', keywords: ['template ledger', 'xương sống', 'nguyên tác', 'giữ hồn', 'đại cảnh'] },
    ],
  },
  'sang-the-than-minh': {
    key: 'sang-the-than-minh',
    label: 'Sang The Than Minh World-Creation Progression',
    primaryGenre: 'di-gioi',
    subGenres: ['toan-dan-sang-the', 'sang-the', 'thien-dao-luu'],
    mcArchetype: 'world creator with accelerated divine-domain cheat',
    antiTropes: ['no_miserable_start', 'no_random_power_jump', 'no_forgotten_species', 'no_empty_world_stats'],
    promptContext: [
      '[FOCUS PRESET: sang-the-than-minh]',
      'Premise lock:',
      '- MC xuyên qua thế giới nơi mỗi người gần như là thần minh dự bị, sở hữu một Thần Vực/tiểu thế giới riêng.',
      '- Sức mạnh bản thể = chất lượng thế giới tự sáng tạo: diện tích, pháp tắc, sinh thái, chủng tộc quyến thuộc, tín ngưỡng, chiến lực văn minh và độ ổn định Thiên Đạo.',
      '- MC có trí nhớ kiếp trước như kho văn học/ảo tưởng/phim ảnh/thần thoại/tiểu thuyết, dùng để tái hiện các "world template" mà dân bản địa chưa từng nghĩ tới.',
      '- Core fantasy là sáng thế + nuôi sinh vật + phát triển văn minh + tấn cấp thế giới, MC mạnh dần theo thế giới phản hồi, đọc sảng chứ không bị hành xác kéo dài.',
      '- Sảng văn cadence: khó khăn chỉ là bài toán ngắn để MC khoe trí nhớ kiếp trước + bàn tay vàng; mỗi chương phải có tiến triển hữu hình như tăng hạng, tiến hóa loài, mở template, tăng tín ngưỡng/thần lực hoặc thắng kiểm tra.',
      '',
      'Setup bắt buộc:',
      '- Có học viện/cơ cấu khảo hạch thần minh dự bị, cấp bậc Thần Vực và ladder tấn cấp rõ.',
      '- Có golden finger cụ thể giúp MC biến ký ức kiếp trước thành bản thiết kế thế giới khả thi nhưng có luật: gia tốc thời gian, phân tích pháp tắc, dung hợp giống loài, chỉnh môi trường, điểm nguồn gốc hoặc template pháp tắc.',
      '- Có world-state ledger: diện tích, nguồn năng lượng, pháp tắc, sinh thái, chủng tộc/quyến thuộc, tín ngưỡng, tài nguyên, rủi ro sụp đổ.',
      '- Có ít nhất 3 chủng tộc/sinh vật chủ lực phát triển dài hạn, mỗi loài có tính cách, kỹ năng, cây tiến hóa và vai trò văn minh riêng.',
      '- Có battle/test loop: khảo hạch thế giới, chiến tranh thần vực, trao đổi tài nguyên, xếp hạng học viện, phó bản hư không.',
      '',
      'Chapter continuity bắt buộc:',
      '- Khi thế giới/loài/pháp tắc/tín ngưỡng thay đổi, continuity.json phải ghi worldStateDeltas, factions, plotThreads và itemEvents/economicLedger nếu có tài nguyên.',
      '- Không nâng cấp thế giới bằng may mắn trống; mọi tấn cấp phải có nguyên nhân, chi phí, payoff và rủi ro đã được ghi.',
      '- Không để quyến thuộc/sinh vật cũ biến mất khỏi truyện sau khi được gieo.',
      '- Không kéo main khổ lâu, không để bài toán treo quá nhiều chương; ưu tiên payoff sảng ngay trong chương.',
      '[/FOCUS PRESET]',
    ].join('\n'),
    coverPromptHints: [
      'epic premium Chinese webnovel cover, young male world creator holding a glowing miniature divine realm',
      'inside the orb: oceans, mountains, primordial creatures and golden world tree roots, cosmic academy silhouettes behind',
      'clean cool-neutral cinematic light, sharp mobile thumbnail, 3:4 Vietnamese webnovel cover, no muddy orange cast',
    ],
    requiredSetupKeywords: [
      { code: 'divine_domain', label: 'Thần Vực/tiểu thế giới', keywords: ['thần vực', 'tiểu thế giới', 'thế giới riêng', 'sáng thế', 'lãnh địa thế giới'] },
      { code: 'creator_progression', label: 'tấn cấp thế giới', keywords: ['tấn cấp', 'cấp bậc', 'cảnh giới', 'thần minh dự bị', 'thần hỏa'] },
      { code: 'species', label: 'quyến thuộc/chủng tộc', keywords: ['quyến thuộc', 'chủng tộc', 'sinh vật', 'bộ tộc', 'văn minh'] },
      { code: 'faith_law', label: 'tín ngưỡng/pháp tắc', keywords: ['tín ngưỡng', 'pháp tắc', 'thiên đạo', 'thần tính', 'nguồn gốc'] },
      { code: 'previous_life_templates', label: 'trí nhớ kiếp trước/world template', keywords: ['trí nhớ kiếp trước', 'kiếp trước', 'văn học', 'phim ảnh', 'ảo tưởng', 'template'] },
      { code: 'world_ledger', label: 'world-state ledger', keywords: ['world-state', 'trạng thái thế giới', 'diện tích', 'sinh thái', 'tài nguyên'] },
      { code: 'assessment_loop', label: 'khảo hạch/chiến tranh thần vực', keywords: ['khảo hạch', 'học viện', 'xếp hạng', 'chiến tranh thần vực', 'phó bản hư không'] },
    ],
  },
  'song-xuyen-trade': {
    key: 'song-xuyen-trade',
    label: 'Song Xuyen Trade Progression',
    primaryGenre: 'di-gioi',
    subGenres: ['isekai-trade', 'kinh-doanh', 'cultural-carry'],
    mcArchetype: 'cross-world trade operator',
    antiTropes: ['no_unlimited_inventory', 'no_free_arbitrage', 'no_new_world_without_payoff', 'no_source-less_resources', 'no_pure_suffering_loop'],
    promptContext: [
      '[FOCUS PRESET: song-xuyen-trade]',
      'Premise lock:',
      '- MC qua lại giữa chủ thế giới và dị giới/các thế giới khác bằng một cơ chế có giới hạn rõ.',
      '- Core fantasy là bù trừ giá trị giữa các thế giới: hàng hóa, thông tin, kỹ thuật nhỏ, văn hóa, thuốc, nguyên liệu, logistics.',
      '- MC mạnh dần bằng thương mại, quan hệ, dữ liệu giá, hậu cần, inventory discipline và faction trust, không phải cheat tiền/vật phẩm vô hạn.',
      '- Đây là sảng văn trade/progression: mỗi chương phải trả "trade dividend" rõ cho MC. Dù có nguy cơ, cuối chương MC cần lãi ít nhất một thứ cụ thể: tiền, hàng, nguồn cung, khách hàng, quyền route, dữ liệu giá, uy tín faction, giấy phép, hợp đồng, hoặc đòn bẩy xã hội.',
      '- Không kéo MC khổ liên tục. Rủi ro chỉ đáng giữ nếu nó đổi được lợi thế mới hoặc mở cửa kiếm lợi lớn hơn ngay trong chapter/window.',
      '',
      'Setup bắt buộc:',
      '- Ít nhất 2 thế giới có tên, luật, nhu cầu, nguồn cung, rủi ro và giá trị tương đối khác nhau.',
      '- Có trade ledger / inventory ledger / world-state ledger trong storyOutline.',
      '- Có exchange-rate drift: giao dịch nhiều lần sẽ làm giá, phe phái, luật hoặc nguồn cung thay đổi.',
      '- Có logistics constraint: khối lượng, thời gian, kiểm soát hải quan/cổng dịch chuyển, niềm tin, bảo quản, rủi ro bị phát hiện.',
      '- Có social cost: mỗi khoản lợi phải tạo phản ứng của gia đình, khách hàng, thương hội, chính quyền hoặc phe dị giới.',
      '',
      'Chapter continuity bắt buộc:',
      '- Khi có mua/bán/trao đổi/vận chuyển, continuity.json phải ghi itemEvents, economicLedger, tradeLedger và worldStateDeltas.',
      '- Mỗi chương Song Xuyên phải ghi rõ trong economicLedger/tradeLedger: MC đã lãi gì sau chương này. Nếu chỉ thêm áp lực/rủi ro mà không có profit/progression dividend, phải revise.',
      '- Không để hàng hóa/vốn/tài nguyên xuất hiện không nguồn.',
      '- Không mở thế giới mới nếu ledger hai thế giới cũ chưa đủ payoff hoặc chưa có lý do.',
      '[/FOCUS PRESET]',
    ].join('\n'),
    coverPromptHints: [
      'clear premium realistic fantasy trade portal between modern city market and otherworld caravan market',
      'MC holding a ledger and a small traded artifact, clean cool-neutral cinematic light',
      'no yellow cast, no muddy orange glow, crisp mobile thumbnail, 3:4 Vietnamese webnovel cover',
    ],
    requiredSetupKeywords: [
      { code: 'two_worlds', label: 'hai hoặc nhiều thế giới', keywords: ['chủ thế giới', 'dị giới', 'thế giới khác', 'hai thế giới', 'cổng', 'song xuyên'] },
      { code: 'trade_loop', label: 'trade loop', keywords: ['buôn bán', 'trao đổi', 'giao dịch', 'chênh lệch giá', 'arbitrage', 'thương mại'] },
      { code: 'logistics', label: 'logistics constraint', keywords: ['hậu cần', 'vận chuyển', 'khối lượng', 'bảo quản', 'thời gian', 'kiểm soát'] },
      { code: 'inventory', label: 'inventory/resource ledger', keywords: ['inventory', 'tồn kho', 'vật tư', 'hàng hóa', 'nguồn hàng', 'tài nguyên'] },
      { code: 'world_state', label: 'world-state drift', keywords: ['world-state', 'trạng thái thế giới', 'giá biến động', 'nguồn cung', 'phe phái', 'thương hội'] },
    ],
  },
};

export function isFocusKey(value: string | undefined): value is FocusKey {
  return value === 'song-xuyen-trade' || value === 'sang-the-than-minh' || value === 'thien-dao-thu-vien';
}

export function getFocusPreset(focusKey: string | undefined): FocusPreset | null {
  return isFocusKey(focusKey) ? FOCUS_PRESETS[focusKey] : null;
}

export function buildFocusPresetContext(focusKey: string | undefined): string {
  const preset = getFocusPreset(focusKey);
  return preset?.promptContext || '';
}

export function applyFocusPresetTemplate<T extends Record<string, unknown>>(template: T, focusKey: string | undefined): T & Record<string, unknown> {
  const preset = getFocusPreset(focusKey);
  if (!preset) return template;
  return {
    ...template,
    focusKey: preset.key,
    genres: [preset.primaryGenre],
    subGenres: preset.subGenres,
    mcArchetype: preset.mcArchetype,
    antiTropes: preset.antiTropes,
    coverPrompt: preset.coverPromptHints.join(', '),
  };
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFC');
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.reduce((sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

const THIEN_DAO_PHYSICAL_SUBMISSION_TERMS = [
  'nộp bản thảo',
  'đi nộp',
  'xếp hàng nộp',
  'quầy nộp',
  'đăng bản thảo lên thiên đạo thư viện',
  'thiên đạo thư viện phân lâu',
  'phân lâu thành',
  'quảng trường bảng',
  'trà lâu thư bình',
];

const THIEN_DAO_MENTAL_ACCESS_TERMS = [
  'thức hải',
  'ý niệm',
  'thần niệm',
  'gọi trong đầu',
  'trong đầu',
  'thư viện tinh thần',
  'thư viện trong tâm',
  'cosmic interface',
];

const THIEN_DAO_STEALTH_TERMS = [
  'ẩn danh',
  'bút danh',
  'không lộ diện',
  'giấu thân phận',
  'false trail',
  'ảo ảnh thư viện',
  'không để lộ',
];

const THIEN_DAO_EARLY_CONSPIRACY_TERMS = [
  'hắc ám văn đàn',
  'ám sát',
  'sát thủ',
  'trà quán',
  'điều tra quán',
  'lão giả áo đen',
  'tổ chức đen',
  'mật hội',
];

const THIEN_DAO_TEMPLATE_SPINE_TERMS = [
  'template ledger',
  'xương sống',
  'nguyên tác',
  'giữ hồn',
  'đại cảnh',
  'archetype',
  'nguồn cảm hứng',
];

export function validateFocusPresetChapterContent(
  payload: {
    chapterNumber: number;
    content: string;
    protagonistName?: string;
  },
  focusKey: string | undefined,
): FocusPresetValidationReport {
  const preset = getFocusPreset(focusKey);
  if (!preset) return { verdict: 'pass', focusKey: 'song-xuyen-trade', issues: [] };
  const issues: FocusPresetIssue[] = [];

  if (preset.key !== 'thien-dao-thu-vien') {
    return { verdict: 'pass', focusKey: preset.key, issues };
  }

  const text = normalize(payload.content);
  const isEarly = payload.chapterNumber <= 100;
  const hasLibraryEvent = hasAny(text, ['thiên đạo thư viện', 'tác gia', 'độc giả', 'lĩnh ngộ', 'tác phẩm', 'bút danh']);

  for (const term of THIEN_DAO_PHYSICAL_SUBMISSION_TERMS) {
    if (text.includes(term)) {
      issues.push({
        code: 'focus_physical_submission_forbidden',
        severity: 'critical',
        message: `Thiên Đạo Thư Viện is a mental/cosmic interface; forbidden physical-submission term found: ${term}.`,
      });
      break;
    }
  }

  if (hasLibraryEvent && !hasAny(text, THIEN_DAO_MENTAL_ACCESS_TERMS)) {
    issues.push({
      code: 'focus_mental_library_access_missing',
      severity: 'critical',
      message: 'Chapter uses Thiên Đạo Thư Viện but does not show mental access through thức hải/ý niệm/thần niệm/gọi trong đầu.',
    });
  }

  if (isEarly && !hasAny(text, THIEN_DAO_STEALTH_TERMS)) {
    issues.push({
      code: 'focus_early_anonymity_missing',
      severity: 'major',
      message: 'Early Thiên Đạo Thư Viện chapters must keep Lâm Mặc anonymous through bút danh/false trail/no identity reveal.',
    });
  }

  if (isEarly && hasAny(text, THIEN_DAO_EARLY_CONSPIRACY_TERMS)) {
    issues.push({
      code: 'focus_early_conspiracy_loop_forbidden',
      severity: 'critical',
      message: 'Early arc must not drift into dark-org assassination/investigation beats; conflict should come from writing, readers, rankings, and enlightenment.',
    });
  }

  if (hasAny(text, ['vạn văn ký ức', 'trái đất', 'kiếm hiệp', 'tam quốc', 'huyền huyễn']) && !hasAny(text, THIEN_DAO_TEMPLATE_SPINE_TERMS)) {
    issues.push({
      code: 'focus_earth_template_spine_missing',
      severity: 'major',
      message: 'When Earth works inspire a book, chapter should preserve a template ledger/source spine instead of inventing a drifting story from scratch.',
    });
  }

  const critical = issues.some((issue) => issue.severity === 'critical');
  const major = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    focusKey: preset.key,
    issues,
  };
}

export function validateFocusPresetStorySetup(
  payload: StorySetupForFocusPreset,
  focusKey: string | undefined,
): FocusPresetValidationReport {
  const preset = getFocusPreset(focusKey);
  if (!preset) {
    return { verdict: 'pass', focusKey: 'song-xuyen-trade', issues: [] };
  }
  const issues: FocusPresetIssue[] = [];
  if (payload.genres[0] !== preset.primaryGenre) {
    issues.push({
      code: 'focus_primary_genre_mismatch',
      severity: 'major',
      message: `Focus ${preset.key} requires primary genre ${preset.primaryGenre}.`,
    });
  }
  const subGenres = payload.subGenres || payload.genres.slice(1);
  for (const required of preset.subGenres) {
    if (!subGenres.includes(required)) {
      issues.push({
        code: 'focus_subgenre_missing',
        severity: 'major',
        message: `Focus ${preset.key} requires subgenre ${required}.`,
      });
    }
  }
  const text = normalize([
    payload.worldDescription,
    asText(payload.setupKernel),
    asText(payload.masterOutline),
    asText(payload.storyOutline),
    asText(payload.arcPlan),
  ].join('\n'));
  for (const group of preset.requiredSetupKeywords) {
    if (!hasAny(text, group.keywords)) {
      issues.push({
        code: `focus_missing_${group.code}`,
        severity: 'major',
        message: `${preset.label} setup must define ${group.label}: ${group.keywords.join(', ')}.`,
      });
    }
  }
  if (preset.key === 'thien-dao-thu-vien') {
    const physicalMatches = THIEN_DAO_PHYSICAL_SUBMISSION_TERMS.filter((term) => text.includes(term));
    if (physicalMatches.length > 0) {
      issues.push({
        code: 'focus_physical_submission_forbidden',
        severity: 'critical',
        message: `Thiên Đạo Thư Viện setup must not treat the library as a physical manuscript office: ${physicalMatches.slice(0, 3).join(', ')}.`,
      });
    }
    if (!hasAny(text, THIEN_DAO_MENTAL_ACCESS_TERMS)) {
      issues.push({
        code: 'focus_mental_library_access_missing',
        severity: 'critical',
        message: 'Thiên Đạo Thư Viện setup must define mental access through thức hải/ý niệm/thần niệm/gọi trong đầu.',
      });
    }
    if (!hasAny(text, THIEN_DAO_STEALTH_TERMS)) {
      issues.push({
        code: 'focus_anonymous_author_missing',
        severity: 'major',
        message: 'Thiên Đạo Thư Viện setup must define Lâm Mặc as an anonymous/hidden author in the early arc.',
      });
    }
    if (!hasAny(text, THIEN_DAO_TEMPLATE_SPINE_TERMS)) {
      issues.push({
        code: 'focus_earth_template_spine_missing',
        severity: 'major',
        message: 'Setup must define how Vạn Văn Ký Ức preserves Earth source-template spines instead of inventing disconnected new books.',
      });
    }
  }
  const critical = issues.some((issue) => issue.severity === 'critical');
  const major = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    focusKey: preset.key,
    issues,
  };
}

export function validateFocusPresetContinuity(
  payload: ContinuityExtractionPayload,
  focusKey: string | undefined,
): FocusPresetValidationReport {
  const preset = getFocusPreset(focusKey);
  if (!preset) return { verdict: 'pass', focusKey: 'song-xuyen-trade', issues: [] };
  const issues: FocusPresetIssue[] = [];
  if (preset.key === 'sang-the-than-minh') {
    const text = normalize([
      payload.summary,
      payload.mcState,
      payload.cliffhanger,
      ...payload.plotThreads.map((entry) => `${entry.name} ${entry.description} ${entry.payoffDescription || ''}`),
      ...(payload.worldStateDeltas || []).map((entry) => `${entry.worldName} ${entry.deltaType} ${entry.description} ${entry.pressureChange || ''} ${entry.relatedResources.join(' ')}`),
      ...(payload.factions || []).map((entry) => `${entry.factionName} ${entry.description || ''}`),
    ].join('\n'));
    const hasCreationScene = hasAny(text, ['thần vực', 'tiểu thế giới', 'sáng thế', 'quyến thuộc', 'pháp tắc', 'tín ngưỡng', 'world-state', 'template']);
    if (!hasCreationScene) return { verdict: 'pass', focusKey: preset.key, issues };
    if ((payload.worldStateDeltas || []).length === 0) {
      issues.push({
        code: 'focus_world_state_delta_missing',
        severity: 'critical',
        message: 'Sang The chapter has world-creation signals but continuity.json lacks worldStateDeltas.',
      });
    }
    if (!hasAny(text, ['trí nhớ kiếp trước', 'văn học', 'phim ảnh', 'ảo tưởng', 'template', 'vạn tượng'])) {
      issues.push({
        code: 'focus_previous_life_template_missing',
        severity: 'major',
        message: 'Sang The chapter should record how previous-life memory/world templates affect creation progress.',
      });
    }
    if (!hasAny(text, ['quyến thuộc', 'chủng tộc', 'sinh vật', 'kiến đá', 'mộc linh', 'long tích'])) {
      issues.push({
        code: 'focus_species_progress_missing',
        severity: 'major',
        message: 'Sang The chapter should track species/dependent-race progress.',
      });
    }
    const critical = issues.some((issue) => issue.severity === 'critical');
    const major = issues.some((issue) => issue.severity === 'major');
    return {
      verdict: critical ? 'block' : major ? 'revise' : 'pass',
      focusKey: preset.key,
      issues,
    };
  }
  if (preset.key === 'thien-dao-thu-vien') {
    const text = normalize([
      payload.summary,
      payload.mcState,
      payload.cliffhanger,
      payload.readerPayoff?.tradeDividend || '',
      payload.readerPayoff?.progressionDelta || '',
      payload.readerPayoff?.comfortOrSwaggerBeat || '',
      payload.readerPayoff?.nextProfitHook || '',
      ...payload.itemEvents.map((entry) => `${entry.itemName} ${entry.eventType} ${entry.description || ''}`),
      ...payload.economicLedger.map((entry) => `${entry.entityName} ${entry.assets.join(' ')} ${entry.deltaSummary} ${entry.notes || ''}`),
      ...payload.plotThreads.map((entry) => `${entry.name} ${entry.description} ${entry.payoffDescription || ''}`),
      ...(payload.worldStateDeltas || []).map((entry) => `${entry.worldName} ${entry.deltaType} ${entry.description} ${entry.pressureChange || ''} ${entry.relatedResources.join(' ')}`),
      ...(payload.factions || []).map((entry) => `${entry.factionName} ${entry.description || ''}`),
    ].join('\n'));
    const hasPublishOrEnlightenment = hasAny(text, [
      'thiên đạo thư viện',
      'tác gia',
      'đăng sách',
      'đăng chương',
      'bản thảo',
      'tác phẩm',
      'độc giả',
      'nhập tâm',
      'lĩnh ngộ',
      'thư bình',
      'bảng xếp hạng',
      'điểm công nhận',
    ]);
    if (!hasPublishOrEnlightenment) return { verdict: 'pass', focusKey: preset.key, issues };

    if (!hasAny(text, ['thiên đạo thư viện', 'tác gia', 'bạch bút', 'thanh bút', 'văn thánh', 'tân tác gia'])) {
      issues.push({
        code: 'focus_author_library_missing',
        severity: 'major',
        message: 'Thiên Đạo Thư Viện chapter should record the author/library institution affected by the event.',
      });
    }
    const hasPersistedWorkDelta = payload.itemEvents.length > 0
      || payload.plotThreads.some((entry) => hasAny(normalize(`${entry.name} ${entry.description}`), ['tác phẩm', 'bản thảo', 'sách', 'hồi truyện', 'sơn hà', 'loạn thế', 'cửu thiên', 'huyết án']));
    if (!hasAny(text, ['tác phẩm', 'bản thảo', 'đăng sách', 'đăng chương', 'quyển', 'hồi truyện', 'ấn ký tác phẩm']) || !hasPersistedWorkDelta) {
      issues.push({
        code: 'focus_work_delta_missing',
        severity: 'critical',
        message: 'Publish/enlightenment chapter must name and persist the work or manuscript being written/published.',
      });
    }
    if (!hasAny(text, ['độc giả', 'nhập tâm', 'lĩnh ngộ', 'thư bình', 'người đọc', 'fan', 'bình luận'])) {
      issues.push({
        code: 'focus_reader_reaction_missing',
        severity: 'critical',
        message: 'Publish/enlightenment chapter must record reader immersion/reaction.',
      });
    }
    if (!hasAny(text, ['võ công', 'công pháp', 'thân pháp', 'trận pháp', 'kiếm ý', 'chưởng pháp', 'binh pháp', 'ý cảnh'])) {
      issues.push({
        code: 'focus_skill_delta_missing',
        severity: 'critical',
        message: 'Reader enlightenment must produce a concrete martial skill/cultivation/formation/strategy delta.',
      });
    }
    if (!hasAny(text, ['danh vọng', 'điểm công nhận', 'thiên đạo công nhận', 'bảng xếp hạng', 'tân tác gia', 'ấn ký', 'quyền đăng', 'thưởng'])) {
      issues.push({
        code: 'focus_reputation_reward_missing',
        severity: 'major',
        message: 'Chapter should record Heavenly Dao reputation/ranking/resource reward for MC.',
      });
    }
    if ((payload.worldStateDeltas || []).length === 0 && (payload.factions || []).length === 0 && payload.economicLedger.length === 0) {
      issues.push({
        code: 'focus_publish_delta_ledger_missing',
        severity: 'critical',
        message: 'Publish/enlightenment chapter must persist a world/faction/economic delta so the author progression is not invisible.',
      });
    }
    const critical = issues.some((issue) => issue.severity === 'critical');
    const major = issues.some((issue) => issue.severity === 'major');
    return {
      verdict: critical ? 'block' : major ? 'revise' : 'pass',
      focusKey: preset.key,
      issues,
    };
  }
  const text = normalize([
    payload.summary,
    payload.mcState,
    payload.cliffhanger,
    ...payload.economicLedger.map((entry) => `${entry.deltaSummary} ${entry.assets.join(' ')}`),
    ...(payload.tradeLedger || []).map((entry) => `${entry.resourceName} ${entry.source} ${entry.cost} ${entry.expectedValue} ${entry.logisticsConstraint} ${entry.worldStateImpact}`),
    ...(payload.worldStateDeltas || []).map((entry) => `${entry.worldName} ${entry.deltaType} ${entry.description} ${entry.pressureChange} ${entry.relatedResources.join(' ')}`),
  ].join('\n'));
  const hasTradeScene = hasAny(text, ['buôn', 'bán', 'mua', 'trao đổi', 'giao dịch', 'hàng', 'vốn', 'lợi nhuận', 'doanh thu', 'chênh lệch', 'thương hội', 'route', 'ledger', 'quyền', 'hợp đồng', 'giấy phép']);
  if (!hasTradeScene) return { verdict: 'pass', focusKey: preset.key, issues };

  if ((payload.tradeLedger || []).length === 0) {
    issues.push({
      code: 'focus_trade_ledger_missing',
      severity: 'critical',
      message: 'Song Xuyen chapter has trade signals but continuity.json lacks tradeLedger.',
    });
  }
  if ((payload.worldStateDeltas || []).length === 0) {
    issues.push({
      code: 'focus_world_state_delta_missing',
      severity: 'major',
      message: 'Song Xuyen trade scene must record worldStateDeltas so exchange/value drift is not invisible.',
    });
  }
  const dividendText = normalize([
    payload.readerPayoff?.tradeDividend || '',
    payload.readerPayoff?.progressionDelta || '',
    payload.readerPayoff?.comfortOrSwaggerBeat || '',
    payload.readerPayoff?.nextProfitHook || '',
    payload.mcState,
    payload.summary,
    ...payload.economicLedger.map((entry) => `${entry.cashEstimate || ''} ${entry.assets.join(' ')} ${entry.deltaSummary} ${entry.notes || ''}`),
    ...(payload.tradeLedger || []).map((entry) => `${entry.expectedValue} ${entry.worldStateImpact}`),
    ...(payload.relationships || []).map((entry) => `${entry.relationshipType} ${entry.notes || ''}`),
  ].join('\n'));
  const hasProgressionDividend = hasAny(dividendText, [
    'lãi',
    'lợi nhuận',
    'doanh thu',
    'vốn tăng',
    'thêm vốn',
    'khách hàng',
    'hợp đồng',
    'giấy phép',
    'quyền route',
    'quyền tuyến',
    'quyền xem',
    'quyền kiểm',
    'slot',
    'suất',
    'nguồn cung',
    'đòn bẩy',
    'uy tín',
    'trust',
    'dữ liệu giá',
    'ledger advantage',
    'route token',
    'priority',
    'ưu tiên',
    'bảo hộ',
    'quyền vận chuyển',
    'tài sản',
  ]);
  if (!hasProgressionDividend) {
    issues.push({
      code: 'focus_trade_dividend_missing',
      severity: 'major',
      message: 'Song Xuyen chapter must give MC a concrete trade/progression dividend, not only more pressure or suffering.',
    });
  }
  if (!payload.readerPayoff?.tradeDividend || !payload.readerPayoff?.progressionDelta) {
    issues.push({
      code: 'focus_reader_payoff_missing',
      severity: 'major',
      message: 'Song Xuyen continuity.json must include readerPayoff.tradeDividend and readerPayoff.progressionDelta so the chapter cannot pass as pure procedural suffering.',
    });
  }
  const riskOnlyText = normalize(`${payload.summary}\n${payload.mcState}\n${payload.cliffhanger}`);
  const riskSignals = countMatches(riskOnlyText, ['nguy cơ', 'rủi ro', 'bị', 'áp lực', 'đe dọa', 'bẩn', 'leak', 'mất', 'chưa sạch', 'khổ', 'trì hoãn']);
  const winSignals = countMatches(dividendText, ['lãi', 'lợi', 'vốn', 'khách', 'quyền', 'hợp đồng', 'uy tín', 'nguồn cung', 'dữ liệu giá', 'đòn bẩy', 'giấy phép', 'slot', 'ưu tiên']);
  if (riskSignals >= 4 && winSignals < 2) {
    issues.push({
      code: 'focus_risk_only_chapter',
      severity: 'major',
      message: 'Song Xuyen chapter reads risk-heavy without enough visible win signals. Revise toward trade/progression payoff.',
    });
  }
  const itemNames = new Set(payload.itemEvents.map((event) => normalize(event.itemName)));
  const economicText = normalize(payload.economicLedger.map((entry) => `${entry.assets.join(' ')} ${entry.deltaSummary}`).join('\n'));
  for (const trade of payload.tradeLedger || []) {
    const resource = normalize(trade.resourceName);
    if (!trade.source || !trade.cost || !trade.logisticsConstraint || !trade.worldStateImpact) {
      issues.push({
        code: 'focus_trade_entry_incomplete',
        severity: 'critical',
        message: `Trade ledger entry "${trade.resourceName}" must include source, cost, logisticsConstraint and worldStateImpact.`,
      });
    }
    if (!itemNames.has(resource) && !economicText.includes(resource)) {
      issues.push({
        code: 'focus_resource_without_source',
        severity: 'critical',
        message: `Trade resource "${trade.resourceName}" has no matching itemEvents/economicLedger source.`,
      });
    }
  }
  const critical = issues.some((issue) => issue.severity === 'critical');
  const major = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    focusKey: preset.key,
    issues,
  };
}

export function formatFocusPresetReport(report: FocusPresetValidationReport): string {
  const issueText = report.issues.length
    ? report.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`).join('\n')
    : '- ok';
  return [
    `Focus preset: ${report.focusKey} verdict=${report.verdict}`,
    'Issues:',
    issueText,
  ].join('\n');
}
