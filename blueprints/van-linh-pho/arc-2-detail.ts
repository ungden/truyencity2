// Arc 2 detailed chapter briefs (ch.51-150, 100 briefs).
//
// Theme: "Tranh đoạt tiểu tộc Linh Châu — Vương thị + Lý thị"
// Core payoff: Cố tộc đè bẹp Vương thị + Lý thị, leo trung tộc Linh Châu Thành,
// mở chuỗi cửa hàng pet thuần hoá ngầm, Cố Vân Kiếm full redemption, Tro Bụi
// → Hỏa Phụng Tế A peak.
//
// Cumulative state entering arc 2 (post ch.50):
//   MC: Sơ Cấp tầng 1 (ngự thú sư)
//   Pets: Phượng Linh C (Tro Bụi), Cơ Khí Vũ Sĩ D (Cơ Niệm), Phong Yến E (Lục Vũ)
//   Gia tộc: Cố tộc tiểu tộc, MC trưởng tộc đầy đủ (đại trưởng lão Cố Trường Hành công nhận)
//   Tro Linh Phái: 25 đệ tử + em gái Tiểu Đào + Vân Kiếm + Hà Thúc + Già Tâm
//   Antagonists arc 1 closed: Trường Khải (tử hình), Trường Lệ (rút + bồi hoàn), Khiếu (nghỉ), Lâm+Hảo (cảnh cáo)
//   Items established: Vòng Linh Tinh B, sách Vạn Linh Hỏa Pháp A, 3 viên Phượng Linh Đan,
//     Linh Tinh Ngọc B, bản đồ Bắc Vực với ghi chú tổ phụ
//   Open threads: bố mẹ Bắc Vực, di tích cổ Bắc Vực, Vạn Linh Phổ origin Trái Đất

import type { ChapterBrief } from './arc-skeleton';

const TONE_LAO_LUC = 'TONE: MC Cố Diệp lạnh đạm + tự tin + tính toán. Public face thiếu niên 16 tuổi may mắn. KHÔNG paranoid. KHÔNG tự khoe.';
const BAN_BASE = 'BAN: cliffhanger "có người theo dõi/rình mò"; pet evolve công khai; em gái biết Vạn Linh Phổ; MC chõ mồm bênh người lạ.';
const BAN_RESOURCES = 'CẤM nhắc "chìa khóa", "bản đồ", "vòng đeo", "mảnh vỡ", "huyết mạch" trừ khi declare source ledger trong cùng chương. Items có source ở arc 1 (Vòng Linh Tinh ch.10, bản đồ Bắc Vực ch.50). KHÔNG re-introduce nếu không cần thiết.';
const TIER_NOTE = 'PET TIER PUBLIC: Tro Bụi public B+ (cấp thật C, Phượng Linh), Cơ Niệm public D+ (cấp thật D), Lục Vũ public E (cấp thật E). Cấp ẩn chỉ MC + 0 người chứng kiến biết.';

