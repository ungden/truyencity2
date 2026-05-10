// Fix pacing drift in arc_plans for project 2bfd2a90.
// Issues found in ch.1-3 audit:
//   1. Cố Khiếu antagonist xuất hiện 3 chương liên tiếp (no breathing)
//   2. Không có big wow / face-slap visible (kìm nén)
//   3. Pet evolution still secret but em gái đã thấy MC trong phòng kín (soft breach)
//   4. plot_threads = 0, character_states thiếu nhiều characters
//
// Fix: Override briefs ch.4-7 to enforce:
//   - Ch.4: Cố Khiếu khám xét FAIL — MC pre-empted, bystander shock thầm
//   - Ch.5: BREATHING — Tro Bụi → Lửa Tro E complete, em gái + Hà Thúc warm scene
//   - Ch.6: BREATHING — Cố Già Tâm dẫn vào kho di sản (small payoff), MC dạy đệ tử
//   - Ch.7: BIG WOW — giải đấu Vân Kiếm, mass face-slap, đám đệ tử chuyển hướng
// Also: Add directive in arc_theme + plan_text to force engine extract
// characters Hà Thúc / Trường Khải / Khiếu / Vân Kiếm / Già Tâm / Tro Bụi / Lục Vũ.

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const PROJECT_ID = '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c';

