// Arc 1 prelude — ch.1-5 placeholder briefs.
//
// These chapters were written BEFORE the blueprint approach was adopted.
// Content already in DB. Briefs here exist purely for blueprint coverage
// (so all 1..totalChapters covered → can activate).
//
// Brief content reflects what was actually written, derived from
// chapter_summaries table.

import type { ChapterBrief } from './arc-skeleton';

const TONE_PRELUDE = 'TONE: prelude — chapter đã viết trước blueprint era. Content đã trong DB.';

export const ARC1_BRIEFS_PRELUDE_CH1_5: ChapterBrief[] = [
  {
    n: 1, beat: 'setup',
    titleHint: 'Tỉnh Dậy Trong Phế Tộc',
    goal: 'Cố Diệp tỉnh dậy sau xuyên hồn — nhận thức gia tộc Cố sa sút, chú Cố Trường Khải ép ký từ bỏ thừa kế, Vạn Linh Phổ activate khi nhìn pet đầu tiên.',
    payoff: 'thông tin gia tộc, kéo dài 7 ngày trước khi ký, manh mối Vạn Linh Phổ activate',
    cast: ['Cố Diệp', 'Cố Tiểu Đào', 'Hà Thúc', 'Cố Trường Khải', 'Lục Vũ'],
    location: 'Cố phủ — phòng riêng + sân',
    scenes: ['MC tỉnh dậy với em gái', 'Hà Thúc báo gia phả', 'Vạn Linh Phổ activate với Lục Vũ', 'chú Trường Khải ép ký, MC deflect'],
    mcBenefit: 'thông tin gia tộc + Vạn Linh Phổ activate + 7 ngày prep',
    risks: [TONE_PRELUDE],
  },
  {
    n: 2, beat: 'breathing',
    titleHint: 'Kho Lưu Trữ Đêm Khuya',
    goal: 'Đêm: MC + Hà Thúc lén vào kho lưu trữ Cố phủ — observe pet phế qua Vạn Linh Phổ. Acquire Tro Bụi (slime cấp F kho cũ) — phát hiện tuyến tiến hóa Phượng Linh path.',
    payoff: 'pet đầu tiên Tro Bụi acquired + kế hoạch feed Tro Lửa Linh',
    cast: ['Cố Diệp', 'Hà Thúc', 'Tro Bụi'],
    location: 'kho lưu trữ Cố phủ + chợ Linh Châu Thành',
    scenes: ['đêm khuya lén vào kho', 'scan Tro Bụi qua Vạn Linh Phổ', 'mua Tro Lửa Linh', 'feed bí mật bắt đầu'],
    mcBenefit: 'Tro Bụi pet thứ 1 + Tro Lửa Linh nguyên liệu + kinh nghiệm thị trường',
    risks: [TONE_PRELUDE],
  },
  {
    n: 3, beat: 'setup',
    titleHint: 'Ngày Thứ Nhất và Lời Thách',
    goal: 'Ngày 1 feed Tro Bụi tiếp tục. MC dạy em gái Cố Tiểu Đào kiến thức ngự thú cơ bản. Cố Vân Kiếm (em họ kiêu ngạo) thách MC giải đấu nội tộc 5 ngày sau.',
    payoff: 'kiến thức ngự thú cho em gái + thử thách giải đấu accept',
    cast: ['Cố Diệp', 'Cố Tiểu Đào', 'Cố Vân Kiếm', 'Cố Già Tâm'],
    location: 'sân Cố phủ',
    scenes: ['MC dạy em gái', 'Vân Kiếm chế nhạo + thách giải đấu', 'Già Tâm khen MC ngầm', 'Tro Bụi feed sequence ngày 2-3'],
    mcBenefit: 'thử thách giải đấu setup + uy tín nhỏ + Già Tâm phe MC',
    risks: [TONE_PRELUDE],
  },
  {
    n: 4, beat: 'big_wow',
    titleHint: 'Tiến Hóa Trong Bóng Tối',
    goal: 'Tro Bụi evolve Lửa Tro cấp E thành công trong phòng kín. MC dạy pet kìm chế cấp F+ public cho giải đấu. Cố Khiếu (trưởng lão) lục soát phòng MC, không tìm thấy.',
    payoff: 'Tro Bụi evolve Lửa Tro E (đột phá pet) + chuẩn bị giải đấu + Khiếu mất mặt',
    cast: ['Cố Diệp', 'Hà Thúc', 'Cố Khiếu', 'Lửa Tro'],
    location: 'phòng kín hậu sơn + phòng riêng MC',
    scenes: ['Tro Bụi feed cuối', 'evolve Lửa Tro E thành công', 'MC dạy kìm chế', 'Khiếu lục soát fail'],
    mcBenefit: 'Tro Bụi → Lửa Tro E + Khiếu mất uy tín + chuẩn bị giải đấu',
    risks: [TONE_PRELUDE],
  },
  {
    n: 5, beat: 'resolution',
    titleHint: 'Lửa Tro Đêm Khuya',
    goal: 'Sub-arc 1 resolution. MC dạy em gái thuộc tính lôi hệ. Hà Thúc đưa nhật ký bố Cố Hành — manh mối arc 4 plant. MC test Lửa Tro kìm chế F+ chuẩn bị giải đấu mai.',
    payoff: 'nhật ký bố + kỹ năng kìm chế Lửa Tro + sẵn sàng giải đấu',
    cast: ['Cố Diệp', 'Cố Tiểu Đào', 'Hà Thúc', 'Lửa Tro'],
    location: 'sân + phòng kín hậu sơn',
    scenes: ['MC dạy em gái lôi hệ', 'Hà Thúc đưa nhật ký bố', 'cảnh báo "kẻ phản bội nội tộc" trong nhật ký', 'Lửa Tro test kìm chế'],
    mcBenefit: 'nhật ký bố + manh mối arc 4 + Lửa Tro sẵn sàng giải đấu',
    threadsAdvance: ['phục hưng gia tộc', 'bố Cố Hành Bắc Vực mất tích'],
    risks: [TONE_PRELUDE],
  },
];
