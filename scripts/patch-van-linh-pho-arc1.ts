// Pre-fill arc_plans row for arc 1 (chapters 1-50) so flash-cheap-routine
// skips DeepSeek arc plan generation entirely. Each chapter brief has
// concrete mcBenefit matching CONCRETE_BENEFIT_RE.

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const PROJECT_ID = '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c';

// Arc 1 covers ch.1-50: "Phục hưng nội tộc — đoạt lại quyền thừa kế"
// Beat structure: warm baseline → Vạn Linh Phổ activate → first secret feed →
// first kìm chế public win → tiered face-slap đám trưởng lão → đoạt thừa kế.

const arc1ChapterBriefs = [
  // ── Beat 1: Warm baseline + Vạn Linh Phổ activate (ch.1-3) ──
  {
    chapterNumber: 1, sub_arc_number: 1,
    brief: 'Cố Diệp tỉnh dậy trong thân thể 16 tuổi sau khi xuyên hồn từ Trái Đất 2126 (kiếp trước sinh viên Học Viện Ngự Thú đang viết luận văn Tuyến Tiến Hóa Ẩn). Em gái Cố Tiểu Đào (12 tuổi) ngồi cạnh giường, lo lắng. Quản gia Hà Thúc báo chú Cố Trường Khải sẽ đến gặp chiều nay để bàn về thừa kế. Cố Diệp lặng lẽ quan sát: gia tộc nát, kho pet bị biển thủ, bố mẹ mất tích Bắc Vực 1 năm trước. Đột nhiên Vạn Linh Phổ activate — HUD ẩn hiện ra khi nhìn pet đầu tiên trong sân (con sparrow Lục Vũ vườn nhà): cấp F + 4 tuyến tiến hóa khả thi + công thức feed. Cố Diệp giấu phản ứng, vẫn vỏ thiếu niên hồi phục. Chú đến, đặt giấy từ bỏ thừa kế lên bàn. Cố Diệp deflect "đầu vẫn chóng, để vài hôm nữa", chú bực mình đi. Cố Diệp internal: cần tài nguyên gấp + pet đầu tiên.',
    mcBenefit: 'thông tin gia tộc + bản đồ kho lưu trữ pet phế từ Hà Thúc, kéo dài hạn ký giấy 7 ngày, manh mối Vạn Linh Phổ activate khi observe pet',
    scenes: [
      'Mở: Cố Diệp tỉnh dậy, em gái Tiểu Đào lo lắng — warm beat, MC thiếu niên hồi phục',
      'Hà Thúc báo gia phả + chú Trường Khải sẽ đến — MC tiếp nhận thông tin lạnh đạm',
      'Cố Diệp ra sân, Vạn Linh Phổ activate khi nhìn Lục Vũ sparrow — HUD ẩn hiện ra (lần đầu trong truyện)',
      'Chú Trường Khải đến với giấy thừa kế, MC deflect "đầu chóng, vài hôm" — chú bực bỏ đi',
      'Hà Thúc kể chuyện kho lưu trữ pet phế (Tro Bụi slime trong đó) — setup ch.2',
      'Cliffhanger: đêm khuya, MC quyết định đi vào kho lưu trữ — first move',
    ],
  },
  {
    chapterNumber: 2, sub_arc_number: 1,
    brief: 'Đêm khuya, Cố Diệp lẻn vào kho lưu trữ Cố phủ. Hà Thúc canh ngoài. MC observe các pet phế bị bỏ trong kho — Vạn Linh Phổ scan từng con. Phần lớn không có tuyến tiến hóa đáng giá. Đến cuối kho, MC nhìn slime "Tro Bụi" cấp F (chỉ ăn bụi, dùng để cleaning) — HUD ẩn show 3 tuyến tiến hóa: tuyến lửa (Lửa Tro → Phượng Linh → Hỏa Phụng Tế → ... → Hồng Hoang Phụng Tổ SS), tuyến tro thuần (cap thấp), tuyến lai. MC chọn tuyến lửa — feed sequence yêu cầu Tro Lửa Linh + thời gian 7 ngày để evolve sang Lửa Tro cấp E. MC bí mật mang Tro Bụi về phòng kín hậu sơn vườn nhà. Sáng hôm sau, MC ra chợ Linh Châu Thành nhân cớ "đi dạo cho khoẻ", mua nguyên liệu Tro Lửa Linh giá rẻ (vài đồng vì ai cũng nghĩ là nguyên liệu cấp F vô dụng).',
    mcBenefit: 'pet đầu tiên Tro Bụi acquired (vật phẩm), Tro Lửa Linh nguyên liệu cho feed sequence, kinh nghiệm thị trường Linh Châu Thành (thông tin)',
    scenes: [
      'Đêm khuya MC lẻn vào kho lưu trữ với Hà Thúc canh ngoài',
      'Vạn Linh Phổ scan từng pet phế — đến cuối kho gặp Tro Bụi',
      'HUD ẩn show 3 tuyến tiến hóa của Tro Bụi — MC chọn tuyến lửa',
      'MC bí mật mang Tro Bụi về phòng kín hậu sơn',
      'Sáng MC ra chợ Linh Châu mua Tro Lửa Linh giá rẻ — bystander coi như nguyên liệu phế',
      'Cliffhanger: MC bắt đầu sequence feed — countdown 7 ngày',
    ],
  },
  {
    chapterNumber: 3, sub_arc_number: 1,
    brief: 'Ngày 1-3 sequence feed Tro Bụi. MC dạy em gái Cố Tiểu Đào kiến thức ngự thú cơ bản (lý giải bằng "đọc sách trong thư phòng tổ phụ"). Em gái lộ tò mò + lém lỉnh — chemistry ấm áp. Cố Vân Kiếm (em họ kiêu ngạo, cháu của Trường Khải) đến chế nhạo MC "không có pet còn dạy người khác", thách thức 5 ngày sau giải đấu nội tộc vòng 1 — kẻ thua phải làm việc hèn 1 tháng. MC bình thản nhận thách. Vân Kiếm cười khinh bỏ đi. Trưởng lão Cố Già Tâm (78 tuổi, trung lập) nghe tiếng, ra khen MC "có chí" và đề cập kho di sản tổ phụ vẫn khoá kín — chỉ trưởng tộc hợp pháp được vào. MC ghi nhận: phải đoạt được trưởng tộc danh phận để vào kho di sản.',
    mcBenefit: 'kiến thức ngự thú cơ bản (skill) cho em gái, manh mối kho di sản tổ phụ chỉ trưởng tộc vào được, nhận thử thách giải đấu nội tộc 5 ngày — opportunity face-slap đối thủ làm nền',
    scenes: [
      'MC dạy em gái Cố Tiểu Đào kiến thức ngự thú — chemistry ấm áp',
      'Cố Vân Kiếm đến chế nhạo + thách giải đấu 5 ngày sau',
      'MC bình thản nhận, Vân Kiếm cười khinh bỏ đi (đối thủ làm nền)',
      'Trưởng lão Cố Già Tâm (trung lập) đến khen MC, đề cập kho di sản tổ phụ chỉ trưởng tộc vào được',
      'MC bí mật check Tro Bụi tiến triển feed — pre-Lửa Tro form đang nóng dần',
      'Cliffhanger: 4 ngày nữa giải đấu, 4 ngày nữa Tro Bụi xong evolve sang Lửa Tro cấp E',
    ],
  },
  // ── Beat 2: First evolution + first kìm chế public win (ch.4-7) ──
  {
    chapterNumber: 4, sub_arc_number: 2,
    brief: 'Ngày 4-5 feed sequence. MC tiếp tục chuẩn bị giải đấu — đăng ký pet sẽ dùng. Vân Kiếm khoe pet hổ con cấp E mới nhận. MC chỉ đăng ký "slime cấp F không tên" — đám đệ tử trẻ cười nhạo. Ngày 6 sáng, Tro Bụi hoàn thành sequence: evolve thành Lửa Tro cấp E. MC scan Vạn Linh Phổ — pet stats tăng vượt expectation, có skill "Tro Lửa Phun" damage diện rộng. MC test trong phòng kín, hài lòng. MC chỉ thị Tro Bụi: ngày mai giải đấu, kìm chế ở mức F+ (chỉ bằng 30% sức thật) — chỉ đủ thắng vài hiệp đầu, không show kỹ năng cấp E. Tro Bụi gật.',
    mcBenefit: 'pet Tro Bụi evolve thành công cấp E (đột phá level), skill mới Tro Lửa Phun (kỹ năng), chuẩn bị face-slap Vân Kiếm + đám đệ tử trẻ ngày mai',
    scenes: [
      'MC tiếp tục feed Tro Bụi — bí mật trong phòng kín hậu sơn',
      'Vân Kiếm khoe hổ con cấp E mới — đám đệ tử nịnh hót',
      'MC đăng ký "slime cấp F không tên" — đám đệ tử cười nhạo',
      'Đêm ngày 5: Tro Bụi evolve Lửa Tro E — Vạn Linh Phổ confirm stat vượt mức',
      'MC test pet trong phòng kín, dạy kìm chế 30% sức cho ngày mai',
      'Cliffhanger: sáng mai giải đấu, MC sẵn sàng face-slap đầu tiên',
    ],
  },
  {
    chapterNumber: 5, sub_arc_number: 2,
    brief: 'Giải đấu nội tộc vòng 1. Cố tộc 30 đệ tử trẻ + trưởng lão xem. Vòng 1: MC bắt cặp với đệ tử trẻ Cố Khang (pet sói nhỏ E), MC thắng nhanh trong 30 giây — Tro Bụi (kìm chế F+) phun tro lửa làm sói rút lui. Đám đệ tử ngơ ngác. Vòng 2: Cố Tử Vũ (pet đại bàng E peak), trận khó hơn — Tro Bụi vẫn thắng (kìm chế ở 50%). Bystander shock thầm: "slime cấp F không tên thắng E peak?". Vân Kiếm bắt đầu nhíu mày. Vòng 3: Cố Vân Kiếm (hổ con E). MC ra hiệu Tro Bụi mở 70% — tro lửa cuộn, hổ con thua. Vân Kiếm câm họng, đám đệ tử quay sang MC. Trưởng lão Cố Già Tâm khen "có cốt cách tổ phụ". Trưởng lão khác (theo phe Trường Khải) im lặng tái mặt. MC kết thúc vỏ "may mắn, slime hơi đặc biệt".',
    mcBenefit: 'thắng giải đấu nội tộc vòng 1 — uy tín nội tộc tăng, công nhận từ Cố Già Tâm, face-slap Vân Kiếm + đám đệ tử (face-slap mass), Tro Bụi danh tiếng "slime đặc biệt" (vẫn giấu cấp E)',
    scenes: [
      'Sảnh giải đấu Cố phủ, 30 đệ tử + trưởng lão tập trung',
      'Vòng 1: MC vs Cố Khang — Tro Bụi phun tro lửa, sói rút (kìm chế F+)',
      'Vòng 2: MC vs Cố Tử Vũ — đại bàng thua, bystander shock thầm "slime F thắng E peak?"',
      'Vòng 3: MC vs Vân Kiếm — Tro Bụi mở 70%, hổ con thua, Vân Kiếm câm họng',
      'Cố Già Tâm khen "có cốt cách tổ phụ" — trưởng lão phe Trường Khải tái mặt',
      'MC vỏ "may mắn, slime hơi đặc biệt" — public face thiếu niên may mắn',
    ],
  },
  // ── Beat 3: First face-slap đám trưởng lão biển thủ (ch.6-15) ──
  {
    chapterNumber: 6, sub_arc_number: 2,
    brief: 'Sau vòng 1, đám đệ tử trẻ chuyển hướng — vài người đến hỏi MC bí quyết, MC deflect "do thiên phú slime, không có gì". Vân Kiếm rời sảnh, đi tìm chú Trường Khải báo cáo. Trường Khải lo lắng nhưng tỏ vẻ bình thường — vẫn ép MC ký giấy thừa kế tối nay. MC từ chối lần nữa "5 ngày nữa". Trưởng lão Cố Già Tâm chiều đó đến phòng MC, hỏi nhỏ về Tro Bụi. MC nửa thật nửa giả: "đọc sách tổ phụ, biết slime có nhánh tiến hóa lửa hiếm". Cố Già Tâm gật, không hỏi sâu, chỉ nói: "kho di sản tổ phụ có thêm nhiều thứ — cháu nên đoạt trưởng tộc danh phận để vào". MC nhận manh mối: trưởng lão ngầm ủng hộ.',
    mcBenefit: 'đám đệ tử trẻ chuyển hướng (network), trưởng lão Cố Già Tâm ngầm ủng hộ (quan hệ), confirm path đoạt trưởng tộc → vào kho di sản tổ phụ (manh mối + thông tin)',
    scenes: [
      'Sau vòng đấu, vài đệ tử trẻ đến hỏi MC bí quyết — MC deflect "thiên phú slime"',
      'Vân Kiếm báo chú Trường Khải — chú nội tâm lo, ngoài bình thường',
      'Trường Khải ép ký giấy thừa kế tối nay, MC từ chối "5 ngày"',
      'Chiều: Cố Già Tâm đến phòng MC, hỏi nhỏ về Tro Bụi',
      'MC nửa thật nửa giả — "sách tổ phụ kể slime có nhánh lửa"',
      'Cố Già Tâm: "cháu nên đoạt trưởng tộc, kho di sản còn nhiều thứ" — manh mối quan trọng',
    ],
  },
  {
    chapterNumber: 7, sub_arc_number: 2,
    brief: 'MC bí mật investigate kho gia tộc — Hà Thúc dẫn đường. Phát hiện: trưởng lão Cố Trường Lệ (một trong 4 trưởng lão biển thủ, tay phải Trường Khải) đã bán 3 pet quý của tổ phụ cho thương nhân Vương thị (tiểu tộc đối thủ Cố tộc) để lấy tiền cá nhân. MC ghi nhận chứng cứ — Hà Thúc có sổ đối chiếu cũ. Đây là leverage để công khai face-slap Trường Lệ trước hội đồng trưởng lão. MC quyết định gài bẫy: ngày mai sẽ "tình cờ" kiểm kê kho khi cả hội đồng có mặt, lộ ra việc 3 pet biến mất.',
    mcBenefit: 'manh mối biển thủ của Trường Lệ (thông tin), sổ đối chiếu của Hà Thúc (vật phẩm chứng cứ), kế hoạch face-slap Trường Lệ trước hội đồng (setup-payoff)',
    scenes: [
      'MC + Hà Thúc đêm khuya investigate kho gia tộc',
      'Phát hiện 3 pet quý của tổ phụ thiếu — đối chiếu sổ',
      'Hà Thúc cho biết Trường Lệ bán cho Vương thị — leverage',
      'MC + Hà Thúc thiết kế bẫy: kiểm kê công khai trước hội đồng ngày mai',
      'MC về phòng feed Tro Bụi tiếp + scan Lục Vũ trong sân — Vạn Linh Phổ show tuyến phong (preview pet thứ 3)',
      'Cliffhanger: ngày mai hội đồng trưởng lão',
    ],
  },
  {
    chapterNumber: 8, sub_arc_number: 2,
    brief: 'Hội đồng trưởng lão Cố tộc sáng. 4 trưởng lão biển thủ + Cố Già Tâm + chú Trường Khải. MC tới muộn 5 phút (intentional), xin phép kiểm kê "xem kho có cần bổ sung gì không". Trường Khải khó chịu nhưng không cản. MC + Hà Thúc đem sổ ra đối chiếu công khai — phát hiện 3 pet quý thiếu. MC chỉ tay vào Trường Lệ: "Trưởng lão, 3 pet này last seen có chữ ký của ngài". Trường Lệ tái mặt, cố biện minh "đi luyện tập". Hà Thúc đưa thêm sổ Vương thị (qua manh mối) — chứng cứ giao dịch. Trường Lệ câm họng, các trưởng lão khác sốc. Trường Khải bực nhưng không thể bao che. MC đề xuất: Trường Lệ rút khỏi hội đồng + bồi hoàn. Cố Già Tâm ủng hộ, các trưởng lão khác miễn cưỡng đồng ý. Trường Khải tái mặt — 1 ally bị loại.',
    mcBenefit: 'face-slap Trường Lệ trước hội đồng (uy tín), Trường Lệ rút hội đồng + bồi hoàn 3 pet (tài nguyên thu hồi), Trường Khải mất 1 ally (đột phá quyền lực nội tộc)',
    scenes: [
      'Hội đồng trưởng lão sáng, MC tới muộn 5 phút',
      'MC + Hà Thúc kiểm kê kho công khai — chỉ ra 3 pet thiếu',
      'MC chỉ tay Trường Lệ: "có chữ ký ngài last seen"',
      'Hà Thúc đưa sổ Vương thị — chứng cứ giao dịch',
      'Trường Lệ câm họng, các trưởng lão sốc',
      'MC đề xuất Trường Lệ rút + bồi hoàn — Cố Già Tâm ủng hộ, hội đồng đồng ý, Trường Khải mất ally',
    ],
  },
  ...generateSimpleBriefs(9, 50),
];

