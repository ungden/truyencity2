/**
 * Deep fix for "Trở Lại 1995: Đế Chế Bất Động Sản Hải Long Đô"
 *
 * 12 existing chapters were riddled with:
 *   1. Currency math impossible: ch1 starts with "5 nguyên" but spends 27 nguyên
 *   2. Currency confusion: "nguyên" / "xu" / "triệu" mixed without consistency
 *   3. Inflated prices: rent goes 12 → 300 → 700 nguyên/tháng inconsistently
 *   4. Unrealistic land prices: 1.25M nguyên/m² Q7 1995 (real: 50-200k/m²)
 *   5. Narrative jump: rented shop in ch5 → suddenly bought Q7 land in ch11
 *      with no setup chapter showing how MC accumulated capital for purchase
 *
 * Fix:
 *   - Wipe all 12 chapters + clear memory tables
 *   - Reset current_chapter = 0
 *   - Replace world_description with detailed economic + currency hard rules
 *   - Cron will rewrite using new constraints
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const NEW_WORLD_DESCRIPTION = `BỐI CẢNH: Hải Long Đô (tựa TP. Hồ Chí Minh) năm 1995, Đại Nam Quốc vừa Đổi Mới được 10 năm. Internet chưa phổ biến, Yahoo Messenger sắp ra. Sàn chứng khoán Đại Nam khai trương năm 2000 (5 năm nữa). BĐS Q.7 vẫn còn đồng ruộng + nhà cấp 4 thưa thớt. Mọi tiền tệ TRONG TRUYỆN dùng VND thực — đồng / nghìn đồng / triệu đồng / tỷ đồng — ngang giá VND của Việt Nam ngoài đời. TUYỆT ĐỐI KHÔNG dùng "nguyên" làm đơn vị tiền, KHÔNG dùng "xu", KHÔNG dùng "lượng vàng" trong giao dịch hàng ngày.

NHÂN VẬT CHÍNH:
- Lý Minh, sinh viên năm 3 Khoa Cơ khí trường Đại học Bách Khoa Hải Long Đô.
- Vốn liếng đầu truyện: 5 triệu đồng (~500 USD năm 1995, từ tiền tiết kiệm + bố mẹ gửi vài tháng).
- Bàn tay vàng: ký ức 30 năm tương lai (đến 2025) — nhớ chính xác chu kỳ kinh tế, mảnh đất nào lên giá, công ty nào niêm yết / phá sản, công thức kinh doanh đã thử qua.
- Tính cách: pragmatic, tính toán cẩn thận, ưa value investing kiểu Buffett/Graham, không liều lĩnh.

KINH TẾ 1995 — SỐ LIỆU CHUẨN (BẮT BUỘC TUÂN THỦ):
- Lương sinh viên đi làm thêm: 200,000 - 500,000 đồng/tháng
- Lương kỹ sư mới ra trường: 600,000 - 1,200,000 đồng/tháng
- Tô phở vỉa hè: 3,000 - 5,000 đồng/bát
- Cơm bụi sinh viên: 5,000 - 8,000 đồng/đĩa
- Cà phê vỉa hè: 1,000 - 2,000 đồng/cốc
- Mặt bằng nhà phố mặt tiền 30m² khu sinh viên: 800,000 - 1,500,000 đồng/tháng
- Mặt bằng mặt tiền trung tâm Q.1 (đường Nguyễn Huệ, Lê Lợi): 5-15 triệu đồng/tháng
- Đất nền Q.7 năm 1995: 50,000 - 200,000 đồng/m² (đa phần dưới 100k/m² vì còn ruộng)
- Đất Q.1, Q.3 mặt tiền: 5-20 triệu đồng/m²
- 1 chỉ vàng SJC: 450,000 - 500,000 đồng (1 lượng = 10 chỉ ≈ 4.5 - 5 triệu đồng)
- Xe Honda Cub mới: 18-25 triệu đồng
- Xe Yamaha Sirius mới (1999): 22-28 triệu đồng

QUY TẮC SỐ LIỆU NHẤT QUÁN (CRITIC PHẢI ENFORCE):
- Mọi giao dịch trong truyện phải có MATH ĐÚNG: số tiền chi không vượt số tiền hiện có.
- Mỗi lần MC kiếm tiền hoặc chi tiền, NÊU CỤ THỂ con số + tổng cộng còn lại trong tay.
- Khi MC vay vốn ngân hàng: tỷ lệ vay tối đa 70-80% giá trị tài sản thế chấp (theo luật ngân hàng VN 1995).
- Doanh thu quán phở mới mở (10-30 bát/ngày tuần đầu): 30,000 - 150,000 đồng/ngày × 30 = 900k - 4.5 triệu đồng/tháng (KHÔNG phải 60 triệu/tháng — đó là quán đông sau khi xây thương hiệu nhiều tháng).
- Khi nâng quy mô lên chuỗi 5-10 quán, doanh thu mới chạm 50-100 triệu/tháng.

PROGRESSION CAPITAL CHUẨN (15 chương đầu):
- Ch.1: 5 triệu đồng vốn liếng → mua nguyên liệu phở 1 ngày (~150-200k) → bán thử
- Ch.2-5: doanh thu nhỏ vài trăm k/ngày, lời ròng 50-100k/ngày, tích lũy đến ~3-5 triệu sau 1 tháng
- Ch.6-10: mở quán cố định thuê mặt bằng 1 triệu/tháng + đặt cọc 3 tháng = 3 triệu, dùng vốn 8-10 triệu (góp + vay nhỏ bạn)
- Ch.11-15: doanh thu 5-10 triệu/tháng, tích lũy 30-50 triệu sau 6 tháng để chuẩn bị scale
- Ch.16+: mở quán thứ 2, doanh thu 20+ triệu/tháng, BẮT ĐẦU nghĩ mua đất Q.7 (chứ KHÔNG mua đất luôn ở chương 11)

ĐỊA DANH:
- Hải Long Đô (tựa TP. Hồ Chí Minh): khu MC sinh sống, sôi động.
- Phượng Đô (tựa Hà Nội): trung tâm chính trị, MC ít liên quan.
- Cố Đô Trung Đô (tựa Cố Đô Huế): di sản, ít xuất hiện.
- Q.1, Q.3, Q.5: trung tâm cũ Hải Long Đô. Q.7: vùng ven phía Nam, sẽ phát triển sau 2005.
- Đường Nguyễn Huệ, Lê Lợi, Đồng Khởi: phố thương mại Q.1.
- Đại học Bách Khoa: trường top 1 Hải Long Đô.

TẬP ĐOÀN HIỆN TẠI 1995:
- Đại Phong Group (gốc Hải Long Đô): tập đoàn công nghệ tiên phong, đang phát triển outsourcing — đối thủ tương lai (~ FPT-analog).
- Vạn Thái Tập Đoàn (gốc Phượng Đô): gia tộc bất động sản truyền thống — đối thủ truyền thống.
- Khang Việt Bank: ngân hàng top 5, MC sẽ giao dịch ở chi nhánh Q.1.
- Trần gia, Phạm gia, Lê gia: 3 gia tộc tài phiệt ngầm Hải Long Đô.

CẤM TUYỆT ĐỐI:
- Dùng từ "nguyên" làm đơn vị tiền (chỉ nói "đồng/nghìn đồng/triệu đồng/tỷ đồng").
- Dùng từ "xu" cho tiền tệ (Đại Nam Quốc 1995 đã dùng VND, không có xu).
- Cho MC vay 80 triệu mua đất ở chương 10-15 — quá nhanh, vô lý kinh tế.
- Doanh thu quán phở mới mở 60 triệu/tháng — phải build dần qua nhiều tháng.
- Bỏ qua các bước trung gian (kiếm vốn ban đầu → vay ngân hàng → mua đất) — phải có chương cụ thể cho từng bước.

CẤU TRÚC 4 GIAI ĐOẠN (TUYẾN CHÍNH 750 chương):
- Giai đoạn 1 (Ch.1-50): Cash-cow F&B — quán phở vỉa hè → quán cố định → chuỗi 3-5 quán. Tích lũy 100-200 triệu đồng.
- Giai đoạn 2 (Ch.51-150): Bành trướng F&B + manh nha BĐS — chuỗi 20+ quán phở/cà phê, mua đất Q.7 đầu tiên. Tài sản 1-5 tỷ đồng.
- Giai đoạn 3 (Ch.151-300): Chứng khoán mới mở (2000) + quỹ đầu tư riêng. MC tận dụng kiến thức tương lai gom cổ phiếu rẻ. Tài sản 50-200 tỷ.
- Giai đoạn 4 (Ch.301-450): Đế chế BĐS thương mại + khu đô thị mới Q.7. Tài sản nghìn tỷ.
- Giai đoạn 5 (Ch.451-600): Khủng hoảng 2008 + thâu tóm tài sản giá rẻ. Mở rộng ngân hàng, quỹ đầu tư.
- Giai đoạn 6 (Ch.601-750): Quốc tế hóa + công nghệ + trùm tư bản hậu trường.

LOGIC NGHIỆP VỤ KINH DOANH (BẮT BUỘC):
- P&L (Profit & Loss): mỗi quyết định lớn phải có bảng lời/lỗ.
- OCF (Operating Cash Flow): MC ưu tiên dòng tiền hoạt động trước khi nghĩ đầu tư.
- Margin of Safety (Buffett): MC mua khi giá ≤70% giá trị thực.
- Economic Moat: MC xây "hào kinh tế" qua brand (Phở Minh) + chuỗi cung ứng + nhân sự trung thành.
- Quản lý rủi ro: KHÔNG đặt tất cả vốn vào 1 deal, KHÔNG vay quá 50% tài sản ròng.`;

async function main(): Promise<void> {
  const { data: n } = await s.from('novels').select('id,title').eq('slug', 'tro-lai-1995-de-che-bat-dong-san-hai-long-do').single();
  const novelId = n!.id as string;
  const { data: p } = await s.from('ai_story_projects').select('id').eq('novel_id', novelId).single();
  const projectId = p!.id as string;

  console.log(`▶ ${n!.title}`);

  // 1. Pause
  await s.from('ai_story_projects').update({ status: 'paused' }).eq('id', projectId);
  console.log('  ✓ paused');

  // 2. Wipe chapters
  const { count: chBefore } = await s.from('chapters').select('id', { count: 'exact', head: true }).eq('novel_id', novelId);
  await s.from('chapters').delete().eq('novel_id', novelId);
  console.log(`  ✓ wiped ${chBefore ?? 0} chapters`);

  // 3. Wipe memory tables
  const memTables = ['chapter_summaries', 'character_states', 'story_memory_chunks', 'beat_usage'];
  for (const t of memTables) {
    const { error } = await s.from(t).delete().eq('project_id', projectId);
    if (!error) console.log(`    ✓ cleared ${t}`);
  }

  // 4. Update world_description with hard rules + reset pointer
  const { error: updErr } = await s.from('ai_story_projects').update({
    world_description: NEW_WORLD_DESCRIPTION,
    current_chapter: 0,
  }).eq('id', projectId);
  if (updErr) {
    console.error('  ✗ update failed:', updErr.message);
    return;
  }
  console.log('  ✓ world_description updated with hard economic rules');
  console.log(`     (${NEW_WORLD_DESCRIPTION.split(/\s+/).length} words, was ~100w)`);
  console.log('  ✓ current_chapter reset to 0');

  // 5. Reactivate
  await s.from('ai_story_projects').update({ status: 'active' }).eq('id', projectId);
  console.log('  ✓ reactivated — cron will rewrite from chapter 1 with new constraints');
}
main().catch(console.error);
