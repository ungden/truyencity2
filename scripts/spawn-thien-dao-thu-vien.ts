/**
 * Spawn/refresh the live focus project:
 * "Thiên Đạo Thư Viện: Ta Dùng Văn Minh Trái Đất Phong Thần".
 *
 * Dry-run by default:
 *   node --import tsx scripts/spawn-thien-dao-thu-vien.ts
 *
 * Apply:
 *   node --import tsx scripts/spawn-thien-dao-thu-vien.ts --apply
 */
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getFocusPreset, validateFocusPresetStorySetup } from '@/services/story-engine/codex-automation/focus-presets';
import { validateKnowledgeCoverage } from '@/services/story-engine/codex-automation/genre-knowledge';
import type { GenreType, StoryKernel } from '@/services/story-engine/types';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true, override: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const APPLY = process.argv.includes('--apply');
const FOCUS_KEY = 'thien-dao-thu-vien';
const TITLE = 'Thiên Đạo Thư Viện: Ta Dùng Văn Minh Trái Đất Phong Thần';
const SLUG = 'thien-dao-thu-vien-ta-dung-van-minh-trai-dat-phong-than';
const MAIN_CHARACTER = 'Lâm Mặc';
const GENRE: GenreType = 'di-gioi';
const SUB_GENRES = ['viet-van-sang-the', 'nho-dao', 'thien-dao-luu', 'vo-dao'];
const TOTAL_CHAPTERS = 1000;
const DAILY_QUOTA = 50;

const worldDescription = `Đại Diễn Giới là một dị giới võ đạo thịnh hành đến mức ai cũng luyện khí huyết: trẻ con học bộ pháp cơ sở, tiểu thương biết quyền cước phòng thân, học viện dùng võ công để phân tầng thân phận. Trên tầng võ giả bình thường là Tác Gia, tầng lớp VIP được Thiên Đạo Thư Viện công nhận. Một Tác Gia có thể viết sách, đăng bản thảo lên Thiên Đạo Thư Viện, nhận thư bình, điểm công nhận, bảng xếp hạng, quyền đăng và ấn ký tác phẩm. Khi độc giả đọc đến cảnh đủ hay, họ có thể nhập tâm vào nhân vật trong sách, trải qua ý cảnh như thật rồi lĩnh ngộ võ công, công pháp, thân pháp, trận pháp, kiếm ý hoặc binh pháp.

Tác Gia được chia cấp Bạch Bút -> Thanh Bút -> Kim Bút -> Tông Sư -> Văn Thánh -> Thiên Đạo Tác Gia. Mỗi cấp mở quyền khác nhau: số hồi được đăng mỗi ngày, quyền lập thư hội độc giả, quyền mở diễn võ trong sách, quyền nhận phản hồi tu vi và quyền để tác phẩm thành truyền thừa bán công khai. Văn hóa viết sách bản địa còn sơ khai và đơn nhất: nhân vật thường chỉ là thiên tài đánh liên tục, tình tiết thiếu hồi hộp, tuyến phụ cứng, phản diện hô khẩu hiệu. Vì vậy độc giả Đại Diễn Giới biết đọc để học võ, nhưng chưa từng thấy kỹ thuật kể chuyện hiện đại như phục bút, cao trào nhiều tuyến, nhân vật trưởng thành, chiến tranh mưu lược, bí ẩn trinh thám hay thế giới quan lớn.

Lâm Mặc xuyên qua thân phận thư sinh nghèo vừa thi rớt Bạch Bút khảo hạch. Hắn mang theo Vạn Văn Ký Ức, bàn tay vàng lưu trữ văn minh Trái Đất: kiếm hiệp, lịch sử, Tam Quốc style, Anh Hùng Xạ Điêu/Tiếu Ngạo style, huyền huyễn, thần thoại, phim ảnh, game, trinh thám, chiến tranh và webnovel. Vạn Văn Ký Ức không cho phép copy thô; nó tái cấu trúc ký ức thành bản thảo hợp luật Thiên Đạo, tự đổi tên, đổi địa lý, đổi pháp môn, tính chi phí tinh thần, độ tương thích độc giả, rủi ro hiểu sai và phần thưởng danh vọng. Nếu Lâm Mặc viết đủ hay, độc giả lĩnh ngộ càng nhiều, hắn càng nhận điểm công nhận, phản hồi khí huyết, quyền đăng và danh vọng Tác Gia.

Loop cốt lõi: Lâm Mặc chọn template Trái Đất -> dùng Vạn Văn Ký Ức dị giới hóa thành tác phẩm mới -> đăng lên Thiên Đạo Thư Viện -> độc giả nhập tâm/lĩnh ngộ võ học -> thư bình, bảng Tân Tác Gia, học viện/tông môn/triều đình phản ứng -> MC nhận danh vọng/tài nguyên/tu vi tự vệ -> mở tác phẩm tiếp theo. Đây là sảng văn Tác Gia chủ đạo: trở ngại chỉ là người bản địa coi thường, văn đàn chèn ép, độc giả hiểu sai hoặc đối thủ bắt chước; MC dùng chương mới, plot twist, bảng xếp hạng và độc giả ngộ võ để phản đòn nhanh.

Các tuyến tác phẩm dài hạn: "Sơn Hà Xạ Nhật" kiểu kiếm hiệp anh hùng giúp độc giả ngộ chưởng pháp, khinh công, xạ thuật và nghĩa hiệp; "Loạn Thế Mưu Vương" kiểu Tam Quốc giúp quân viện ngộ trận pháp, binh pháp và thuật dùng người; "Cửu Thiên Hỏa Chủng" kiểu huyền huyễn giúp luyện đan viện ngộ dị hỏa/công pháp; "Huyết Án Bạch Ngọc Lâu" kiểu trinh thám võ đạo giúp bộ khoái học suy luận, phá án và thân pháp ẩn dấu. Mỗi tuyến có độc giả/faction đại diện và phản ứng xã hội để giữ mạch 1000 chương.`;