const newBriefsCh4to7 = [
  {
    chapterNumber: 4, sub_arc_number: 2,
    brief: 'CỐ KHIẾU KHÁM XÉT FAIL + BYSTANDER SHOCK THẦM. Sáng cuộc họp trưởng lão khám xét phòng MC. MC đã chuyển slime sang phòng tu luyện cũ tổ phụ dưới gốc bồ đề (khoá kín, không ai biết) đêm qua. Cố Khiếu + 2 đệ tử lục soát phòng MC — không tìm thấy gì. Trưởng lão Cố Già Tâm trung lập dự cuộc họp, nhìn thái độ bình tĩnh kỳ lạ của MC trước cuộc lục soát — bystander shock thầm: "thiếu niên 16 tuổi vừa tỉnh dậy mà đã có thần thái này?". Cố Khiếu mất mặt, các trưởng lão khác bắt đầu nghi ngờ Khiếu vu cáo. MC vỏ "đêm qua mất ngủ ra vườn hóng gió, có gì đâu" — public face thiếu niên khúm núm. Sau đó Cố Khiếu RÚT KHỎI sân khấu — không xuất hiện chương 5-6. MC quay về phòng kín feed Tro Bụi tiếp. KHÔNG ai chứng kiến.',
    mcBenefit: 'Cố Khiếu mất uy tín trước hội đồng (face-slap đối thủ), Cố Già Tâm bystander shock thầm (uy tín nội tộc tăng), thông tin Cố Khiếu đang bị nghi vu cáo (manh mối)',
    scenes: [
      'Đêm: MC chuyển slime + nguyên liệu sang phòng tu luyện cũ tổ phụ dưới gốc bồ đề, Hà Thúc canh',
      'Sáng: Cố Khiếu + 2 đệ tử lục soát phòng MC — không thấy gì',
      'Cuộc họp trưởng lão tại sảnh chính: Cố Khiếu cáo buộc, MC vỏ khúm núm "ngủ không yên ra vườn"',
      'Cố Già Tâm bystander shock thầm: thái độ MC bình tĩnh kỳ lạ — internal monologue dài lão',
      'Trưởng lão phe khác bắt đầu nghi ngờ Khiếu vu cáo, Khiếu mất mặt RÚT KHỎI cuộc họp',
      'Chiều: MC về phòng kín feed Tro Bụi tiếp, scan Vạn Linh Phổ — Tro Bụi tiến độ 80%',
      'Hà Thúc lại đến báo "Cố Khiếu đã đi xa, không quay lại trong 3 ngày" — confirm cooldown',
    ],
  },
  {
    chapterNumber: 5, sub_arc_number: 2,
    brief: 'BREATHING CHƯƠNG. Sáng ngày 6 sequence feed Tro Bụi → tối: TRO BỤI EVOLVE LỬA TRO CẤP E THÀNH CÔNG trong phòng kín. MC scan Vạn Linh Phổ, hài lòng. Tone ấm áp xen tính toán: dạy em gái Cố Tiểu Đào kiến thức nâng cao về thuộc tính phong hệ + lôi hệ. Em gái lém lỉnh hỏi "ca có pet bí mật à?" — MC deflect bằng "ca chỉ thích đọc sách thôi". Quản gia Hà Thúc kể chuyện đêm bố MC Cố Hành ra Bắc Vực 1 năm trước — manh mối quan trọng cho arc 4. KHÔNG có scene đối thủ. Chỉ MC + em gái + Hà Thúc + Tro Bụi. Cuối chương: MC test Tro Bụi trong phòng kín, Tro Bụi phun tro lửa làm cháy 1 cục đá — MC dạy nó kìm chế "ngày kia giải đấu, mày phải giấu cấp E, chỉ show F+". Tro Bụi gật.',
    mcBenefit: 'Tro Bụi evolve Lửa Tro cấp E thành công (đột phá pet level, kỹ năng Tro Lửa Phun), manh mối bố Cố Hành Bắc Vực từ Hà Thúc (thông tin), uy tín với em gái (quan hệ), kinh nghiệm dạy pet kìm chế (skill)',
    scenes: [
      'Sáng: MC ra vườn, dạy em gái phong hệ + lôi hệ — chemistry ấm áp, bướm bay',
      'Trưa: Hà Thúc kể chuyện bố Cố Hành ra Bắc Vực 1 năm trước, có cuốn nhật ký bố để lại',
      'MC ngầm ghi nhớ — manh mối arc 4',
      'Tối: Tro Bụi feed final — evolve Lửa Tro cấp E thành công',
      'MC scan Vạn Linh Phổ: "Lửa Tro E, skill Tro Lửa Phun damage diện rộng, có thể tiếp tục feed sang Phượng Linh C ở arc 2"',
      'MC test pet trong phòng kín, dạy kìm chế "show F+ chỉ"',
      'Cliffhanger nhẹ: ngày kia giải đấu Vân Kiếm — Tro Bụi sẵn sàng',
    ],
  },
  {
    chapterNumber: 6, sub_arc_number: 2,
    brief: 'BREATHING CHƯƠNG. Cố Già Tâm dẫn MC vào kho di sản tạm thời (chỉ vài kệ ngoài, chưa đầy đủ). MC nhận 1 cuốn sách công thức tiến hóa cổ + 2 viên Hỏa Diễm Thạch + 50 Linh Mạch (tài nguyên payoff thực sự). Cố Già Tâm: "phần lớn còn niêm phong, chỉ trưởng tộc hợp pháp được mở. Mai sau cháu đoạt trưởng tộc, ta sẽ giúp." MC cúi đầu cảm ơn. Sau đó MC dạy 5 đệ tử trẻ trong gia tộc kiến thức cơ bản — đệ tử trẻ ngầm phục, bắt đầu nghiêng về MC (network). Tiểu Đào nhìn anh đầy ngưỡng mộ. Hà Thúc thở phào "thiếu gia có thần thái thế này, gia tộc còn hy vọng". Cuối chương: MC về phòng kín, Tro Bụi sẵn sàng cho giải đấu mai. KHÔNG có đối thủ. Pure dopamine flow.',
    mcBenefit: 'sách công thức tiến hóa cổ + 2 viên Hỏa Diễm Thạch + 50 Linh Mạch (tài nguyên), 5 đệ tử trẻ ngầm phục (network), uy tín với Hà Thúc + Già Tâm (quan hệ), confirm path đoạt trưởng tộc',
    scenes: [
      'Sáng: Cố Già Tâm dẫn MC vào kho di sản tạm thời (vài kệ ngoài)',
      'MC nhận sách công thức tiến hóa cổ + 2 viên Hỏa Diễm Thạch + 50 Linh Mạch — payoff hữu hình',
      'Cố Già Tâm: "phần lớn còn niêm phong, đoạt trưởng tộc mới mở được"',
      'Trưa: MC dạy 5 đệ tử trẻ kiến thức cơ bản (Cố Khang, Cố Tử Vũ, 3 đệ tử khác)',
      '5 đệ tử ngầm phục, dần nghiêng về MC',
      'Chiều: Tiểu Đào nhìn anh ngưỡng mộ, Hà Thúc thở phào',
      'Tối: MC về phòng kín, Tro Bụi sẵn sàng — Cliffhanger nhẹ "mai giải đấu"',
    ],
  },
  {
    chapterNumber: 7, sub_arc_number: 2,
    brief: 'BIG WOW CHƯƠNG — GIẢI ĐẤU VÂN KIẾM. Cố Diệp xuất hiện sảnh giải đấu trong vỏ thiếu niên gầy yếu. 30 đệ tử + trưởng lão dự khán. Vân Kiếm khoe Bạch Ngân Lang cấp D, đám tùy tùng nịnh hót. MC chỉ "slime cấp F không tên" — đám đệ tử cười nhạo. Trận đấu: MC ra hiệu Tro Bụi kìm chế ở F+ (chỉ 25% sức thật). Vân Kiếm tự tin tấn công, Bạch Ngân Lang lao ra. Tro Bụi tránh nhanh, phun tia tro lửa nhỏ — Bạch Ngân Lang giật mình, ngần ngại. Vân Kiếm ép tấn công lần 2, Tro Bụi bóp lại thành quả cầu, lăn nhẹ qua trúng chân Bạch Ngân Lang — pet kêu thảm, ngã. MC thắng trong 90 giây. ĐẠI ĐÒN FACE-SLAP MASS: 30 đệ tử + trưởng lão SHOCK THẦM "slime cấp F thắng cấp D?", Vân Kiếm câm họng tái mặt, đám tùy tùng cúi đầu. Cố Già Tâm khen "có cốt cách tổ phụ — Đại Sư Cố Lập Khải đã trở lại?". Trưởng lão Cố Trường Lệ (phe Trường Khải, biển thủ) tái mặt — internal "thằng nhóc này không thể coi thường". MC vỏ "may mắn, slime hơi đặc biệt thôi" — public face thiếu niên may mắn. Sau giải đấu: 5 đệ tử trẻ chuyển hướng theo MC (network expand), Vân Kiếm lủi đi, đám đệ tử khác đến hỏi MC bí quyết. MC deflect "do thiên phú slime". MC nhận tiền thưởng giải đấu 30 đồng + 5 viên Hồi Khí Đan (resource). Cuối chương: chú Cố Trường Khải nghe tin, mặt sa sầm — confirm next antagonist phase.',
    mcBenefit: 'thắng giải đấu nội tộc vòng 1 (uy tín nội tộc lớn), face-slap Vân Kiếm + đám đệ tử (face-slap mass), tiền thưởng 30 đồng + 5 viên Hồi Khí Đan (tài nguyên), 5 đệ tử trẻ network (quan hệ), Cố Trường Lệ tái mặt (đột phá quyền lực)',
    scenes: [
      'Sảnh giải đấu Cố phủ, 30 đệ tử + trưởng lão tập trung',
      'Vân Kiếm khoe Bạch Ngân Lang D, MC chỉ "slime F không tên"',
      'Đám đệ tử cười nhạo, Tiểu Đào lo lắng kéo tay anh',
      'Trận đấu: Tro Bụi kìm chế F+ tránh + phun tro lửa, Bạch Ngân Lang giật mình',
      'MC ra hiệu Tro Bụi đè bẹp — Bạch Ngân Lang ngã trong 90 giây',
      'BIG WOW: 30 đệ tử + trưởng lão SHOCK THẦM, Vân Kiếm câm họng tái mặt',
      'Cố Già Tâm khen "có cốt cách tổ phụ", Cố Trường Lệ tái mặt internal',
      'MC vỏ "may mắn, slime đặc biệt" — public face thiếu niên may mắn',
      'Sau đấu: 5 đệ tử chuyển hướng, đến hỏi bí quyết, MC deflect',
      'MC nhận tiền thưởng 30 đồng + 5 viên Hồi Khí Đan',
      'Cliffhanger: chú Cố Trường Khải nghe tin, mặt sa sầm — next antagonist phase',
    ],
  },
];

