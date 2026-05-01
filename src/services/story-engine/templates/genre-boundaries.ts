/**
 * Genre boundary rules — what CAN expand within each genre, what's drift (Phase 28 TIER 2).
 *
 * Extracted from templates.ts. Used to inject into Architect/Critic context so
 * generated chapters stay within genre boundaries (vd do-thi cấm tu tiên jargon).
 */

import type { GenreType } from '../types';

export interface GenreBoundary {
  coreIdentity: string;
  forbidden: string[];
  allowedExpansions: string[];
  driftWarnings: string[];
}

export const GENRE_BOUNDARIES: Record<GenreType, GenreBoundary> = {
  'tien-hiep': {
    coreIdentity: 'Tu tiên cổ điển: tu luyện, cảnh giới, tông phái, linh khí, đan dược, pháp bảo',
    forbidden: [
      'Công nghệ hiện đại (máy tính, điện thoại, internet, AI)',
      'Vũ khí hiện đại (súng, tên lửa, bom nguyên tử)',
      'Du hành không gian, hành tinh khác (trừ khi đã setup tinh giới)',
      'Hệ thống game rõ ràng (level up notification, UI panel)',
    ],
    allowedExpansions: [
      'Tu luyện kết hợp luyện khí/luyện thể',
      'Cổ trận pháp, cổ đại di tích',
      'Thần giới, ma giới (khi cảnh giới đủ cao)',
    ],
    driftWarnings: [
      'MC dùng khoa học để giải thích tu luyện',
      'Xuất hiện vũ khí/công nghệ vượt thời đại',
      'Bối cảnh chuyển sang hoàn toàn hiện đại',
    ],
  },
  'huyen-huyen': {
    coreIdentity: 'Huyền huyễn: thế giới hư cấu, hệ thống sức mạnh độc đáo, nhiều chủng tộc',
    forbidden: [
      'Công nghệ Trái Đất hiện đại',
      'Tham chiếu đến thế giới thực (quốc gia, thành phố thực)',
      'Hệ thống game rõ ràng',
    ],
    allowedExpansions: [
      'Ma pháp + tu luyện kết hợp',
      'Nhiều chủng tộc, không gian khác nhau',
      'Thần thoại, truyền thuyết nội tại',
    ],
    driftWarnings: [
      'Xuất hiện yếu tố khoa học cứng',
      'MC xuyên không về Trái Đất',
    ],
  },
  'do-thi': {
    coreIdentity: 'Đô thị hiện đại: thành phố, kinh doanh, quyền lực xã hội, đời thường',
    forbidden: [
      'Tu tiên cao cấp (bay trên trời, hủy diệt thành phố bằng chiêu thức)',
      'Xuyên không sang thế giới khác',
      'Chiến tranh giữa các hành tinh',
      'Ma thuật/phép thuật rõ ràng (trừ khi đã setup từ đầu)',
    ],
    allowedExpansions: [
      'Võ thuật nhẹ (kung fu, boxing)',
      'Năng lực siêu nhiên nhẹ (nếu setup từ đầu)',
      'Hệ thống bí ẩn (nếu là đô thị dị năng)',
    ],
    driftWarnings: [
      'MC bắt đầu bay, phá hủy tòa nhà bằng nội lực',
      'Xuất hiện quái vật, ma quỷ khi không phải thể loại linh dị',
      'Bối cảnh rời thành phố hoàn toàn sang rừng núi tu luyện',
    ],
  },
  'kiem-hiep': {
    coreIdentity: 'Kiếm hiệp cổ trang: giang hồ, bang hội, kiếm pháp, nghĩa hiệp, ân oán',
    forbidden: [
      'Công nghệ hiện đại',
      'Tu tiên level thần tiên (bay vào vũ trụ)',
      'Hệ thống game',
      'Vũ khí hiện đại',
    ],
    allowedExpansions: [
      'Nội công, khinh công, điểm huyệt',
      'Bí kíp võ công, thần binh lợi khí',
      'Ẩn sĩ cao nhân, bí mật giang hồ',
    ],
    driftWarnings: [
      'MC đạt sức mạnh phá hủy núi non',
      'Xuất hiện phép thuật/tu tiên thực sự',
      'Bối cảnh chuyển sang hiện đại',
    ],
  },
  'lich-su': {
    coreIdentity: 'Lịch sử Trung Quốc/châu Á: triều đại, chính trị, quân sự, văn hóa thời đại',
    forbidden: [
      'Phi thuyền, laser, năng lượng hạt nhân',
      'Xâm lăng hành tinh khác',
      'Công nghệ vượt thời đại quá nhiều (máy tính, điện)',
      'Tu tiên cao cấp (trừ khi đã setup rõ từ đầu)',
      'Quái vật ngoài hành tinh',
    ],
    allowedExpansions: [
      'Cải tiến công nghệ hợp lý cho thời đại (thuốc súng sớm, in ấn, thủy lợi)',
      'Chiến thuật quân sự tiên tiến',
      'Yếu tố thần bí nhẹ nếu phù hợp văn hóa (phong thủy, bói toán)',
    ],
    driftWarnings: [
      'MC phát minh công nghệ hiện đại hoàn chỉnh',
      'Xuất hiện vũ khí vượt thời đại 500+ năm',
      'Bối cảnh chuyển sang khoa học viễn tưởng',
      'Tu luyện tu tiên trong truyện lịch sử thuần',
    ],
  },
  'khoa-huyen': {
    coreIdentity: 'Khoa huyễn: công nghệ tương lai, vũ trụ, AI, robot, siêu nhân khoa học',
    forbidden: [
      'Tu tiên truyền thống (linh khí, đan điền)',
      'Ma thuật/phép thuật (trừ khi đã setup là tech-magic)',
      'Kiếm hiệp cổ trang thuần',
    ],
    allowedExpansions: [
      'Năng lực siêu nhiên giải thích bằng khoa học',
      'Alien, du hành vũ trụ',
      'AI, robot, cyborg, gene enhancement',
    ],
    driftWarnings: [
      'MC bắt đầu tu luyện kiểu cổ xưa',
      'Bối cảnh chuyển về cổ đại hoàn toàn',
    ],
  },
  'vong-du': {
    coreIdentity: 'Vọng du/Game: thế giới ảo, game mechanics, quest, raid, PvP, level system',
    forbidden: [
      'Bối cảnh hoàn toàn rời thế giới game mà không quay lại',
      'Mất hoàn toàn yếu tố game (level, quest, boss)',
    ],
    allowedExpansions: [
      'Real-world stakes ảnh hưởng game',
      'AI trong game phát triển ý thức',
      'Multiple games/thế giới ảo',
    ],
    driftWarnings: [
      'Game elements biến mất hoàn toàn',
      'Chuyển sang tu tiên thuần túy không còn game',
    ],
  },
  'dong-nhan': {
    coreIdentity: 'Đồng nhân: fanfiction trong thế giới anime/manga/game nổi tiếng',
    forbidden: [
      'Phá hủy hoàn toàn setting gốc mà không giải thích',
      'OC hoàn toàn không liên quan đến thế giới gốc',
    ],
    allowedExpansions: [
      'Crossover nhiều thế giới',
      'AU (Alternative Universe)',
      'Thêm hệ thống/golden finger',
    ],
    driftWarnings: [
      'Nhân vật gốc bị OOC quá mức',
      'Bối cảnh không còn nhận ra thế giới gốc',
    ],
  },
  'mat-the': {
    coreIdentity: 'Mạt thế: apocalypse, zombie, đột biến, sinh tồn, tài nguyên khan hiếm',
    forbidden: [
      'Xã hội phục hồi hoàn toàn quá sớm',
      'MC trở thành thần/tiên rời khỏi thế giới mạt thế',
    ],
    allowedExpansions: [
      'Năng lực siêu nhiên từ đột biến',
      'Crystal/tinh thể năng lượng',
      'Quái vật đột biến tiến hóa',
    ],
    driftWarnings: [
      'Bối cảnh sinh tồn biến mất, thành đô thị bình thường',
      'MC mạnh quá không có thử thách sinh tồn',
    ],
  },
  'linh-di': {
    coreIdentity: 'Linh dị: ma quỷ, huyền bí, kinh dị, tâm linh, phong thủy',
    forbidden: [
      'Khoa học giải thích mọi thứ siêu nhiên',
      'Tu tiên cao cấp (phá hủy thế giới)',
      'Không gian/vũ trụ, alien',
    ],
    allowedExpansions: [
      'Phong thủy, bùa chú, pháp sư',
      'Tâm linh, luân hồi, nghiệp báo',
      'Yếu tố kinh dị tâm lý',
    ],
    driftWarnings: [
      'Ma quỷ biến thành quái vật kiểu fantasy thuần',
      'MC trở thành tu tiên mạnh mẽ bỏ qua yếu tố kinh dị',
    ],
  },
  'quan-truong': {
    coreIdentity: 'Quan trường: chính trị, leo lên quyền lực, mưu kế, quan hệ, tham nhũng',
    forbidden: [
      'Siêu năng lực, tu luyện',
      'Chiến tranh vũ trụ',
      'Ma thuật/phép thuật',
    ],
    allowedExpansions: [
      'Kinh doanh, tài chính',
      'Tình cảm, gia đình',
      'Điều tra, phá án',
    ],
    driftWarnings: [
      'MC dùng vũ lực thay vì mưu trí',
      'Bối cảnh rời chính trường hoàn toàn',
    ],
  },
  'di-gioi': {
    coreIdentity: 'Dị giới: xuyên không sang thế giới khác, khám phá, sinh tồn, phát triển',
    forbidden: [
      'Quay về Trái Đất vĩnh viễn mà không quay lại dị giới',
    ],
    allowedExpansions: [
      'Hệ thống/golden finger',
      'Tu luyện, ma pháp tùy thế giới',
      'Xây dựng lãnh thổ, phát triển vương quốc',
    ],
    driftWarnings: [
      'Bối cảnh dị giới biến mất, thành đô thị hiện đại',
    ],
  },
  'ngon-tinh': {
    coreIdentity: 'Ngôn tình: tình yêu, cảm xúc, quan hệ, drama gia đình, heal',
    forbidden: [
      'Chiến tranh quy mô lớn',
      'Tu luyện/sức mạnh chiến đấu là focus chính',
      'Khoa học viễn tưởng hardcore',
    ],
    allowedExpansions: [
      'Kinh doanh, sự nghiệp',
      'Gia đình, con cái',
      'Bí mật thân phận, drama',
    ],
    driftWarnings: [
      'MC bắt đầu đánh nhau nhiều hơn yêu đương',
      'Tình cảm biến mất, thành action thuần',
    ],
  },
  'ngu-thu-tien-hoa': {
    coreIdentity: 'Ngự Thú Tiến Hóa: Pokemon × Tu tiên × RPG. MC ngự thú sư có Bàn Tay Vàng nhìn thấu Tuyến Tiến Hóa Ẩn + công thức BOM, biến pet phế vật thành thần thú. Sảng văn Bất Đối Xứng Nhận Thức.',
    forbidden: [
      'MC tự tay đánh nhau như võ sĩ / kiếm khách (combat phải qua pet)',
      'Pet được "buff vô lý" không có công thức tiến hóa rõ — phải có data nhất quán',
      'Tu tiên cảnh giới đột phá MC (sai genre — tu tiên không phải ngự thú)',
      'Pet biến mất hoặc bị nâng cấp không qua công thức → thiếu nhất quán data',
    ],
    allowedExpansions: [
      'Học viện ngự thú / cấm khu thợ săn / gia tộc / thương nhân / VR game / cổ truyền',
      'Hệ thống đột biến BOM + pet evolution tree đa dạng',
      'Đa loại pet: thú/cá/chim/côn trùng/thực vật/khoáng/hồn/cơ giới/nguyên tố',
    ],
    driftWarnings: [
      'MC bắt đầu tự đánh nhau thay vì điều phối pet → drift sang tu tiên/võ hiệp',
      'Pet "thiên thần đẳng" thay vì có data tiến hóa rõ → mất bản sắc thể loại',
      'Combat tay đôi MC vs villain → đang drift sang fantasy combat',
    ],
  },
  'khoai-xuyen': {
    coreIdentity: 'Khoái Xuyên: MC nhân viên Hệ Thống Đa Vũ Trụ, mỗi 30-50 chương xuyên vào 1 thân phận mới (pháo hôi/villain) ở 1 thế giới khác để cứu vớt nguyên chủ. Modular episodic, reset cao.',
    forbidden: [
      'Nhân vật phụ thế giới cũ xuất hiện thế giới mới (trừ cặp đôi xuyên cùng / nguyên chủ tự ý thức)',
      'Khí vận chi tử (nguyên chủ chính nguyên tác) là "kẻ tốt thuần" — phải vạch trần đạo đức giả',
      'MC quên skill stacking giữa các thế giới → mất tính progression',
      'Thế giới kéo dài >55 chương → mất tính modular episodic',
    ],
    allowedExpansions: [
      'Đa thể loại thế giới: đô thị tổng tài, cung đấu cổ đại, mạt thế zombie, dị giới ma pháp, võng du VR',
      'Hub Space giữa các thế giới với NPC hệ thống có cá tính',
      'Cặp đôi xuyên cùng (linh hồn nhận ra linh hồn qua nhiều thân phận)',
      'Bù đắp tiếc nuối (slice-of-life cảm xúc, không vả mặt)',
    ],
    driftWarnings: [
      'Thế giới biến thành arc dài >60 chương → mất tính modular',
      'MC mất voice senior nhất quán, bị "đồng hóa" thành nguyên chủ → drift bản sắc',
      'Khí vận chi tử thành "đồng minh sau cùng" → mất engine sảng văn vả mặt',
    ],
  },
  'quy-tac-quai-dam': {
    coreIdentity: 'Quy Tắc Quái Đàm: phó bản đời thường biến dị, MC sinh tồn bằng tuân thủ + suy luận quy tắc thật/giả. Atmospheric horror, Uncanny Valley, KHÔNG combat vật lý.',
    forbidden: [
      'Pháp sư / đạo trưởng / thiên sư cao tay vung bùa giết ma',
      'Tu tiên cảnh giới / đột phá / luyện đan',
      'Kiếm khách / võ lâm / chiến đấu vật lý tay đôi',
      'Hầm mộ / nghĩa địa / quan tài / xác sống cổ điển',
      'Jump scare máu me, miêu tả "máu / xương / nội tạng" gratuitous',
      'MC dùng vũ khí (kiếm, dao, súng, bùa diệt ma) đánh chết quái vật',
    ],
    allowedExpansions: [
      'Đa dạng phó bản đời thường (văn phòng / metro / bệnh viện / chung cư / siêu thị / khách sạn / trường học / quán ăn đêm)',
      'Hệ thống điểm san trị (Sanity) + đạo cụ quỷ dị + mảnh vỡ quy tắc',
      'Crossover các "kẻ phá đảo" khác, tổ chức Quái Đàm hậu trường',
      'Yếu tố trinh thám / suy luận khi MC ghép manh mối quy tắc giả/thật',
    ],
    driftWarnings: [
      'MC bắt đầu vung kiếm/súng đánh quái vật → đang drift sang fantasy/horror combat',
      'Phó bản biến thành hầm mộ cổ / nghĩa địa → đang drift sang linh-di truyền thống',
      'MC tu luyện đột phá cảnh giới → đang drift sang tu-tiên',
      'Quái vật được mô tả như rồng / yêu / quỷ thay vì người-bình-thường-sai-1-chi-tiết → mất Uncanny Valley',
    ],
  },
};

/**
 * Get genre boundary text for injection into context.
 */
export function getGenreBoundaryText(genre: GenreType): string {
  const boundary = GENRE_BOUNDARIES[genre];
  if (!boundary) return '';

  const parts: string[] = [];
  parts.push(`THỂ LOẠI: ${genre.toUpperCase()}`);
  parts.push(`BẢN SẮC CỐT LÕI: ${boundary.coreIdentity}`);
  parts.push(`\nCẤM TUYỆT ĐỐI (nếu vi phạm → genre drift):`);
  for (const item of boundary.forbidden) {
    parts.push(`  - ${item}`);
  }
  parts.push(`\nCHO PHÉP MỞ RỘNG (có kiểm soát):`);
  for (const item of boundary.allowedExpansions) {
    parts.push(`  + ${item}`);
  }
  parts.push(`\nDẤU HIỆU CẢNH BÁO (nếu thấy → đang lệch thể loại):`);
  for (const item of boundary.driftWarnings) {
    parts.push(`  ! ${item}`);
  }

  return parts.join('\n');
}
