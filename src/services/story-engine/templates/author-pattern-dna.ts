/**
 * Author Pattern DNA
 *
 * Compact reusable setup patterns for modern sảng văn. These are not author
 * profiles and do not imitate any writer's prose; they describe story-machine
 * moves that can be composed into a StoryKernel.
 */

export interface AuthorPatternCard {
  id: string;
  label: string;
  setupUse: string;
  payoffUse: string;
}

export const AUTHOR_PATTERN_DNA: AuthorPatternCard[] = [
  {
    id: 'smooth_opportunity',
    label: 'Smooth Opportunity',
    setupUse: 'Cơ hội đầu truyện đến từ routine tự nhiên trong domain nhỏ.',
    payoffUse: 'MC nhận việc/khách/tài nguyên mới mà không cần bi kịch ép buộc.',
  },
  {
    id: 'casual_competence',
    label: 'Casual Competence',
    setupUse: 'Cho MC giỏi một việc cụ thể ngay ở ch.1.',
    payoffUse: 'Reader sướng vì MC xử lý gọn bằng tay nghề, không diễn thuyết.',
  },
  {
    id: 'audience_reaction',
    label: 'Audience Reaction',
    setupUse: 'Luôn có người chứng kiến thành quả trong phạm vi local.',
    payoffUse: 'Ánh mắt, lời bàn, đơn hàng, vote, comment tạo dopamine xã hội.',
  },
  {
    id: 'report_back',
    label: 'Report-back',
    setupUse: 'Thiết kế kênh tin quay lại: khách kể, bảng xếp hạng, chat nhóm, báo cáo.',
    payoffUse: 'Thành quả MC lan ra ngoài scene chính, tạo cảm giác thế giới phản ứng.',
  },
  {
    id: 'public_recognition',
    label: 'Public Recognition',
    setupUse: 'Đặt mốc công nhận hữu hình theo tầng: phố, lớp, guild, huyện, ngành.',
    payoffUse: 'MC được gọi tên đúng lúc sau một chuỗi năng lực đã chứng minh.',
  },
  {
    id: 'resource_unlock',
    label: 'Resource Unlock',
    setupUse: 'Mỗi thành quả mở tài nguyên mới: tool, cửa hàng, bản đồ, contact, recipe.',
    payoffUse: 'Payoff không chỉ là thắng trận mà là thêm khả năng đẻ cảnh mới.',
  },
  {
    id: 'sector_expansion',
    label: 'Sector Expansion',
    setupUse: 'Phase sau mở lĩnh vực/khu vực mới nhưng vẫn phục vụ fantasy gốc.',
    payoffUse: 'Truyện rộng dần mà không đổi lane hoặc biến sang genre khác.',
  },
  {
    id: 'underestimation_payoff',
    label: 'Underestimation Payoff',
    setupUse: 'Đối thủ đánh giá thấp vì nhìn nhầm domain hoặc dữ kiện.',
    payoffUse: 'MC thắng bằng thứ đã setup trước, không cần đối thủ ngu toàn diện.',
  },
  {
    id: 'market_signal',
    label: 'Market Signal',
    setupUse: 'Dùng số liệu thị trường/rank/đơn hàng/traffic như phản hồi khách quan.',
    payoffUse: 'Reader thấy tăng trưởng đo được, không chỉ nghe narrator khen.',
  },
  {
    id: 'hidden_expertise',
    label: 'Hidden Expertise',
    setupUse: 'MC có kinh nghiệm/quan sát nhỏ mà người khác không chú ý.',
    payoffUse: 'Mỗi arc lộ thêm một mảng chuyên môn đã có gốc từ tính cách/nghề.',
  },
  {
    id: 'social_proof',
    label: 'Social Proof',
    setupUse: 'Tạo nhóm người dùng/đồng đội/khách hàng xác nhận giá trị của MC.',
    payoffUse: 'Niềm tin tập thể mở ra cơ hội lớn hơn cho MC.',
  },
  {
    id: 'compounding_asset',
    label: 'Compounding Asset',
    setupUse: 'Cho MC xây tài sản tích lũy: skill tree, cửa hàng, đội ngũ, territory, database.',
    payoffUse: 'Payoff cũ trở thành đòn bẩy cho payoff mới, tạo cảm giác càng đọc càng lời.',
  },
];

export function formatAuthorPatternDnaForSetup(): string {
  return AUTHOR_PATTERN_DNA
    .map(card => `- ${card.id}: ${card.setupUse} Payoff: ${card.payoffUse}`)
    .join('\n');
}