const newPlanTextLine = [
  'ARC 1: Phục hưng nội tộc — đoạt lại quyền thừa kế.',
  'Sub-arc 1 (ch.1-3): Warm baseline. Cố Diệp tỉnh dậy, Vạn Linh Phổ activate, MC plant first seed bí mật ở kho lưu trữ. (DONE — written)',
  'Sub-arc 2 (ch.4-15): First evolution Tro Bụi → Lửa Tro E + first face-slap đám trưởng lão biển thủ qua hội đồng.',
  '  - Ch.4 (CRITICAL): Cố Khiếu khám xét FAIL — MC pre-empted, Cố Già Tâm bystander shock thầm. Cố Khiếu RÚT KHỎI sân khấu, KHÔNG xuất hiện 3 chương sau.',
  '  - Ch.5-6 (BREATHING): Tro Bụi evolve Lửa Tro E thành công. MC + em gái + Hà Thúc warm scenes. Cố Già Tâm dẫn vào kho di sản tạm thời, payoff tài nguyên hữu hình. KHÔNG có đối thủ trong 2 chương này.',
  '  - Ch.7 (BIG WOW): Giải đấu Vân Kiếm — Tro Bụi kìm chế F+ thắng Bạch Ngân Lang D, mass face-slap, 30 đệ tử + trưởng lão shock thầm.',
  '  - Ch.8-15: Tiếp face-slap đám trưởng lão biển thủ Cố Trường Lệ + 2-3 trưởng lão khác qua bằng chứng Hà Thúc cung cấp.',
  'Sub-arc 3 (ch.16-30): Trường Khải tung đòn cuối với Vương thị, MC face-slap pet kìm chế, acquire pet thứ 2 + 3.',
  'Sub-arc 4 (ch.31-50): Climax arc 1 — Trường Khải bắt cóc em gái, MC trận chiến cuối, đoạt trưởng tộc danh phận, vào kho di sản tổ phụ, gia tộc Cố từ phế tộc thành tiểu tộc lại.',
  '',
  '*** PACING ENFORCEMENT (HARD RULE) ***',
  '- Đối thủ KHÔNG xuất hiện liên tục >2 chương. Sau mỗi đợt confront → 2-3 chương breathing (em gái + Hà Thúc + pet evolution bí mật).',
  '- Mỗi 3-5 chương ≥1 BIG WOW (mass face-slap, milestone, evolve visible-public).',
  '- 80% chương dopamine flow, 20% climax. Adversity:dopamine = 10:90.',
  '- Pet evolution PHẢI làm trong phòng kín (phòng tu luyện cũ tổ phụ dưới gốc bồ đề), KHÔNG ai chứng kiến.',
  '- Em gái Cố Tiểu Đào CHỈ biết MC "tu luyện đọc sách", KHÔNG biết slime, KHÔNG biết Vạn Linh Phổ.',
  '- Cố Khiếu antagonist sub-phase: rút khỏi sân khấu sau ch.4 (cooldown 3-4 chương trước khi quay lại trong chuỗi face-slap đám trưởng lão biển thủ).',
  '- Bystander shock thầm + đối thủ kinh ngạc câm họng + NPC khen lén = dopamine source ưu tiên. KHÔNG MC tự khoe.',
  '',
  '*** REQUIRED CHARACTER TRACKING ***',
  '- Per chapter, MUST extract character_states for: Cố Diệp (MC), em gái Cố Tiểu Đào, quản gia Hà Thúc, chú Cố Trường Khải (antagonist), em họ Cố Vân Kiếm (rival), trưởng lão Cố Khiếu (antagonist secondary), trưởng lão Cố Già Tâm (mentor neutral), pet Tro Bụi.',
  '- Per chapter, MUST extract plot_threads for: phục hưng gia tộc, đoạt thừa kế, bố Cố Hành Bắc Vực mất tích, Vạn Linh Phổ tuyến tiến hóa, kho di sản tổ phụ niêm phong.',
].join('\n');

