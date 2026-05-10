// Arc 3 detailed chapter briefs (ch.151-300, 150 briefs).
//
// Theme: "Liên minh trung tộc Linh Châu — 4 trung tộc liên thủ"
// Core payoff: Cố tộc đại tộc thành Linh Châu, mở học viện ngự thú riêng,
// Cố Tiểu Đào lộ talent thông giao tâm linh, acquire pet thứ 4 Mộc Linh,
// MC tiến Trung Cấp tầng 5.
//
// Cumulative state entering arc 3 (post ch.150):
//   MC: Sơ Cấp peak → Trung Cấp tầng 5 cuối arc
//   Pets: Hỏa Phụng Tế A peak (Tro Bụi), Thần Thuật Cơ Sư B (Cơ Niệm), Phong Linh C (Lục Vũ)
//   Gia tộc: Cố tộc trung tộc Linh Châu top — 80,000 linh thạch + 30 pet C-B + lãnh thổ 5 tiểu tộc cũ
//   Tro Linh Phái: 25 + nhánh expand 50+ đệ tử + Vân Kiếm phó trưởng tộc
//   Đồng minh: 4 trung tộc Linh Châu (Hồ thị + 3 khác)
//   Open threads: bố mẹ Bắc Vực, di tích cổ Bắc Vực, Vạn Linh Phổ origin Trái Đất, em gái talent thông giao tâm linh

import type { ChapterBrief } from './arc-skeleton';

const TONE = 'TONE: MC lạnh đạm + tự tin + tính toán. KHÔNG paranoid. KHÔNG tự khoe.';
const BAN = 'BAN cliffhanger paranoia ("có ai theo dõi"); pet evolve công khai; em gái biết Vạn Linh Phổ; MC chõ mồm bênh người lạ; resources cosmic-tier (thần vật/Thần Cách).';
const TIER = 'PET TIER PUBLIC: Hỏa Phụng Tế kìm chế A− public, Thần Thuật Cơ Sư B+, Phong Linh C+. Cấp ẩn chỉ MC biết.';

interface ClusterMeta { n: number; theme: string; }

function buildBriefs(
  clusterMeta: ClusterMeta[],
  subArcContext: string,
  resolveThread?: string,
): ChapterBrief[] {
  const beats: Array<'setup' | 'breathing' | 'confront' | 'big_wow' | 'resolution'> = [
    'setup', 'breathing', 'confront', 'big_wow', 'resolution',
  ];
  return clusterMeta.map((meta, idx) => {
    const beat = beats[idx % 5];
    const isLast = idx === clusterMeta.length - 1 && resolveThread;
    return {
      n: meta.n,
      beat,
      brief: `${meta.theme}. (${subArcContext}.)`,
      scenes: [
        `Beat ${beat}: ${meta.theme.split(/[—.,]/)[0].slice(0, 100)}`,
        `Cast: MC, em gái Tiểu Đào, Vân Kiếm phó trưởng tộc, Già Tâm, Hà Thúc, 3 nhánh trưởng (Cố Khang/Tử Vũ/Lan Nhi)`,
        `Pet portfolio public: Hỏa Phụng Tế A−, Thần Thuật Cơ Sư B+, Phong Linh C+ (kìm chế xuống)`,
        `MC tone lão lục — internal tính toán, public face khiêm tốn`,
        `Beat-specific: ${beat === 'big_wow' ? 'mass face-slap + bystander shock visible' : beat === 'breathing' ? 'family/đệ tử/đồng minh warm scene' : beat === 'setup' ? 'observe + plant seed + intel gather' : beat === 'confront' ? 'antagonist face-off direct' : 'consolidate gain + setup next cluster'}`,
        `Engine state extract: chapter_summaries + character_states + plot_threads update`,
      ],
      mcBenefit: `${beat === 'big_wow' ? 'face-slap đối thủ + uy tín/danh vọng tăng' : beat === 'resolution' ? 'tài nguyên + payoff cluster đầy đủ' : 'thông tin + setup-payoff cho cluster sau'}`,
      threadsAdvance: ['phục hưng gia tộc', 'Cố tộc đại tộc thành Linh Châu (arc 3)'],
      threadsResolve: isLast ? [resolveThread] : undefined,
      risks: [BAN, TONE, TIER, `END phù hợp beat ${beat}, KHÔNG cliffhanger paranoia.`],
    };
  });
}