export const ARC2_BRIEFS_CH51_150: ChapterBrief[] = [
  // ═══ Sub-arc 1 (ch.51-60): Cố Diệp tổ chức nội tộc ═══════════════════
  {
    n: 51, beat: 'setup',
    brief: 'Sáng đầu arc 2. MC Cố Diệp chính thức tiếp quản Cố tộc với danh phận trưởng tộc đầy đủ. Tổ chức cuộc họp nội tộc đầu tiên — tổng kê tài sản (5000 linh thạch còn dư + 3 pet B + sách di sản + Vòng Linh Tinh + Linh Tinh Ngọc), nhân lực (Tro Linh Phái 25 + Vân Kiếm + Già Tâm + Hà Thúc + 8 trưởng lão còn lại), địa vị (tiểu tộc Linh Châu — vừa hồi phục).',
    scenes: [
      'Sáng: MC mặc trường bào trưởng tộc lần đầu, ngồi vị trí chính sảnh',
      'Cuộc họp nội tộc: 8 trưởng lão còn lại + Già Tâm + Hà Thúc + Vân Kiếm + 3 nhánh trưởng',
      'MC tổng kê tài sản công khai: 5000 linh thạch + 3 pet B + sách di sản + nguyên liệu',
      'MC ra 3 chính sách: (1) tài sản gia tộc minh bạch, (2) thưởng phạt rõ ràng, (3) đệ tử trẻ ưu tiên đào tạo',
      'Trưởng lão Cố Già Tâm + 5 trưởng lão khác đồng ý. 2 trưởng lão lưỡng lự (phe Trường Khải cũ)',
      'Chiều: MC + Vân Kiếm bàn kế hoạch arc 2 — đoạt tiểu tộc Linh Châu',
      'Tối: MC về phòng kín, scan 3 pet — Phượng Linh C ổn, Cơ Khí Vũ Sĩ D ổn, Phong Yến E feed tiếp tục',
    ],
    mcBenefit: 'trưởng tộc danh phận đầy đủ (uy tín tối thượng), tài sản gia tộc minh bạch (network gia tộc), 6/8 trưởng lão ủng hộ chính sách (đột phá quyền lực)',
    threadsAdvance: ['phục hưng gia tộc'],
    newThreads: ['Cố tộc đoạt tiểu tộc Linh Châu (arc 2)'],
    risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, 'END: MC + 3 pet phòng kín đêm.'],
  },
  {
    n: 52, beat: 'breathing',
    brief: 'BREATHING. MC + Vân Kiếm + 3 nhánh trưởng training Tro Linh Phái 25 đệ tử kỹ năng đối phó tiểu tộc đối thủ. Em gái Tiểu Đào lần đầu chính thức tham gia training với Tiểu Mèo Linh.',
    scenes: [
      'Sáng: MC tổ chức training Tro Linh Phái — chiến thuật đối tiểu tộc',
      'Vân Kiếm dạy Phong + Lôi Hợp Bích cấp B cho 3 nhánh trưởng',
      'Cố Khang nhánh A dẫn 7 đệ tử, Tử Vũ nhánh B, Lan Nhi nhánh C — phối hợp pet B',
      'Trưa: em gái Tiểu Đào training với Tiểu Mèo Linh — talent feed nhanh hơn đệ tử khác 30%',
      'Chiều: MC scan em gái — không thấy Vạn Linh Phổ cho người, nhưng có hint talent đặc biệt',
      'Hà Thúc kể chuyện kỹ năng "thông giao tâm linh" hiếm trong gia phả tổ phụ',
      'Tối: MC ghi sổ — em gái có thể có talent thông giao tâm linh? (manh mối arc 3)',
    ],
    mcBenefit: 'Tro Linh Phái kỹ năng nâng cao (skill expand), em gái talent thông giao tâm linh manh mối (thông tin), Vân Kiếm Phong + Lôi Hợp Bích B (skill)',
    threadsAdvance: ['phục hưng gia tộc'],
    newThreads: ['em gái Cố Tiểu Đào talent thông giao tâm linh'],
    risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, 'END: MC ghi sổ phòng kín, yên tĩnh.'],
  },
  {
    n: 53, beat: 'confront',
    brief: 'Vương thị tiểu tộc gửi sứ giả đến Cố tộc — đề xuất "hợp tác giao thương" thực ra là ép Cố tộc bán pet B giá rẻ. MC từ chối lịch sự. Vương thị sứ giả tức bỏ về.',
    scenes: [
      'Sáng: Vương thị sứ giả 2 người đến Cố tộc, gặp MC + Già Tâm',
      'Sứ giả: "Vương Đại Hoàng đề xuất Cố tộc bán 2 pet B + 2000 linh thạch giá ưu đãi 70%"',
      'MC bình tĩnh: "70% là bóc lột. Tôi từ chối. Nếu Vương thị muốn pet B, mua giá thị trường"',
      'Sứ giả: "thiếu gia, ngài đang khinh thường Vương thị"',
      'MC: "tôi tôn trọng Vương thị. Nhưng giao dịch phải công bằng. Mời sứ giả về"',
      'Sứ giả tức tối bỏ về. Già Tâm: "Vương Đại Hoàng sẽ tung đòn lớn — chuẩn bị"',
      'Chiều: MC + Vân Kiếm + 3 nhánh trưởng họp khẩn cấp — chuẩn bị phòng thủ',
    ],
    mcBenefit: 'từ chối Vương thị bóc lột (uy tín nội tộc), manh mối Vương Đại Hoàng tung đòn lớn (thông tin)',
    threadsAdvance: ['Cố tộc đoạt tiểu tộc Linh Châu (arc 2)'],
    newThreads: ['Vương Đại Hoàng tung đòn lớn'],
    risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, 'END: MC + nhánh trưởng họp khẩn cấp.'],
  },
  {
    n: 54, beat: 'big_wow',
    brief: 'BIG WOW small scale: Vương thị tổ chức "đoàn thương nhân" 5 người + 5 pet C tiến vào Cố phủ giả vờ giao thương — thực ra cướp tài sản. Cố Khang nhánh A phát hiện, báo MC. MC + Vân Kiếm + 3 pet B của nhánh trưởng đối phó. Vương thị 5 cướp thua trong 10 phút, bị giam.',
    scenes: [
      'Sáng: 5 người Vương thị giả thương nhân vào Cố phủ — Cố Khang phát hiện qua badge giả',
      'MC + Vân Kiếm + 3 nhánh trưởng đối phó — Lửa Tro (kìm chế B+ public) + Bạch Ngân Lang + Lưu Vân Hổ + Hồng Ngân Tước + Bạch Linh Mãng vs 5 pet C Vương thị',
      'Trận đấu nhanh: Lửa Tro phun tia AOE, Phong Lôi Hợp Bích của Vân Kiếm + Lan Nhi quét sạch 3 pet C',
      'Cố Khang bóp 1 pet C Vương thị, Tử Vũ giam 1 pet C bằng Hồng Ngân Tước',
      '5 người Vương thị + 5 pet C bị giam trong kho gia tộc',
      'BIG WOW: tin lan ra Linh Châu — Vương thị thất bại tiếp tay cướp tại Cố tộc, mất uy tín',
      'Cố Già Tâm khen MC: "phản ứng nhanh, đúng cách trưởng tộc"',
    ],
    mcBenefit: 'thắng 5 cướp Vương thị + 5 pet C giam (face-slap đối thủ, tài nguyên), tin lan Linh Châu Cố tộc + Vương thị (uy tín thành), Già Tâm khen công khai (quan hệ)',
    threadsAdvance: ['Cố tộc đoạt tiểu tộc Linh Châu (arc 2)'],
    risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, 'END: 5 cướp giam, MC bình thản.'],
  },
  {
    n: 55, beat: 'resolution',
    brief: 'RESOLUTION sub-arc 1. MC tổ chức cuộc họp với 5 cướp Vương thị bị giam — yêu cầu Vương thị Đại Hoàng đến chính thức xin lỗi + bồi hoàn. Vương thị bồi hoàn 3000 linh thạch + 3 pet C cho Cố tộc. Cố tộc tài chính ổn (8000 linh thạch tổng).',
    scenes: [
      'Sáng: MC gửi tin Vương thị — yêu cầu Vương Đại Hoàng đến xin lỗi + bồi hoàn',
      'Trưa: Vương Đại Hoàng + 2 trưởng lão Vương thị đến Cố tộc — formal',
      'Vương Đại Hoàng cúi đầu xin lỗi: "đó là quyết định cá nhân của 5 đệ tử, không phải Vương thị chủ trương"',
      'MC bình tĩnh: "tôi nhận lời xin lỗi. Bồi hoàn 3000 linh thạch + 3 pet C tương đương"',
      'Vương Đại Hoàng đồng ý — chuyển tài sản + đem 5 đệ tử về Vương thị xử lý',
      'Chiều: Cố tộc tài chính ổn, 8000 linh thạch tổng + 6 pet B + 3 pet C',
      'Tối: MC chia 1000 linh thạch cho Tro Linh Phái nhánh đào tạo, giữ 7000 vốn riêng',
    ],
    mcBenefit: 'Vương thị bồi hoàn 3000 linh thạch + 3 pet C (tài nguyên cực lớn), Vương Đại Hoàng formal xin lỗi (uy tín thành), Cố tộc tài chính ổn 8000 linh thạch',
    threadsAdvance: ['Cố tộc đoạt tiểu tộc Linh Châu (arc 2)'],
    risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, 'END: MC chia linh thạch yên tĩnh.'],
  },
  // Sub-arc 2 (ch.61-70): Cố Vân Kiếm full redemption ─────────────────────
  ...generateClusterBriefs([
    { n: 56, theme: 'Vân Kiếm chứng minh trung thành — dẫn 1 nhánh đệ tử vào cấm khu cấp F để săn pet F-E quý cho gia tộc' },
    { n: 57, theme: 'Vân Kiếm về với 8 pet F-E + 30g Linh Mạch — MC khen + chính thức bổ nhiệm Vân Kiếm "phó trưởng tộc"' },
    { n: 58, theme: 'Tin Vân Kiếm phó trưởng tộc lan Linh Châu — đám trưởng lão còn lại của Cố tộc lưỡng lự (Cố Lâm + Hảo) — MC giữ kiên định' },
    { n: 59, theme: 'BIG WOW: Lý thị (đối thủ thứ 2) gửi sứ giả đe dọa Cố tộc — MC dùng chứng cứ Trường Khải bí mật từng giao dịch với Lý thị, face-slap ngược' },
    { n: 60, theme: 'RESOLUTION: Lý thị bồi hoàn 2000 linh thạch + 2 pet C, Cố tộc thành công đối phó cả 2 tiểu tộc' },
  ], 1, 'Vương thị + Lý thị consolidation', 'Vân Kiếm phó trưởng tộc, Cố tộc đối phó 2 tiểu tộc thành công'),
  // Sub-arc 3 (ch.61-70): Vương thị tổ chức tấn công ─────────────────────
  ...generateClusterBriefs([
    { n: 61, theme: 'SETUP: Vương thị tổ chức "đoàn thương nhân" 20 người + 20 pet C để tấn công Cố tộc đợt 2 — quy mô lớn hơn' },
    { n: 62, theme: 'BREATHING: MC + Tro Linh Phái + Vân Kiếm chuẩn bị phòng thủ — set up bẫy ở 3 cổng Cố phủ' },
    { n: 63, theme: 'CONFRONT: Vương thị 20 cướp đến cổng chính — MC + 25 đệ tử Tro Linh Phái + Vân Kiếm + Già Tâm + 8 trưởng lão + 3 pet B + 3 pet C đối phó' },
    { n: 64, theme: 'BIG WOW: Trận đấu lớn 30 vs 20 — Cố tộc thắng nhờ Phong Lôi Hợp Bích B của Vân Kiếm + Tro Lửa Phun AOE của Lửa Tro' },
    { n: 65, theme: 'RESOLUTION: 20 người Vương thị + 18 pet C thua giam, 2 chạy thoát. Vương Đại Hoàng đích thân đến xin lỗi lần 2' },
    { n: 66, theme: 'SETUP: Vương Đại Hoàng đề xuất "đoạt 1 trận đấu" — Cố tộc vs Vương thị tại quảng trường thành Linh Châu' },
    { n: 67, theme: 'BREATHING: MC + Vân Kiếm + 3 nhánh trưởng + 5 đệ tử nâng cao chuẩn bị giải đấu — train chiến thuật public' },
    { n: 68, theme: 'CONFRONT: Vương thị bí mật mua chuộc 1 trưởng lão Cố tộc (Cố Lâm) — MC phát hiện, mời cuộc họp khẩn' },
    { n: 69, theme: 'BIG WOW: Cố Lâm bị face-slap công khai trong cuộc họp — Cố tộc trục xuất 1 trưởng lão phản, Vương thị mất ally' },
    { n: 70, theme: 'RESOLUTION: Cố tộc nội bộ vững chắc, chuẩn bị giải đấu Vương thị tại quảng trường' },
  ], 2, 'Vương thị tấn công đợt 2 + Lâm phản'),
  // Sub-arc 4 (ch.71-80): Vương thị đại biểu thua + Tro Bụi tiến triển Phượng Linh giai đoạn cuối ───
  ...generateClusterBriefs([
    { n: 71, theme: 'SETUP: Giải đấu Cố tộc vs Vương thị tại quảng trường Linh Châu — 5 đại biểu mỗi bên, dùng pet C+. Cố tộc gửi MC + Vân Kiếm + 3 nhánh trưởng' },
    { n: 72, theme: 'BREATHING: Khán đài quảng trường đầy đủ trưởng lão Linh Châu + 5 trung tộc xem — MC + đoàn Cố tộc tự tin bước vào' },
    { n: 73, theme: 'CONFRONT: Vòng 1-2: Cố Khang + Cố Tử Vũ thắng 2 đại biểu Vương thị (pet C peak vs Cố tộc pet B kìm chế)' },
    { n: 74, theme: 'BIG WOW: Vòng 5: MC vs Vương Đại Hoàng + pet C peak — Lửa Tro kìm chế B+ thắng nhanh, mass face-slap quảng trường' },
    { n: 75, theme: 'RESOLUTION: Cố tộc thắng 5/5, Vương thị bồi hoàn 5000 linh thạch + 5 pet C cho Cố tộc' },
    { n: 76, theme: 'SETUP: MC scan Tro Bụi (giấu trong phòng kín) — tiến độ Phượng Linh stage 2/5 (cấp C peak), cần feed Phượng Linh Đan + Linh Mạch + Hỏa Diễm Thạch' },
    { n: 77, theme: 'BREATHING: MC + Hà Thúc bí mật ra chợ Linh Châu mua nguyên liệu cấp C — 1500 linh thạch chi tiêu' },
    { n: 78, theme: 'CONFRONT: Lý thị (đối thủ thứ 2) tổ chức ám sát Hà Thúc trên đường — MC + 3 pet B của nhánh trưởng đối phó, Hà Thúc an toàn' },
    { n: 79, theme: 'BIG WOW: MC trục xuất Lý thị đại biểu công khai — Lý thị mất uy tín thành, 4 trung tộc Linh Châu chọn đứng phe Cố tộc' },
    { n: 80, theme: 'RESOLUTION: Cố tộc network thành phố mở rộng + 4 trung tộc đứng đồng minh + Tro Bụi feed tiến độ 60% Phượng Linh stage 3' },
  ], 3, 'Vương thị giải đấu thua + Tro Bụi Phượng Linh stage advance'),
  // Sub-arc 5 (ch.81-90): Tro Bụi → Phượng Linh giai đoạn cuối ─────────────
  ...generateClusterBriefs([
    { n: 81, theme: 'SETUP: Tro Bụi tiến độ Phượng Linh stage 4/5 — MC bí mật feed Phượng Linh Đan thứ 2 ở phòng kín' },
    { n: 82, theme: 'BREATHING: Em gái Tiểu Đào talent thông giao tâm linh lộ rõ hơn — đọc được tâm trạng Tiểu Mèo Linh' },
    { n: 83, theme: 'CONFRONT: Trung tộc Hoàng thị (đối thủ mới) tổ chức gặp MC — đề xuất hợp tác, thực ra muốn kiểm tra thực lực Cố tộc' },
    { n: 84, theme: 'BIG WOW: MC + Vân Kiếm + 3 nhánh trưởng đến lễ Hoàng thị — show pet B kìm chế ở mức impressing, Hoàng thị chủ tịch shock thầm' },
    { n: 85, theme: 'RESOLUTION: Hoàng thị đề xuất minh ước với Cố tộc + 1500 linh thạch + 1 pet B — MC chấp nhận' },
    { n: 86, theme: 'SETUP: Tro Bụi tiến độ Phượng Linh stage 5/5 final — MC bí mật feed last batch nguyên liệu cấp C' },
    { n: 87, theme: 'BREATHING: MC + em gái + Hà Thúc + Vân Kiếm + Già Tâm tổ chức bữa ăn ấm áp gia đình — chemistry đỉnh' },
    { n: 88, theme: 'CONFRONT: Lý thị tung đòn cuối — gửi 1 cao thủ Trung Cấp tầng 3 + 3 pet B đến Cố tộc gây áp lực' },
    { n: 89, theme: 'BIG WOW: Tro Bụi evolve final stage Phượng Linh C peak (5 stages complete) trong phòng kín — pet đầu tiên cấp C peak của MC' },
    { n: 90, theme: 'RESOLUTION: MC + Phượng Linh peak C kìm chế B+ đối phó cao thủ Lý thị Trung Cấp + 3 pet B — Lý thị thua nhanh' },
  ], 4, 'Tro Bụi Phượng Linh giai đoạn cuối + Lý thị tung đòn cuối'),
  // Sub-arc 6 (ch.91-100): BIG WOW giải đấu trung tộc Linh Châu ───────────
  ...generateClusterBriefs([
    { n: 91, theme: 'SETUP: Giải đấu trung tộc Linh Châu năm — 12 trung tộc tham gia, Cố tộc đại biểu lần đầu sau 50 năm' },
    { n: 92, theme: 'BREATHING: MC + 5 đại biểu Cố tộc (MC + Vân Kiếm + 3 nhánh trưởng) chuẩn bị — formal lễ phục, pet portfolio đầy đủ' },
    { n: 93, theme: 'CONFRONT: Vòng 1: 5 đại biểu Cố tộc thắng 5/5 vs trung tộc Vương thị (đã suy yếu) + Lý thị + 1 trung tộc khác' },
    { n: 94, theme: 'BIG WOW: Vòng 4: MC vs đại biểu trung tộc Hoàng thị (Trung Cấp tầng 5, pet B peak) — Phượng Linh kìm chế B+ thắng' },
    { n: 95, theme: 'RESOLUTION: Cố tộc xếp top 3 trung tộc Linh Châu sau 50 năm — danh vọng tăng vọt, 3000 linh thạch + sách kỹ năng cấp B' },
    { n: 96, theme: 'SETUP: MC mở chuỗi cửa hàng pet thuần hoá ngầm — Hà Thúc làm front, MC scan pet phế qua Vạn Linh Phổ thầm' },
    { n: 97, theme: 'BREATHING: 3 cửa hàng pet nhỏ ở 3 khu Linh Châu — doanh thu 200 linh thạch/ngày, network thương nhân thành mở' },
    { n: 98, theme: 'CONFRONT: Lý thị tổ chức ám sát Hà Thúc lần 2 — MC bắt được sát thủ + chứng cứ Lý thị' },
    { n: 99, theme: 'BIG WOW: MC tổ chức cuộc họp công khai trung tộc Linh Châu — face-slap Lý thị, Lý thị bị trục xuất khỏi liên minh trung tộc' },
    { n: 100, theme: 'RESOLUTION: Lý thị tan rã, Cố tộc + 3 trung tộc khác + Hoàng thị thành liên minh chống Vương thị' },
  ], 5, 'Giải đấu trung tộc Linh Châu + chuỗi cửa hàng pet'),
  // Sub-arc 7 (ch.101-110): Lý thị mua chuộc + ám sát thất bại ────────────
  ...generateClusterBriefs([
    { n: 101, theme: 'SETUP: Lý thị tan rã chia làm 2 phe — phe ôn hoà cầu hoà với Cố tộc, phe cứng đầu tổ chức ám sát cuối' },
    { n: 102, theme: 'BREATHING: MC + Vân Kiếm + 3 nhánh trưởng + Già Tâm bàn chiến lược tiếp — tập trung vào Vương thị' },
    { n: 103, theme: 'CONFRONT: Phe cứng đầu Lý thị 5 cao thủ Sơ Cấp + 3 pet B+ đến Cố phủ ám sát em gái Tiểu Đào' },
    { n: 104, theme: 'BIG WOW: MC + Tiểu Đào (đeo bùa hộ thân từ Già Tâm) + 3 pet B của nhánh trưởng + Phượng Linh kìm chế B+ — 5 cao thủ Lý thị thua, em gái an toàn' },
    { n: 105, theme: 'RESOLUTION: Lý thị phe cứng đầu tan rã hoàn toàn — Cố tộc giam 5 cao thủ + 3 pet B+, bồi hoàn 4000 linh thạch' },
    { n: 106, theme: 'SETUP: Vương thị (đã suy yếu nặng) liên minh với 2 tiểu tộc khác để tấn công Cố tộc' },
    { n: 107, theme: 'BREATHING: MC + Tro Linh Phái + 4 đồng minh trung tộc Linh Châu chuẩn bị phòng thủ — quân đội 80+' },
    { n: 108, theme: 'CONFRONT: Vương thị + 2 tiểu tộc đồng minh tấn công Cố phủ — quân 60+ với 30 pet C+' },
    { n: 109, theme: 'BIG WOW: MC + 80 quân Cố tộc + đồng minh đè bẹp Vương thị + 2 đồng minh — Vương thị tan rã, lãnh thổ thuộc Cố tộc' },
    { n: 110, theme: 'RESOLUTION: Cố tộc kế thừa Vương thị + 2 tiểu tộc — tài sản tăng 300%, 2 đồng minh chính thức' },
  ], 6, 'Lý thị ám sát thất bại + Vương thị tan rã'),
  // Sub-arc 8 (ch.111-120): Tro Bụi → Hỏa Phụng Tế A path activate ───────
  ...generateClusterBriefs([
    { n: 111, theme: 'SETUP: MC scan Tro Bụi Phượng Linh C peak — tuyến tiếp theo Hỏa Phụng Tế cấp A. Cần feed: 500g Linh Mạch tinh + 10 viên Hỏa Phụng Đan B + 1 lõi Yêu Thú C peak. Thời gian 30 ngày, rủi ro 25%' },
    { n: 112, theme: 'BREATHING: MC + Hà Thúc bí mật ra chợ Linh Châu thu thập nguyên liệu cấp B — chi tiêu 4000 linh thạch + đổi 2 pet C' },
    { n: 113, theme: 'CONFRONT: 1 thương nhân lạ tiếp cận MC — đề xuất bán "lõi Yêu Thú C peak" giá rẻ. MC scan Vạn Linh Phổ — fake (lõi cấp D giả)' },
    { n: 114, theme: 'BIG WOW: MC face-slap thương nhân lạ — chứng minh fake công khai. Tin lan, MC danh vọng "ngự thú sư có mắt thẩm định"' },
    { n: 115, theme: 'RESOLUTION: 1 thương nhân lớn Linh Châu (Hồ thị, đại tộc trung lập) gửi quà — 1 lõi Yêu Thú C peak thật + 200 linh thạch chiết khấu' },
    { n: 116, theme: 'SETUP: MC bắt đầu feed Tro Bụi Phượng Linh C → Hỏa Phụng Tế A path — phòng kín hậu sơn, sequence 30 ngày' },
    { n: 117, theme: 'BREATHING: Em gái Tiểu Đào lần đầu thử thông giao tâm linh với Lửa Tro — Lửa Tro response, em gái cảm xúc đỉnh' },
    { n: 118, theme: 'CONFRONT: Cơ Niệm Cơ Khí Vũ Sĩ D scan Vạn Linh Phổ — tuyến tiếp theo Thần Thuật Cơ Sư cấp B. MC bắt đầu feed song song' },
    { n: 119, theme: 'BIG WOW: Lục Vũ Phong Yến E scan — tuyến tiếp theo Phong Linh cấp C. MC bắt đầu feed song song. 3 pet đồng thời feed' },
    { n: 120, theme: 'RESOLUTION: 3 pet portfolio MC đang feed song song — Tro Bụi → Hỏa Phụng Tế A (10/30 ngày), Cơ Niệm → Thần Thuật B (5/15 ngày), Lục Vũ → Phong Linh C (5/15 ngày)' },
  ], 7, 'Tro Bụi → Hỏa Phụng Tế A path + 3 pet song song feed'),
  // Sub-arc 9 (ch.121-130): Mở chuỗi cửa hàng pet thuần hoá ngầm ──────────
  ...generateClusterBriefs([
    { n: 121, theme: 'SETUP: MC mở chuỗi cửa hàng pet thuần hoá thứ 4 + 5 — 5 cửa hàng tổng ở 5 khu Linh Châu, Hà Thúc + 3 đệ tử Tro Linh Phái làm front' },
    { n: 122, theme: 'BREATHING: Hồ thị (đại tộc thương) đề xuất hợp tác thương mại với Cố tộc — chia 10% lợi nhuận chuỗi cửa hàng cho Hồ thị' },
    { n: 123, theme: 'CONFRONT: Đối thủ thương — chuỗi cửa hàng pet lớn của trung tộc Trầm thị tổ chức "chiến tranh giá" — giảm 30% giá pet phế' },
    { n: 124, theme: 'BIG WOW: MC scan pet phế Trầm thị qua Vạn Linh Phổ — phát hiện 1 pet F bị mệnh danh "phế" có tuyến tiến hóa B! MC mua 1 con giá 50 đồng, đột biến public B+ trong 7 ngày' },
    { n: 125, theme: 'RESOLUTION: Trầm thị mất uy tín "thẩm định pet" — 5 trung tộc khác tự nguyện hợp tác với chuỗi cửa hàng MC, doanh thu tăng 500%' },
    { n: 126, theme: 'SETUP: Tro Bụi tiến độ Hỏa Phụng Tế 20/30 ngày, Cơ Niệm Thần Thuật 12/15, Lục Vũ Phong Linh 12/15' },
    { n: 127, theme: 'BREATHING: MC dạy em gái + 3 nhánh trưởng kỹ năng "thẩm định pet" — chia sẻ 1 phần kiến thức (không tiết lộ Vạn Linh Phổ)' },
    { n: 128, theme: 'CONFRONT: Cơ Niệm evolve Thần Thuật Cơ Sư cấp B trong phòng kín' },
    { n: 129, theme: 'BIG WOW: Lục Vũ evolve Phong Linh cấp C trong phòng kín — MC pet portfolio: Phượng Linh peak C (sắp A) + Thần Thuật Cơ Sư B + Phong Linh C' },
    { n: 130, theme: 'RESOLUTION: MC scan 3 pet — đỉnh portfolio cấp C-B, sẵn sàng giai đoạn cuối arc 2' },
  ], 8, 'Chuỗi cửa hàng pet ngầm + 3 pet evolve next stage'),
  // Sub-arc 10 (ch.131-140): Vương thị + Lý thị liên thủ tấn công cuối ─────
  ...generateClusterBriefs([
    { n: 131, theme: 'SETUP: 2 phe còn sót lại của Vương thị + Lý thị (sau khi tan rã) liên thủ — gọi 1 cao thủ trung tộc khác, Trầm thị, làm trung gian' },
    { n: 132, theme: 'BREATHING: MC + Vân Kiếm + 3 nhánh trưởng + 4 đồng minh chuẩn bị quân đội 100+ phòng thủ Cố tộc' },
    { n: 133, theme: 'CONFRONT: Trầm thị + 30 cao thủ Trung Cấp + Vương + Lý (60 quân tổng) đến Cố tộc — Trầm thị chủ tịch (Đại Sư tầng 1) đứng đầu' },
    { n: 134, theme: 'BIG WOW small: MC + Phượng Linh peak C kìm chế B+ thắng đại biểu Trầm thị Trung Cấp tầng 9 + pet A — bystander đại lục choáng' },
    { n: 135, theme: 'CONFRONT escalating: Trầm thị chủ tịch tự ra trận với pet S — đại lực huy hiếm thấy. Già Tâm: "thử thách thật sự"' },
    { n: 136, theme: 'BREATHING: MC bí mật check Tro Bụi tiến độ Hỏa Phụng Tế — 28/30 ngày, sắp xong. Phương án: kéo dài trận, đợi Tro Bụi xong' },
    { n: 137, theme: 'BIG WOW: Tro Bụi evolve Hỏa Phụng Tế cấp A trong phòng kín giữa trận chiến — MC bí mật mang ra, kìm chế xuống B peak public' },
    { n: 138, theme: 'CONFRONT escalating: MC + Hỏa Phụng Tế cấp A kìm chế B peak vs Trầm thị chủ tịch + pet S — trận đấu 30 phút, Hỏa Phụng Tế thắng nhờ skill Phượng Linh AOE' },
    { n: 139, theme: 'BIG WOW MASS: Trầm thị chủ tịch thua + pet S thua — đại lục choáng, Cố tộc danh vọng vượt trung tộc Linh Châu' },
    { n: 140, theme: 'RESOLUTION: Trầm thị + Vương + Lý liên minh tan rã — bồi hoàn 50,000 linh thạch + 20 pet C-B + lãnh thổ' },
  ], 9, 'Vương + Lý + Trầm liên thủ + Tro Bụi → Hỏa Phụng Tế A peak'),
  // Sub-arc 11 (ch.141-150): CLIMAX arc 2 — Cố tộc trung tộc Linh Châu ────
  ...generateClusterBriefs([
    { n: 141, theme: 'SETUP: Cố tộc tài sản tăng vọt — 80,000 linh thạch tổng + 30 pet C-B + lãnh thổ 5 tiểu tộc cũ. MC tổ chức tổng kê chính thức' },
    { n: 142, theme: 'BREATHING: MC + em gái + Hà Thúc + Già Tâm + Vân Kiếm + 25 đệ tử Tro Linh Phái tổ chức bữa ăn mừng arc 2 sắp climax' },
    { n: 143, theme: 'CONFRONT: Đại trưởng lão Cố Trường Hành (Cao Cấp tầng 3) đến Cố tộc lần 2 — chứng kiến công nhận Cố tộc trung tộc Linh Châu thành chính thức' },
    { n: 144, theme: 'BIG WOW small: Cố Trường Hành tổ chức buổi giảng "Vạn Linh Pháp Quyết" cấp A cho Tro Linh Phái — MC + 5 đệ tử nâng cao học' },
    { n: 145, theme: 'RESOLUTION: Cố tộc chính thức trung tộc Linh Châu — danh vọng vượt 4 trung tộc cũ, đứng đầu liên minh' },
    { n: 146, theme: 'SETUP: MC tiến vào Sơ Cấp tầng 9 (peak) — chuẩn bị tiến Trung Cấp ở arc 3' },
    { n: 147, theme: 'BREATHING: Em gái Cố Tiểu Đào talent thông giao tâm linh chính thức lộ — Tiểu Đào kết hợp với Tiểu Mèo Linh tạo "thông giao team"' },
    { n: 148, theme: 'CONFRONT: Tin Cố tộc lan ra ngoài Linh Châu — đại tộc Bắc Châu (kẻ gài bẫy bố mẹ MC) bắt đầu chú ý' },
    { n: 149, theme: 'BIG WOW: MC tổ chức cuộc họp Cố tộc — công bố kế hoạch arc 3: liên minh trung tộc Linh Châu + chuẩn bị Bắc Vực tìm bố mẹ' },
    { n: 150, theme: 'CLIMAX arc 2 RESOLUTION: Cố tộc trung tộc Linh Châu hoàn chỉnh, MC Sơ Cấp peak, Tro Bụi Hỏa Phụng Tế A peak, em gái thông giao team — sẵn sàng arc 3' },
  ], 10, 'CLIMAX arc 2 — Cố tộc trung tộc Linh Châu hoàn chỉnh', 'Cố tộc trung tộc Linh Châu thành công nhận chính thức'),
];