const description = 'Lâm Mặc xuyên qua Đại Diễn Giới, nơi ai cũng là võ giả nhưng Tác Gia mới là tầng lớp được Thiên Đạo công nhận. Bằng Vạn Văn Ký Ức và kho văn minh Trái Đất, hắn đăng sách lên Thiên Đạo Thư Viện, khiến độc giả nhập tâm lĩnh ngộ võ công, công pháp và binh pháp. Văn đàn bản địa còn sơ khai, bảng Tân Tác Gia vừa mở ra đã bị một người mới dùng kỹ thuật kể chuyện hiện đại làm chấn động thiên hạ.';

const setupKernel: StoryKernel = {
  readerFantasy: 'Lâm Mặc dùng kho văn minh Trái Đất và kỹ thuật kể chuyện hiện đại để trở thành Tác Gia được Thiên Đạo Thư Viện công nhận, khiến độc giả lĩnh ngộ võ đạo rồi trả lại danh vọng, điểm công nhận và tài nguyên cho hắn.',
  protagonistEngine: 'MC thắng bằng Vạn Văn Ký Ức, khả năng chọn template đúng lúc, dị giới hóa bản thảo, đọc phản ứng độc giả và leo bảng Tác Gia thay vì lao vào đánh nhau kéo dài.',
  pleasureLoop: [
    'chọn một template văn học/phim/game Trái Đất phù hợp bài toán hiện tại',
    'Vạn Văn Ký Ức tái cấu trúc bản thảo thành tác phẩm hợp luật Thiên Đạo',
    'đăng sách lên Thiên Đạo Thư Viện và chờ phản ứng thư bình/bảng xếp hạng',
    'độc giả nhập tâm vào cảnh truyện rồi lĩnh ngộ võ học/công pháp cụ thể',
    'faction bản địa chấn động, đối thủ bị face-slap bằng số liệu đọc và lĩnh ngộ',
    'Lâm Mặc nhận điểm công nhận, danh vọng, quyền đăng hoặc phản hồi khí huyết',
  ],
  systemMechanic: {
    name: 'Vạn Văn Ký Ức',
    input: 'ký ức văn học, phim ảnh, game, thần thoại, lịch sử và webnovel Trái Đất cộng với nhu cầu võ đạo hiện tại của độc giả Đại Diễn Giới',
    output: 'bản thảo dị giới hóa hợp luật Thiên Đạo, kèm dự báo độ tương thích độc giả, võ học có thể phát sinh, chi phí tinh thần và rủi ro hiểu sai',
    limit: 'không được copy thô tên/plot nguyên bản, phải trả chi phí tinh thần và cần phản ứng độc giả thật để đổi thành điểm công nhận',
    reward: 'điểm công nhận, danh vọng Tác Gia, quyền đăng, thư bình, phản hồi khí huyết và tài nguyên Thiên Đạo',
  },
  mcSecret: {
    secret: 'Lâm Mặc có ký ức văn minh Trái Đất và Vạn Văn Ký Ức tái cấu trúc tác phẩm từ kiếp trước.',
    outsideWorldKnowledge: 'Người ngoài chỉ biết hắn là Tác Gia mới có thiên phú cấu truyện kỳ lạ, chưa biết kho ký ức Trái Đất.',
    revealRule: 'Không công khai bí mật trong 300 chương đầu; chỉ để lộ qua tác phẩm ngày càng rộng và lời đồn hắn là người được Văn Đạo ưu ái.',
  },
  benefitLoop: {
    goal: 'leo từ Bạch Bút vô danh lên Thiên Đạo Tác Gia bằng tác phẩm được độc giả thật sự lĩnh ngộ',
    action: 'viết, đăng, theo dõi thư bình, tối ưu hồi tiếp theo và dùng kết quả lĩnh ngộ để mở quyền đăng cao hơn',
    benefit: 'mỗi 1-3 chương phải có một phần thưởng thấy được: điểm công nhận, bảng xếp hạng, quyền đăng, độc giả trung thành, phản hồi khí huyết hoặc faction mời hợp tác',
    cadence: 'payoff nhỏ mỗi chương, payoff bảng xếp hạng mỗi 5 chương, nâng quyền Tác Gia mỗi 30-50 chương',
  },
  interventionRule: 'Lâm Mặc chỉ can thiệp vào tranh chấp ngoài đời khi nó liên quan trực tiếp đến tác phẩm, độc giả, quyền đăng, danh vọng hoặc an toàn của hắn; không nhận việc cứu người ngoài nếu không tạo payoff Tác Gia.',
  phase1Playground: {
    locations: ['Bạch Bút Học Xá', 'Thiên Đạo Thư Viện phân lâu thành Thanh Nhai', 'quảng trường Bảng Tân Tác Gia', 'trà lâu Thư Bình Các'],
    cast: ['Lâm Mặc', 'Tô Thanh Nghi', 'Cố Nham', 'Giang Bách Luyện', 'Hạ Vũ Đồng'],
    resources: ['điểm công nhận', 'quyền đăng hồi tiếp', 'thư bình độc giả', 'ấn ký tác phẩm', 'phản hồi khí huyết'],
    localAntagonists: ['Cố Nham, Bạch Bút lâu năm viết truyện đơn tuyến và coi thường tân nhân', 'Thư Lại Viện kiểm duyệt sợ tác phẩm mới phá quy củ cũ'],
    repeatableSceneTypes: ['MC viết/chỉnh bản thảo bằng Vạn Văn Ký Ức', 'độc giả nhập tâm lĩnh ngộ võ học', 'bảng xếp hạng/thư bình bùng nổ phản ứng', 'Tác Gia bản địa bị face-slap bằng số liệu đọc'],
  },
  socialReactor: {
    witnesses: ['độc giả võ sinh bình dân', 'Bạch Bút Học Xá', 'Thư Bình Các', 'học viện võ đạo Thanh Nhai', 'bảng Tân Tác Gia'],
    reactionModes: ['thư bình trực tiếp', 'bảng xếp hạng đổi hạng', 'ngộ võ tại chỗ', 'faction gửi thiếp mời', 'đối thủ bắt chước rồi lộ yếu'],
    reportBackCadence: 'mỗi chương có ít nhất một phản ứng độc giả hoặc bảng xếp hạng; mỗi 5 chương có reaction cluster từ faction lớn hơn',
  },
  noveltyLadder: [
    { chapterRange: '1-50', newToy: 'Sơn Hà Xạ Nhật kiếm hiệp anh hùng, độc giả ngộ chưởng pháp/xạ thuật/nghĩa hiệp', keepsSameLane: 'vẫn là viết sách -> độc giả lĩnh ngộ -> Thiên Đạo công nhận' },
    { chapterRange: '51-150', newToy: 'Loạn Thế Mưu Vương chiến tranh/binh pháp, quân viện và thế gia tranh quyền diễn giải', keepsSameLane: 'mở rộng tác phẩm sang chiến tranh nhưng payoff vẫn qua Tác Gia và thư viện' },
    { chapterRange: '151-300', newToy: 'Cửu Thiên Hỏa Chủng huyền huyễn/thần thoại, luyện đan viện ngộ dị hỏa', keepsSameLane: 'dùng văn minh Trái Đất làm template hợp luật Thiên Đạo' },
    { chapterRange: '301-600', newToy: 'Huyết Án Bạch Ngọc Lâu trinh thám võ đạo, bộ khoái và học viện học suy luận', keepsSameLane: 'tác phẩm đổi lĩnh vực nhưng độc giả/faction vẫn là dopamine loop' },
    { chapterRange: '601-1000', newToy: 'văn đạo ảnh hưởng tông môn, triều đình, học viện; Thiên Đạo Thư Viện xem MC là người tái lập văn đạo', keepsSameLane: 'MC là Tác Gia chủ đạo, không chuyển thành thuần chiến thần' },
  ],
  controlRules: {
    payoffCadence: 'mỗi chương có payoff hữu hình, mỗi 5 chương có bảng/reaction cluster, mỗi 20-50 chương nâng quyền hoặc mở tác phẩm mới',
    attentionGradient: 'mở từ thư viện địa phương -> bảng Tân Tác Gia -> học viện võ đạo -> quân viện/triều đình -> Văn Đạo toàn giới',
    openThreadsPerArc: 3,
    closeThreadsPerArc: 2,
  },
  patternCards: ['viet-van-sang-the', 'reader-reaction-loop', 'ranking-face-slap', 'culture-carry-progression'],
};

