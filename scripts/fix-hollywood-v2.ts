/**
 * Hollywood 1991 v2 — minimize Vietnamese-American identity to background.
 *
 * User feedback: "tốt nhất là ít đả động tới concept người Việt nhất có thể
 * mà tập trung ở Hollywood thôi"
 *
 * → Make this a pure Hollywood industry novel. MC is Vietnamese-American
 * by background but the story focus is 100% film craft + studio politics
 * + agent system. Family appears in 1-2 chapters/arc as cultural anchor
 * (pho dinner, mom worried about son's career, sister supports), no
 * cultural identity arc, no diaspora politics, no Asian-American themes.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const NEW_WORLD = `BỐI CẢNH: Năm 1991 Los Angeles. David Trần (tên VN: Trần Diệu Phong), 22 tuổi, vừa tốt nghiệp UCLA Film School. Trọng sinh từ năm 2025 — kiếp trước y là indie director kiệt sức qua đời ở tuổi 36 sau khi chạm Oscar shortlist. Kiếp này y có 34 năm "ký ức tương lai" về toàn bộ ngành điện ảnh Hollywood: box-office winners, Oscar mechanics, tech disruptions, agent career arcs, IP timing.

PHẠM VI TRUYỆN — 100% HOLLYWOOD:
Đây là truyện ngành điện ảnh Hollywood, KHÔNG phải truyện về cộng đồng người Việt. Trọng tâm 95% = filmmaking craft (kịch bản, đạo diễn, post-production), studio politics (Mouse Studios, Universe Studios, agent system), award circuit (Sundance, Cannes, Oscar), industry tech evolution. Yếu tố "MC gốc Việt" CHỈ là background CHI TIẾT NHỎ, KHÔNG phải cốt truyện chính.

CONTENT SAFETY (BẮT BUỘC):
TruyenCity là nền tảng giải trí — KHÔNG phải báo chính trị. Cấm tuyệt đối:
- Bất kỳ nội dung chính trị VN nào: chiến tranh, di cư tỵ nạn, 1975, cộng sản/tự do, VNCH, các tổ chức cộng đồng người Việt hải ngoại có tên thật (Người Việt Tự Do, Mặt Trận, Văn Bút...).
- Bất kỳ chủ đề "Asian-American identity" / "diaspora identity" / "racism in Hollywood" / "model minority" — KHÔNG phải arc của truyện này.
- "Little Saigon" / "Westminster" / "Orange County Vietnamese community" làm chỉ dấu chính trị — chỉ nhắc Orange County là địa điểm sinh sống bình thường.
- Family backstory liên quan chiến tranh / di cư chính trị — gia đình MC là gia đình Mỹ bình thường, đã sống ở Mỹ nhiều thế hệ hoặc sang du học rồi định cư.

GIA ĐÌNH (BACKGROUND ONLY — xuất hiện max 1-2 scene/arc):
- Cha: Trần Văn Đức, kỹ thuật viên ánh sáng tự do tại các phim trường Hollywood (lighting tech). Yêu nghề, ít nói. Gia đình đã sống ở California từ lâu, không có bối cảnh chính trị nào.
- Mẹ: Nguyễn Thị Hà, chủ tiệm nail thành công. Lo tài chính, thực dụng, ban đầu nghi ngờ con theo phim nhưng dần ủng hộ.
- Em gái: Trần Mỹ Linh, 18 tuổi, vừa nhập học UCLA. Sau này thành producer cho hãng MC.
- Gia đình ăn cơm Việt cuối tuần, mẹ nấu phở — đó là TẤT CẢ "Vietnamese-American flavor" cần có. KHÔNG đào sâu vào identity.

NHÂN VẬT CHÍNH — DAVID TRẦN:
- 22 tuổi (1991), tốt nghiệp UCLA Film School. Tên Việt là Trần Diệu Phong nhưng trong giới phim dùng "David Trần".
- 34 năm memory tương lai: chính xác box-office, Oscar voters, tech timing (DVD → streaming, CGI breakthrough years), career arcs hàng trăm ngành phim.
- Personality: đam mê phim, perfectionist, biết thuyết phục bằng emotion + concrete plan, học nhanh, đôi khi quá nguyên tắc.
- Identity: hoàn toàn Mỹ. Tiếng Anh native, văn hóa Mỹ. Tiếng Việt chỉ ở nhà với cha mẹ. KHÔNG có "identity crisis" hay "cultural search" arc.

POWER TRANSFER QUA PHIM (NON-COMBAT):
- MC KHÔNG combat. "Đối thủ" = audience emotional response (cried/laughed/changed worldview).
- MC ra phim QUEN THUỘC sớm hơn 5-10 năm so với lịch sử thật:
  • "Pulp Fiction" pattern (non-linear narrative) — MC ra từ 1992
  • "The Matrix" (1999) — MC ra "Glitch" 1996 cybertech
  • "Inception" (2010) — MC ra "Lucid" 2003 dream-within-dream
  • "Avatar" (2009) — MC ra "Faraway World" 2001 sớm 8 năm
  • "Parasite" (2019) — MC ra "Kẻ Trú" 2008 class struggle
- Mỗi phim = 1 mini-arc 20-40 chương: ý tưởng → kịch bản → casting → quay → post → release → award circuit → studio aftermath.

GOLDEN FINGER:
- 34 năm memory: industry data, Oscar voter demographics, agent career trajectories, tech timing.
- "Director Eye" passive: nhìn rushes biết shot keep / cut.
- LIMITATIONS: phải tự CRAFT phim (memory predict + structure, không tự generate). Phải build team, raise budget, navigate agent politics.

INDUSTRY CONTEXT 1991-2025:
- 1991-1995: indie boom (Miramax era), Sundance bùng nổ, agent system mạnh nhất
- 1996-2000: studio M&A, big-budget franchises, Pixar
- 2001-2010: blockbuster era, CGI commodity, China market emerges
- 2011-2020: streaming revolution (Netflix, Disney+), Marvel dominance
- 2021-2025: streaming saturation, return to theatrical, AI tools emerge

NHÂN VẬT FICTIONAL (KHÔNG dùng tên thật):
- Mouse Studios = analog to Disney (rival studio)
- Universe Studios = analog to Universal
- C.A.A = fictional super-agency
- Quentin Tarn = analog to Tarantino (đồng nghiệp / hơi thua MC)
- James Cam = analog to Cameron (đối thủ blockbuster)
- Steven Spie = analog to Spielberg (mentor figure)
- Paul T. And = analog to Paul Thomas Anderson (đồng nghiệp indie)
- Etc — fictional analogs cho mọi tên thật.

CẤU TRÚC 5 ARCS (600 chương):
- Arc 1 (1-120): Indie Sundance — MC ra phim debut, gây chấn động
- Arc 2 (121-240): Studio Indie — lập studio riêng, ra "Glitch" cybertech
- Arc 3 (241-360): Blockbuster — ra "Faraway World" trước Cameron
- Arc 4 (361-480): Streaming Pivot — chuyển platform khi streaming bùng
- Arc 5 (481-600): Đế Chế — IP đa ngành, Oscar lifetime, MC nghỉ hưu sáng tạo

CẤM TUYỆT ĐỐI:
- Nội dung chính trị VN / Mỹ. KHÔNG chiến tranh, di cư tỵ nạn, báo cộng đồng có tên thật.
- "Asian American identity" / "Vietnamese diaspora" / "Hollywood racism" làm cốt truyện.
- MC combat vật lý.
- Tên thật của đạo diễn/diễn viên Hollywood (dùng fictional analog).
- Mô tả lại nguyên si phim đã có thật. MC làm phim MỚI dựa trên TINH THẦN.`;

async function main(): Promise<void> {
  const { data: n } = await s.from('novels').select('id,title').eq('slug', 'trong-sinh-1991-dao-dien-david-tran-tai-hollywood').single();
  const novelId = n!.id as string;
  const { data: p } = await s.from('ai_story_projects').select('id').eq('novel_id', novelId).single();

  await s.from('ai_story_projects').update({
    world_description: NEW_WORLD,
  }).eq('id', p!.id as string);

  console.log(`✓ Hollywood 1991 v2 — Vietnamese identity reduced to background only`);
  console.log(`  ${NEW_WORLD.split(/\s+/).length} words`);
  console.log(`  Family appears max 1-2 scenes/arc as cultural anchor (phở dinner, mom worried)`);
  console.log(`  No identity arc, no diaspora politics, no Asian-American themes`);
  console.log(`  100% focus = Hollywood industry + filmmaking craft`);
}
main().catch(console.error);
