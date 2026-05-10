// Patch project's world_description to include `### NHÂN VẬT CHÍNH` section
// with `- Tên: Cố Diệp` line so extractMainCharacterNameFromWorld() finds it.

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const PROJECT_ID = '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c';

const worldDescription = `### THẾ GIỚI NỀN

Thiên Linh Đại Lục là đại lục cổ trang nơi ngự thú sư là tầng lớp chủ đạo. Civilization được xây quanh khả năng khế ước, nuôi dưỡng và tiến hóa pet. Rank ngự thú sư bằng social rank, gia tộc rank theo pet portfolio và territory.

Power system Ngự Thú Sư có 7 tier: Ngự Thú Đồ Tể (1-9 sub) → Sơ Cấp (1-9) → Trung Cấp (1-9) → Cao Cấp (1-9) → Đại Sư (1-9, tiến hóa ẩn) → Truyền Thuyết (1-3) → Thần Thoại (1-3).

Beast tier system: F (rác đường phố) → E → D → C → B → A → S (godbeast) → SS (primordial) → SSS (creator).

### NHÂN VẬT CHÍNH

- Tên: Cố Diệp
- Tuổi: 16 (kiếp này), 18 (kiếp trước Trái Đất 2126)
- Cảnh giới khởi điểm: Ngự Thú Đồ Tể tầng 3
- Bàn tay vàng: Vạn Linh Phổ — di sản tổ phụ Cố Lập Khải Đại Sư mất 5 năm trước, chỉ Cố Diệp dùng được vì xuyên hồn synergy. Khi Cố Diệp nhìn pet thấy HUD ẩn gồm cấp, thuộc tính, 3-5 tuyến tiến hóa khả thi với sequence feed concrete, thời gian, risk, final tier, cảnh báo nếu feed sai sequence sẽ mutate sai hoặc downgrade.
- Tính cách: lạnh đạm, ít lời, internal monologue tính toán. Public face thiếu niên 16 tuổi bình thường may mắn.
- Bí mật cốt lõi: xuyên hồn từ Trái Đất 2126, kiếp trước sinh viên năm cuối Học Viện Ngự Thú đang viết luận văn về Tuyến Tiến Hóa Ẩn dùng pattern matching và bio-genome simulation. Tuyệt đối giấu trong 700 chương đầu, không tiết lộ cho ai kể cả em gái.
- Pet khởi điểm: 0 — sẽ acquire Tro Bụi (slime cấp F kho gia tộc) ở chương 1, Cơ Niệm (mech bug cấp E) ở chương 20+, Lục Vũ (sparrow cấp F) ở chương 40+.

### GIA ĐÌNH HỌ CỐ

- Cố Lập Khải: tổ phụ, mất 5 năm trước, từng là Đại Sư cuối cùng của gia tộc, để lại Vạn Linh Phổ
- Cố Hành: bố Cố Diệp, Trung Cấp peak, mất tích 1 năm trước trong Bắc Vực, thực ra bị gài bẫy bởi đại tộc Bắc Châu (reveal arc 4)
- Lưu Tiêm Nhi: mẹ Cố Diệp, Sơ Cấp, đại sư phụ chế thuốc, mất tích cùng bố
- Cố Tiểu Đào: em gái Cố Diệp, 12 tuổi, chưa khế ước pet. Cố Diệp bảo vệ tuyệt đối. Lộ talent thông giao tâm linh ở arc 3.
- Cố Trường Khải: chú Cố Diệp, antagonist nội tộc arc 1, Sơ Cấp, ép Cố Diệp ký từ bỏ thừa kế và biển thủ kho gia tộc
- Cố Vân Kiếm: em họ, cháu của Cố Trường Khải, kiêu ngạo, rival nội tộc, redemption arc 2
- Hà Thúc: quản gia 60 tuổi, Sơ Cấp tầng thấp, trung thành tuyệt đối, biết gia phả và bí mật của tổ phụ nhưng không biết Vạn Linh Phổ
- Cố Già Tâm: trưởng lão 78 tuổi, Trung Cấp, trung lập ban đầu, dần ủng hộ Cố Diệp sau face-slap đầu tiên

### BẢN ĐỒ THẾ GIỚI

- Linh Châu Thành: thành lớn Trung Châu, Cố phủ ở khu Tây nam thành. Đầu game arc 1-3 chương 1-300.
- Bắc Vực: vùng đông lạnh, beast preserve, nơi bố mẹ Cố Diệp mất tích. Arc 4 chương 301-500.
- Trung Châu: thủ phủ đại lục, có cung đình và đại tộc thượng lưu. Arc 5 chương 501-700.
- Vạn Thú Lĩnh: núi thiêng cấm địa, nơi thần thú thượng cổ ngủ yên. Arc 6-7 chương 701-1000.

### TIỀN TỆ VÀ TÀI NGUYÊN

- Ngự thú tệ: 1, tiền mặt
- Điểm cống hiến: 1000, mua tài nguyên hiếm
- Resources: vật liệu tiến hóa, lõi năng lượng, mảnh vỡ tinh thạch

### LUẬT MODE LÃO LỤC

- Cố Diệp tuyệt đối GIẤU Vạn Linh Phổ. Không ai biết, kể cả em gái Cố Tiểu Đào, quản gia Hà Thúc, đệ tử trẻ.
- Pet evolution PHẢI làm trong bí mật ở kho riêng, hậu sơn, phòng kín. Không evolve công khai. Không ai chứng kiến quá trình.
- Pet đã evolve cấp X public chỉ ở cấp X-1 hoặc X-2. Cố Diệp bảo pet kìm chế.
- Cố Diệp chỉ tiết lộ pet evolved khi đã invincible trong context đó (đối thủ không thể phản kích trong window ngắn).
- Cultivation tiến nhanh lý giải bằng di sản tổ phụ truyền lại, thiên phú đặc biệt, cơ duyên — không để bị nghi xuyên hồn hay golden finger.
- Cấm cliffhanger kẻ lạ biết bí mật Cố Diệp, tin nhắn từ Trái Đất, thế lực ngoài đột nhiên đến tìm trừ khi master_outline đã ghi rõ.
- Đối thủ ngắt quãng 3-5 chương 1 đợt confront 1-2 chương. Không truy đuổi liên tục. Đợt confront xong là 2-3 chương breathing.
- Dopamine source ưu tiên phản ứng xã hội: bystander shock thầm, đối thủ kinh ngạc câm họng, NPC khen lén, giá pet tăng phi mã, gia tộc nội bộ ngầm phục. Không Cố Diệp tự khoe.
- Cố Diệp không đánh nhau trực tiếp. Combat luôn qua pet vs pet với Cố Diệp chỉ huy.
`;

async function main() {
  const { error } = await db
    .from('ai_story_projects')
    .update({ world_description: worldDescription, updated_at: new Date().toISOString() })
    .eq('id', PROJECT_ID);
  if (error) { console.error(error); process.exit(1); }
  console.log(`world_description patched (${worldDescription.length} chars). Now retry write-chapter-flash.ts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
