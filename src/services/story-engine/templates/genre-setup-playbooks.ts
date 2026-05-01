/**
 * Genre Setup Playbooks — Phase 29
 *
 * Per-genre research data threaded vào setup-pipeline (idea/world/character/description
 * stages). Trước Phase 29: setup-pipeline chỉ dùng `seed-blueprint` generic + universal
 * sảng-văn DNA → idea + world + character generated bằng prompt generic, Writer phải
 * compensate sau ở mọi chương.
 *
 * Phase 29 fix: hardcode 1 lần research deep cho 16 genres. Setup pipeline AI dùng
 * playbook làm POSITIVE incentive — không random tự sáng tạo, mà PICK từ menu của
 * worldbuilding hooks / archetype / opening scene / tension axis.
 *
 * NHẤT QUÁN với Phase 19/20 sảng-văn DNA:
 *   - Warm baseline opening (MC có golden finger ACTIVE từ ch.1, KHÔNG rock-bottom)
 *   - Phase 1 antagonist LOCAL only — KHÔNG cosmic-tier (Đại Đế / Tổ Tiên / Tối Thượng)
 *   - GROWTH > SURVIVAL framing (MC theo đuổi X, KHÔNG MC chạy trốn X)
 *   - Anti rock-bottom triggers: ngất xỉu / đói lạnh / nô lệ / amnesia openings BANNED
 *
 * Reference: Phase 19F mì-ăn-liền (≥2 dopamine peaks/chương), Phase 19D warm-baseline,
 *            Phase 20A 3 new top-level genres (quy-tac-quai-dam, ngu-thu-tien-hoa, khoai-xuyen).
 */