const storyOutline = {
  id: 'thien-dao-thu-vien-outline',
  title: TITLE,
  genre: GENRE,
  premise: 'Lâm Mặc xuyên qua Đại Diễn Giới, dùng Vạn Văn Ký Ức và kho văn minh Trái Đất để viết sách được Thiên Đạo Thư Viện công nhận, khiến độc giả nhập tâm lĩnh ngộ võ đạo.',
  themes: ['văn minh kể chuyện đánh thức võ đạo', 'độc giả và tác giả cùng tiến hóa', 'danh vọng được xây bằng payoff thật'],
  mainConflict: 'Văn đàn bản địa sơ khai và các Tác Gia cũ cố giữ quy củ, trong khi tác phẩm của Lâm Mặc liên tục tạo lĩnh ngộ mới làm Thiên Đạo Thư Viện đổi luật chơi.',
  targetChapters: TOTAL_CHAPTERS,
  protagonist: {
    name: MAIN_CHARACTER,
    startingState: 'Thư sinh mới xuyên qua, thi rớt Bạch Bút, khí huyết yếu nhưng có Vạn Văn Ký Ức và kho văn minh Trái Đất.',
    endGoal: 'Trở thành Thiên Đạo Tác Gia, người tái lập Văn Đạo của Đại Diễn Giới.',
    characterArc: 'Từ tân nhân bị coi thường thành tác gia chủ đạo biết dùng tác phẩm, độc giả và Thiên Đạo công nhận để thay đổi võ đạo.',
  },
  majorPlotPoints: [
    { chapter: 1, event: 'Lâm Mặc đăng hồi đầu Sơn Hà Xạ Nhật, độc giả đầu tiên nhập tâm và ngộ Phá Vân Chưởng.' },
    { chapter: 50, event: 'Sơn Hà Xạ Nhật đưa Lâm Mặc lên Thanh Bút, bảng Tân Tác Gia công nhận hắn là hiện tượng.' },
    { chapter: 150, event: 'Loạn Thế Mưu Vương khiến quân viện tranh quyền đọc, đối thủ bản địa bị face-slap vì truyện đơn tuyến không tạo lĩnh ngộ.' },
    { chapter: 300, event: 'Cửu Thiên Hỏa Chủng mở tuyến huyền huyễn/thần thoại, Thiên Đạo cấp ấn ký Kim Bút.' },
    { chapter: 600, event: 'Tác phẩm trinh thám võ đạo tạo hệ suy luận pháp môn, triều đình và học viện buộc phải công nhận Văn Đạo mới.' },
    { chapter: 1000, event: 'Lâm Mặc dùng vạn văn hợp lưu để trở thành Thiên Đạo Tác Gia, để lại thư viện văn minh cho toàn Đại Diễn Giới.' },
  ],
  endingVision: 'Lâm Mặc không thành thuần võ thần; hắn trở thành Thiên Đạo Tác Gia, dùng sách làm đường cho vạn võ giả cùng lĩnh ngộ.',
  uniqueHooks: ['Thiên Đạo Thư Viện biến độc giả reaction thành power economy', 'Vạn Văn Ký Ức dị giới hóa kho văn minh Trái Đất', 'face-slap bằng bảng xếp hạng, thư bình và người đọc ngộ võ'],
  setupKernel,
  ledgers: ['tác phẩm đang viết', 'độc giả nhập tâm', 'võ học/công pháp phát sinh', 'điểm công nhận', 'danh vọng Tác Gia', 'faction phản ứng'],
  canonRules: [
    'Không copy thô tên/plot nguyên bản; mọi tác phẩm phải được Vạn Văn Ký Ức tái cấu trúc.',
    'Nếu độc giả lĩnh ngộ, phải có tác phẩm/cảnh đọc/skill/phản ứng/phần thưởng.',
    'MC có thể tăng võ đạo tự vệ nhờ phản hồi độc giả nhưng không chuyển thành truyện combat thuần.',
  ],
};