function generateSimpleBriefs(start: number, end: number): Array<{
  chapterNumber: number;
  sub_arc_number: number;
  brief: string;
  mcBenefit: string;
  scenes: string[];
}> {
  const briefs = [];
  for (let i = start; i <= end; i++) {
    const subArc = i <= 15 ? 2 : i <= 30 ? 3 : 4;
    let brief: string;
    let mcBenefit: string;
    let scenes: string[];
    if (i <= 15) {
      brief = `Ch.${i}: Tiếp tục face-slap đám trưởng lão biển thủ. Cố Diệp gài bẫy thêm 1-2 trưởng lão phe Trường Khải. Pet Tro Bụi tiếp tục feed sequence (đang hướng Phượng Linh cấp C arc 2). MC kìm chế Tro Bụi public ở Lửa Tro E. Em gái Cố Tiểu Đào tham gia luyện kiến thức ngự thú nhiều hơn. Cliffhanger: cận cảnh Trường Khải sắp dùng đòn cuối cùng.`;
      mcBenefit = `tài nguyên thu hồi từ trưởng lão thứ ${i - 7}, uy tín nội tộc tăng, manh mối âm mưu Trường Khải`;
      scenes = ['MC investigate trưởng lão khác', 'Bẫy hội đồng', 'Trường lão tái mặt', 'Bồi hoàn tài nguyên', 'Tro Bụi feed bí mật', 'Cliffhanger Trường Khải'];
    } else if (i <= 30) {
      brief = `Ch.${i}: Trường Khải tung đòn cuối — gọi Vương thị (tiểu tộc cùng cấp) đến gây áp lực. MC face-slap Vương thị bằng pet kìm chế. Lục Vũ (sparrow vườn nhà) được acquire ch.20+ — Vạn Linh Phổ scan tuyến phong, MC bắt đầu feed sequence song song Tro Bụi. Cơ Niệm (mech bug) acquire ch.25+ ở chợ Linh Châu. Em gái Cố Tiểu Đào talent dần lộ — chưa rõ. Cliffhanger: chú Trường Khải tuyệt vọng, sắp ra tay với em gái MC.`;
      mcBenefit = `tài nguyên + uy tín thắng Vương thị, pet thứ 2 và 3 acquired (vật phẩm), em gái Tiểu Đào talent manh mối, đột phá pet portfolio`;
      scenes = ['Vương thị đến gây áp lực', 'MC face-slap pet kìm chế', 'Acquire Lục Vũ + Cơ Niệm', 'Feed sequence song song', 'Em gái talent manh mối', 'Cliffhanger chú tuyệt vọng'];
    } else {
      brief = `Ch.${i}: Climax arc 1 — chú Trường Khải bắt cóc em gái Cố Tiểu Đào, ép MC ký từ bỏ thừa kế. MC dùng pet đã evolve cấp B (kìm chế xuống A) đánh bại Trường Khải trong 1 trận. Trường Khải cùng phe bị giam. Cố Già Tâm chính thức công nhận MC là trưởng tộc. MC vào kho di sản tổ phụ — phát hiện gia phả + công thức cổ + manh mối bố mẹ ở Bắc Vực. Gia tộc Cố từ phế tộc thành tiểu tộc lại. Setup arc 2.`;
      mcBenefit = `đoạt trưởng tộc danh phận (uy tín tối thượng), kho di sản tổ phụ (tài nguyên + công thức cổ), manh mối bố mẹ ở Bắc Vực (thông tin), em gái được bảo vệ`;
      scenes = ['Trường Khải bắt cóc em gái', 'MC trận chiến cuối arc 1 — pet B kìm chế A', 'Trường Khải bị giam', 'Cố Già Tâm công nhận MC trưởng tộc', 'Vào kho di sản tổ phụ', 'Manh mối Bắc Vực — setup arc 2'];
    }
    briefs.push({ chapterNumber: i, sub_arc_number: subArc, brief, mcBenefit, scenes });
  }
  return briefs;
}