import type { GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface McArchetype {
  /** Short label, used as JSON key for AI selection (vd "silent-OP", "phế vật giả phế") */
  name: string;
  /** Voice/personality summary — feeds into character voice anchor */
  voice: string;
  /** Signature trait/move (làm reader nhớ MC này khác MC khác) */
  signature: string;
  /** Genres/sub-genres this archetype thrives in (informational) */
  fits: string[];
  /** Anti-patterns explicit BANNED nếu pick archetype này */
  antiPatterns: string[];
}

export interface OpeningScene {
  /** 1-line scenario description (Vietnamese) */
  scenario: string;
  /** Hook/promise reader sees in scene 1-2 (≤50% chương) */
  hook: string;
  /** Anti-pattern this scene AVOIDS (rock-bottom / amnesia / etc.) */
  antiPattern: string;
}

export interface TensionAxis {
  /** Short label (vd "nội môn rivalry", "thương trường M&A") */
  name: string;
  /** 1-line description of the central conflict */
  description: string;
  /** Arc shape: how this tension escalates across volumes (Phase 1 → 4) */
  arcShape: string;
}

export interface GenreSetupPlaybook {
  /**
   * 10-12 iconic worldbuilding hooks. Setup AI MUST inject ≥3 vào world_description.
   * Mix of: landmarks (cấm địa/pháp khí xưa), factions (sect/corp), taboos (cấm thuật),
   * recurring events (bí cảnh open mỗi N năm), historical mystery (tổ sư mất tích).
   */
  worldbuildingHooks: string[];
  /** 5-7 MC archetypes, each with voice+signature. Setup AI picks 1 for character stage. */
  mcArchetypes: McArchetype[];
  /** 5-7 opening scene templates — all warm-baseline aware. */
  openingScenes: OpeningScene[];
  /** 3-5 central tension axes — describes what the long arc IS about. */
  tensionAxes: TensionAxis[];
  /** Hook checklist for validators */
  hookChecklist: { minHooks: number; hookTypes: string[] };
}

// ── Playbooks: 16 genres ─────────────────────────────────────────────────────

const TIEN_HIEP: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Tổ sư khai phái mất tích cách đây 3000 năm — di vật rải rác chờ truyền nhân',
    'Cấm địa cổ phong ấn cổ thần — mở mỗi 60 năm khi linh khí dồn về',
    'Bí cảnh tu luyện chỉ những kẻ dưới Trúc Cơ mới vào được',
    'Linh khí đại lục cạn dần — đại kiếp linh khí khô đến trong 100 năm',
    'Đan đỉnh trấn phái biến mất một đêm — sư môn lao đao tài nguyên',
    'Thiên kiêu lệch lạc xuất hiện một thế hệ một lần — đang là thế hệ này',
    'Linh thảo Vương Long Mạch ngàn năm chỉ nở một lần ở đỉnh núi cấm',
    'Hai Đại Tông Môn 1000 năm thù hận — bề ngoài hòa hảo, bên trong âm mưu',
    'Cổ trận pháp đại lục đang lung lay — yêu thú đáy vực bắt đầu rò rỉ',
    'Cảnh giới Hóa Thần được cho là biến mất 2000 năm — không ai sống đến đó',
    'Pháp khí cổ Linh Thiên Kiếm đang nằm chờ chủ mới — sư phụ tổ truyền lại',
    'Sự kiện "Linh Vũ Đại Hội" sắp tổ chức — tu sĩ trẻ tài năng tranh tài',
  ],
  mcArchetypes: [
    {
      name: 'silent-OP',
      voice: 'Nói ít, hành động dứt khoát. Không khoe khoang, không giải thích. Cho kết quả nói thay.',
      signature: 'Mỗi lần nâng cảnh giới đều giấu kín — đối thủ tưởng MC vẫn yếu mới phát hiện thực lực',
      fits: ['tien-hiep', 'huyen-huyen'],
      antiPatterns: ['nội tâm độc thoại dài lê thê', 'giải thích kế hoạch trước với địch'],
    },
    {
      name: 'phế vật giả phế',
      voice: 'Khiêm nhường lúc đầu, phản công khi cần. Không phô trương, nhưng có nguyên tắc thép.',
      signature: 'Bị xem là phế vật vì che giấu thực lực — đại biểu đột phá khi gia tộc/sư môn cần',
      fits: ['tien-hiep', 'huyen-huyen', 'kiem-hiep'],
      antiPatterns: ['tự thương cảm số phận', 'than vãn bị bắt nạt'],
    },
    {
      name: 'trọng sinh kiến thức hiện đại',
      voice: 'Tỉnh táo, có kế hoạch dài hạn. Biết tương lai nên không vội. Xài kiến thức khoa học giải bí ẩn tu tiên.',
      signature: 'Áp dụng tư duy hiện đại (toán/hóa/tâm lý học) vào tu luyện — pioneer phương pháp mới',
      fits: ['tien-hiep', 'huyen-huyen'],
      antiPatterns: ['báo thù kẻ hãm hại kiếp trước', 'amnesia về kiếp cũ'],
    },
    {
      name: 'thiên kiêu lệch lạc',
      voice: 'Tự tin, ngạo khí, nhưng có lý do — thực lực vượt bậc cùng tuổi. Biết khi nào nên cứng, khi nào nên nhường.',
      signature: 'Tài năng tu luyện top thế hệ + 1 thiên phú độc đáo (vd song hệ, đặc thù pháp tướng)',
      fits: ['tien-hiep', 'huyen-huyen'],
      antiPatterns: ['ngạo mạn vô lý chỉ để bị vả mặt', 'không có tài năng thực sự bù đắp'],
    },
    {
      name: 'cẩu đạo trường sinh',
      voice: 'Cẩn trọng, thiên về phòng thủ. Ưu tiên sống sót lâu dài hơn vinh quang nhanh.',
      signature: 'Từ chối mọi cám dỗ "đại cơ duyên" rủi ro cao — chuyên xây nền móng vững',
      fits: ['tien-hiep'],
      antiPatterns: ['lao vào bí cảnh không suy nghĩ', 'đối đầu trực diện với cường địch'],
    },
    {
      name: 'truyền thừa cổ',
      voice: 'Cổ điển, có học thức tu đạo. Coi trọng truyền thống, đạo lý.',
      signature: 'Là truyền nhân duy nhất của một dòng truyền thừa cổ đã mất tích — kế thừa đầy đủ lý thuyết',
      fits: ['tien-hiep'],
      antiPatterns: ['quá rập khuôn truyền thống không đổi mới'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC dậy trong tiểu môn phái có sư phụ già dạy bài học hôm nay — sáng sớm yên tĩnh',
      hook: 'Hôm nay sư phụ giao MC một nhiệm vụ "đơn giản" hơn lệ thường — MC nhận thấy điểm bất thường',
      antiPattern: 'NO ngất xỉu / NO bị đuổi khỏi sư môn ch.1',
    },
    {
      scenario: 'MC đang bế quan luyện đan ở thạch động sư môn — vừa hoàn thành 1 mẻ đan thượng phẩm',
      hook: 'Ra khỏi thạch động phát hiện sư huynh đệ đang tụ tập về một sự kiện lớn — MC chậm rãi đi xem',
      antiPattern: 'NO bị thương nặng / NO chạy trốn',
    },
    {
      scenario: 'MC trở về sư môn sau 5 năm đi lịch luyện ngoại địa — mang về vật tư nhiều và kinh nghiệm',
      hook: 'Sư môn đã có thay đổi — vài đệ tử trẻ vượt cấp, nhưng tại MC vẫn là "đại sư huynh đi xa"',
      antiPattern: 'NO sư môn bị diệt / NO không có ai thân thiết còn',
    },
    {
      scenario: 'MC vừa đột phá Luyện Khí lên Trúc Cơ trong nhà mình — gia đình mở tiệc nhỏ',
      hook: 'Sau tiệc một sư huynh đến tìm — báo cấm địa sắp mở cửa, MC được sư phụ nhận vào danh sách',
      antiPattern: 'NO mất gia đình ngay sau tiệc',
    },
    {
      scenario: 'MC đang giảng kinh cho đệ tử mới ở sư môn — 1 năm sau tốt nghiệp Luyện Khí 5 tầng',
      hook: 'Đệ tử trẻ đặt 1 câu hỏi MC chưa từng nghĩ — MC chợt nhận ra một lỗ hổng trong tu luyện sư môn',
      antiPattern: 'NO sư môn cấm MC đặt câu hỏi',
    },
    {
      scenario: 'MC lượm bí quyển trong sơn động khi đi hái thảo dược cho sư môn — lần đầu đọc thấy lý thuyết khác',
      hook: 'Bí quyển không hoàn chỉnh nhưng đoạn mở đã giúp MC tu luyện hiệu quả 2× — MC giấu kín thử nghiệm',
      antiPattern: 'NO bí quyển toàn năng vô địch / NO bị cướp ngay sau khi tìm',
    },
  ],
  tensionAxes: [
    {
      name: 'nội môn rivalry — ngoại môn thi đấu',
      description: 'Đệ tử trẻ trong sư môn cạnh tranh tài nguyên/cảnh giới — bên ngoài có đại hội liên tông môn',
      arcShape: 'Phase 1 ngoại môn → Phase 2 nội môn lên đỉnh → Phase 3 đại hội liên tông → Phase 4 đỉnh đại lục',
    },
    {
      name: 'huyết mạch bí mật + truyền thừa cổ',
      description: 'MC mang huyết mạch/truyền thừa của một thế lực cổ đã mất — kẻ thù truyền kiếp đang tìm',
      arcShape: 'Phase 1 reveal mảnh đầu → Phase 2 tìm mảnh tiếp → Phase 3 đối đầu kẻ thù truyền kiếp → Phase 4 phục hưng',
    },
    {
      name: 'cảnh giới đột phá → bí cảnh tài nguyên',
      description: 'Mỗi cảnh giới đột phá mở khóa bí cảnh mới — cạnh tranh tài nguyên với tu sĩ đồng cấp',
      arcShape: 'Phase 1 Luyện Khí → Phase 2 Trúc Cơ → Phase 3 Kim Đan → Phase 4 Nguyên Anh + Hóa Thần tease',
    },
    {
      name: 'tông môn đối kháng + chính ma đại chiến',
      description: 'Hai phe lớn (chính/ma hoặc 2 tông môn) đối đầu lâu năm — MC phải chọn hoặc làm cầu nối',
      arcShape: 'Phase 1 cá nhân ân oán → Phase 2 phe phái căng thẳng → Phase 3 đại chiến mở → Phase 4 hòa bình mới',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['landmark', 'faction', 'event', 'mystery'] },
};

const HUYEN_HUYEN: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Đại lục có 9 bậc Đại Đế — bậc 1 phong ấn lăng mộ chờ truyền nhân',
    'Vạn Tộc tranh hùng — Nhân tộc đang yếu thế nhất, các tộc khác coi thường',
    'Cổ Lộ Thượng Cổ Chiến Trường mở mỗi 100 năm — tu sĩ trẻ tới luyện kinh nghiệm',
    'Cấm khu Tiên Cảnh — không ai dưới Đại Năng vào sống sót',
    'Bí thuật cổ Vô Thượng Đại Đạo bị thất truyền — mỗi thế hệ chỉ 1 người tìm được mảnh',
    'Tinh không bên ngoài đại lục có dị thú khổng lồ chờ ăn linh khí',
    'Sông sao trên trời thật ra là vạn linh tu hành đường',
    '4 Linh Hồn Tổ Tông trấn 4 phương trời — mỗi 1000 năm tỉnh dậy thử thế hệ mới',
    'Đỉnh núi Tử Cấm có cổ chung — vang mỗi khi 1 Đại Đế ngã xuống',
    'Vực sâu Cửu U có khí ác mộng — tu sĩ Trúc Cơ vào sẽ phát điên',
    'Thiên kiêu lệch lạc xuất hiện cùng lúc trong 9 phương — thế hệ này có 9 thiên kiêu',
    'Pháp tướng huyết mạch cổ truyền — mỗi 100 năm một thế hệ chỉ kích hoạt 1 lần',
  ],
  mcArchetypes: [
    {
      name: 'thiên kiêu blood',
      voice: 'Tự tin nhưng có lý — pháp tướng huyết mạch cổ kích hoạt từ nhỏ. Biết mình có cơ hội nên không hèn.',
      signature: 'Pháp tướng huyết mạch độc đáo (vd Long Phượng / Cửu Sao Cổ Khí) — chỉ MC kích hoạt được thế hệ này',
      fits: ['huyen-huyen'],
      antiPatterns: ['ngạo mạn không kèm thực lực', 'phá vỡ pháp tướng quá sớm để khoe'],
    },
    {
      name: 'silent-OP',
      voice: 'Nói ít, làm nhiều. Người khác đánh giá thấp đến khi MC ra tay.',
      signature: 'Mỗi cảnh giới đều giấu — chỉ phát huy lúc cứu đồng đội hay đối đầu cường địch',
      fits: ['huyen-huyen', 'tien-hiep'],
      antiPatterns: ['nội tâm độc thoại dài', 'giải thích kế hoạch'],
    },
    {
      name: 'người trẻ thừa kế đại đế',
      voice: 'Cẩn trọng, có lý tưởng — biết mình kế thừa di sản nên không phụ truyền thừa.',
      signature: 'Là duy nhất kế thừa được Đại Đế cũ truyền tâm — nắm 1 phần Đạo cũ chưa hoàn chỉnh',
      fits: ['huyen-huyen'],
      antiPatterns: ['kiêu ngạo về di sản', 'không học gì thêm từ thế hệ mới'],
    },
    {
      name: 'cô tử trở về',
      voice: 'Lạnh lùng nhưng công bằng. Đã trải qua nguy hiểm bên ngoài, biết đời.',
      signature: 'Trở về nhà sau N năm phiêu bạt — thực lực vượt xa anh em họ ở nhà',
      fits: ['huyen-huyen', 'tien-hiep'],
      antiPatterns: ['báo thù toàn diện ngay khi về', 'mất gia đình kích hoạt'],
    },
    {
      name: 'thiên tài lệch hệ',
      voice: 'Lập dị, hứng thú với điều khác lạ. Không quan tâm chuẩn mực sư môn.',
      signature: 'Tu hệ độc/lệch (vd Tử Pháp / Hắc Hệ) — bị sư môn nghi kỵ nhưng có sức mạnh độc nhất',
      fits: ['huyen-huyen'],
      antiPatterns: ['bị sư môn đuổi ngay ch.1', 'không có ai bảo vệ'],
    },
    {
      name: 'truyền nhân kẻ phong ấn',
      voice: 'Thông minh + cảnh giác — biết mình mang bí mật lớn từ tuổi nhỏ.',
      signature: 'Trong cơ thể MC có ấn 1 cổ thần / Đại Đế bị phong ấn — mở dần qua từng cảnh giới',
      fits: ['huyen-huyen'],
      antiPatterns: ['thực thể phong ấn kiểm soát MC', 'reveal toàn bộ ngay chương đầu'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC ở thư viện gia tộc tự học pháp quyết — pháp tướng huyết mạch lần đầu kích hoạt',
      hook: 'Pháp tướng vừa kích hoạt liền có người trong gia tộc cảm nhận — báo lên trưởng lão',
      antiPattern: 'NO bị gia tộc đuổi vì pháp tướng',
    },
    {
      scenario: 'MC cùng đồng môn vào Cổ Lộ Thượng Cổ Chiến Trường — nhiệm vụ tập huấn đầu tiên',
      hook: 'Ngay lối vào MC nhận ra dấu hiệu của 1 truyền thừa cổ chỉ MC đọc được',
      antiPattern: 'NO đồng môn chết hết để mỗi MC sống',
    },
    {
      scenario: 'MC vừa trở về gia tộc sau 5 năm rèn luyện ngoại địa — đại hội tộc tới gần',
      hook: 'Cha mẹ chào đón nhưng anh em họ nghi ngờ MC giấu thực lực — MC mỉm cười không trả lời',
      antiPattern: 'NO mất gia đình / NO bị anh em đẩy vào hố',
    },
    {
      scenario: 'MC ở phòng tự kỷ luyện đan/khắc trận — vừa thành công 1 món pháp khí cấp trung',
      hook: 'Sư phụ ghé thăm khen 1 câu — kèm thông báo có cơ hội tham gia sự kiện liên tông môn',
      antiPattern: 'NO sư phụ chết / NO pháp khí bị cướp ngay',
    },
    {
      scenario: 'MC dạo phố thành chính của tông môn — gặp 1 người trẻ khác đang giảng đạo cho dân thường',
      hook: 'Người đó giảng sai 1 chỗ căn bản — MC chỉ ra nhẹ nhàng, người ấy là một thiên kiêu khác',
      antiPattern: 'NO đụng độ chết người ngay ch.1',
    },
    {
      scenario: 'MC nghiên cứu pháp tướng tổ truyền tại nhà — phát hiện ấn ký mới hiển thị',
      hook: 'Ấn ký mới gợi ý có 1 di vật cổ trong vùng đất gia tộc — MC chuẩn bị đi tìm',
      antiPattern: 'NO ấn nuốt MC / NO mất kiểm soát',
    },
  ],
  tensionAxes: [
    {
      name: 'thiên kiêu thế hệ + đại lục đại hội',
      description: 'MC là 1 trong N thiên kiêu thế hệ — cạnh tranh tài nguyên + danh vọng qua các đại hội liên tông',
      arcShape: 'Phase 1 nội tông → Phase 2 liên tông phương → Phase 3 đại lục đại hội → Phase 4 vạn tộc',
    },
    {
      name: 'huyết mạch cổ + cường tộc thù truyền kiếp',
      description: 'Huyết mạch MC kế thừa từ 1 cổ tộc — cổ tộc kẻ thù vẫn tồn tại và đang săn truyền nhân',
      arcShape: 'Phase 1 ẩn dấu → Phase 2 reveal cá nhân → Phase 3 cổ tộc đại chiến → Phase 4 truyền thừa hoàn nguyên',
    },
    {
      name: 'cảnh giới Đại Đế + lăng mộ cổ',
      description: 'Đại lục có lăng mộ Đại Đế cổ chờ truyền nhân — MC phải vượt qua thử thách lăng mộ',
      arcShape: 'Phase 1 phát hiện mảnh → Phase 2 vào lăng tầng đầu → Phase 3 đỉnh lăng tâm linh → Phase 4 thừa kế Đại Đế',
    },
    {
      name: 'vạn tộc cạnh tranh + nhân tộc phục hưng',
      description: 'Nhân tộc đang yếu nhất — MC dẫn dắt phục hưng',
      arcShape: 'Phase 1 cá nhân → Phase 2 sư môn nhân tộc → Phase 3 đại lục nhân tộc → Phase 4 vạn tộc đại hội',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['landmark', 'faction', 'event', 'mystery', 'bloodline'] },
};

const DO_THI: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Tập đoàn gia tộc đang khủng hoảng nội bộ — 3 nhánh tranh quyền thừa kế',
    'Thị trường mới nổi (vd AI / EV / fintech) đang chia sẻ lại — cơ hội cho người mới',
    'Khu công nghiệp công nghệ X mới mở — chính phủ ưu đãi 5 năm',
    'Showbiz ngầm có quy luật ăn chia — newcomer phải biết "ai là ai"',
    'Bệnh viện tỉnh đang thiếu chuyên gia thực sự — đa số đang trục lợi',
    'Cuộc chiến mạng xã hội KOL — drama mỗi tuần một lần',
    'Khu phố cổ đang được quy hoạch lại — bất động sản tăng vọt',
    'Trường đại học top vừa mở chương trình MBA mới — networking elite',
    'Ngành xuất bản đang chuyển đổi số — sách giấy giảm, ebook bùng nổ',
    'Quán bar hạng sang khu phố Tây có "club kín" — chỉ ai có name mới được vào',
    'Phố Wall Saigon — nhóm broker trẻ vừa lập 1 quỹ private equity mới',
    'Sự kiện gọi vốn Series A đang sôi nổi — VC quốc tế đổ về Việt Nam',
  ],
  mcArchetypes: [
    {
      name: 'professional reborn',
      voice: 'Trầm tĩnh, chuyên nghiệp. Nói chuyện business-like. Có kế hoạch dài hạn cho sự nghiệp.',
      signature: 'Trọng sinh từ tương lai N năm — biết market trends + có chuyên môn (kỹ sư/bác sĩ/finance)',
      fits: ['do-thi'],
      antiPatterns: ['báo thù người yêu cũ ngay ch.1', 'showcase tương lai quá rõ làm mọi người nghi'],
    },
    {
      name: 'thiếu gia ẩn thân',
      voice: 'Thoải mái, hơi cynical, biết đời. Không khoe khoang nhưng có gu sang.',
      signature: 'Là thiếu gia gia tộc lớn nhưng chọn ẩn thân để xây dựng từ con số 0 — chứng minh năng lực',
      fits: ['do-thi'],
      antiPatterns: ['lộ thân phận quá sớm để được giúp', 'không có lý do thuyết phục để ẩn'],
    },
    {
      name: 'tay ngang đột phá',
      voice: 'Chân thật, có khao khát rõ. Học nhanh, dám mạo hiểm.',
      signature: 'Người ngoài ngành nhảy vào lĩnh vực mới — thiên phú học + insight độc đáo',
      fits: ['do-thi'],
      antiPatterns: ['thành công nhờ may mắn không nhờ năng lực'],
    },
    {
      name: 'CEO tương lai',
      voice: 'Quyết đoán, chiến lược, không cảm tính trong business. Đối ngoại lịch thiệp.',
      signature: 'Có golden finger là khả năng đọc chính xác báo cáo tài chính / xu hướng — pioneer 1 ngách',
      fits: ['do-thi'],
      antiPatterns: ['mạnh tay với nhân viên không lý do', 'đời sống cá nhân toàn drama'],
    },
    {
      name: 'genius doctor / lawyer',
      voice: 'Chuyên nghiệp, kỹ thuật cao. Nói ngắn gọn, ưu tiên facts.',
      signature: 'Bác sĩ / luật sư có kiến thức vượt thời đại — giải case impossible',
      fits: ['do-thi'],
      antiPatterns: ['malpractice không hậu quả', 'đồng nghiệp ghét vô lý'],
    },
    {
      name: 'media insider',
      voice: 'Quan sát giỏi, biết PR/branding. Có gu thẩm mỹ.',
      signature: 'Pioneer trong showbiz/media — có sense về xu hướng + relationship management',
      fits: ['do-thi'],
      antiPatterns: ['scandal không giải quyết được', 'mất hết bạn vì showbiz'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC vừa hoàn thành 1 deal đầu tiên ở văn phòng riêng — sáng thứ Hai bình thường',
      hook: 'Khách hàng nhỏ hôm nay vừa hỏi tới deal lớn hơn — MC nhận thấy cơ hội mở rộng',
      antiPattern: 'NO mất việc / NO bị đuổi khỏi nhà',
    },
    {
      scenario: 'MC đang chạy 1 quán cafe / studio nhỏ tự mở — sáng nay khách quen đến order như mọi khi',
      hook: 'Một khách lạ đến đặt 1 yêu cầu đặc biệt — kéo theo cơ hội kết nối với network mới',
      antiPattern: 'NO quán phá sản / NO bị cạnh tranh đè',
    },
    {
      scenario: 'MC vừa nhận lương tháng + bonus đầu tiên — mua sắm cuối tuần với gia đình nhỏ',
      hook: 'Trên đường về nghe podcast 1 industry insider nói về xu hướng MC đã biết — quyết định khởi nghiệp',
      antiPattern: 'NO mất việc đột ngột / NO gia đình đột nhiên gặp tai nạn',
    },
    {
      scenario: 'MC đang dạy lớp / chữa bệnh / xét xử ca thường lệ — buổi sáng làm việc bình tĩnh',
      hook: 'Ca hôm nay có 1 chi tiết nhỏ MC nhận ra khác thường — sẽ dẫn tới case lớn hơn',
      antiPattern: 'NO bị cấp trên hãm hại',
    },
    {
      scenario: 'MC vừa được promote lên vị trí mới ở công ty — không lớn nhưng có quyền tự quyết',
      hook: 'Trong họp đầu tiên MC phát hiện 1 inefficiency — proposal cải tổ nhỏ',
      antiPattern: 'NO bị đồng nghiệp tẩy chay tập thể',
    },
    {
      scenario: 'MC đang ăn tối với gia đình — cuộc gọi từ ngân hàng báo MC vừa được duyệt khoản vay khởi nghiệp',
      hook: 'Gia đình ủng hộ cẩn thận — MC bắt đầu lập kế hoạch chi tiết',
      antiPattern: 'NO gia đình phản đối quyết liệt làm MC khổ sở',
    },
  ],
  tensionAxes: [
    {
      name: 'thương trường M&A + tập đoàn gia tộc',
      description: 'MC xây dựng/cứu lấy 1 doanh nghiệp — đối thủ là tập đoàn lớn dùng M&A / PR / lobbying',
      arcShape: 'Phase 1 startup nhỏ → Phase 2 mid-cap rivalry → Phase 3 thị trường ngành → Phase 4 đa ngành / quốc tế',
    },
    {
      name: 'showbiz / media leverage',
      description: 'MC pioneer trong media/entertainment — đối thủ là gatekeeper showbiz cũ',
      arcShape: 'Phase 1 newcomer → Phase 2 hit show → Phase 3 studio chính chủ → Phase 4 truyền thông đa nền',
    },
    {
      name: 'professional excellence + corporate climb',
      description: 'MC là chuyên gia (bác sĩ/luật sư/nghiên cứu) — leo lên qua case khó + networking',
      arcShape: 'Phase 1 case nhỏ → Phase 2 case mid → Phase 3 leadership phòng → Phase 4 ngành / quốc gia',
    },
    {
      name: 'gia đình + tình cảm + sự nghiệp đan xen',
      description: 'MC cân bằng gia đình/love + sự nghiệp — không cô đơn, không drama',
      arcShape: 'Phase 1 cá nhân → Phase 2 partner ổn định → Phase 3 gia đình mới → Phase 4 thành tựu lâu dài',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['industry', 'company', 'event', 'opportunity'] },
};

const KIEM_HIEP: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Võ lâm 7 đại môn phái — 3 chính 4 trung lập, ma đạo lén lút phát triển',
    'Cấm khu Thiên Cung — võ lâm cao thủ vô địch không ai sống ra được',
    'Bí kíp Cửu Âm Chân Kinh / Vô Cực Thần Công đang lưu lạc — ai cũng tìm',
    'Đại hội võ lâm 10 năm tổ chức 1 lần — sắp tới',
    'Thứ trưởng quan binh đang truy quét ma đạo — nhiều môn phái phải chọn phe',
    'Triều đình mục nát — võ lâm tự xử lý xã hội ngầm',
    'Vũ khí cổ Đồ Long Đao / Ỷ Thiên Kiếm đang bị chia làm nhiều mảnh',
    'Hắc Đạo có 1 minh chủ mới nổi — không ai biết danh tính',
    'Sa mạc Tây Vực có bộ tộc kỳ bí — võ công khác Trung Nguyên',
    'Quân đội Tống đang chiến với Liêu / Kim — võ lâm bị kéo vào',
    'Tiêu Cục lớn nhất Trung Nguyên đang gặp khó — caravan bị cướp liên tiếp',
    'Tửu lâu lớn nhất kinh thành là điểm trao đổi tin tức võ lâm',
  ],
  mcArchetypes: [
    {
      name: 'thiếu hiệp chính phái',
      voice: 'Chính trực, có nguyên tắc đạo nghĩa. Nói thẳng, hành động dứt khoát.',
      signature: 'Đệ tử gia tộc/môn phái chính — kỹ năng vững, tinh thần "vì giang hồ chính nghĩa"',
      fits: ['kiem-hiep'],
      antiPatterns: ['hi sinh vô nghĩa', 'cuồng tín chính phái không suy nghĩ'],
    },
    {
      name: 'cô đơn lãng tử',
      voice: 'Lạnh lùng, ít nói, mỉa mai khi cần. Có quá khứ đau thương nhưng không kể.',
      signature: 'Đi 1 mình khắp giang hồ, võ công độc đáo — không thuộc môn phái nào',
      fits: ['kiem-hiep'],
      antiPatterns: ['quá khứ kích hoạt cảm xúc thái quá', 'tự thương cảm'],
    },
    {
      name: 'thư sinh ẩn võ',
      voice: 'Lịch lãm, có học. Nói chuyện điềm đạm, hay trích thi thư.',
      signature: 'Bề ngoài là nho sinh đi thi — thực ra là cao thủ ẩn thân',
      fits: ['kiem-hiep'],
      antiPatterns: ['lộ võ công quá sớm khi không cần'],
    },
    {
      name: 'truyền nhân ma đạo cải tà',
      voice: 'Phức tạp — biết ma đạo nhưng chọn đường chính. Có chiều sâu nội tâm.',
      signature: 'Học võ ma đạo từ nhỏ nhưng quyết đi đường chính — bị 2 phe nghi kỵ',
      fits: ['kiem-hiep'],
      antiPatterns: ['cải tà rồi lại quay lại ma đạo không lý do'],
    },
    {
      name: 'tiểu nhị quán trọ',
      voice: 'Hiền lành, lém lỉnh, hay quan sát. Khiêm nhường nhưng tinh ranh.',
      signature: 'Bề ngoài là tiểu nhị — thật ra là cao thủ ẩn thân hoặc đệ tử bí mật của 1 đại tông sư',
      fits: ['kiem-hiep'],
      antiPatterns: ['lộ thân phận quá sớm vì lý do nhẹ'],
    },
    {
      name: 'truyền nhân cuối cùng',
      voice: 'Có trách nhiệm, ý chí thép. Nói ít nhưng có trọng lượng.',
      signature: 'Là truyền nhân duy nhất của 1 môn phái đã bị tận diệt — gánh trách nhiệm phục hưng',
      fits: ['kiem-hiep'],
      antiPatterns: ['mất hết người thân ngay ch.1'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC đang luyện kiếm trong sân môn phái — sáng sớm trên núi yên tĩnh',
      hook: 'Sư phụ đến gọi MC vào điện chính — báo có nhiệm vụ xuống núi đầu tiên',
      antiPattern: 'NO môn phái bị diệt / NO sư phụ chết',
    },
    {
      scenario: 'MC vừa hoàn thành lễ trưởng thành ở môn phái — được phép xuống núi đi giang hồ',
      hook: 'Trưởng môn giao 1 nhiệm vụ "đơn giản" — đem 1 phong thư đến tửu lâu thành phố',
      antiPattern: 'NO bị mai phục ngay khi xuống núi',
    },
    {
      scenario: 'MC ngồi uống rượu ở tửu lâu sau 1 ngày làm việc bình thường — tiêu cục đang bàn deal mới',
      hook: 'Bàn bên có 2 người lạ trao đổi tin tức võ lâm — MC nghe được 1 chi tiết quan trọng',
      antiPattern: 'NO MC bị say lăn ra / NO bị cướp ngay',
    },
    {
      scenario: 'MC đang là tiêu sư trẻ trong tiêu cục — vừa hoàn thành chuyến đi đầu tiên thành công',
      hook: 'Quản lý giao chuyến tiếp theo có hàng đặc biệt — MC nhận thấy có chi tiết bất thường trong hợp đồng',
      antiPattern: 'NO tiêu cục bị diệt sạch ngay ch.1',
    },
    {
      scenario: 'MC đang chăm sóc thầy già bị thương ở am cỏ — buổi chiều rảnh rỗi',
      hook: 'Thầy hôm nay nhắc đến 1 chuyện cũ võ lâm — MC nhận thấy có liên quan đến hiện tại',
      antiPattern: 'NO thầy chết ngay ch.1',
    },
    {
      scenario: 'MC vừa thắng 1 cuộc thi tỉ võ nhỏ ở thị trấn — không phải đấu trường lớn',
      hook: 'Một cao nhân lạ đến chúc mừng + đưa tin về 1 sự kiện võ lâm sắp diễn ra',
      antiPattern: 'NO thắng giải vô địch không có lý do thuyết phục',
    },
  ],
  tensionAxes: [
    {
      name: 'chính tà đại chiến',
      description: 'Chính phái vs ma đạo — MC chọn phe / làm cầu nối',
      arcShape: 'Phase 1 mâu thuẫn cá nhân → Phase 2 môn phái rivalry → Phase 3 đại chiến mở → Phase 4 hòa bình mới',
    },
    {
      name: 'bí kíp + truyền thừa cổ',
      description: 'Tranh giành bí kíp võ công — MC tìm được mảnh đầu',
      arcShape: 'Phase 1 mảnh đầu → Phase 2 đối thủ truy đuổi → Phase 3 hợp toàn bộ → Phase 4 đại tông sư',
    },
    {
      name: 'triều đình + giang hồ',
      description: 'Mâu thuẫn giữa quan binh + võ lâm — MC bị kéo vào chính trị',
      arcShape: 'Phase 1 cá nhân → Phase 2 môn phái nhúng tay → Phase 3 chính trị triều đình → Phase 4 cải tổ đại cục',
    },
    {
      name: 'phục thù gia tộc',
      description: 'Gia tộc/môn phái MC bị diệt từ trước — MC dần phục thù',
      arcShape: 'Phase 1 sống sót + huấn luyện → Phase 2 truy theo manh mối → Phase 3 đối đầu cường địch → Phase 4 hòa giải / phục hưng',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['sect', 'event', 'weapon', 'mystery'] },
};

const LICH_SU: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Triều đại đang trong giai đoạn đầu — vua mới lên ngôi 5 năm, quan trường tranh quyền',
    'Khoa cử sắp tới — tài năng trẻ tụ tập kinh thành',
    'Biên cương Tây Bắc đang chiến với du mục — quân lương khan hiếm',
    'Hoàng tử cả vừa được phong thái tử — phe phản đối ngầm vận động',
    'Thái Hậu thực quyền — vua trẻ chưa thoát khỏi bóng',
    'Khu chợ kinh thành lớn nhất là nơi tin tức ngoại quốc đầu tiên đến',
    'Một quan đại thần vừa bị cách chức — phe của ông ta đang lo lắng',
    'Sự kiện thiên tai (lũ lụt / hạn hán) đang ảnh hưởng 1 châu lớn',
    'Học viện kinh thành có nhiều học giả tranh luận chính sách',
    'Sứ thần ngoại quốc đến triều cống — yêu sách mới làm triều đình tranh cãi',
    'Tướng quân biên cương vừa đại thắng — danh tiếng vượt cả triều thần kinh',
    'Quan Lễ Bộ chuẩn bị tổ chức Đại Lễ — đầu tư rất lớn',
  ],
  mcArchetypes: [
    {
      name: 'sĩ tử trí thức',
      voice: 'Học rộng, nói có sách. Khiêm nhường nhưng có chính kiến.',
      signature: 'Tài năng văn học + có kiến thức hiện đại bí mật (trọng sinh) — pioneer cải cách',
      fits: ['lich-su'],
      antiPatterns: ['kiêu ngạo về kiến thức tương lai', 'lộ kiến thức hiện đại quá rõ'],
    },
    {
      name: 'tướng trẻ ngoại biên',
      voice: 'Quân kỷ, dứt khoát. Có tâm với binh sĩ.',
      signature: 'Tướng trẻ nhậm chức biên cương — chiến thắng nhỏ + cải tổ quân đội',
      fits: ['lich-su'],
      antiPatterns: ['triều đình cấm hết, không thể làm gì'],
    },
    {
      name: 'quan thanh liêm',
      voice: 'Cẩn trọng, công bằng. Nói ít, làm nhiều.',
      signature: 'Quan trẻ vừa nhậm chức — phát hiện tham nhũng + xử lý thông minh',
      fits: ['lich-su'],
      antiPatterns: ['bị cách chức ngay ch.1', 'không có ai bảo vệ'],
    },
    {
      name: 'hoàng thân lưu vong',
      voice: 'Phức tạp, có chiều sâu. Thận trọng vì biết mình bị theo dõi.',
      signature: 'Hoàng tử/công chúa bị truất ngôi — sống ẩn nhưng dần lấy lại địa vị',
      fits: ['lich-su'],
      antiPatterns: ['phục thù toàn diện ngay khi vừa hồi phục thân phận'],
    },
    {
      name: 'thương nhân kinh đô',
      voice: 'Tinh ranh, biết người, nói chuyện duyên dáng.',
      signature: 'Thương nhân pioneer ngành mới — networking khắp triều đình',
      fits: ['lich-su'],
      antiPatterns: ['bị triều đình tịch thu hết tài sản'],
    },
    {
      name: 'nho gia cải tổ',
      voice: 'Lý tưởng, có học vấn cổ điển + tư duy mới.',
      signature: 'Nho gia trẻ proposing tân thuyết — gây tranh cãi với phe bảo thủ',
      fits: ['lich-su'],
      antiPatterns: ['bị tử hình vì tà thuyết'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC đang đọc sách trong thư viện gia đình — chuẩn bị cho khoa cử sắp tới',
      hook: 'Một bạn học đến tin báo tin nóng từ kinh thành — MC chuẩn bị lên đường',
      antiPattern: 'NO gia đình phá sản đột ngột',
    },
    {
      scenario: 'MC vừa nhậm chức quan nhỏ ở 1 huyện — buổi sáng đầu tiên xử công văn',
      hook: 'Có 1 vụ kiện thường thấy — nhưng MC nhận thấy có chi tiết liên quan đến quan trên',
      antiPattern: 'NO bị cấp trên hãm hại ngay',
    },
    {
      scenario: 'MC là tướng trẻ vừa được phong chức biên cương — đến doanh trại đầu tiên',
      hook: 'Doanh trại có vấn đề lương thực — MC quyết định cải tổ ngay',
      antiPattern: 'NO doanh trại bị diệt khi MC vừa đến',
    },
    {
      scenario: 'MC ở quán trà kinh thành nghe tin tức — quan lại bàn tán việc trong cung',
      hook: 'MC nghe được 1 chi tiết quan trọng — quyết định viết 1 bản tấu nhỏ proposal',
      antiPattern: 'NO bị tố cáo do nghe tin tức',
    },
    {
      scenario: 'MC làm thư đồng cho 1 đại quan — buổi sáng chuẩn bị giấy tờ thường',
      hook: 'Đại quan giao 1 nhiệm vụ tế nhị — MC nhận ra cơ hội thể hiện',
      antiPattern: 'NO đại quan chết bất ngờ',
    },
    {
      scenario: 'MC vừa thắng 1 cuộc thi văn nhỏ ở địa phương — chuẩn bị lên kinh',
      hook: 'Có 1 nhân vật cao cấp đến chúc mừng + đưa thư giới thiệu — MC nhận thấy cơ hội',
      antiPattern: 'NO thư giới thiệu là bẫy',
    },
  ],
  tensionAxes: [
    {
      name: 'tranh chấp ngôi báu + đảng phái triều đình',
      description: 'Vua mới lên ngôi không vững — phe phản đối ngầm hoạt động, MC chọn phe',
      arcShape: 'Phase 1 cá nhân → Phase 2 đảng phái → Phase 3 cung đình → Phase 4 vương triều ổn định',
    },
    {
      name: 'cải tổ chính trị + nho gia tân thuyết',
      description: 'MC proposal cải tổ — phe bảo thủ phản kháng',
      arcShape: 'Phase 1 ý tưởng → Phase 2 thử nghiệm địa phương → Phase 3 triều đình debate → Phase 4 cải tổ thực thi',
    },
    {
      name: 'biên cương + quân sự',
      description: 'MC ở biên cương đối phó ngoại địch + triều đình không tin',
      arcShape: 'Phase 1 binh nhỏ → Phase 2 đại đội → Phase 3 quân đoàn → Phase 4 đại tướng',
    },
    {
      name: 'thương mại + hành chính',
      description: 'MC pioneer ngành mới — đối đầu phe thủ cựu trong kinh tế',
      arcShape: 'Phase 1 thương vụ nhỏ → Phase 2 thị trường địa phương → Phase 3 quốc gia → Phase 4 quốc tế',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['court', 'border', 'event', 'figure'] },
};

const KHOA_HUYEN: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Một viện nghiên cứu top vừa đột phá ngành (vd AI / quantum / biotech) — chấn động giới học thuật',
    'Đại học elite có 1 bí mật nghiên cứu chưa công bố — đang tuyển kỹ sư trẻ',
    'Tập đoàn công nghệ vừa IPO — đang mở rộng vào thị trường mới',
    'Sự kiện tech conference lớn sắp diễn ra — startup tranh giành sự chú ý',
    'Phòng lab cá nhân của 1 giáo sư đã quá cố — di sản nghiên cứu chưa hoàn thành',
    'Cuộc đua R&D giữa 2 tập đoàn lớn — kẻ ra trước thắng thị trường',
    'Quỹ VC vừa lập fund mới chuyên đầu tư deep tech',
    'Hội thảo khoa học ngầm có những "white paper" chưa publish chính thức',
    'Đoàn nghiên cứu vũ trụ / sâu biển vừa phát hiện anomaly khoa học',
    'Cộng đồng open-source phát triển 1 framework mới — nhiều đội tham gia',
    'Cuộc thi hackathon quốc tế có giải thưởng lớn — ai thắng được đầu tư',
    'Phòng thí nghiệm chính phủ đang săn lùng nhân tài đặc biệt',
  ],
  mcArchetypes: [
    {
      name: 'kỹ sư genius',
      voice: 'Logic, kỹ thuật cao. Nói ngắn gọn, ưu tiên data + facts.',
      signature: 'Có thiên phú đọc/viết code thần tốc + insight độc đáo về architecture',
      fits: ['khoa-huyen'],
      antiPatterns: ['không có người support emotional', 'cô độc cô đơn không lý do'],
    },
    {
      name: 'nghiên cứu sinh đột phá',
      voice: 'Curious, thông minh, hơi rụt rè trong giao tiếp xã hội.',
      signature: 'PhD/master student với research direction lệch xu hướng — pioneer 1 ngách mới',
      fits: ['khoa-huyen'],
      antiPatterns: ['advisor cản trở vô lý', 'mất tài liệu nghiên cứu'],
    },
    {
      name: 'CEO startup tech',
      voice: 'Energetic, vision-driven, có tài thuyết phục.',
      signature: 'Founder có kỹ thuật + business sense — bootstrap startup với ý tưởng độc đáo',
      fits: ['khoa-huyen'],
      antiPatterns: ['startup phá sản ngay ch.1'],
    },
    {
      name: 'hacker ẩn danh',
      voice: 'Cẩn thận, hơi paranoid, có ethics riêng.',
      signature: 'White-hat hacker — có khả năng đặc biệt + biết bí mật ngầm của các tập đoàn',
      fits: ['khoa-huyen'],
      antiPatterns: ['phạm tội nặng nhưng không hậu quả'],
    },
    {
      name: 'data scientist intuit',
      voice: 'Thinker, ưa tìm patterns. Trầm lặng, hay nhìn dữ liệu.',
      signature: 'Đọc dữ liệu thấy thứ người khác không thấy — pioneer 1 model/insight',
      fits: ['khoa-huyen'],
      antiPatterns: ['data đột nhiên bị xóa không lý do'],
    },
    {
      name: 'medical researcher',
      voice: 'Cẩn trọng, ethical, có empathy với bệnh nhân.',
      signature: 'BS/researcher với insight breakthrough về 1 bệnh hiếm hoặc 1 phương pháp mới',
      fits: ['khoa-huyen'],
      antiPatterns: ['bệnh nhân chết để tạo motivation'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC đang code 1 prototype trong phòng riêng — sáng cuối tuần yên tĩnh',
      hook: 'Vừa xong commit feature đột phá — đăng demo lên forum chuyên ngành nhận phản hồi tích cực',
      antiPattern: 'NO laptop bị hack / NO mất data',
    },
    {
      scenario: 'MC trong lab nghiên cứu — vừa hoàn thành 1 thí nghiệm thành công nhỏ',
      hook: 'Advisor xem kết quả khen — mời MC lên trình bày tại seminar tuần sau',
      antiPattern: 'NO advisor lấy credit',
    },
    {
      scenario: 'MC đang chạy startup nhỏ — buổi sáng thứ Hai họp team 5 người',
      hook: 'Sales lead báo có 1 enterprise customer quan tâm — chuẩn bị pitch lớn',
      antiPattern: 'NO co-founder rời đội',
    },
    {
      scenario: 'MC làm engineer trong tập đoàn lớn — vừa hoàn thành ticket đầu tuần',
      hook: 'Manager đề xuất MC tham gia 1 dự án innovation lab — cơ hội thể hiện',
      antiPattern: 'NO bị sa thải',
    },
    {
      scenario: 'MC là TA trong đại học — vừa chấm xong assignment cho lớp lớn',
      hook: 'Một sinh viên xuất sắc submit 1 bài giải lệch chuẩn — MC nhận ra approach mới',
      antiPattern: 'NO bị giáo sư la mắng vô lý',
    },
    {
      scenario: 'MC tham gia hackathon quốc tế — đội đã hoàn thành phase 1',
      hook: 'Phase 2 có challenge mới — MC nhận thấy cách giải lệch chuẩn nhưng hiệu quả',
      antiPattern: 'NO đội tan rã giữa hackathon',
    },
  ],
  tensionAxes: [
    {
      name: 'tech race + corporate rivalry',
      description: 'MC startup cạnh tranh với tập đoàn lớn — race to market',
      arcShape: 'Phase 1 prototype → Phase 2 product-market fit → Phase 3 series A/B → Phase 4 IPO / industry leader',
    },
    {
      name: 'research breakthrough + academic politics',
      description: 'MC nghiên cứu đột phá — đối đầu phe khoa học bảo thủ',
      arcShape: 'Phase 1 paper đầu → Phase 2 lab leader → Phase 3 institutional recognition → Phase 4 nobel-tier',
    },
    {
      name: 'tech ethics + societal impact',
      description: 'MC tech innovation có hệ quả xã hội — phải cân nhắc ethics',
      arcShape: 'Phase 1 cá nhân → Phase 2 cộng đồng → Phase 3 chính phủ → Phase 4 toàn cầu',
    },
    {
      name: 'reverse engineer + insider knowledge',
      description: 'MC giải mã 1 hệ thống cũ / di sản — pioneer ứng dụng mới',
      arcShape: 'Phase 1 thí nghiệm cá nhân → Phase 2 nhóm nhỏ → Phase 3 ngành → Phase 4 paradigm shift',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['lab', 'company', 'event', 'breakthrough'] },
};

const VONG_DU: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Game VR mới ra mắt 2 tuần — chỉ 5% người chơi đã đạt level 10',
    'Guild top server đang tuyển thành viên — yêu cầu test khắt khe',
    'Boss world đầu tiên vẫn chưa ai đánh được — reward khổng lồ chờ',
    'Cuộc thi e-sport quốc tế sắp diễn ra — slot Việt Nam chưa được chọn',
    'Beta tester có thông tin nội bộ về expansion sắp ra',
    'Nhà phát hành đang điều tra cheat — server chính trị căng thẳng',
    'Sponsor lớn đang săn talent — pro player có deal vài tỷ',
    'Rare item drop rate 0.001% — vài người may mắn đã có',
    'Map ẩn vừa được data-miner phát hiện — chưa ai vào được',
    'Class meta vừa thay đổi sau patch — meta-game đang reshuffle',
    'Studio livestream đang mua nhà cho top streamer',
    'Internet cafe lớn nhất thành phố là nơi pro player gặp nhau',
  ],
  mcArchetypes: [
    {
      name: 'pro player ẩn thân',
      voice: 'Tỉnh táo, ít nói trong game. Ngoài đời chân thật.',
      signature: 'Đã chơi game cũ pro nhưng giờ chơi game mới ẩn danh — mục tiêu kiếm tiền + danh',
      fits: ['vong-du'],
      antiPatterns: ['lộ ID quá sớm để bị chú ý'],
    },
    {
      name: 'sinh viên part-time gamer',
      voice: 'Năng động, thực dụng. Cân bằng học + game + đi làm.',
      signature: 'Sinh viên có thiên phú gaming + áp lực kinh tế — chơi để kiếm tiền hỗ trợ gia đình',
      fits: ['vong-du'],
      antiPatterns: ['gia đình tan vỡ vì game'],
    },
    {
      name: 'người trở về (rebirth)',
      voice: 'Có kế hoạch dài hạn — biết meta tương lai + bug.',
      signature: 'Trọng sinh từ tương lai — biết quest hidden + drop rate + meta phát triển',
      fits: ['vong-du'],
      antiPatterns: ['lộ kiến thức tương lai làm các player khác nghi'],
    },
    {
      name: 'tester closed beta',
      voice: 'Cẩn thận, có insight kỹ thuật. Hiểu cơ chế game sâu.',
      signature: 'Đã chơi closed beta — biết bug + exploit + boss mechanic chưa fix',
      fits: ['vong-du'],
      antiPatterns: ['exploit nặng đến mức bị ban'],
    },
    {
      name: 'guild leader bẩm sinh',
      voice: 'Charismatic, biết động viên đồng đội. Có tầm nhìn chiến lược.',
      signature: 'Recruit + giữ team mạnh — pioneer lối chơi guild-based',
      fits: ['vong-du'],
      antiPatterns: ['guild tan rã không lý do'],
    },
    {
      name: 'streamer thông minh',
      voice: 'Entertainer, biết câu chuyện, biết hài hước.',
      signature: 'Vừa chơi giỏi vừa làm content tốt — fanbase grow nhanh',
      fits: ['vong-du'],
      antiPatterns: ['scandal phá sự nghiệp'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC vừa download game mới ra mắt — login lần đầu trong phòng riêng',
      hook: 'Tutorial xong nhận thấy có hidden quest mà người khác bỏ qua — bắt đầu thử',
      antiPattern: 'NO PC hỏng / NO mất account',
    },
    {
      scenario: 'MC đang chơi game cũ với guild thân thuộc — sắp xếp chuyển sang game mới',
      hook: 'Guild master đề xuất chuyển sang game mới — MC đồng ý + lập team',
      antiPattern: 'NO guild tan rã đột ngột',
    },
    {
      scenario: 'MC làm streamer nhỏ — buổi stream cuối tuần có 50 viewer ổn định',
      hook: 'Hôm nay 1 highlight clip viral nhỏ — MC nhận thấy cơ hội grow',
      antiPattern: 'NO bị kẻ ghen tị doxx',
    },
    {
      scenario: 'MC làm part-time tại internet cafe — pro player đến chơi quen',
      hook: 'Pro player quen mời MC test build mới — MC làm thử + cải tiến',
      antiPattern: 'NO bị pro player lừa',
    },
    {
      scenario: 'MC vừa nhận deal sponsor nhỏ đầu tiên — hợp đồng 6 tháng',
      hook: 'Sponsor có đề xuất sự kiện riêng — MC chuẩn bị làm content quality',
      antiPattern: 'NO sponsor lừa đảo / NO breach contract',
    },
    {
      scenario: 'MC test closed beta game mới — vừa pass NDA',
      hook: 'Phát hiện 1 mechanic ẩn dev chưa nhận ra — MC report + được trọng dụng',
      antiPattern: 'NO bị NDA strike vô lý',
    },
  ],
  tensionAxes: [
    {
      name: 'world boss + guild war',
      description: 'MC + guild đua boss + lãnh thổ với guild khác',
      arcShape: 'Phase 1 cá nhân → Phase 2 small guild → Phase 3 server top → Phase 4 cross-server',
    },
    {
      name: 'e-sport tournament + sponsor',
      description: 'MC leo từ amateur lên pro — sponsor + tournament',
      arcShape: 'Phase 1 local → Phase 2 quốc gia → Phase 3 châu lục → Phase 4 thế giới',
    },
    {
      name: 'IRL + game intersection',
      description: 'Áp lực IRL (gia đình / học vấn / kinh tế) + thành tựu game đan xen',
      arcShape: 'Phase 1 part-time → Phase 2 chuyên nghiệp → Phase 3 sponsor lớn → Phase 4 ổn định',
    },
    {
      name: 'meta breakthrough + class innovation',
      description: 'MC pioneer 1 build/lối chơi lệch meta — community follow',
      arcShape: 'Phase 1 thử nghiệm → Phase 2 viral → Phase 3 meta change → Phase 4 đại sư class',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['game', 'guild', 'event', 'mechanic'] },
};

const DONG_NHAN: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Universe canon đang ở giai đoạn arc chính — MC ở khoảng giữa timeline',
    'Một nhân vật canon yếu thế đang bị backstory bi kịch — chờ MC can thiệp',
    'Faction chính trong canon đang chia rẽ — MC có thể tham gia 1 phe',
    'Power scaling canon có lỗ hổng MC nhận ra — exploitable',
    'Sự kiện big arc canon sắp diễn ra — MC biết kết quả',
    'Nhân vật antagonist canon thật ra có lý do hợp lý — MC có thể thuyết phục',
    'Có nhân vật canon đang thầm thương MC — chưa thổ lộ',
    'Tổ chức ngầm canon đang săn 1 vật phẩm cổ — MC đã có',
    'Lockdown / dimensional barrier canon — MC có cách phá',
    'Trận thắng kinh điển canon — MC có thể thay đổi thắng thua',
    'Mentor canon yêu thích MC — chuẩn bị truyền dạy bí kíp',
    'Side character canon yếu sẽ trở thành đồng minh chí cốt nếu MC đầu tư',
  ],
  mcArchetypes: [
    {
      name: 'self-insert (đọc giả) thông minh',
      voice: 'Tự ý thức mình là độc giả của canon — biết tương lai, tận dụng kiến thức.',
      signature: 'Hành động dựa trên metadata canon — pre-empt drama trước khi xảy ra',
      fits: ['dong-nhan'],
      antiPatterns: ['lộ identity là độc giả với canon char', 'spoil tương lai trắng trợn'],
    },
    {
      name: 'OC ẩn năng',
      voice: 'Có power scale ẩn — thường khiêm tốn để không phá meta canon.',
      signature: 'OC với power scale tiệm cận top — nhưng dùng tiết chế để giữ canon balance',
      fits: ['dong-nhan'],
      antiPatterns: ['nerf MC vô lý để không OP', 'không dùng power dù tình huống cần'],
    },
    {
      name: 'mentor figure',
      voice: 'Trầm tĩnh, có quyền uy. Hướng dẫn canon char.',
      signature: 'Lớn tuổi hơn protagonist canon — đóng vai mentor / tiền bối',
      fits: ['dong-nhan'],
      antiPatterns: ['mentor chết để tạo angst'],
    },
    {
      name: 'side character upgrade',
      voice: 'Chuyển từ bối cảnh bình thường sang vai chính — có growth arc.',
      signature: 'Là 1 side char canon được upgrade — pioneer cách dùng power chưa khám phá',
      fits: ['dong-nhan'],
      antiPatterns: ['side char bị coi thường vĩnh viễn'],
    },
    {
      name: 'antagonist sympathy turn',
      voice: 'Phức tạp — có quá khứ bị canon hiểu lầm. Tìm cách hòa giải.',
      signature: 'Là antagonist canon nhưng MC reveal được context khiến antagonist không còn phải xấu',
      fits: ['dong-nhan'],
      antiPatterns: ['antagonist quay đầu quá nhanh không lý do'],
    },
    {
      name: 'time traveler trong canon',
      voice: 'Có kế hoạch dài, biết divergence point. Cẩn thận với butterfly effect.',
      signature: 'Đã thấy ending xấu — đi ngược về point divergence để fix',
      fits: ['dong-nhan'],
      antiPatterns: ['butterfly effect biến canon thành chaos không control được'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC tỉnh dậy trong universe canon — ở giai đoạn đầu story',
      hook: 'Nhận ra mình là 1 nhân vật canon side / OC — bắt đầu lập kế hoạch dài hạn',
      antiPattern: 'NO mất ký ức về kiếp cũ',
    },
    {
      scenario: 'MC làm việc thường ngày trong universe canon — gặp 1 canon char',
      hook: 'Canon char hỏi 1 câu MC nhớ là precursor cho plot lớn — MC trả lời cẩn thận',
      antiPattern: 'NO MC nói thẳng "tôi biết tương lai"',
    },
    {
      scenario: 'MC train với mentor canon — buổi tập thường lệ',
      hook: 'Mentor chia sẻ 1 chi tiết về kỹ thuật ẩn — MC nhận ra link với plot tương lai',
      antiPattern: 'NO mentor chết ngay ch.1',
    },
    {
      scenario: 'MC trong tổ chức canon — assignment đầu tiên',
      hook: 'Assignment đơn giản nhưng MC nhận ra có liên quan đến arc lớn — chuẩn bị thông minh',
      antiPattern: 'NO bị tổ chức loại bỏ ngay',
    },
    {
      scenario: 'MC đến địa danh canon nổi tiếng — du lịch / visit thường lệ',
      hook: 'Tại đây MC tình cờ gặp 1 nhân vật canon ẩn — bắt đầu friendship arc',
      antiPattern: 'NO nhân vật canon từ chối MC ngay',
    },
    {
      scenario: 'MC vừa hoàn thành arc nhỏ trong universe — power up nhẹ',
      hook: 'Power up này MC biết là precursor cho 1 power lớn — chuẩn bị grinding',
      antiPattern: 'NO power lossing ngay sau',
    },
  ],
  tensionAxes: [
    {
      name: 'canon arc divergence + butterfly',
      description: 'MC can thiệp canon arc — divergence consequence',
      arcShape: 'Phase 1 small change → Phase 2 mid arc shift → Phase 3 big arc reroute → Phase 4 endgame AU',
    },
    {
      name: 'canon char relationship + side stories',
      description: 'MC develop relationship với canon chars — fix bi kịch',
      arcShape: 'Phase 1 acquaintance → Phase 2 friend → Phase 3 ally → Phase 4 chosen family',
    },
    {
      name: 'meta exploitation + foreknowledge',
      description: 'MC dùng kiến thức canon — exploit metadata',
      arcShape: 'Phase 1 small exploit → Phase 2 mid plot → Phase 3 big plot → Phase 4 meta-aware antagonist',
    },
    {
      name: 'OC power scale + canon balance',
      description: 'MC OC power up — cân bằng với canon meta',
      arcShape: 'Phase 1 base canon → Phase 2 mid-tier → Phase 3 top-tier → Phase 4 transcend canon',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['canon-char', 'canon-event', 'lore', 'faction'] },
};

const MAT_THE: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Apocalypse vừa xảy ra 7 ngày — đa số dân chưa adapt, supply còn',
    'Zombie / quái vật đột biến đang gia tăng — quy luật chưa rõ',
    'Awakened (siêu năng lực) chỉ 1% dân — đang được chính phủ sàng lọc',
    'Safe zone lớn nhất thành phố là siêu thị + tòa văn phòng — đã bị chiếm bởi nhóm tự xưng',
    'Hệ thống dungeon vừa mở ra — ai vào trước có drop tốt',
    'Quân đội vẫn còn lực lượng nhưng chia phe — mỗi phe có vùng kiểm soát riêng',
    'Truyền thông sụp đổ — chỉ còn radio ham + bulletin board',
    'Biến dị thực vật bắt đầu xuất hiện — 1 số có giá trị resource cao',
    'Bệnh dịch không phải zombie nhưng gây mutation chậm — research đang chậm',
    'Có hint về "tier 2" apocalypse sắp tới — chưa ai biết chi tiết',
    'Một số nhóm survivor có kiến thức cổ (bushcraft, prepper) — value cao',
    'Thiên thạch / dimensional rift là cause — chưa ai khoá được',
  ],
  mcArchetypes: [
    {
      name: 'prepper insider',
      voice: 'Cẩn trọng, methodical. Biết sinh tồn từ lâu — không panic.',
      signature: 'Đã có kế hoạch + supply trước apocalypse — survival ưu thế nhờ prep',
      fits: ['mat-the'],
      antiPatterns: ['mất hết supply ch.1', 'gia đình từ chối nghe'],
    },
    {
      name: 'awakened thầm lặng',
      voice: 'Trầm tĩnh, observant. Khám phá power dần.',
      signature: 'Vừa awakened siêu năng lực hiếm — power growth qua thử nghiệm cẩn thận',
      fits: ['mat-the'],
      antiPatterns: ['power gây hủy diệt vô lý'],
    },
    {
      name: 'rebirth survivor',
      voice: 'Thực dụng, có experience từ kiếp trước. Biết safe zone + boss.',
      signature: 'Trọng sinh từ apocalypse phase 2/3 — biết quy luật boss + tier 2',
      fits: ['mat-the'],
      antiPatterns: ['lộ kiến thức apocalypse với người không tin'],
    },
    {
      name: 'medic / scientist',
      voice: 'Logic, có tâm với bệnh nhân. Cool dưới áp lực.',
      signature: 'Bác sĩ / researcher — pioneer nghiên cứu mutation + cure',
      fits: ['mat-the'],
      antiPatterns: ['lab bị diệt ngay', 'không có người support'],
    },
    {
      name: 'community builder',
      voice: 'Lãnh đạo, có khả năng thuyết phục. Tin tưởng đồng minh.',
      signature: 'Tập hợp survivor — pioneer cộng đồng có tổ chức',
      fits: ['mat-the'],
      antiPatterns: ['cộng đồng tan rã do nội phản'],
    },
    {
      name: 'lone hunter',
      voice: 'Lạnh lùng, hiệu quả. Có ethics riêng.',
      signature: 'Đi 1 mình hunting boss + scavenge — pioneer 1 lối đi solo',
      fits: ['mat-the'],
      antiPatterns: ['sociopath không có ethics'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC trong căn hộ riêng đã prep từ trước — apocalypse 7 ngày, supply còn nhiều',
      hook: 'Nghe radio thông báo nhóm survivor gần — quyết định kết nối có chiến lược',
      antiPattern: 'NO căn hộ bị xâm nhập ch.1',
    },
    {
      scenario: 'MC vừa awakened siêu năng lực nhẹ — đang thí nghiệm trong safe room',
      hook: 'Power thử thành công — MC lập kế hoạch dùng power scout safer area',
      antiPattern: 'NO power phá hủy nhà',
    },
    {
      scenario: 'MC ở safe zone nhỏ với gia đình — mọi người đã ổn định',
      hook: 'Có thông báo dungeon mở gần — MC đề xuất scout cùng nhóm tin cậy',
      antiPattern: 'NO gia đình mất ngay',
    },
    {
      scenario: 'MC trong nhóm survivor 5-7 người — đang scavenge thường lệ',
      hook: 'Scavenge run hôm nay tìm được 1 resource đặc biệt — kéo theo opportunity',
      antiPattern: 'NO nhóm bị diệt ngay',
    },
    {
      scenario: 'MC làm medic trong base — buổi sáng khám bệnh nhân thường',
      hook: 'Một bệnh nhân có triệu chứng lạ — MC nhận thấy có thể là tier 2 mutation',
      antiPattern: 'NO bệnh nhân chết ngay ch.1',
    },
    {
      scenario: 'MC vừa hoàn thành dungeon nhỏ đầu tiên — drop loot vừa phải',
      hook: 'Drop có 1 item lạ chưa ai biết — MC quyết định nghiên cứu trước khi sell',
      antiPattern: 'NO item bị cướp ngay',
    },
  ],
  tensionAxes: [
    {
      name: 'apocalypse tier escalation',
      description: 'Apocalypse có nhiều tier — MC chuẩn bị từ tier 1',
      arcShape: 'Phase 1 tier 1 zombie → Phase 2 tier 2 mutation → Phase 3 tier 3 dungeon → Phase 4 tier 4 dimensional',
    },
    {
      name: 'community vs lone wolf',
      description: 'MC chọn cộng đồng hay solo — đối đầu nhóm khác phe',
      arcShape: 'Phase 1 cá nhân → Phase 2 nhóm nhỏ → Phase 3 community → Phase 4 federation',
    },
    {
      name: 'awakened race + power growth',
      description: 'MC awakened — race với awakened khác về growth',
      arcShape: 'Phase 1 awakened mới → Phase 2 mid power → Phase 3 top tier khu vực → Phase 4 quốc gia',
    },
    {
      name: 'cure / cause investigation',
      description: 'MC investigate cause apocalypse — pioneer cure',
      arcShape: 'Phase 1 sample → Phase 2 hypothesis → Phase 3 prototype cure → Phase 4 large scale',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['threat', 'safe-zone', 'power', 'event'] },
};

const LINH_DI: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Khu phố cũ có 1 căn nhà bỏ hoang 30 năm — cư dân đồn có ma',
    'Nghĩa địa làng có mộ vô danh — đêm có ánh sáng lạ',
    'Bệnh viện cũ tầng 4 đã đóng — đêm có tiếng bước chân',
    'Trường học có giai thoại học sinh tự tử — phòng học cụ thể',
    'Cây cổ thụ ngoại ô có miếu thờ — cấm trẻ em đến đêm',
    'Hầm tàu điện cũ chưa khai thông — có legend về biến mất',
    'Khách sạn cổ phòng 404 — lễ tân không cho ai vào',
    'Đền phế tích trên đồi có cấm địa — dân địa phương tránh',
    'Con sông bên làng có "thuồng luồng" — mỗi 50 năm 1 lần kéo người',
    'Nhà thờ cổ có hầm bí mật — linh mục cũ giấu tài liệu',
    'Hoa Hồng Đỏ Tươi nở vào đêm 30 — chỉ tại 1 góc rừng',
    'Hồ ngầm dưới chùa có đáy không tìm được',
  ],
  mcArchetypes: [
    {
      name: 'thầy phong thủy trẻ',
      voice: 'Cẩn trọng, có học thức cổ. Tôn trọng truyền thống.',
      signature: 'Truyền nhân 1 dòng phong thủy — biết bùa chú + đọc địa lý',
      fits: ['linh-di'],
      antiPatterns: ['quá tự tin với spirit', 'ignore lời cảnh báo gia tộc'],
    },
    {
      name: 'investigator paranormal',
      voice: 'Logic + tin có thế giới khác. Cool dưới áp lực.',
      signature: 'Nhà báo / điều tra viên paranormal — có camera + thiết bị + kiến thức research',
      fits: ['linh-di'],
      antiPatterns: ['không tin gì spirit ngay khi gặp'],
    },
    {
      name: 'medium thiên phú',
      voice: 'Sensitive, có empathy với spirit. Cẩn trọng vì biết hậu quả.',
      signature: 'Có thiên phú giao tiếp với spirit từ nhỏ — gia đình che chở',
      fits: ['linh-di'],
      antiPatterns: ['power overwhelming MC liên tục'],
    },
    {
      name: 'forensic ngỗ tác',
      voice: 'Khoa học, kỹ thuật, lạnh lùng. Có ethics nghề.',
      signature: 'Pháp y / ngỗ tác có insight độc đáo — vừa logic vừa sensitive paranormal',
      fits: ['linh-di'],
      antiPatterns: ['xem nhẹ spirit case'],
    },
    {
      name: 'truyền nhân bí thuật',
      voice: 'Cổ điển, học rộng. Tôn trọng cấm kỵ.',
      signature: 'Truyền nhân duy nhất 1 dòng bí thuật cổ — biết symbol + ngữ pháp xưa',
      fits: ['linh-di'],
      antiPatterns: ['phá cấm kỵ vì lý do nhỏ'],
    },
    {
      name: 'bystander có khả năng tiềm ẩn',
      voice: 'Hồn nhiên, tò mò. Chưa biết khả năng của mình.',
      signature: 'Người thường gặp paranormal lần đầu — power awaken dần dần',
      fits: ['linh-di'],
      antiPatterns: ['power awaken quá nhanh không learning curve'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC làm thầy phong thủy trẻ — khách hàng đầu tiên đến tư vấn',
      hook: 'Khách kể câu chuyện nhà cũ có vấn đề — MC nhận ra chi tiết liên quan đến 1 case lớn',
      antiPattern: 'NO khách hàng chết ngay',
    },
    {
      scenario: 'MC điều tra cho 1 podcast paranormal — đang setup thiết bị tại 1 địa danh hot',
      hook: 'Cảm giác lạ ở vị trí cụ thể — recording có anomaly đáng quan tâm',
      antiPattern: 'NO MC bị spirit possess ngay ch.1',
    },
    {
      scenario: 'MC làm pháp y — case thường lệ buổi sáng',
      hook: 'Case hôm nay có chi tiết bất thường — MC ghi note kỹ',
      antiPattern: 'NO case bị che giấu hết',
    },
    {
      scenario: 'MC ở nhà ông bà — học bài vẽ bùa chú từ ông',
      hook: 'Ông kể 1 câu chuyện cũ — MC nhận ra bùa hôm nay học có liên quan',
      antiPattern: 'NO ông chết ngay ch.1',
    },
    {
      scenario: 'MC làm researcher folklore — vừa nhận grant nghiên cứu địa phương',
      hook: 'Trip thực địa đầu tiên đến 1 làng — gặp người già kể folklore quan trọng',
      antiPattern: 'NO làng bị tấn công',
    },
    {
      scenario: 'MC mới chuyển đến nhà thuê — buổi tối đầu tiên dọn dẹp',
      hook: 'Nhận thấy 1 vật cũ chủ trước để lại — có ý nghĩa paranormal',
      antiPattern: 'NO bị attack ngay đêm đầu',
    },
  ],
  tensionAxes: [
    {
      name: 'spirit case + bí mật quá khứ',
      description: 'MC giải case spirit — lộ ra bí mật lịch sử khu vực',
      arcShape: 'Phase 1 case nhỏ → Phase 2 case mid → Phase 3 case big → Phase 4 ancient curse',
    },
    {
      name: 'cult / hắc đạo paranormal',
      description: 'MC đối đầu cult dùng bí thuật xấu',
      arcShape: 'Phase 1 cult fringe → Phase 2 cell địa phương → Phase 3 quốc gia → Phase 4 hierarchy',
    },
    {
      name: 'truyền thừa bí thuật + master',
      description: 'MC tìm master + học bí thuật',
      arcShape: 'Phase 1 self-study → Phase 2 master 1 → Phase 3 master 2 → Phase 4 đại sư',
    },
    {
      name: 'realm khác / dimensional',
      description: 'MC khám phá realm khác — pioneer mapping',
      arcShape: 'Phase 1 hint → Phase 2 cross over → Phase 3 explore → Phase 4 stable bridge',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['location', 'legend', 'case', 'lore'] },
};

const QUAN_TRUONG: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Tỉnh đang trong giai đoạn cải tổ kinh tế — leader mới mong muốn bứt phá',
    'Một huyện đang bị scandal nhỏ về quản lý — chờ giải quyết',
    'Dự án infrastructure lớn vừa được phê duyệt — phân vùng quyền lực',
    'Hội nghị tỉnh ủy sắp diễn ra — sự bố trí nhân sự chiến lược',
    'Một quan chức trẻ vừa được điều chuyển — phe ủng hộ + đối thủ phản ứng',
    'Doanh nghiệp địa phương lớn đang mâu thuẫn với quận ủy',
    'Báo chí địa phương đang đào 1 vụ tham nhũng nhỏ',
    'Hội từ thiện do 1 phu nhân quan chức điều hành — networking elite',
    'Trường Đảng đào tạo 1 batch cán bộ trẻ — selection căng thẳng',
    'Đoàn kiểm tra Trung ương sắp xuống — nhiều đơn vị lo lắng',
    'Một chính sách ngành mới đang được lobby — competing visions',
    'Ngày hội kỷ niệm tỉnh sắp tổ chức — chỉ tiêu thành tích',
  ],
  mcArchetypes: [
    {
      name: 'cán bộ trẻ tài năng',
      voice: 'Khiêm nhường, lễ phép. Có tầm nhìn cải cách + biết chính trị.',
      signature: 'Cán bộ trẻ lên qua thi tuyển + công việc thực — pioneer cải tổ ở vị trí',
      fits: ['quan-truong'],
      antiPatterns: ['kiêu ngạo về thành tích', 'vô tâm với cấp dưới'],
    },
    {
      name: 'professional reborn quan chức',
      voice: 'Cẩn trọng, có kế hoạch dài. Trầm tĩnh dưới áp lực.',
      signature: 'Trọng sinh từ tương lai — biết policy + nhân sự + scandal sắp xảy ra',
      fits: ['quan-truong'],
      antiPatterns: ['lộ kiến thức tương lai làm cấp trên nghi'],
    },
    {
      name: 'chuyên gia chuyển ngành',
      voice: 'Có chuyên môn (kỹ sư / luật sư / kinh tế) — nói chuyện kỹ thuật.',
      signature: 'Tay ngang vào quan trường — sử dụng chuyên môn xử lý case khó',
      fits: ['quan-truong'],
      antiPatterns: ['không thích nghi với chính trị'],
    },
    {
      name: 'thái tử đảng',
      voice: 'Tự tin, có background. Biết network + luật chơi.',
      signature: 'Có gia thế — chọn không dựa hết vào gia tộc, tự xây dựng năng lực',
      fits: ['quan-truong'],
      antiPatterns: ['dựa hoàn toàn vào gia thế', 'không có năng lực thực'],
    },
    {
      name: 'thư ký giỏi lên',
      voice: 'Quan sát, lắng nghe, chính xác. Biết deference + assertion.',
      signature: 'Bắt đầu từ thư ký cho đại quan — promote dần qua làm việc thực + networking',
      fits: ['quan-truong'],
      antiPatterns: ['phụ thuộc 1 đại quan duy nhất'],
    },
    {
      name: 'cải cách lý tưởng',
      voice: 'Lý tưởng, có nguyên tắc. Khôn ngoan trong chiến thuật.',
      signature: 'Vào quan trường để cải cách thực — biết khi cần spinning',
      fits: ['quan-truong'],
      antiPatterns: ['cải cách quá nhanh bị backlash'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC vừa nhận quyết định bổ nhiệm chức nhỏ — buổi sáng đầu tiên đến văn phòng',
      hook: 'Bàn giao công việc xong nhận thấy 1 case dở dang — MC nghiên cứu kỹ',
      antiPattern: 'NO bị cấp dưới sabotage ngay',
    },
    {
      scenario: 'MC làm thư ký cho phó chủ tịch tỉnh — buổi họp đầu tuần',
      hook: 'Sếp giao 1 project nhỏ — MC nhận ra cơ hội thể hiện năng lực',
      antiPattern: 'NO sếp chết / NO sếp đột nhiên đi xa',
    },
    {
      scenario: 'MC dự lớp Trường Đảng — buổi học chiều thường lệ',
      hook: 'Một giảng viên đề cập 1 chính sách — MC có kiến giải khác và share private',
      antiPattern: 'NO bị tố cáo vô lý',
    },
    {
      scenario: 'MC làm việc ở phòng nghiên cứu chính sách — đang viết 1 báo cáo',
      hook: 'Báo cáo MC viết được sếp khen — gửi lên cấp trên đọc',
      antiPattern: 'NO báo cáo bị đánh cắp',
    },
    {
      scenario: 'MC dự một bữa networking nhỏ với cán bộ trẻ — uống cafe cuối tuần',
      hook: 'Một đồng nghiệp chia sẻ 1 inside info — MC nhận ra link với case mình đang xử lý',
      antiPattern: 'NO bị đồng nghiệp set up',
    },
    {
      scenario: 'MC đi survey thực địa 1 huyện — chuyến công tác thường lệ',
      hook: 'Thấy 1 vấn đề thực tế ít ai báo cáo — MC ghi vào báo cáo của mình',
      antiPattern: 'NO bị địa phương chống đối kịch liệt',
    },
  ],
  tensionAxes: [
    {
      name: 'phe phái + leverage',
      description: 'MC chọn phe / hoặc làm cầu nối — leverage qua project + báo cáo',
      arcShape: 'Phase 1 cá nhân → Phase 2 phòng → Phase 3 sở/cục → Phase 4 tỉnh/quốc gia',
    },
    {
      name: 'cải cách + bảo thủ',
      description: 'MC pioneer cải cách — phe bảo thủ phản kháng',
      arcShape: 'Phase 1 thí điểm nhỏ → Phase 2 thí điểm rộng → Phase 3 chính sách quy mô → Phase 4 cải tổ ngành',
    },
    {
      name: 'scandal + xử lý',
      description: 'MC điều tra scandal nhỏ → chain to bigger',
      arcShape: 'Phase 1 case địa phương → Phase 2 cấp tỉnh → Phase 3 quốc gia → Phase 4 hệ thống',
    },
    {
      name: 'thăng tiến qua merit',
      description: 'MC merit-based promotion — networking + thành tích',
      arcShape: 'Phase 1 phó phòng → Phase 2 trưởng phòng → Phase 3 phó giám đốc → Phase 4 lãnh đạo',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['policy', 'figure', 'case', 'event'] },
};

const DI_GIOI: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'MC xuyên không đến 1 làng nhỏ trong dị giới — kingdom đang ổn định',
    'Magic system của dị giới có lỗ hổng MC khám phá ra',
    'Hệ thống Lord (lãnh chúa) đang có 7 kingdoms cạnh tranh — wartime imminent',
    'Race khác (elf/dwarf/beastfolk) có territory riêng — diplomacy căng thẳng',
    'Adventurer guild đang tuyển — quest từ E đến S rank',
    'Dungeon mới mở gần làng — nguy cơ + cơ hội',
    'Royal academy magic vừa khai giảng — selection elite',
    'Thương hội lớn đang mở chi nhánh — opportunity',
    'Holy church có schism nội bộ — 2 giáo phái mâu thuẫn',
    'Demon king prophecy đang được nhắc — 100 năm chờ thực hiện',
    'Magic crystal mỏ vừa được phát hiện — kingdoms tranh giành',
    'Hành lang ma thuật giữa dị giới + thế giới khác đang được nghiên cứu',
  ],
  mcArchetypes: [
    {
      name: 'tri thức hiện đại uplift',
      voice: 'Logic, có kiến thức rộng. Pioneer ngành mới (toán/y/kỹ thuật).',
      signature: 'Áp dụng kiến thức hiện đại vào dị giới — pioneer 1 ngách (vd farming/medicine/printing)',
      fits: ['di-gioi'],
      antiPatterns: ['lộ kiến thức quá nhanh làm dị giới phải reset', 'kiến thức quá hiện đại không feasibly implement'],
    },
    {
      name: 'lord baron starting small',
      voice: 'Chiến lược, có vision. Tôn trọng vassal + populace.',
      signature: 'Lãnh chúa thiếu niên thừa kế lãnh thổ nhỏ — pioneer governance + military',
      fits: ['di-gioi'],
      antiPatterns: ['mất lãnh thổ ngay ch.1'],
    },
    {
      name: 'adventurer thiên phú',
      voice: 'Energetic, brave. Có ethics nghề (không reckless).',
      signature: 'Adventurer trẻ thiên phú combat / magic — leveling qua quests',
      fits: ['di-gioi'],
      antiPatterns: ['party tan rã'],
    },
    {
      name: 'magic genius bookworm',
      voice: 'Curious, học rộng. Trầm lặng nhưng đam mê magic theory.',
      signature: 'Sinh viên magic academy đột phá — pioneer spell mới',
      fits: ['di-gioi'],
      antiPatterns: ['professor ghen tị steal credit'],
    },
    {
      name: 'craftsman/merchant pioneer',
      voice: 'Thực dụng, có kỹ năng tay nghề + business sense.',
      signature: 'Pioneer 1 ngành thủ công / thương mại — networking + innovation',
      fits: ['di-gioi'],
      antiPatterns: ['guild độc quyền chèn ép'],
    },
    {
      name: 'priest/healer ethical',
      voice: 'Compassionate, có ethics tôn giáo. Strong principles.',
      signature: 'Priest trẻ với power healing độc đáo — pioneer medicine + ethics',
      fits: ['di-gioi'],
      antiPatterns: ['church corruption đè nặng'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC tỉnh dậy trong làng nhỏ dị giới — đã thích nghi 6 tháng',
      hook: 'Hôm nay quyết định ra adventurer guild đăng ký — bước đầu tiên',
      antiPattern: 'NO mất ký ức / NO ngất xỉu lần 2',
    },
    {
      scenario: 'MC vừa nhận thừa kế lãnh chúa nhỏ — đến lãnh thổ buổi sáng đầu',
      hook: 'Vassal + farmer chào đón — MC bắt đầu survey + planning',
      antiPattern: 'NO lãnh thổ bị xâm lược ngay',
    },
    {
      scenario: 'MC là sinh viên magic academy năm 1 — buổi học sáng',
      hook: 'Giáo sư đề cập 1 spell phức tạp — MC nhận ra cách approach mới',
      antiPattern: 'NO bị academy expel',
    },
    {
      scenario: 'MC mở 1 quán nhỏ trong town — kinh doanh đầu tiên thuận lợi',
      hook: 'Khách quan trọng đến order đặc biệt — MC chuẩn bị chu đáo',
      antiPattern: 'NO quán bị đốt',
    },
    {
      scenario: 'MC làm adventurer rank E — vừa hoàn thành quest đầu tiên',
      hook: 'Guild master đề xuất quest D rank tiếp theo — có party tin cậy',
      antiPattern: 'NO party phản bội',
    },
    {
      scenario: 'MC làm priest trong nhà thờ nhỏ — buổi cầu nguyện sáng',
      hook: 'Một bệnh nhân khó đến nhờ healing — MC nhận thấy có điều bất thường',
      antiPattern: 'NO bệnh nhân chết ngay',
    },
  ],
  tensionAxes: [
    {
      name: 'kingdom war + lordship',
      description: 'MC lord mở rộng lãnh thổ — đối đầu lord khác',
      arcShape: 'Phase 1 baron → Phase 2 viscount → Phase 3 count → Phase 4 duke/king',
    },
    {
      name: 'adventurer rank up + dungeon',
      description: 'MC adventurer leo rank — boss + dungeon',
      arcShape: 'Phase 1 E rank → Phase 2 C rank → Phase 3 A rank → Phase 4 S rank',
    },
    {
      name: 'magic innovation + academy',
      description: 'MC pioneer spell + theory — academic recognition',
      arcShape: 'Phase 1 student → Phase 2 researcher → Phase 3 professor → Phase 4 archmage',
    },
    {
      name: 'tech uplift + trade',
      description: 'MC pioneer ngành mới — corporate + political',
      arcShape: 'Phase 1 workshop → Phase 2 city guild → Phase 3 kingdom monopoly → Phase 4 international trade',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['kingdom', 'guild', 'magic', 'race'] },
};

const NGON_TINH: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Showbiz có 1 talent agency lớn vừa thay leader — đang reshuffle artists',
    'Tập đoàn đa ngành đang IPO — phụ nữ trẻ đang nắm vị trí then chốt',
    'Một designer studio nổi tiếng đang tuyển — lifestyle elite',
    'Ngành y/luật/kiến trúc có competition căng thẳng — talent trẻ nổi lên',
    'Một sự kiện gala lớn sắp tổ chức — celebrities tụ tập',
    'Phố cafe sang trọng có "club kín" của giới thượng lưu',
    'Trường mỹ thuật / âm nhạc top vừa khai giảng — admission elite',
    'Tập đoàn family-owned đang tranh chấp thừa kế — phụ nữ là center',
    'Sự kiện charity ball sắp tới — networking đại gia + celebrities',
    'Một MV/TV show đang tuyển diễn viên — competition nóng',
    'Ngành PR + quản lý nghệ sĩ đang scandal — opportunity cho người mới có ethics',
    'Một bệnh viện tư nhân lớn mới mở chi nhánh — bác sĩ trẻ tài năng được săn',
  ],
  mcArchetypes: [
    {
      name: 'đại nữ chủ career-driven',
      voice: 'Independent, có chính kiến. Lịch thiệp nhưng không yếu.',
      signature: 'Phụ nữ trẻ pioneer 1 ngành — career là main, romance hỗ trợ',
      fits: ['ngon-tinh'],
      antiPatterns: ['phụ thuộc nam chính', 'sự nghiệp thất bại vì love'],
    },
    {
      name: 'professional reborn nữ',
      voice: 'Tỉnh táo, có kế hoạch. Trầm tĩnh, có sense về love.',
      signature: 'Trọng sinh — biết tương lai showbiz/business + đối thủ + love misfortune',
      fits: ['ngon-tinh'],
      antiPatterns: ['phục thù người yêu cũ ngay ch.1'],
    },
    {
      name: 'designer/artist soulful',
      voice: 'Cảm xúc, có gu thẩm mỹ. Tự tin trong art, hơi rụt rè trong love.',
      signature: 'Pioneer 1 phong cách design / art — discovery + recognition',
      fits: ['ngon-tinh'],
      antiPatterns: ['art bị đánh cắp'],
    },
    {
      name: 'doctor/lawyer competent',
      voice: 'Chuyên nghiệp, có ethics. Mạnh trong việc chính, mềm trong tình cảm.',
      signature: 'Bác sĩ/luật sư trẻ tài năng — case khó + parallel love arc',
      fits: ['ngon-tinh'],
      antiPatterns: ['malpractice', 'mất bằng'],
    },
    {
      name: 'CEO daughter ẩn thân',
      voice: 'Có background nhưng chọn khiêm tốn. Smart + grounded.',
      signature: 'Là daughter của tập đoàn lớn — chọn ẩn thân để tự xây dựng',
      fits: ['ngon-tinh'],
      antiPatterns: ['lộ thân phận quá sớm'],
    },
    {
      name: 'PR/manager với heart',
      voice: 'Năng động, có ethics. Empathy + sharp in business.',
      signature: 'PR/talent manager pioneer cách làm việc nhân văn — ngành showbiz',
      fits: ['ngon-tinh'],
      antiPatterns: ['scandal phá sự nghiệp ngay'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC vừa thắng project design / case nhỏ đầu tiên — buổi sáng văn phòng',
      hook: 'Sếp khen + giao project lớn hơn — networking opportunity',
      antiPattern: 'NO bị đồng nghiệp tẩy chay',
    },
    {
      scenario: 'MC ở bệnh viện làm ca sáng — bệnh nhân thường',
      hook: 'Một ca khó đến — MC pioneer phương pháp nhẹ nhàng',
      antiPattern: 'NO bệnh nhân chết',
    },
    {
      scenario: 'MC trong studio art riêng — đang hoàn thiện 1 piece',
      hook: 'Curator gallery đến thăm — đề nghị triển lãm',
      antiPattern: 'NO bị đạo ý tưởng',
    },
    {
      scenario: 'MC đang manage talent trẻ — buổi sáng coordination',
      hook: 'Talent có cơ hội audition lớn — MC chuẩn bị strategy',
      antiPattern: 'NO talent bỏ MC',
    },
    {
      scenario: 'MC vừa nhận thư mời tham dự gala lớn — chuẩn bị buổi tối',
      hook: 'Gala MC gặp 1 đại gia / talent có conversation đáng nhớ',
      antiPattern: 'NO bị scandal ngay',
    },
    {
      scenario: 'MC đến nhậm chức partner trẻ ở firm — sáng đầu tiên',
      hook: 'Partner senior giao case có potential lớn — MC chuẩn bị kỹ',
      antiPattern: 'NO bị partner senior hãm hại',
    },
  ],
  tensionAxes: [
    {
      name: 'career rise + romance parallel',
      description: 'MC sự nghiệp lên + romance phát triển song song — không exclusive',
      arcShape: 'Phase 1 cá nhân → Phase 2 partner ổn định → Phase 3 industry leader → Phase 4 legacy',
    },
    {
      name: 'showbiz politics + love',
      description: 'MC ở showbiz xử lý scandal + love',
      arcShape: 'Phase 1 newcomer → Phase 2 hit → Phase 3 A-list → Phase 4 legacy',
    },
    {
      name: 'family business + identity',
      description: 'MC navigate family business + tự xây identity riêng',
      arcShape: 'Phase 1 hidden → Phase 2 reveal partial → Phase 3 lead one branch → Phase 4 lead all',
    },
    {
      name: 'professional excellence + ethics',
      description: 'MC chuyên gia case khó + giữ ethics',
      arcShape: 'Phase 1 case nhỏ → Phase 2 case mid → Phase 3 leadership → Phase 4 industry voice',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['industry', 'event', 'network', 'project'] },
};

// ── Phase 20A new top-level genres ──────────────────────────────────────────

const QUY_TAC_QUAI_DAM: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Phó bản đời thường (văn phòng/metro/siêu thị) bắt đầu xuất hiện quy tắc kỳ lạ',
    'Người tham gia đầu tiên chỉ 5% thoát — tỷ lệ thành công thấp',
    'Quy tắc thật và giả đan xen — phải suy luận tỉ mỉ',
    'Có "Quản trị viên" ngầm điều phối phó bản — không ai gặp mặt được',
    'Phó bản tier 1 (đời thường) → tier 2 (lệch realism) đang dần escalate',
    'Cộng đồng survivor online chia sẻ kinh nghiệm — nhiều info conflicting',
    'Một số người đã trải qua >5 phó bản — gọi là "Lão Survivor"',
    'Vật phẩm từ phó bản có thể mang ra IRL — black market đang hình thành',
    'Có "NPC" trong phó bản đang behave bất thường — hint có lực lượng third-party',
    'Quy tắc đôi khi đánh đố ngữ nghĩa — wording rất quan trọng',
    'Phó bản có "uncanny valley" — chi tiết nhỏ lệch chuẩn (không khí lạnh, đèn nhấp nháy bất thường)',
    'Có tin đồn về "Endgame Phó Bản" — chưa ai vào và sống ra',
  ],
  mcArchetypes: [
    {
      name: 'lão survivor cẩn trọng',
      voice: 'Trầm tĩnh, methodical. Đọc quy tắc 3 lần trước khi hành động.',
      signature: 'Đã trải qua 3-5 phó bản — biết pattern + bẫy phổ biến',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['liều lĩnh không lý do', 'ignore lời cảnh báo'],
    },
    {
      name: 'logic researcher',
      voice: 'Khoa học, tìm pattern. Nói ngắn gọn, ưu tiên data.',
      signature: 'Researcher / scientist phân tích quy tắc với phương pháp khoa học',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['ignore intuition'],
    },
    {
      name: 'newcomer nhanh học',
      voice: 'Quan sát, học nhanh. Không panic.',
      signature: 'Newcomer nhưng có khả năng tổng hợp + suy luận tốt',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['quá tự tin sau 1-2 phó bản thắng'],
    },
    {
      name: 'team leader đồng đội',
      voice: 'Lãnh đạo, bình tĩnh, biết phân nhiệm.',
      signature: 'Tập hợp team — chia roles + survive together',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['team tan rã do conflict'],
    },
    {
      name: 'paranormal sensitive',
      voice: 'Sensitive về uncanny details. Cảm nhận trước.',
      signature: 'Có giác quan paranormal — cảm nhận quy tắc thật/giả nhanh hơn',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['power overwhelming'],
    },
    {
      name: 'collector vật phẩm',
      voice: 'Pragmatic, có business sense. Sống sót + thu lợi.',
      signature: 'Collect vật phẩm phó bản + giao dịch black market — pioneer chiến lược loot',
      fits: ['quy-tac-quai-dam'],
      antiPatterns: ['greed làm chết người'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC đã trải qua 2 phó bản thành công — buổi sáng IRL bình thường',
      hook: 'Notification phó bản 3 sắp triệu — MC bắt đầu chuẩn bị supplies + đọc note cũ',
      antiPattern: 'NO mất hết note phó bản',
    },
    {
      scenario: 'MC vừa hoàn thành phó bản 1 thành công đầu tiên — quay về IRL',
      hook: 'Có người liên hệ qua online forum — invite vào team có kinh nghiệm',
      antiPattern: 'NO team là bẫy',
    },
    {
      scenario: 'MC đang research patterns trong nhà — sáng yên tĩnh',
      hook: 'Tìm ra 1 pattern lệch — chuẩn bị test trong phó bản tới',
      antiPattern: 'NO note bị đánh cắp',
    },
    {
      scenario: 'MC team training cho phó bản tới — practice scenario',
      hook: 'Training simulator phát hiện 1 weakness — team adjust strategy',
      antiPattern: 'NO team member rời',
    },
    {
      scenario: 'MC làm collector — vừa giao dịch 1 vật phẩm cấp B thành công',
      hook: 'Khách hàng VIP đề xuất commission cấp A — MC nhận task',
      antiPattern: 'NO khách lừa',
    },
    {
      scenario: 'MC research forum survivor — đọc case study',
      hook: 'Phát hiện 1 case study có hint về Endgame — MC bắt đầu plan dài',
      antiPattern: 'NO forum bị đóng cửa',
    },
  ],
  tensionAxes: [
    {
      name: 'phó bản tier escalation',
      description: 'Phó bản từ tier 1 (đời thường) → tier 2 (lệch realism) → tier 3 (occult)',
      arcShape: 'Phase 1 tier 1 → Phase 2 tier 2 → Phase 3 tier 3 → Phase 4 endgame',
    },
    {
      name: 'team building + survival',
      description: 'MC build team — survive nhiều phó bản',
      arcShape: 'Phase 1 solo → Phase 2 team 3 → Phase 3 team 7 → Phase 4 alliance',
    },
    {
      name: 'meta investigation',
      description: 'MC investigate cause + Quản trị viên',
      arcShape: 'Phase 1 hint → Phase 2 partial reveal → Phase 3 contact → Phase 4 confrontation',
    },
    {
      name: 'item collection + black market',
      description: 'MC collect vật phẩm — pioneer kinh tế ngầm',
      arcShape: 'Phase 1 single item → Phase 2 small set → Phase 3 collection → Phase 4 broker',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['copy', 'rule', 'item', 'mystery'] },
};

const NGU_THU_TIEN_HOA: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'Học viện ngự thú top vừa khai giảng — admission cao',
    'Pet competition quốc gia sắp tới — tournament tiers',
    'Wild beast vùng cấm vừa biến dị — scientific anomaly',
    'Beast taming guild đang reshuffle — opportunity',
    'Một dòng pet rare vừa được phát hiện — collector market',
    'Beast evolution research lab top đang tuyển intern',
    'Truyền thừa cổ Dòng Ngự Thú đang chờ truyền nhân',
    'Đoàn explorer đang tuyển ngự thú sư cho expedition',
    'Pet trade black market — rare species',
    'Học viện có "Cấm Thú Đường" — đệ tử top mới được vào',
    'Sự kiện "Hợp Thể" — pet + master bonding ritual ngàn năm',
    'Tin đồn về "Thái Sơ Thú" — pet ancestor of all species',
  ],
  mcArchetypes: [
    {
      name: 'ngự thú sư có insight',
      voice: 'Quan sát kỹ, có empathy với pet. Học nhanh.',
      signature: 'Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn của pet — pioneer evolution path',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['lộ Bàn Tay Vàng quá sớm', 'pet abuse'],
    },
    {
      name: 'pet trainer cực đoan',
      voice: 'Methodical, demanding. Có ethics nghề.',
      signature: 'Train pet với phương pháp khắc khổ — pet evolution faster',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['pet abuse'],
    },
    {
      name: 'thiếu niên truyền thừa',
      voice: 'Curious, có tâm với pet. Học rộng tradition cổ.',
      signature: 'Truyền nhân 1 dòng ngự thú cổ — biết kỹ thuật bonding lost',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['rập khuôn truyền thống'],
    },
    {
      name: 'researcher khoa học',
      voice: 'Logic, tinh tế. Pioneer evolution theory.',
      signature: 'Beast evolution researcher — pioneer 1 hệ thống classification',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['ignore intuition pet'],
    },
    {
      name: 'explorer + tamer',
      voice: 'Brave, adventurous. Có ethics với wild beasts.',
      signature: 'Explorer + tamer wild beasts — pioneer mapping species',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['poaching'],
    },
    {
      name: 'merchant pet specialist',
      voice: 'Pragmatic, business-minded. Có sense về rare pets.',
      signature: 'Merchant chuyên rare pets — networking + ethics',
      fits: ['ngu-thu-tien-hoa'],
      antiPatterns: ['black market exploit'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC tại học viện ngự thú — buổi sáng training thường lệ',
      hook: 'Pet vừa đột phá tier mới — MC nhận thấy có Tuyến Tiến Hóa Ẩn unique',
      antiPattern: 'NO pet chết / NO pet bỏ MC',
    },
    {
      scenario: 'MC làm researcher trong lab — quan sát 1 wild beast vừa đem về',
      hook: 'Phát hiện anomaly trong genetic — chuẩn bị paper',
      antiPattern: 'NO lab bị đánh cắp',
    },
    {
      scenario: 'MC vừa tốt nghiệp học viện — nhận pet đầu tiên',
      hook: 'Pet basic nhưng có potential ẩn — MC bắt đầu plan tiến hóa',
      antiPattern: 'NO pet bị thay',
    },
    {
      scenario: 'MC ở pet shop riêng — buổi sáng khách thường',
      hook: 'Khách đặc biệt mang đến pet rare — MC tư vấn evolution path',
      antiPattern: 'NO khách scam',
    },
    {
      scenario: 'MC trong expedition team — base camp sáng',
      hook: 'Scout report wild beast hiếm — MC chuẩn bị team đi tame',
      antiPattern: 'NO beast diệt team',
    },
    {
      scenario: 'MC dạy lớp ngự thú học cơ bản — sinh viên năm 1',
      hook: 'Sinh viên có pet bất thường — MC nhận thấy Tuyến Tiến Hóa unique',
      antiPattern: 'NO sinh viên steal credit',
    },
  ],
  tensionAxes: [
    {
      name: 'pet evolution + tournament',
      description: 'MC + pet leo tournament tiers',
      arcShape: 'Phase 1 local → Phase 2 region → Phase 3 quốc gia → Phase 4 thế giới',
    },
    {
      name: 'rare species + collection',
      description: 'MC pioneer collection species — academic + market',
      arcShape: 'Phase 1 single → Phase 2 small set → Phase 3 comprehensive → Phase 4 ancestor species',
    },
    {
      name: 'evolution research + breakthrough',
      description: 'MC pioneer evolution theory',
      arcShape: 'Phase 1 paper đầu → Phase 2 lab leader → Phase 3 academic recognition → Phase 4 paradigm shift',
    },
    {
      name: 'truyền thừa cổ + bí thuật',
      description: 'MC tìm + học bí thuật cổ ngự thú',
      arcShape: 'Phase 1 hint → Phase 2 master → Phase 3 mastery → Phase 4 đại sư truyền thừa',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['academy', 'species', 'event', 'lore'] },
};

const KHOAI_XUYEN: GenreSetupPlaybook = {
  worldbuildingHooks: [
    'MC là nhân viên Hệ Thống Đa Vũ Trụ — receive missions',
    'Mỗi 30-50 chương xuyên thân phận mới — pháo hôi/villain/nữ phụ',
    'Hub Space giữa các thế giới — shop + skill upgrade',
    'Có nguyên chủ cần cứu / bù đắp — backstory bi kịch',
    'Hệ thống có lỗi đôi khi — leverage opportunity',
    'Multiverse có "Đại Đạo" rule — không được phá meta',
    'Một số nhân viên cũ đang đối đầu MC — competition',
    'Có thế giới đặc biệt cao tier — chỉ top employees mới được phái',
    'Sự kiện "Hợp Nhất Thế Giới" - meta event ảnh hưởng nhiều thế giới',
    'Hệ thống boss có khả năng "Đặc Quyền" — performance reward',
    'Có "Phó Bản Bí Mật" — reward đặc biệt nhưng risk cao',
    'Cặp đôi xuyên cùng — partner consistent across worlds',
  ],
  mcArchetypes: [
    {
      name: 'nhân viên hệ thống lão luyện',
      voice: 'Chuyên nghiệp, methodical. Có experience nhiều worlds.',
      signature: 'Đã trải qua 10+ worlds — biết pattern + có toolset',
      fits: ['khoai-xuyen'],
      antiPatterns: ['ignore variation từng world'],
    },
    {
      name: 'newcomer thông minh',
      voice: 'Curious, học nhanh. Trầm tĩnh dưới áp lực.',
      signature: 'Newcomer nhưng có insight về metadata + pattern',
      fits: ['khoai-xuyen'],
      antiPatterns: ['quá tự tin sau 1-2 worlds'],
    },
    {
      name: 'rebel hệ thống',
      voice: 'Có chính kiến, không đồng ý mọi mission. Có ethics riêng.',
      signature: 'Đôi khi defy hệ thống vì ethics — leverage loophole',
      fits: ['khoai-xuyen'],
      antiPatterns: ['rebel quá rõ bị hệ thống ban'],
    },
    {
      name: 'partner đồng hành',
      voice: 'Cool, có chemistry với partner. Trustworthy.',
      signature: 'Cặp đôi xuyên cùng — partner consistent',
      fits: ['khoai-xuyen'],
      antiPatterns: ['partner phản bội'],
    },
    {
      name: 'collector skill',
      voice: 'Pragmatic, có business sense. Optimize skill points.',
      signature: 'Optimize stats + skill — efficient missions',
      fits: ['khoai-xuyen'],
      antiPatterns: ['greed làm hỏng mission'],
    },
    {
      name: 'investigator meta',
      voice: 'Curious về meta. Trầm tĩnh, có chiều sâu.',
      signature: 'Investigate cause + Đại Đạo + meta-rule',
      fits: ['khoai-xuyen'],
      antiPatterns: ['ignore mission để chase meta'],
    },
  ],
  openingScenes: [
    {
      scenario: 'MC trong Hub Space sau mission thành công — đang shop skill',
      hook: 'Notification mission mới — MC review brief + chuẩn bị',
      antiPattern: 'NO mission impossible',
    },
    {
      scenario: 'MC vừa hoàn thành world 1 — settle reward',
      hook: 'Hệ thống offer mission cấp cao hơn — MC accept',
      antiPattern: 'NO mất reward',
    },
    {
      scenario: 'MC đang research case study từ employees cũ — đọc note',
      hook: 'Phát hiện 1 pattern hệ thống chưa nói — chuẩn bị test',
      antiPattern: 'NO note bị xóa',
    },
    {
      scenario: 'MC đang tap upgrade skill — hub space yên tĩnh',
      hook: 'Skill mới unlock potential — MC plan dùng next mission',
      antiPattern: 'NO skill bị nerf ngay',
    },
    {
      scenario: 'MC vừa gặp partner mới được assign — buổi briefing',
      hook: 'Partner có complementary skills — MC plan synergy',
      antiPattern: 'NO partner phản bội ngay',
    },
    {
      scenario: 'MC trong mission xuyên thân phận pháo hôi — buổi sáng đầu tiên',
      hook: 'Quan sát nguyên chủ + môi trường — bắt đầu plan cứu',
      antiPattern: 'NO mất ký ức về mission',
    },
  ],
  tensionAxes: [
    {
      name: 'mission progression + worlds',
      description: 'MC mission từ tier thấp → tier cao',
      arcShape: 'Phase 1 tier E → Phase 2 tier C → Phase 3 tier A → Phase 4 tier S',
    },
    {
      name: 'cặp đôi cùng xuyên',
      description: 'MC + partner consistent across worlds',
      arcShape: 'Phase 1 met → Phase 2 trust → Phase 3 sync → Phase 4 unbreakable',
    },
    {
      name: 'meta investigation Đại Đạo',
      description: 'MC investigate hệ thống + multiverse rule',
      arcShape: 'Phase 1 hint → Phase 2 partial → Phase 3 contact → Phase 4 confrontation/transcend',
    },
    {
      name: 'rebel ethics + mission balance',
      description: 'MC balance hệ thống mission + ethics riêng',
      arcShape: 'Phase 1 comply → Phase 2 small defy → Phase 3 leverage loophole → Phase 4 reform',
    },
  ],
  hookChecklist: { minHooks: 3, hookTypes: ['system', 'world', 'partner', 'meta'] },
};

// ── Master playbook map ──────────────────────────────────────────────────────

export const GENRE_SETUP_PLAYBOOKS: Record<GenreType, GenreSetupPlaybook> = {
  'tien-hiep': TIEN_HIEP,
  'huyen-huyen': HUYEN_HUYEN,
  'do-thi': DO_THI,
  'kiem-hiep': KIEM_HIEP,
  'lich-su': LICH_SU,
  'khoa-huyen': KHOA_HUYEN,
  'vong-du': VONG_DU,
  'dong-nhan': DONG_NHAN,
  'mat-the': MAT_THE,
  'linh-di': LINH_DI,
  'quan-truong': QUAN_TRUONG,
  'di-gioi': DI_GIOI,
  'ngon-tinh': NGON_TINH,
  'quy-tac-quai-dam': QUY_TAC_QUAI_DAM,
  'ngu-thu-tien-hoa': NGU_THU_TIEN_HOA,
  'khoai-xuyen': KHOAI_XUYEN,
};

/**
 * Get playbook for a genre. Falls back to tien-hiep if unknown.
 * (TS Record<GenreType,...> ensures all 16 genres present at compile time —
 *  this fallback is just defensive runtime safety.)
 */
export function getGenreSetupPlaybook(genre: GenreType): GenreSetupPlaybook {
  return GENRE_SETUP_PLAYBOOKS[genre] ?? GENRE_SETUP_PLAYBOOKS['tien-hiep'];
}

/**
 * Format playbook for inclusion in setup-pipeline AI prompts.
 * Compact representation — keeps token cost reasonable while exposing menu.
 */
export function formatPlaybookForIdeaStage(genre: GenreType): string {
  const pb = getGenreSetupPlaybook(genre);
  const tensions = pb.tensionAxes.map((t, i) => `  ${i + 1}. ${t.name} — ${t.description}`).join('\n');
  return `GENRE PLAYBOOK — TENSION AXES (chọn 1 làm core conflict cho premise):
${tensions}

QUY TẮC: premise phải ám chỉ rõ 1 tension axis ở trên. Stake Phase 1 LOCAL.`;
}

export function formatPlaybookForWorldStage(genre: GenreType): string {
  const pb = getGenreSetupPlaybook(genre);
  const hooks = pb.worldbuildingHooks.map((h, i) => `  ${i + 1}. ${h}`).join('\n');
  return `GENRE PLAYBOOK — WORLDBUILDING HOOKS (BẮT BUỘC inject ≥${pb.hookChecklist.minHooks} hooks vào world_description):
${hooks}

QUY TẮC: world_description PHẢI mention ≥${pb.hookChecklist.minHooks} hook keyword/concept ở trên (paraphrase OK, ý phải khớp). Loại hook đa dạng: ${pb.hookChecklist.hookTypes.join(' / ')}.`;
}

export function formatPlaybookForCharacterStage(genre: GenreType): string {
  const pb = getGenreSetupPlaybook(genre);
  const archetypes = pb.mcArchetypes.map((a, i) =>
    `  ${i + 1}. ${a.name}\n     voice: ${a.voice}\n     signature: ${a.signature}`
  ).join('\n');
  return `GENRE PLAYBOOK — MC ARCHETYPES (chọn 1 phù hợp world + premise):
${archetypes}

QUY TẮC: trả về MC + archetype name (1 trong list trên) + voice (paraphrase từ archetype) + signature trait.`;
}

export function formatPlaybookForDescriptionStage(genre: GenreType): string {
  const pb = getGenreSetupPlaybook(genre);
  const tensions = pb.tensionAxes.map(t => `${t.name}`).join(' / ');
  return `GENRE PLAYBOOK — TENSION REFERENCE: ${tensions}

QUY TẮC: description blurb phải tone đúng genre + ám chỉ 1 trong các tension axes. KHÔNG spoil endgame.`;
}

/**
 * Validate world_description chứa ≥minHooks hooks từ playbook.
 * Returns { passed, missing } — caller dùng để retry stage.
 */
export function validateWorldHooks(genre: GenreType, worldDescription: string): { passed: boolean; matchedCount: number; minRequired: number } {
  const pb = getGenreSetupPlaybook(genre);
  const text = worldDescription.toLowerCase();
  let matched = 0;
  for (const hook of pb.worldbuildingHooks) {
    // Heuristic: extract key noun phrases (split by — or .) — match if any chunk appears
    const chunks = hook.split(/[—,.]/).map(c => c.trim().toLowerCase()).filter(c => c.length >= 8);
    if (chunks.some(c => text.includes(c.slice(0, Math.min(c.length, 25))))) {
      matched++;
    }
  }
  return { passed: matched >= pb.hookChecklist.minHooks, matchedCount: matched, minRequired: pb.hookChecklist.minHooks };
}

/**
 * Validate MC archetype name matches one in playbook list.
 */
export function validateMcArchetype(genre: GenreType, archetypeName: string): { passed: boolean; suggested: string[] } {
  const pb = getGenreSetupPlaybook(genre);
  const norm = archetypeName.trim().toLowerCase();
  const passed = pb.mcArchetypes.some(a => a.name.toLowerCase() === norm || norm.includes(a.name.toLowerCase()));
  return { passed, suggested: pb.mcArchetypes.map(a => a.name) };
}