const masterOutline = {
  title: TITLE,
  targetChapters: TOTAL_CHAPTERS,
  majorArcs: [
    { name: 'Bạch Bút chấn động', startChapter: 1, endChapter: 50, corePayoff: 'tác phẩm đầu tiên sinh võ học và kéo Lâm Mặc lên bảng Tân Tác Gia' },
    { name: 'Thanh Bút leo bảng', startChapter: 51, endChapter: 150, corePayoff: 'nhiều dòng tác phẩm, bút danh và thư hội độc giả ổn định' },
    { name: 'Kim Bút đa tuyến', startChapter: 151, endChapter: 300, corePayoff: 'kiếm hiệp, chiến tranh, huyền huyễn và trinh thám võ đạo cùng tạo ảnh hưởng faction' },
    { name: 'Văn Đạo rung chuyển', startChapter: 301, endChapter: 600, corePayoff: 'học viện, tông môn, triều đình phải xây cơ chế quanh tác phẩm của MC' },
    { name: 'Thiên Đạo Tác Gia', startChapter: 601, endChapter: 1000, corePayoff: 'MC hợp lưu văn minh Trái Đất với Văn Đạo Đại Diễn Giới và phong thần bằng tác phẩm' },
  ],
};

const arcPlan = [
  { chapter: 1, goal: 'Đăng hồi đầu Sơn Hà Xạ Nhật', conflict: 'Bạch Bút cũ chê người mới viết quá nhiều tuyến', payoff: 'độc giả đầu tiên ngộ Phá Vân Chưởng, MC nhận điểm công nhận', hook: 'bảng Tân Tác Gia nhảy hạng' },
  { chapter: 10, goal: 'Ổn định nhóm độc giả đầu tiên', conflict: 'độc giả hiểu sai nghĩa hiệp thành đấu đá', payoff: 'MC dùng hồi tiếp theo chỉnh ý cảnh, nhận thư bình thật', hook: 'học viện võ đạo gửi thiếp hỏi quyền đọc' },
  { chapter: 25, goal: 'Face-slap Tác Gia đơn tuyến', conflict: 'Cố Nham bắt chước nhưng không tạo lĩnh ngộ', payoff: 'Sơn Hà Xạ Nhật sinh khinh công mới', hook: 'Thiên Đạo mở thử thách Thanh Bút sớm' },
  { chapter: 50, goal: 'Kết arc Bạch Bút', conflict: 'thư viện kiểm chứng nguồn gốc tác phẩm', payoff: 'Vạn Văn Ký Ức chứng minh bản thảo hợp luật, Lâm Mặc lên Thanh Bút', hook: 'quân viện muốn hắn viết chiến tranh/binh pháp' },
];

