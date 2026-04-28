/**
 * Deep fix for "Đoạn Tuyệt: 5 Năm Sau Họ Quỳ Trước Văn Phòng"
 *
 * 10 existing chapters used "xu" as Vietnamese currency unit ("7.2 tỷ xu",
 * "500 triệu xu") — fake currency in a Vietnam-set urban business story.
 * Wipe + rebuild with hard VND rules in world_description.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const NEW_WORLD_DESCRIPTION = `BỐI CẢNH: Phượng Đô (tựa Hà Nội) năm 2024, thủ đô tài chính của Đại Nam Liên Bang. Mọi tiền tệ TRONG TRUYỆN dùng VND thực — đồng / nghìn đồng / triệu đồng / tỷ đồng — ngang giá VND của Việt Nam ngoài đời. TUYỆT ĐỐI KHÔNG dùng "nguyên" làm đơn vị tiền, KHÔNG dùng "xu" làm đơn vị tiền.

NHÂN VẬT CHÍNH:
- Trần Minh, 27 tuổi, con ruột của gia tộc Trần Phượng Đô — tập đoàn BĐS + tài chính 3 đời.
- Background: thất lạc 18 năm (lưu lạc miền núi với mẹ ruột do mâu thuẫn gia đình), được đón về năm 22 tuổi. Tốt nghiệp khoa Kinh tế Đại học Phượng Đô, MBA Singapore.
- 5 năm hi sinh thầm lặng vẫn bị đổ oan (con nuôi "Tiểu Mạch" vu khống biển thủ).
- Tính cách: pragmatic, tính toán cẩn thận, lạnh lùng nhưng có khả năng phân tích tài chính sắc bén.

GIA TỘC TRẦN PHƯỢNG ĐÔ:
- Trần Đại Lâm (cha): Chủ tịch tập đoàn, tin tưởng con nuôi mù quáng.
- Lý Hoa (mẹ): cảm tính, ưu tiên Tiểu Mạch.
- Trần Như Phượng (chị cả, 32t): Phó chủ tịch, lạnh nhạt với MC.
- Trần Như Lan (chị thứ hai, 30t): Giám đốc Marketing, tin lời Tiểu Mạch.
- Trần Như Tuyết (chị thứ ba, 29t): Trưởng phòng PR, "trà xanh" thứ hai.
- Tiểu Mạch (con nuôi, 25t): "trà xanh" giả tạo, biển thủ ngầm 50 tỷ đồng, ngoại tình thiếu gia tập đoàn đối thủ Vạn Thái.

KINH TẾ HIỆN ĐẠI 2024 — SỐ LIỆU CHUẨN (BẮT BUỘC TUÂN THỦ):
- Lương kỹ sư mới ra trường Phượng Đô: 15-25 triệu đồng/tháng
- Lương senior banker: 80-200 triệu đồng/tháng
- Tổng tài sản gia tộc top 50 VN: 10,000-50,000 tỷ đồng
- Doanh thu tập đoàn BĐS lớn: 5,000-20,000 tỷ đồng/năm
- Thương vụ M&A nhỏ: 100-500 tỷ đồng
- Thương vụ M&A lớn: 1,000-10,000 tỷ đồng
- Văn phòng hạng A Q.1 Hải Long Đô: 25-45 USD/m²/tháng (~600k-1.1 triệu đồng)
- Căn hộ chung cư cao cấp Phượng Đô: 80-200 triệu đồng/m²
- Biệt thự khu Royal City / Vincom: 30-100 tỷ đồng
- Xe Mercedes S-Class: 5-7 tỷ đồng
- Xe Range Rover SVAutobiography: 10-15 tỷ đồng

QUY TẮC SỐ LIỆU NHẤT QUÁN:
- Mọi giao dịch trong truyện phải có MATH ĐÚNG: số tiền chi không vượt số tiền hiện có.
- Khi nhắc đến "doanh thu/lợi nhuận", phải nêu CỤ THỂ con số (vd "doanh thu Q3: 2,400 tỷ đồng, lợi nhuận ròng 320 tỷ").
- Khi MC vạch trần biển thủ, phải có HÓA ĐƠN/BÁO CÁO/EMAIL CỤ THỂ làm chứng cứ.
- Khi MC mua lại tài sản, ngân hàng cho vay tối đa 70% giá trị tài sản thế chấp.

PROGRESSION 5 NĂM SAU ĐOẠN TUYỆT:
- Năm 1: Xây quỹ đầu tư riêng ("Minh Capital") với vốn 50 tỷ đồng (kiếm từ trading + đầu tư cá nhân).
- Năm 2: Quỹ tăng lên 500 tỷ. Bắt đầu thâu tóm cổ phiếu các công ty đối thủ gia tộc Trần.
- Năm 3: Quỹ 2,500 tỷ. Mua lại 1 tài sản cốt lõi của tập đoàn Trần (vd lô đất chiến lược).
- Năm 4: Quỹ 8,000 tỷ. Vạch trần Tiểu Mạch biển thủ qua audit độc lập.
- Năm 5: Quỹ 15,000 tỷ. Tập đoàn Trần Phượng Đô phá sản. Gia đình quỳ trước văn phòng MC.

ĐỊA DANH:
- Phượng Đô (tựa Hà Nội): trụ sở gia tộc Trần.
- Hải Long Đô (tựa TP. Hồ Chí Minh): nơi MC lập quỹ đầu tư riêng (xa khỏi gia tộc).
- Quận Phố Cổ, Q.Tây Hồ, Q.Cầu Giấy: khu trung tâm Phượng Đô.
- Đường Trần Hưng Đạo, đường Lý Thường Kiệt: phố tài chính.

ĐỐI THỦ + ĐỒNG MINH:
- Vạn Thái Tập Đoàn (đối thủ truyền kiếp gia tộc Trần): MC bí mật liên minh với họ trong M&A.
- Đại Phong Group (công nghệ): MC mua 5% cổ phần làm đòn bẩy.
- Khang Việt Bank: ngân hàng đầu tư của MC.
- Tiểu Mạch chạy trốn cùng tiền quỹ ở năm 4 — đến Macau hoặc Singapore.

CẤM TUYỆT ĐỐI:
- Dùng từ "nguyên" hoặc "xu" làm đơn vị tiền (chỉ "đồng/nghìn đồng/triệu đồng/tỷ đồng").
- MC tha thứ cho gia đình ruột — Personality Lock cứng, MC luôn lạnh lùng từ chối.
- Cảnh đánh nhau vật lý — đây là combat kinh tế, không phải combat võ thuật.

CẤU TRÚC 4 GIAI ĐOẠN (TUYẾN CHÍNH ~800 chương):
- Giai đoạn 1 (Ch.1-30): Tích tụ uất ức + Rời đi. MC bị vu oan biển thủ → ký giấy đoạn tuyệt → xách vali rời Phượng Đô đến Hải Long Đô.
- Giai đoạn 2 (Ch.31-200): Tự lập + Cú tát đầu tiên. Lập quỹ, đầu tư trading + crypto + cổ phiếu công nghệ. Năm 1-2 sau đoạn tuyệt.
- Giai đoạn 3 (Ch.201-500): Phản kích kinh tế + Phân hóa kẻ địch. Thâu tóm tài sản gia tộc Trần. Tiểu Mạch lộ đuôi. Năm 3-4.
- Giai đoạn 4 (Ch.501-800): Sụp đổ hoàn toàn + Trật tự mới. Gia tộc tán gia bại sản. Tiểu Mạch chạy trốn. MC trở thành ông trùm tư bản.

VÒNG LẶP CẢM XÚC (mỗi 5-10 chương):
- Bước 1: MC đạt thành tựu mới (chốt deal nghìn tỷ, mua tòa nhà, ra mắt sản phẩm)
- Bước 2: Cut sang góc nhìn gia đình ruột — bàng hoàng, ganh tị, hối hận
- Bước 3: Họ tìm đến MC quỳ gối xin lỗi, MC lạnh nhạt từ chối
- Bước 4: Bí mật quá khứ MC thầm hi sinh được hé lộ qua chứng cớ — gia đình càng đau lòng

HỒ SƠ BÍ MẬT MC THẦM HI SINH (rải dần qua arc):
- Khúc piano chị cả Như Phượng đoạt giải thực ra do MC sáng tác và đào tạo cô từ nhỏ.
- Hợp đồng cứu sống công ty năm 2019 do MC quỳ gối thuyết phục đối tác Singapore (chứ không phải cha).
- MC từng hiến máu nhóm O- cứu mẹ năm 2020 (mẹ không biết).
- Công thức M&A đưa tập đoàn lên top 10 do MC ẩn danh nghĩ ra (cha lấy công).
- MC từng dằn mặt 1 đối tác lừa đảo bố mẹ, lấy lại 200 tỷ — không ai biết.`;

async function main(): Promise<void> {
  const { data: n } = await s.from('novels').select('id,title').eq('slug', 'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong').single();
  const novelId = n!.id as string;
  const { data: p } = await s.from('ai_story_projects').select('id').eq('novel_id', novelId).single();
  const projectId = p!.id as string;

  console.log(`▶ ${n!.title}`);

  await s.from('ai_story_projects').update({ status: 'paused' }).eq('id', projectId);
  console.log('  ✓ paused');

  const { count: chBefore } = await s.from('chapters').select('id', { count: 'exact', head: true }).eq('novel_id', novelId);
  await s.from('chapters').delete().eq('novel_id', novelId);
  console.log(`  ✓ wiped ${chBefore ?? 0} chapters`);

  for (const t of ['chapter_summaries', 'character_states', 'story_memory_chunks', 'beat_usage']) {
    await s.from(t).delete().eq('project_id', projectId);
  }
  console.log('  ✓ cleared memory tables');

  await s.from('ai_story_projects').update({
    world_description: NEW_WORLD_DESCRIPTION,
    current_chapter: 0,
    total_planned_chapters: 800,
  }).eq('id', projectId);
  console.log(`  ✓ world_description rebuilt (${NEW_WORLD_DESCRIPTION.split(/\s+/).length} words)`);

  await s.from('ai_story_projects').update({ status: 'active' }).eq('id', projectId);
  console.log('  ✓ reactivated — cron will rewrite from chapter 1');
}
main().catch(console.error);