export const ARC3_BRIEFS_CH151_300: ChapterBrief[] = [
  // Sub-arc 1 (ch.151-160): Liên minh trung tộc giả lập ─────────────────
  ...buildBriefs([
    { n: 151, theme: '4 trung tộc Linh Châu (Hồ thị + 3 khác) đề xuất "liên minh phòng ngự" với Cố tộc — thực ra muốn dùng Cố tộc làm tấm khiên trước Hoàng thị (đại tộc thượng lưu)' },
    { n: 152, theme: 'BREATHING: MC + Vân Kiếm + Già Tâm thảo luận — accept liên minh nhưng giữ độc lập' },
    { n: 153, theme: '1 trung tộc trong liên minh (Trầm thị) bí mật làm gián điệp cho Hoàng thị' },
    { n: 154, theme: 'BIG WOW: MC vạch trần Trầm thị gián điệp — Trầm thị bị 3 trung tộc còn lại trục xuất khỏi liên minh' },
    { n: 155, theme: 'RESOLUTION: Liên minh 4 trung tộc còn 3 — Cố tộc + Hồ thị + 2 khác. Trầm thị thành đối thủ' },
    { n: 156, theme: 'SETUP: Trầm thị tổ chức trả thù — gửi 5 cao thủ Trung Cấp tầng 7 ám sát em gái Tiểu Đào' },
    { n: 157, theme: 'BREATHING: Em gái Tiểu Đào training thông giao tâm linh — Tiểu Mèo Linh hấp thụ tốt' },
    { n: 158, theme: 'CONFRONT: 5 cao thủ Trầm thị xâm nhập Cố phủ — bị Tro Linh Phái + Vân Kiếm phát hiện sớm' },
    { n: 159, theme: 'BIG WOW: MC + Hỏa Phụng Tế kìm chế A− đè bẹp 5 cao thủ + 5 pet B peak — face-slap mass thành Linh Châu' },
    { n: 160, theme: 'RESOLUTION sub-arc 1: Trầm thị tan rã, Cố tộc + 3 trung tộc liên minh củng cố' },
  ], 'sub-arc 1, liên minh trung tộc giả lập + Trầm thị gián điệp', 'liên minh trung tộc giả lập'),
  // Sub-arc 2 (ch.161-175): Cố Tiểu Đào lộ talent thông giao ────────────
  ...buildBriefs([
    { n: 161, theme: 'SETUP: Em gái Tiểu Đào talent thông giao tâm linh chính thức awaken — đọc được cảm xúc Tiểu Mèo Linh + Lửa Tro' },
    { n: 162, theme: 'BREATHING: MC + Già Tâm + Hà Thúc thảo luận — Tiểu Đào talent quý hiếm, ngàn năm 1 người' },
    { n: 163, theme: 'CONFRONT: Hồ thị (đồng minh) đề xuất hôn ước con gái Hồ thị với Cố Vân Kiếm — politcial play' },
    { n: 164, theme: 'BIG WOW: Vân Kiếm + con gái Hồ thị (Hồ Linh Nhi, talent Phong hệ) gặp lần đầu — chemistry tự nhiên, đám trung tộc bystander shock' },
    { n: 165, theme: 'RESOLUTION: Hôn ước Vân Kiếm × Hồ Linh Nhi formal — liên minh Cố + Hồ tăng thân' },
    { n: 166, theme: 'SETUP: Tiểu Đào training thông giao chính thức — MC dạy + Già Tâm tham vấn từ gia phả tổ phụ' },
    { n: 167, theme: 'BREATHING: Tiểu Đào team với Tiểu Mèo Linh + 1 pet F mới — "thông giao team" 3 thành viên' },
    { n: 168, theme: 'CONFRONT: Đại tộc Hoàng thị (thượng lưu thành) tổ chức hội thi liên trung tộc — Cố tộc đại biểu được mời' },
    { n: 169, theme: 'BIG WOW: Tiểu Đào tham gia hội thi với "thông giao team" — gây chấn động, talent công bố lan đại lục' },
    { n: 170, theme: 'RESOLUTION: Hoàng thị + 5 đại tộc khác chú ý Cố tộc — gửi sứ giả thăm. MC accept formal visits' },
    { n: 171, theme: 'SETUP: Hoàng thị chủ tịch (Đại Sư tầng 5) đến Cố phủ — formal visit' },
    { n: 172, theme: 'BREATHING: MC + Hoàng chủ tịch trao đổi chính trị — không ký kết, MC giữ độc lập' },
    { n: 173, theme: 'CONFRONT: 1 đại tộc khác (Trần thị) gửi sứ giả threat — đe dọa Cố tộc nếu không hợp tác' },
    { n: 174, theme: 'BIG WOW: MC face-slap Trần thị sứ giả công khai — 5 đại tộc khác đứng phe Cố tộc' },
    { n: 175, theme: 'RESOLUTION sub-arc 2: Cố tộc danh vọng đại tộc thành chính thức + Tiểu Đào talent công nhận' },
  ], 'sub-arc 2, em gái talent thông giao + chính trị đại tộc', 'em gái Cố Tiểu Đào talent thông giao tâm linh'),
  // Sub-arc 3 (ch.176-195): Acquire Mộc Linh pet thứ 4 ──────────────────
  ...buildBriefs([
    { n: 176, theme: 'SETUP: MC nhận tin có pet Mộc hệ rare cấp B trong cấm khu Trung Châu — Mộc Linh' },
    { n: 177, theme: 'BREATHING: MC + Vân Kiếm + Hà Thúc + 5 đệ tử nâng cao chuẩn bị thám hiểm cấm khu' },
    { n: 178, theme: 'CONFRONT: Đoàn thám hiểm gặp pet C peak Mộc hệ trong cấm khu ngoại vi' },
    { n: 179, theme: 'BIG WOW: MC scan Vạn Linh Phổ — pet đó là precursor của Mộc Linh, có tuyến tiến hóa lên Mộc Thần A' },
    { n: 180, theme: 'RESOLUTION: MC bắt pet Mộc precursor về Cố phủ' },
    { n: 181, theme: 'SETUP: Tiến sâu cấm khu Trung Châu — đoàn gặp 1 đại tộc khác (Lý thị từ Trung Châu, không phải Linh Châu)' },
    { n: 182, theme: 'BREATHING: Đoàn camp tại cấm khu — MC scan Vạn Linh Phổ với 5 pet trong tay' },
    { n: 183, theme: 'CONFRONT: Lý thị Trung Châu thách thức Cố tộc — không cho qua khu Mộc Linh' },
    { n: 184, theme: 'BIG WOW: MC + 4 pet of nhánh trưởng + Hỏa Phụng Tế kìm chế đè bẹp Lý thị Trung Châu — face-slap đại tộc Trung Châu' },
    { n: 185, theme: 'RESOLUTION: Đoàn vào sâu cấm khu, gặp Mộc Linh chính thức' },
    { n: 186, theme: 'SETUP: Mộc Linh cấp B peak, không dễ thuần — MC scan tuyến tiến hóa Mộc Thần A path' },
    { n: 187, theme: 'BREATHING: MC + Mộc Linh tương tác — Mộc Linh response với Tiểu Đào (talent thông giao)' },
    { n: 188, theme: 'CONFRONT: Đại tộc khác (Trần thị từ Trung Châu) cũng đến tranh Mộc Linh' },
    { n: 189, theme: 'BIG WOW: MC + Tiểu Đào (talent thông giao) thuyết phục Mộc Linh tự nguyện theo MC — Trần thị bại' },
    { n: 190, theme: 'RESOLUTION: Mộc Linh khế ước với MC — pet thứ 4 cấp B peak chính thức' },
    { n: 191, theme: 'SETUP: Đoàn về Cố phủ — Mộc Linh cần feed sequence Mộc Thần A' },
    { n: 192, theme: 'BREATHING: MC + Hà Thúc bí mật mua nguyên liệu Mộc hệ — chi tiêu 8000 linh thạch' },
    { n: 193, theme: 'CONFRONT: Trần thị (Trung Châu) tổ chức báo thù — gửi 10 cao thủ Đại Sư xuống Linh Châu' },
    { n: 194, theme: 'BIG WOW: MC + Già Tâm + 3 đồng minh trung tộc Linh Châu + Hỏa Phụng Tế A đè bẹp 10 cao thủ Trần thị' },
    { n: 195, theme: 'RESOLUTION sub-arc 3: Mộc Linh acquired + feed bắt đầu, Trần thị Trung Châu rút' },
  ], 'sub-arc 3, acquire Mộc Linh pet thứ 4', 'Mộc Linh pet thứ 4'),
  // Sub-arc 4 (ch.196-215): Liên minh trung tộc tấn công đầu tiên ───────
  ...buildBriefs([
    { n: 196, theme: 'SETUP: Hoàng thị (đại tộc Linh Châu thượng lưu) tổ chức "liên minh đại tộc" 5 tộc tấn công Cố tộc + Hồ thị' },
    { n: 197, theme: 'BREATHING: MC + Vân Kiếm + Hồ thị chủ tịch họp khẩn — chuẩn bị quân đội 200+' },
    { n: 198, theme: 'CONFRONT: 5 đại tộc + 100 cao thủ Trung-Cao Cấp đến Cố phủ — quy mô lớn nhất arc 3' },
    { n: 199, theme: 'BIG WOW: Trận đánh lớn — Hỏa Phụng Tế A + Thần Thuật Cơ Sư B + Phong Linh C + Mộc Linh B + 4 pet B của nhánh trưởng vs 5 pet S of 5 đại tộc' },
    { n: 200, theme: 'RESOLUTION mid: Trận đánh kéo 1 ngày — Cố tộc + Hồ thị giữ vững, 2 đại tộc tan rã' },
    { n: 201, theme: 'SETUP: 3 đại tộc còn lại liên thủ tấn công đợt 2' },
    { n: 202, theme: 'BREATHING: MC bí mật check Tro Bụi (Hỏa Phụng Tế A) — peak power, sẵn sàng tier S path?' },
    { n: 203, theme: 'CONFRONT: Hoàng thị chủ tịch (Đại Sư tầng 5) tự ra trận với pet S' },
    { n: 204, theme: 'BIG WOW: MC ra trận với Hỏa Phụng Tế A peak — kìm chế xuống tier B+ public, dùng kỹ năng "Vạn Linh Hỏa Pháp" (sách arc 1)' },
    { n: 205, theme: 'RESOLUTION: Hoàng thị + 2 đại tộc khác bại — bồi hoàn 200,000 linh thạch + 50 pet B-A + lãnh thổ 3 đại tộc cũ' },
    { n: 206, theme: 'SETUP: Cố tộc đứng top 3 đại tộc Linh Châu — bệ lệ trên cả Hoàng thị cũ' },
    { n: 207, theme: 'BREATHING: MC tổ chức bữa ăn mừng — 4 đồng minh + 1 thắng đội + Tro Linh Phái 100+ thành viên giờ' },
    { n: 208, theme: 'CONFRONT: 1 đại tộc Trung Châu (Trần thị quay lại) gửi tin ám sát — yêu cầu MC giao Mộc Linh' },
    { n: 209, theme: 'BIG WOW: MC face-slap Trần thị Trung Châu sứ giả công khai — 4 đại tộc Trung Châu khác đứng phe Cố tộc' },
    { n: 210, theme: 'RESOLUTION: Cố tộc danh vọng vượt Linh Châu, lan ra Trung Châu' },
    { n: 211, theme: 'SETUP: MC tiến vào Trung Cấp tầng 1 — đột phá realm' },
    { n: 212, theme: 'BREATHING: Em gái Tiểu Đào team thông giao expand 5 thành viên (5 pet F-D)' },
    { n: 213, theme: 'CONFRONT: 1 đại tộc Trung Châu khác (Triệu thị) đề xuất "hôn ước chính trị" với Cố tộc' },
    { n: 214, theme: 'BIG WOW: MC từ chối lịch sự nhưng có lợi — Triệu thị accept liên minh phi hôn nhân' },
    { n: 215, theme: 'RESOLUTION sub-arc 4: Cố tộc đại tộc Linh Châu top 1 + 5 đồng minh đại tộc Trung Châu' },
  ], 'sub-arc 4, liên minh đại tộc tấn công + Cố tộc top 1 Linh Châu', 'liên minh trung tộc tấn công đầu tiên'),
  // Sub-arc 5 (ch.216-235): BIG WOW giải đấu liên trung tộc Linh Châu ───
  ...buildBriefs([
    { n: 216, theme: 'SETUP: Linh Châu thành tổ chức "Đại Hội Liên Trung Tộc Năm" — 20 trung-đại tộc tham gia, 100 đại biểu' },
    { n: 217, theme: 'BREATHING: Cố tộc gửi MC + Vân Kiếm + 3 nhánh trưởng + 1 đệ tử nâng cao = 5 đại biểu' },
    { n: 218, theme: 'CONFRONT: Vòng 1: Cố tộc thắng 5/5 vs 5 trung tộc khác' },
    { n: 219, theme: 'BIG WOW: Vòng 5 (final): MC vs Hoàng thị tân chủ tịch (sau khi cũ thua) + pet A peak — Hỏa Phụng Tế A− public dễ dàng' },
    { n: 220, theme: 'RESOLUTION: Cố tộc giữ top 1 + giành 1,000,000 linh thạch + 100 pet C-S' },
    { n: 221, theme: 'SETUP: Cố Trường Hành (đại trưởng lão từ arc 1) đến Cố tộc lần 3 — formal congratulate' },
    { n: 222, theme: 'BREATHING: MC + Cố Trường Hành thảo luận — Trường Hành chia sẻ thông tin tổ phụ ngày xưa' },
    { n: 223, theme: 'CONFRONT: Trường Hành tiết lộ — tổ phụ Cố Lập Khải có liên kết với Bắc Vực + Trung Châu thượng lưu' },
    { n: 224, theme: 'BIG WOW: Trường Hành trao MC 1 mảnh ngọc đỏ — "tổ phụ giấu trong di sản, dặn ta trao khi cháu thành đại tộc"' },
    { n: 225, theme: 'RESOLUTION: MC scan mảnh ngọc — manh mối Trái Đất + Vạn Linh Phổ origin foreshadow advance' },
    { n: 226, theme: 'SETUP: Linh Châu thành chính trị — Cố tộc trở thành tâm điểm liên minh' },
    { n: 227, theme: 'BREATHING: MC + 5 đồng minh đại tộc Linh Châu + 5 đồng minh Trung Châu họp định kỳ' },
    { n: 228, theme: 'CONFRONT: Đại tộc Bắc Châu (kẻ gài bẫy bố mẹ) lần đầu xuất hiện — gửi sứ giả Linh Châu' },
    { n: 229, theme: 'BIG WOW: MC scan sứ giả Bắc Châu — kẻ này có manh mối bố mẹ MC. MC chấp nhận dialog formal' },
    { n: 230, theme: 'RESOLUTION: Sứ giả về Bắc Châu báo cáo — Bắc Châu phải lo' },
    { n: 231, theme: 'SETUP: MC + Hà Thúc + Già Tâm bàn kế hoạch Bắc Vực arc 4' },
    { n: 232, theme: 'BREATHING: Tiểu Đào talent thông giao mạnh hơn — đọc được cảm xúc 5 pet cùng lúc' },
    { n: 233, theme: 'CONFRONT: 1 cao thủ Bắc Châu vào Linh Châu giả thương nhân — định ám sát Tiểu Đào' },
    { n: 234, theme: 'BIG WOW: Tiểu Đào "thông giao team" phát hiện ám sát thông qua pet phép — MC + Vân Kiếm bắt cao thủ' },
    { n: 235, theme: 'RESOLUTION sub-arc 5: Bắc Châu manh mối + Cố tộc top 1 Linh Châu củng cố + Tiểu Đào talent đỉnh' },
  ], 'sub-arc 5, giải đấu Linh Châu + Bắc Châu sứ giả + tổ phụ mảnh ngọc', 'BIG WOW giải đấu liên trung tộc Linh Châu'),
  // Sub-arc 6 (ch.236-255): Trầm thị + Lý thị tổ chức ám sát ────────────
  ...buildBriefs([
    { n: 236, theme: 'SETUP: Trầm thị (tan rã từ ch.155) + Lý thị (tan rã arc 2) còn sót lại liên thủ với Bắc Châu — kế hoạch ám sát Cố tộc' },
    { n: 237, theme: 'BREATHING: MC training Mộc Linh path Mộc Thần A — feed sequence ổn' },
    { n: 238, theme: 'CONFRONT: 30 cao thủ Sơ-Trung Cấp Trầm + Lý + Bắc Châu vào Linh Châu giả thương nhân' },
    { n: 239, theme: 'BIG WOW: MC + Tro Linh Phái 100+ + Vân Kiếm + 3 nhánh trưởng đè bẹp 30 cao thủ — Tiểu Đào không bị động đến' },
    { n: 240, theme: 'RESOLUTION: 25 cao thủ giam, 5 chạy thoát. Bắc Châu phải lo formal' },
    { n: 241, theme: 'SETUP: Bắc Châu chủ tịch (Đại Sư peak) gửi tin formal cho MC — đề xuất "hợp tác kinh tế"' },
    { n: 242, theme: 'BREATHING: MC + Già Tâm bàn — Bắc Châu dụ MC ra Bắc Vực để ám sát' },
    { n: 243, theme: 'CONFRONT: MC từ chối lời mời formal — gửi tin với 25 cao thủ giam làm chứng' },
    { n: 244, theme: 'BIG WOW: Bắc Châu tức tối, công bố "Cố tộc không hợp tác = kẻ thù" — đại lục chia phe' },
    { n: 245, theme: 'RESOLUTION: 5 đại tộc Trung Châu đứng phe Cố tộc, 3 đại tộc Bắc Châu đứng phe Bắc Châu' },
    { n: 246, theme: 'SETUP: Mộc Linh evolve Mộc Thần A path — feed sequence 30 ngày advance' },
    { n: 247, theme: 'BREATHING: MC + 4 pet portfolio (Hỏa Phụng Tế A, Thần Thuật Cơ Sư B, Phong Linh C, Mộc precursor C) — sắp lên 5 pet với Mộc Thần' },
    { n: 248, theme: 'CONFRONT: Trầm thị + Lý thị tan rã hoàn toàn — 5 cao thủ sót lại đến Cố tộc đầu hàng' },
    { n: 249, theme: 'BIG WOW: MC accept đầu hàng + 5 cao thủ gia nhập Tro Linh Phái — network expand' },
    { n: 250, theme: 'RESOLUTION: Cố tộc đại tộc top + 200 đệ tử Tro Linh Phái + 8 đồng minh đại tộc' },
    { n: 251, theme: 'SETUP: Mộc Linh tiến độ Mộc Thần 60% — sẽ xong trong 12 ngày' },
    { n: 252, theme: 'BREATHING: Em gái Tiểu Đào training trong "vườn thông giao" — 1 khu riêng MC xây cho em' },
    { n: 253, theme: 'CONFRONT: Bắc Châu gửi assassination team thứ 2 — 5 cao thủ Đại Sư + 5 pet S' },
    { n: 254, theme: 'BIG WOW: MC + Hỏa Phụng Tế A + Mộc Linh + Hồ Linh Nhi (vợ chưa cưới Vân Kiếm) đè bẹp 5 cao thủ Đại Sư' },
    { n: 255, theme: 'RESOLUTION sub-arc 6: Bắc Châu mất 5 cao thủ Đại Sư + 5 pet S — assassination team không còn' },
  ], 'sub-arc 6, Trầm + Lý + Bắc Châu ám sát + Mộc Linh feed', 'Trầm thị + Lý thị tan rã hoàn toàn'),
  // Sub-arc 7 (ch.256-275): Mở học viện ngự thú riêng Cố tộc ────────────
  ...buildBriefs([
    { n: 256, theme: 'SETUP: MC quyết định mở học viện ngự thú riêng Cố tộc — tuyển 50 đệ tử ngoại tộc + 50 đệ tử nội tộc' },
    { n: 257, theme: 'BREATHING: MC + Vân Kiếm + Hồ Linh Nhi + Già Tâm + 3 nhánh trưởng làm giảng viên đầu tiên' },
    { n: 258, theme: 'CONFRONT: 200+ ứng viên ngoại tộc đến Cố phủ thi tuyển — quá tải' },
    { n: 259, theme: 'BIG WOW: MC scan ứng viên qua Vạn Linh Phổ thầm, chọn 50 best talent — 1 ứng viên có talent S đặc biệt' },
    { n: 260, theme: 'RESOLUTION: Học viện Cố tộc chính thức khai giảng — 100 đệ tử (50 nội + 50 ngoại)' },
    { n: 261, theme: 'SETUP: Mộc Linh evolve Mộc Thần A — pet thứ 5 cấp A của MC' },
    { n: 262, theme: 'BREATHING: Lễ khai giảng học viện — 8 đồng minh đại tộc gửi đại biểu chúc mừng' },
    { n: 263, theme: 'CONFRONT: 1 đại tộc Bắc Châu nhỏ tổ chức ám sát giảng viên Hồ Linh Nhi' },
    { n: 264, theme: 'BIG WOW: Hồ Linh Nhi (Phong hệ Đại Sư tầng 1) + Phong Linh C đè bẹp ám sát — face-slap đại tộc Bắc Châu' },
    { n: 265, theme: 'RESOLUTION: Học viện Cố tộc danh vọng tăng vọt — 100 ứng viên mới đăng ký' },
    { n: 266, theme: 'SETUP: MC tiến vào Trung Cấp tầng 3 — đột phá realm liên tiếp' },
    { n: 267, theme: 'BREATHING: Tiểu Đào lần đầu lên thuyết giảng học viện — talent thông giao công khai' },
    { n: 268, theme: 'CONFRONT: 1 đại tộc Trung Châu xa (Quách thị) đề xuất "trao đổi đệ tử" với Cố tộc — chính trị' },
    { n: 269, theme: 'BIG WOW: MC accept trao đổi 5 đệ tử mỗi bên — Cố tộc network reach Trung Châu peripheral' },
    { n: 270, theme: 'RESOLUTION: Học viện Cố tộc mở 2 nhánh con tại 2 trung tộc đồng minh' },
    { n: 271, theme: 'SETUP: MC tiến Trung Cấp tầng 5 — peak target arc 3' },
    { n: 272, theme: 'BREATHING: Cố tộc thành tâm điểm Linh Châu thành — 80% trung-đại tộc đứng phe' },
    { n: 273, theme: 'CONFRONT: Bắc Châu chủ tịch tổ chức "đại hội đối phó Cố tộc" tại Bắc Châu' },
    { n: 274, theme: 'BIG WOW: 5 đồng minh Trung Châu của Cố tộc gửi tin support — đại lục chia rõ phe' },
    { n: 275, theme: 'RESOLUTION sub-arc 7: Học viện Cố tộc 200 đệ tử + nhánh con + danh vọng đại lục' },
  ], 'sub-arc 7, học viện ngự thú Cố tộc + Mộc Thần A', 'mở học viện ngự thú riêng Cố tộc'),
  // Sub-arc 8 (ch.276-290): Trận chiến cuối liên minh trung tộc ─────────
  ...buildBriefs([
    { n: 276, theme: 'SETUP: Bắc Châu liên minh 8 đại tộc Bắc — quân đội 1000+ chuẩn bị tấn công Cố tộc' },
    { n: 277, theme: 'BREATHING: MC + 8 đồng minh Linh Châu + 5 đồng minh Trung Châu mobilize quân — 800 cao thủ' },
    { n: 278, theme: 'CONFRONT: Đoàn quân Bắc Châu đến biên giới Linh Châu — 1000 cao thủ + 200 pet S+' },
    { n: 279, theme: 'BIG WOW: Trận đánh quy mô đại lục đầu tiên — Cố tộc + đồng minh vs Bắc Châu liên minh' },
    { n: 280, theme: 'RESOLUTION mid: Trận kéo 3 ngày — Cố tộc + đồng minh giữ vững, Bắc Châu thiệt hại 30%' },
    { n: 281, theme: 'SETUP: Bắc Châu tổ chức trận quyết định — chủ tịch Bắc Châu (Truyền Thuyết tầng 1) tự ra trận' },
    { n: 282, theme: 'BREATHING: MC bí mật check pet portfolio — Hỏa Phụng Tế A peak, Mộc Thần A, sẵn sàng' },
    { n: 283, theme: 'CONFRONT: MC vs Bắc Châu chủ tịch — Truyền Thuyết tầng 1 + pet SS peak' },
    { n: 284, theme: 'BIG WOW: MC kìm chế Hỏa Phụng Tế xuống A peak public, dùng "Vạn Linh Hỏa Pháp" cấp A — đe dọa Bắc Châu chủ tịch' },
    { n: 285, theme: 'RESOLUTION: Bắc Châu chủ tịch rút — Bắc Châu liên minh tan rã, lãnh thổ Cố tộc reach Trung Châu' },
    { n: 286, theme: 'SETUP: Cố tộc giành 5,000,000 linh thạch + 500 pet S-SS + 3 đại tộc Bắc Châu lãnh thổ' },
    { n: 287, theme: 'BREATHING: MC tổ chức tổ chức ăn mừng đại lục — 13 đại tộc đồng minh tham gia' },
    { n: 288, theme: 'CONFRONT: 1 sứ giả lạ đến Cố phủ — không tự xưng tộc nào, đưa MC 1 thư bí ẩn' },
    { n: 289, theme: 'BIG WOW: MC scan thư — manh mối bố mẹ MC ở Bắc Vực sâu, không phải Bắc Châu giam' },
    { n: 290, theme: 'RESOLUTION sub-arc 8: Bắc Châu tan rã + manh mối bố mẹ Bắc Vực thực sự (arc 4 setup)' },
  ], 'sub-arc 8, trận chiến đại lục + manh mối bố mẹ', 'trận chiến cuối liên minh trung tộc'),
  // Sub-arc 9 (ch.291-300): CLIMAX arc 3 ────────────────────────────────
  ...buildBriefs([
    { n: 291, theme: 'SETUP: MC chính thức Trung Cấp tầng 5 peak — sẵn sàng arc 4 Bắc Vực' },
    { n: 292, theme: 'BREATHING: Tiểu Đào talent đỉnh — "thông giao team" 10 thành viên' },
    { n: 293, theme: 'CONFRONT: Đại trưởng lão Cố Trường Hành đến Cố tộc lần 4 — formal recognize Cố tộc đại tộc Linh Châu' },
    { n: 294, theme: 'BIG WOW: Lễ recognize đại tộc — Cố Trường Hành phát biểu "Cố Diệp đã đưa Cố tộc lên top đại tộc đại lục"' },
    { n: 295, theme: 'RESOLUTION: Cố tộc đại tộc Linh Châu chính thức công nhận đại lục' },
    { n: 296, theme: 'SETUP: MC + Già Tâm + Vân Kiếm + Hồ Linh Nhi bàn kế hoạch arc 4 Bắc Vực — cứu bố mẹ' },
    { n: 297, theme: 'BREATHING: MC + Tiểu Đào riêng — em gái xin theo arc 4 Bắc Vực, MC accept với điều kiện bảo vệ tuyệt đối' },
    { n: 298, theme: 'CONFRONT: MC cuối cùng đọc thư bí ẩn ch.288-289 — thông tin: bố mẹ ở "di tích cổ Bắc Vực", có liên kết với Vạn Linh Phổ' },
    { n: 299, theme: 'BIG WOW: MC chính thức tuyên bố tổ chức "đoàn thám hiểm Bắc Vực" — Cố tộc + 5 đồng minh đại tộc + 100 cao thủ' },
    { n: 300, theme: 'CLIMAX RESOLUTION arc 3: Cố tộc đại tộc Linh Châu, MC Trung Cấp peak, pet portfolio 5 con (4 cấp A + 1 cấp B), em gái talent đỉnh, đoàn Bắc Vực formed — sẵn sàng arc 4' },
  ], 'sub-arc 9, CLIMAX arc 3 + Bắc Vực preparation', 'CLIMAX arc 3 — Cố tộc đại tộc Linh Châu'),
];