const chapterBriefs = Array.from({ length: 20 }, (_, idx) => {
  const chapterNumber = idx + 1;
  const beats = [
    'Lâm Mặc tỉnh ở Bạch Bút Học Xá, nhận ra văn đàn bản địa viết truyện sơ khai và mở Vạn Văn Ký Ức.',
    'Hắn chọn template anh hùng kiếm hiệp, tái cấu trúc thành Sơn Hà Xạ Nhật rồi trả chi phí tinh thần đầu tiên.',
    'Hồi đầu được đăng lên Thiên Đạo Thư Viện, độc giả võ sinh bình dân nhập tâm vào cảnh kéo cung.',
    'Độc giả lĩnh ngộ Phá Vân Chưởng, thư bình đầu tiên làm bảng Tân Tác Gia dao động.',
    'Cố Nham cười nhạo nhiều tuyến nhân vật, nhưng số liệu đọc và điểm công nhận phản đòn ngay.',
  ];
  return {
    chapterNumber,
    brief: beats[idx] || `Tiếp tục Sơn Hà Xạ Nhật: Lâm Mặc dùng hồi ${chapterNumber} để mở thêm nhân vật, độc giả nhập tâm sâu hơn, sinh một mảnh võ học nhỏ và kéo phản ứng bảng xếp hạng.`,
    sceneDirection: `Ch.${chapterNumber} phải giữ loop viết/đăng/độc giả lĩnh ngộ/phản ứng bảng.`,
    mcBenefit: `Lâm Mặc nhận payoff hữu hình: điểm công nhận, thư bình, danh vọng hoặc quyền đăng liên quan Sơn Hà Xạ Nhật ch.${chapterNumber}.`,
  };
});