const arc1Row = {
  project_id: PROJECT_ID,
  arc_number: 1,
  start_chapter: 1,
  end_chapter: 50,
  arc_theme: 'foundation',
  plan_text: [
    'ARC 1: Phục hưng nội tộc — đoạt lại quyền thừa kế.',
    'Sub-arc 1 (ch.1-3): Warm baseline. Cố Diệp tỉnh dậy, Vạn Linh Phổ activate, MC plant first seed bí mật ở kho lưu trữ.',
    'Sub-arc 2 (ch.4-15): First evolution Tro Bụi → Lửa Tro E + first face-slap đám trưởng lão biển thủ qua hội đồng.',
    'Sub-arc 3 (ch.16-30): Trường Khải tung đòn cuối với Vương thị, MC face-slap pet kìm chế, acquire pet thứ 2 + 3.',
    'Sub-arc 4 (ch.31-50): Climax arc 1 — Trường Khải bắt cóc em gái, MC trận chiến cuối, đoạt trưởng tộc danh phận, vào kho di sản tổ phụ, gia tộc Cố từ phế tộc thành tiểu tộc lại.',
    'Mode lão lục tuyệt đối: MC luôn kìm chế pet ở public, đối thủ ngắt quãng 3-5 chương 1 đợt, dopamine qua phản ứng xã hội.',
    'Adversity:dopamine = 10:90. Mỗi chương ≥1 dopamine peak hữu hình.',
  ].join('\n'),
  sub_arcs: [
    { sub_arc_number: 1, chapter_range: '1-3', theme: 'Warm baseline + Vạn Linh Phổ activate', payoff: 'pet đầu tiên Tro Bụi acquired bí mật' },
    { sub_arc_number: 2, chapter_range: '4-15', theme: 'First evolution + face-slap trưởng lão biển thủ', payoff: 'Trường Lệ + 2 trưởng lão khác bị loại, Trường Khải mất ally' },
    { sub_arc_number: 3, chapter_range: '16-30', theme: 'Vương thị tiểu tộc tham chiến', payoff: 'pet thứ 2 + 3 acquired, gia tộc rank dần lên' },
    { sub_arc_number: 4, chapter_range: '31-50', theme: 'Climax arc 1 — đoạt trưởng tộc + kho di sản', payoff: 'Cố tộc tiểu tộc lại + manh mối bố mẹ Bắc Vực' },
  ],
  chapter_briefs: arc1ChapterBriefs,
  threads_to_advance: [
    'Bố mẹ MC mất tích ở Bắc Vực — manh mối nhỏ qua kho di sản (resolve arc 4)',
    'Em gái Cố Tiểu Đào talent thông giao tâm linh ẩn (phát triển arc 2-3)',
    'Trưởng lão Cố Già Tâm dần ủng hộ MC (advance qua face-slap)',
    'Vạn Linh Phổ database expand qua observe pet mới (compounding)',
  ],
  threads_to_resolve: [
    'Đoạt quyền thừa kế từ chú Cố Trường Khải (resolved ch.50)',
    'Loại 4 trưởng lão biển thủ (resolved ch.30-50)',
    'Pet đầu tiên Tro Bụi evolve Lửa Tro E (resolved ch.5)',
  ],
  new_threads: [
    'Vương thị tiểu tộc đối thủ — leftover qua arc 2',
    'Manh mối bố mẹ Bắc Vực — leftover qua arc 4',
    'Em gái Cố Tiểu Đào talent ẩn — develop arc 2-3',
    'Tro Bụi tuyến tiến hóa Phượng Linh — develop arc 2-3',
  ],
};

async function main() {
  const { error } = await db.from('arc_plans').upsert(arc1Row, { onConflict: 'project_id,arc_number' });
  if (error) { console.error(error); process.exit(1); }
  console.log(`Arc 1 chapter_briefs upserted: ${arc1Row.chapter_briefs.length} briefs covering ch.1-50`);
}

main().catch((e) => { console.error(e); process.exit(1); });