interface ClusterMeta { n: number; theme: string; }

function generateClusterBriefs(
  clusterMeta: ClusterMeta[],
  subArcNumber: number,
  arcContext: string,
  subArcPayoff?: string,
): ChapterBrief[] {
  const beats: Array<'setup' | 'breathing' | 'confront' | 'big_wow' | 'resolution'> = [
    'setup', 'breathing', 'confront', 'big_wow', 'resolution',
  ];
  return clusterMeta.map((meta, idx) => {
    const beat = beats[idx % 5];
    const isResolution = idx === clusterMeta.length - 1 && subArcPayoff;
    return {
      n: meta.n,
      beat,
      brief: `${meta.theme}. (Sub-arc ${subArcNumber}, ${arcContext}.)`,
      scenes: [
        `Sáng / Trưa / Chiều / Tối — beat ${beat} với theme: ${meta.theme}`,
        `MC interaction với cast tương ứng cluster theme`,
        `Pet portfolio public ở mức kìm chế (Phượng Linh B+, Cơ Niệm D+, Lục Vũ E)`,
        `Engine state extract: thread advance, character state update`,
        `MC tone lão lục (lạnh đạm, tự tin, tính toán)`,
        `Beat-specific scene: ${beat === 'big_wow' ? 'mass face-slap visible với bystander shock' : beat === 'breathing' ? 'family/mentor warm scene' : beat === 'setup' ? 'observe + plant seed' : beat === 'confront' ? 'antagonist face-off direct' : 'consolidate gain + setup next'}`,
      ],
      mcBenefit: `${beat === 'big_wow' ? 'face-slap đối thủ + uy tín tăng' : beat === 'resolution' ? 'tài nguyên + payoff cluster' : 'thông tin + setup-payoff cho cluster sau'}, ${meta.theme.split('—').slice(0, 1).join('').slice(0, 80)}`,
      threadsAdvance: ['phục hưng gia tộc', 'Cố tộc đoạt tiểu tộc Linh Châu (arc 2)'],
      threadsResolve: isResolution ? [arcContext] : undefined,
      risks: [BAN_BASE, BAN_RESOURCES, TONE_LAO_LUC, TIER_NOTE, `END: scene phù hợp beat ${beat}, KHÔNG cliffhanger paranoia.`],
    };
  });
}