async function main() {
  // Load existing arc 1
  const { data: existing } = await db.from('arc_plans').select('chapter_briefs, plan_text, sub_arcs, threads_to_advance, threads_to_resolve, new_threads').eq('project_id', PROJECT_ID).eq('arc_number', 1).maybeSingle();

  if (!existing) { console.error('Arc 1 not found'); process.exit(1); }

  const allBriefs = (existing.chapter_briefs as any[]) || [];
  const fixedChapters = new Set(newBriefsCh4to7.map((b) => b.chapterNumber));
  const merged = [
    ...allBriefs.filter((b) => !fixedChapters.has(b.chapterNumber)),
    ...newBriefsCh4to7,
  ].sort((a, b) => a.chapterNumber - b.chapterNumber);

  const { error } = await db.from('arc_plans').update({
    chapter_briefs: merged,
    plan_text: newPlanTextLine,
  }).eq('project_id', PROJECT_ID).eq('arc_number', 1);

  if (error) { console.error(error); process.exit(1); }
  console.log(`Arc 1 plan_text + ch.4-7 briefs updated. Total briefs: ${merged.length}`);
  console.log('Next: PROJECT_ID=2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c npx tsx scripts/write-chapter-flash.ts');
}

main().catch((e) => { console.error(e); process.exit(1); });