function getDb() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function vnDateToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function getSystemUserId(db: ReturnType<typeof getDb>): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').limit(1).single();
  if (error || !data?.id) throw new Error(`No system profile found: ${error?.message || 'empty'}`);
  return data.id;
}

async function main() {
  const focusPreset = getFocusPreset(FOCUS_KEY);
  if (!focusPreset) throw new Error(`Missing focus preset ${FOCUS_KEY}`);
  const validationPayload = {
    title: TITLE,
    genres: [GENRE],
    subGenres: SUB_GENRES,
    worldDescription,
    setupKernel,
    masterOutline,
    storyOutline,
    arcPlan,
  };
  const focusReport = validateFocusPresetStorySetup(validationPayload, FOCUS_KEY);
  const knowledgeReport = validateKnowledgeCoverage(validationPayload);
  console.log(`spawn=${TITLE}`);
  console.log(`apply=${APPLY}`);
  console.log(`focus_verdict=${focusReport.verdict}`);
  console.log(`knowledge_verdict=${knowledgeReport.verdict}`);
  if (focusReport.verdict !== 'pass') {
    console.log(JSON.stringify(focusReport.issues, null, 2));
    throw new Error('Focus preset validation failed');
  }
  if (knowledgeReport.verdict !== 'pass') {
    console.log(JSON.stringify(knowledgeReport.issues, null, 2));
    throw new Error('Knowledge validation failed');
  }
  if (!APPLY) {
    console.log('Dry-run passed. Re-run with --apply to insert/update live DB.');
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const userId = await getSystemUserId(db);
  const styleDirectives = {
    disable_chapter_split: true,
    flash_bulk_cheap_mode: true,
    flash_writer_enabled: true,
    flash_routine_soft_gate: true,
    flash_routine_max_retries: 1,
    flash_routine_max_extensions: 2,
    flash_bulk_context_max_chars: 32000,
    flash_bulk_min_words: 2600,
    production_daily_chapter_quota: DAILY_QUOTA,
    target_chapter_length_override: 3000,
    deepseek_thinking_enabled: true,
    deepseek_thinking_tasks: ['writer'],
    codex_director_only: true,
    provider: 'deepseek_flash_cheap_routine',
    focus_key: FOCUS_KEY,
    focus_preset_report: focusReport,
    genre_knowledge_pack_version: knowledgeReport.packVersion,
    knowledge_alignment: knowledgeReport.verdict,
  };

  const { data: existingNovel, error: existingErr } = await db
    .from('novels')
    .select('id,title')
    .eq('slug', SLUG)
    .maybeSingle();
  if (existingErr) throw existingErr;

  let novelId = existingNovel?.id as string | undefined;
  if (!novelId) {
    novelId = randomUUID();
    const { error } = await db.from('novels').insert({
      id: novelId,
      title: TITLE,
      slug: SLUG,
      author: 'Truyện City',
      description,
      status: 'Đang ra',
      genres: [GENRE, ...SUB_GENRES],
      cover_prompt: focusPreset.coverPromptHints.join(', '),
    });
    if (error) throw error;
    console.log(`novel_created=${novelId}`);
  } else {
    const { error } = await db.from('novels').update({
      title: TITLE,
      description,
      status: 'Đang ra',
      genres: [GENRE, ...SUB_GENRES],
      cover_prompt: focusPreset.coverPromptHints.join(', '),
    }).eq('id', novelId);
    if (error) throw error;
    console.log(`novel_updated=${novelId}`);
  }

  const { data: existingProject, error: projectLookupErr } = await db
    .from('ai_story_projects')
    .select('id')
    .eq('novel_id', novelId)
    .maybeSingle();
  if (projectLookupErr) throw projectLookupErr;
  const projectId = (existingProject?.id as string | undefined) || randomUUID();
  const projectRow = {
    id: projectId,
    user_id: userId,
    novel_id: novelId,
    genre: GENRE,
    main_character: MAIN_CHARACTER,
    world_description: worldDescription,
    writing_style: 'webnovel_chinese',
    target_chapter_length: 3000,
    ai_model: 'deepseek-v4-flash',
    temperature: 0.75,
    current_chapter: 0,
    total_planned_chapters: TOTAL_CHAPTERS,
    status: 'active',
    setup_stage: 'ready_to_write',
    setup_stage_attempts: 0,
    sub_genres: SUB_GENRES,
    mc_archetype: focusPreset.mcArchetype,
    anti_tropes: focusPreset.antiTropes,
    master_outline: masterOutline,
    story_outline: storyOutline,
    style_directives: styleDirectives,
    updated_at: now,
  };

  const { error: upsertProjectErr } = await db
    .from('ai_story_projects')
    .upsert(projectRow, { onConflict: 'id' });
  if (upsertProjectErr) throw upsertProjectErr;

  const { error: arcErr } = await db.from('arc_plans').upsert({
    project_id: projectId,
    arc_number: 1,
    start_chapter: 1,
    end_chapter: 20,
    arc_theme: 'Bạch Bút chấn động bằng tác phẩm đầu tiên',
    plan_text: 'Lâm Mặc dùng Vạn Văn Ký Ức viết Sơn Hà Xạ Nhật, đăng lên Thiên Đạo Thư Viện, kéo độc giả đầu tiên nhập tâm/lĩnh ngộ và leo bảng Tân Tác Gia. Arc phải giữ loop: tác phẩm -> độc giả -> võ học -> danh vọng -> đối thủ phản ứng.',
    sub_arcs: [
      { range: '1-5', goal: 'kích hoạt Vạn Văn Ký Ức và đăng hồi đầu', payoff: 'Phá Vân Chưởng xuất hiện' },
      { range: '6-12', goal: 'ổn định độc giả đầu tiên', payoff: 'thư bình và điểm công nhận tăng' },
      { range: '13-20', goal: 'face-slap Cố Nham và mở bảng xếp hạng', payoff: 'quyền đăng hồi tiếp và thiếp mời học viện' },
    ],
    chapter_briefs: chapterBriefs,
    threads_to_advance: ['Sơn Hà Xạ Nhật', 'Bảng Tân Tác Gia', 'Vạn Văn Ký Ức'],
    threads_to_resolve: [],
    new_threads: ['độc giả đầu tiên lĩnh ngộ Phá Vân Chưởng', 'Cố Nham bắt đầu bắt chước thất bại'],
  }, { onConflict: 'project_id,arc_number' });
  if (arcErr) throw arcErr;

  const vnDate = vnDateToday();
  const { error: quotaErr } = await db.from('project_daily_quotas').upsert({
    project_id: projectId,
    vn_date: vnDate,
    target_chapters: DAILY_QUOTA,
    written_chapters: 0,
    status: 'active',
    next_due_at: now,
    retry_count: 0,
    last_error: null,
    updated_at: now,
  }, { onConflict: 'project_id,vn_date' });
  if (quotaErr) throw quotaErr;

  console.log(`project_id=${projectId}`);
  console.log(`novel_id=${novelId}`);
  console.log(`focus_key=${FOCUS_KEY}`);
  console.log(`status=active setup_stage=ready_to_write ai_model=deepseek-v4-flash daily_quota=${DAILY_QUOTA}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
