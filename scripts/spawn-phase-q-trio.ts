/**
 * Spawn 3 sảng văn novels theo công thức Modern Knowledge Uplift + Văn Đạo:
 *
 * 1) Xuyên Việt Lãnh Chúa: Khai Cục Mở Mỏ Muối — di-gioi lord builder,
 *    MC xuyên thành lãnh chúa nghèo + bàn tay vàng "Thư Viện Trái Đất";
 *    ứng dụng kiến thức thế kỷ 21 (muối / sắt / quân đội / phát minh).
 *
 * 2) Hoang Cổ Bộ Lạc: Ta Làm Tù Trưởng Cách Mạng — di-gioi thời đại đồ đá,
 *    MC xuyên thành tù trưởng 100 người + golden finger "Hệ Thống Khai
 *    Sáng"; làm lửa, đồ gốm, nông nghiệp, kim loại, kiến lập bộ tộc.
 *
 * 3) RESET cf63c678 (Thiên Đạo Thư Viện) → re-seed theo Văn Đạo formula:
 *    MC nhà văn VN xuyên dị giới → viết tiểu thuyết kiếm hiệp Trái Đất,
 *    ai đọc thì lĩnh ngộ được chiêu thức (Cửu Âm Chân Kinh / Độc Cô Cửu
 *    Kiếm…) → Thiên Đạo công nhận, MC từ phế vật thành Văn Thánh.
 *
 * Cron pickup tự động via `production_enabled=true`.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const VN_DATE = (() => {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
})();

const SEEDS = [
  // ── 1. Lãnh chúa dị giới ────────────────────────────────────────────
  {
    kind: 'spawn' as const,
    title: 'Xuyên Việt Lãnh Chúa: Khai Cục Mở Mỏ Muối',
    slug: 'xuyen-viet-lanh-chua-khai-cuc-mo-mo-muoi',
    genre: 'di-gioi' as const,
    main_character: 'Lê Hữu Tuấn',
    description: 'Kỹ sư cơ khí Việt 28 tuổi Lê Hữu Tuấn tử vong vì tai nạn xưởng — mở mắt xuyên thành tử tước thứ ba của lãnh địa Sương Mộc, nơi 3.000 dân chết đói vì mỏ muối cạn kiệt và thuế quân vương đè bẹp. Hắn có bàn tay vàng "Thư Viện Trái Đất" — tra cứu được toàn bộ kiến thức công nghệ thế kỷ 21. Từ mỏ muối Solvay đến quy trình luyện thép Bessemer, từ thuốc súng đen đến canh tác ngô khoai, hắn đem từng phát minh nhỏ vào dị giới võ lực mạnh nhưng công nghiệp lạc hậu. Bảy lãnh chúa lân bang ban đầu khinh thường gã tử tước đói rách — đến khi quân Sương Mộc cầm súng hỏa mai bắn ngã hiệp sĩ giáp toàn thân từ cách 200 bước, cả vương quốc bắt đầu run sợ.',
    world_description: `Đại lục Aurelius, đại lục cổ phong nguyên thủy hệ Tây Âu thế kỷ 13: bảy đại vương quốc + hàng trăm lãnh chúa phong kiến, võ lực hệ thống cấp bậc (Hạ Đẳng → Trung Đẳng → Cao Đẳng → Đại Sư → Truyền Thuyết). Hiệp sĩ Cao Đẳng có thể chém vỡ tảng đá; Đại Sư bay được trên không 30 mét; Truyền Thuyết chỉ có 12 vị toàn đại lục, gần như thần thoại. Tuy võ lực mạnh, công nghệ cực kỳ lạc hậu: muối còn nấu nồi nhôm thủ công, sắt vẫn rèn bằng búa tay, thuốc súng chưa ai phát minh, lịch năm còn dùng đếm bằng pha trăng. Mỗi lãnh địa = 1 đơn vị phong kiến, đóng thuế cho quốc vương, tự nuôi quân, tự lo sinh kế.

MC Lê Hữu Tuấn (28t kiếp trước kỹ sư cơ khí Vingroup, chết do tai nạn xưởng lúc đang test máy CNC). Xuyên thành Bá tước Tuấn của Sương Mộc — lãnh địa nhỏ cấp ba nằm ở rìa đông bắc vương quốc Vermillion, 3000 dân, kinh tế dựa vào mỏ muối duy nhất nhưng đã cạn kiệt 80% sản lượng do khai thác cổ điển không hiệu quả. Lãnh địa nợ vương quốc 5000 đồng vàng thuế năm trước, hạn tới thu năm sau hoặc bị thu hồi.

GOLDEN FINGER: "Thư Viện Trái Đất Cao Cấp" — UI điện thoại trên cổ tay MC, search bằng giọng nói tiếng Việt, tra ra công thức hóa học, bản vẽ kỹ thuật, sơ đồ tổ chức quân đội, sách binh pháp Tôn Tử, bản đồ thế giới Trái Đất, công thức nấu ăn... mọi kiến thức Wikipedia + Google + ChatGPT hợp lại. Limit: chỉ xem được, không vật chất hóa. Mỗi lần search tiêu tốn 1-5 điểm Mana (MC khởi đầu 100 điểm, hồi 10 điểm/ngày). Search rồi MC phải tự tay làm — kiến thức không tự nó manifest.

Bí mật MC: hắn còn nhớ rõ điện thoại Samsung kiếp trước, cuộc đời 28 năm văn minh hiện đại, vợ Phạm Thu Hương đợi ở Việt Nam (kiếp trước MC chuẩn bị cưới khi tai nạn). Hắn KHÔNG nói với ai về kiếp trước — chỉ giả vờ "tỉnh ngộ sau cơn sốt nguy kịch", thiên hạ tưởng hắn được thần ban điềm.

Phase 1 playground (ch.1-100): lãnh địa Sương Mộc — mỏ muối, lò rèn cũ, ruộng đất bỏ hoang, 3000 dân nghèo. MC dùng kiến thức Solvay process cải tiến mỏ muối, áp dụng kỹ thuật luyện thép Bessemer mini-scale, dạy nông dân kỹ thuật canh tác luân canh + phân chuồng đúng cách. Đối thủ local: bá tước Wolfe lân bang (ham giàu, muốn cướp mỏ muối), quân vương Vermillion (đòi nợ thuế khắc nghiệt).

Phase 2 (ch.100-300): MC dựng quân đội kiểu Roman + thuốc súng đen + súng hỏa mai. Đánh bại liên quân 5 lãnh chúa nhỏ tấn công. Mở rộng lãnh địa lên 10.000 dân. Đối thủ: thái tử Vermillion (ghen tị MC), giáo hội Aurelius (cho rằng phát minh MC là tà thuật).

Phase 3 (ch.300-600): MC thành công tước, nắm trong tay đội quân 5000 súng hỏa mai + 200 pháo binh. Lập "Đế Chế Tuấn" độc lập, chinh phục 3 vương quốc lân bang. Phát minh đường sắt hơi nước nguyên thủy, máy in, hệ thống ngân hàng vàng-bạc. Đối thủ: 7 đại vương quốc liên minh chống MC, 12 vị Truyền Thuyết bắt đầu chú ý.

Phase 4 (ch.600-1000): cosmic reveal — Aurelius là test field của "Thiên Cộng Đồng Văn Minh", các vị Truyền Thuyết là quan sát viên. MC pass test bằng cách kiến lập văn minh công nghiệp + tôn trọng con người. Endgame: MC thăng cấp thành Văn Minh Quản Lý, mở cổng cosmic, quay về cứu Phạm Thu Hương kiếp trước.`,
    total_planned_chapters: 1000,
  },

  // ── 2. Hoang cổ bộ lạc ──────────────────────────────────────────────
  {
    kind: 'spawn' as const,
    title: 'Hoang Cổ Bộ Lạc: Ta Làm Tù Trưởng Cách Mạng',
    slug: 'hoang-co-bo-lac-ta-lam-tu-truong-cach-mang',
    genre: 'di-gioi' as const,
    main_character: 'Phạm Quang Vinh',
    description: 'Nhà khảo cổ học VN 30 tuổi Phạm Quang Vinh ngã xuống hố khai quật, mở mắt xuyên thành tù trưởng Linh Tước — bộ lạc 80 người nguyên thủy sống bằng săn bắn hái lượm giữa rừng nguyên sinh đại lục Tân Thế. Bộ lạc đang sắp diệt vong vì đói rét, thú dữ và bộ lạc Hắc Hổ láng giềng săn người. Hắn có "Hệ Thống Khai Sáng Văn Minh" — bảng task tiến hóa từ Đồ Đá → Đồ Đồng → Đồ Sắt → Phong Kiến → Công Nghiệp, mỗi lần hoàn thành milestone được tặng điểm tri thức quy đổi ra công thức cụ thể. Từ chế lửa bằng đá đánh lửa, dệt vải gai, nuôi heo rừng, đến trồng lúa nước và rèn dao đồng, Quang Vinh dẫn dắt 80 dân man rợ trở thành bộ tộc thần thoại chấn động cả đại lục.',
    world_description: `Đại lục Tân Thế (nguyên thủy parallel-Earth Pleistocene): khí hậu mưa nhiều, rừng nguyên sinh phủ 80%, hệ động vật tiền sử (hổ răng kiếm, voi mammoth, gấu hang động) + linh thú (linh trùng, hỏa lang, băng báo phun ma pháp tiền-chân khí). Loài người chia thành 500-700 bộ lạc nhỏ rải rác, mỗi bộ lạc 30-200 người. Văn minh ở tầng Đồ Đá: chưa biết nông nghiệp, đốt phá rừng để săn, không có chữ viết, không có lịch. Tù trưởng cha truyền con nối hoặc đấu sức.

Bộ lạc Linh Tước (gốc Việt cổ ngữ "linh chim" — totem chim sẻ vàng): 80 người, lãnh thổ thung lũng Sông Bạc rộng 5 km², cách bộ lạc địch Hắc Hổ chỉ 8 km. Trước MC xuyên qua, tù trưởng cũ vừa chết vì gấu tấn công, bộ lạc đang loạn lãnh đạo. MC nhận thân phận con trai trưởng tù trưởng (15 tuổi trong dị giới, ý thức Phạm Quang Vinh 30 tuổi kiếp trước).

GOLDEN FINGER: "Hệ Thống Khai Sáng Văn Minh" — bảng UI hiện ra trong tâm trí MC, hiển thị 5 tầng cấp văn minh (Đồ Đá → Đồ Đồng → Đồ Sắt → Phong Kiến → Công Nghiệp), mỗi tầng có 8-15 milestone (vd "Phát minh lửa bằng đá", "Trồng lúa nước thành công", "Luyện được đồng đỏ"). Hoàn thành mỗi milestone tặng 100-1000 điểm Tri Thức + 1 công thức cụ thể (bản vẽ + hướng dẫn step-by-step bằng tiếng Việt). MC có thể đổi điểm Tri Thức ra "Sách Kỹ Năng" (vd "Kỹ Năng Đánh Sắt Sơ Cấp 500 điểm", "Kỹ Năng Y Thuật Cổ Đại 2000 điểm") — đọc sách 1 giờ là biết kỹ năng đó level sơ cấp ngay lập tức.

Bí mật MC: kiếp trước Phạm Quang Vinh là TS Khảo cổ học ĐHQG-HCM, chết khi đang khai quật di chỉ Đông Sơn rơi xuống hố sâu. Hắn nhớ rõ cuộc đời 30 năm Việt Nam, đặc biệt là kiến thức về kỹ thuật cổ đại (chế đồng Đông Sơn, lúa nước, dệt vải, đan giỏ) — kết hợp Hệ Thống làm MC siêu nhanh.

Phase 1 playground (ch.1-100): bộ lạc Linh Tước 80 dân — săn bắn hái lượm, hang động, sông Bạc. MC chế lửa, làm cung tên đầu đá nhọn, dệt vải gai, nuôi heo rừng, trồng khoai củ. Đối thủ local: bộ lạc Hắc Hổ (200 dân, mạnh hơn, săn người Linh Tước làm thực phẩm + nô lệ), gấu hang động giết tù trưởng cũ.

Phase 2 (ch.100-300): bộ lạc 500 dân — nông nghiệp lúa nước thành công, luyện được đồng đỏ, dao + giáo đồng, dệt vải lụa tơ tằm. MC đánh bại Hắc Hổ, sáp nhập 200 dân. Đối thủ: liên minh 5 bộ lạc lân bang tổ chức tấn công, linh thú khổng lồ (mammoth + gấu trắng).

Phase 3 (ch.300-600): liên minh bộ lạc Linh Tước 2.000 dân — đồ sắt, vũ khí thép, áo giáp, xe ngựa, chữ viết Latin hóa cổ ngữ, lịch âm dương. MC kiến lập "Vương Quốc Linh Việt" sơ khai. Đối thủ: đế quốc Hắc Long (bộ tộc đầu tiên ở tầng Đồ Đồng cách 200 km), giáo phái man rợ thờ linh thú.

Phase 4 (ch.600-1000): cosmic reveal — Tân Thế là test field của "Thiên Đạo Văn Minh Selection", các bộ lạc qua được tầng Công Nghiệp sẽ được mời vào "Tinh Hà Liên Minh". MC pass test bằng cách kiến lập triều đại đầu tiên, văn hóa Linh Việt lan toàn đại lục. Endgame: MC mở cổng cosmic, lưu lại lịch sử cho người Việt kiếp trước.`,
    total_planned_chapters: 1000,
  },

  // ── 3. RESET Thiên Đạo Thư Viện → re-seed Văn Đạo formula ───────────
  {
    kind: 'reset' as const,
    project_id: 'cf63c678-a0b5-4df2-ae1c-6cb20210f589',
    novel_id: '08c72bc6-982f-418e-b754-7f1fe0466112',
    title: 'Văn Đạo Phong Thần: Ta Viết Tiểu Thuyết, Cả Dị Giới Lĩnh Ngộ Tuyệt Kỹ',
    slug: 'van-dao-phong-than-ta-viet-tieu-thuyet-ca-di-gioi-linh-ngo-tuyet-ky',
    genre: 'di-gioi' as const,
    main_character: 'Đỗ Minh Quân',
    description: 'Đỗ Minh Quân, nhà văn 26 tuổi VN bị xe tải tông chết khi vừa hoàn thành bản thảo tiểu thuyết kiếm hiệp đầu tay — mở mắt xuyên dị giới tu chân, thân phận đệ tử ngoại môn cấp thấp nhất của tông môn Vạn Hoa, võ học hệ phế. Thiên Đạo công nhận tài năng văn chương của Quân, trao ban "Văn Đạo Pháp Tắc": hắn viết tiểu thuyết kiếm hiệp Trái Đất (Kim Dung / Cổ Long / Hoàng Dị) trên giấy dị giới — ai đọc nhập tâm sẽ lĩnh ngộ chiêu thức trong đó thành công phu thực sự. Một đệ tử đọc "Tiểu Lý Phi Đao" lĩnh ngộ "Phi Đao Tuyệt Kỹ" giết Trưởng lão. Một quận chúa đọc "Anh Hùng Xạ Điêu" thành Hoàng Dung tái thế. Đến khi tu sĩ Tử Cấm cảnh đọc "Kim Bình Mai", cả Tu Chân Giới chấn động, Thiên Đạo phong Đỗ Minh Quân làm Văn Thánh.',
    world_description: `Tu Chân Giới Vạn Hoa Đại Lục: 9 đại châu, hơn 3000 tông môn, hệ thống tu luyện chia 9 cảnh giới (Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Tử Cấm). Mỗi cảnh giới chia 9 tầng. Tu sĩ Hóa Thần coi như đại nhân vật, Tử Cấm có 7 vị toàn đại lục, gần như thần thoại. Tông môn Vạn Hoa (chính phái cấp hai): 5000 đệ tử, gồm nội môn (mạnh) + ngoại môn (yếu cấp Luyện Khí), chuyên về kiếm tu.

MC Đỗ Minh Quân (26t kiếp trước nhà văn tự do VN, tốt nghiệp Văn Khoa ĐHQG-HCM, viết tiểu thuyết kiếm hiệp đầu tay "Lưu Bạch Kiếm" vừa nộp NXB thì bị xe tải tông chết). Xuyên thành đệ tử ngoại môn Đỗ Minh Quân (16t) tông Vạn Hoa, võ học hệ phế (tư chất tu luyện hạ đẳng), bị bắt nạt thường xuyên. Trước khi MC xuyên qua, bản gốc Quân từng tự tử do bị nhục nhã.

GOLDEN FINGER: "Văn Đạo Pháp Tắc" — Thiên Đạo công nhận tài năng văn chương của MC. Cơ chế:
  • MC viết tiểu thuyết bằng bút lông trên giấy dị giới (giấy Văn Hoa). Văn chương phải đạt chuẩn (>50K chữ, có nhân vật, có cốt truyện, có chiêu thức võ học cụ thể).
  • Ai đọc tiểu thuyết của MC với thái độ chân thành (≥3 giờ liên tục) → Thiên Đạo cho lĩnh ngộ 1-3 chiêu thức trong đó thành công phu thực sự, level tùy thuộc tư chất reader.
  • Reader càng giỏi tu luyện → lĩnh ngộ càng cao tầng. Tu sĩ Tử Cấm đọc "Cửu Âm Chân Kinh" có thể đắc toàn bộ pháp môn.
  • Mỗi reader lĩnh ngộ MC nhận "Văn Vận" (điểm tích lũy) — quy đổi ra cảnh giới tu luyện cho chính MC. 100 Văn Vận = 1 tầng. 9000 Văn Vận = 1 cảnh giới.
  • Limit: MC chỉ viết được tác phẩm hoàn chỉnh mỗi 1-3 tháng. Mỗi tác phẩm chỉ truyền dạy 1 hệ kiếm pháp / 1 pháp môn cụ thể, không tham lam.
  • Bí mật: MC có thể viết MỌI tác phẩm Kim Dung / Cổ Long / Hoàng Dị từ kiếp trước (kiếp trước Quân là fan cuồng kiếm hiệp, thuộc lòng nội dung 30+ bộ).

Bí mật MC: kiếp trước viết "Lưu Bạch Kiếm" có nhân vật MC tên Lưu Tử Cảnh — một quận chúa Vạn Hoa Đại Lục có tên thật là Lưu Tử Cảnh đang cùng thân phận. Thiên Đạo dường như "tạo dị giới theo mô tả bản thảo của Minh Quân kiếp trước". MC nghi ngờ dị giới này là sản phẩm văn học của chính mình — câu hỏi trung tâm: liệu hắn là tác giả hay là nhân vật?

Phase 1 playground (ch.1-100): tông Vạn Hoa — phong cảnh tu chân, đại đệ tử nội môn bắt nạt, MC viết "Tiểu Lý Phi Đao" tặng sư muội Hồ Diệp. Hồ Diệp đọc → lĩnh ngộ "Phi Đao Tuyệt Kỹ" → vô địch đệ tử ngoại môn. Đối thủ: đại đệ tử Vương Lăng (nội môn, ham vợ Hồ Diệp).

Phase 2 (ch.100-300): MC viết "Tuyệt Đại Song Kiêu" và "Sở Lưu Hương" — 3 trưởng lão đọc lĩnh ngộ "Đạo Soái Quyết" thành tông chủ phó. MC từ phế vật Luyện Khí tầng 3 lên Trúc Cơ đỉnh phong. Tông Vạn Hoa thăng cấp thành chính phái cấp một. Đối thủ: tà phái Hắc Phong (cướp bản thảo MC), kiếm tu Lý Lăng Vân.

Phase 3 (ch.300-600): MC viết "Tiếu Ngạo Giang Hồ", "Thần Điêu Hiệp Lữ", "Anh Hùng Xạ Điêu" — toàn đại lục đọc, MC lên Kim Đan cảnh, được phong "Đệ Nhất Văn Hào". Quận chúa Lưu Tử Cảnh thành nữ chính. Đối thủ: ma giáo Vạn Hoa Cốc, cấm thuật Tử Cấm.

Phase 4 (ch.600-1000): MC viết "Kim Bình Mai" — Thiên Đạo phong Văn Thánh, MC lên Tử Cấm cảnh. Cosmic reveal: dị giới này đúng là sản phẩm bản thảo "Lưu Bạch Kiếm" kiếp trước của Minh Quân, và đang có dị giới khác đang viết MC làm nhân vật. Endgame: MC phá vỡ vòng lặp Văn Đạo, tự do giữa các tầng dị giới.`,
    total_planned_chapters: 1000,
  },
];

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function resetChildTables(novelId: string, projectId: string) {
  // Delete all chapter-derived rows. CASCADE handles most, but explicit
  // delete keeps the action clear.
  const tables = [
    { table: 'chapters', col: 'novel_id', val: novelId },
    { table: 'chapter_summaries', col: 'project_id', val: projectId },
    { table: 'character_states', col: 'project_id', val: projectId },
    { table: 'arc_plans', col: 'project_id', val: projectId },
    { table: 'story_memory_chunks', col: 'project_id', val: projectId },
    { table: 'plot_threads', col: 'project_id', val: projectId },
    { table: 'world_rules_index', col: 'project_id', val: projectId },
    { table: 'beat_usage', col: 'project_id', val: projectId },
    { table: 'character_arcs', col: 'project_id', val: projectId },
    { table: 'voice_fingerprints', col: 'project_id', val: projectId },
    { table: 'mc_power_states', col: 'project_id', val: projectId },
    { table: 'world_locations', col: 'project_id', val: projectId },
    { table: 'location_bibles', col: 'project_id', val: projectId },
    { table: 'project_daily_quotas', col: 'project_id', val: projectId },
    { table: 'story_synopsis', col: 'project_id', val: projectId },
    { table: 'cost_tracking', col: 'project_id', val: projectId },
  ];
  for (const t of tables) {
    await s.from(t.table).delete().eq(t.col, t.val);
  }
}

async function applySpawn(seed: typeof SEEDS[0], ownerId: string): Promise<string | null> {
  if (seed.kind === 'reset') {
    console.log(`\n━━ RESET project ${seed.project_id} → "${seed.title}" ━━`);
    await resetChildTables(seed.novel_id, seed.project_id);
    // Update novel + project rows in place.
    await s.from('novels').update({
      title: seed.title,
      slug: seed.slug,
      description: seed.description,
      genres: [seed.genre],
      status: 'Đang ra',
      chapter_count: 0,
      total_chapters: null,
    }).eq('id', seed.novel_id);
    await s.from('ai_story_projects').update({
      genre: seed.genre,
      main_character: seed.main_character,
      world_description: seed.world_description,
      total_planned_chapters: seed.total_planned_chapters,
      current_chapter: 0,
      status: 'active',
      pause_reason: null,
      setup_stage: 'idea',
      setup_stage_attempts: 0,
      setup_stage_error: null,
      story_outline: null,
      master_outline: null,
      story_bible: null,
      temperature: 1.0,
      target_chapter_length: 2800,
      ai_model: 'gemini-3.1-flash-lite',
      style_directives: {
        disable_chapter_split: true,
        production_enabled: true,
        production_daily_chapter_quota: 50,
        require_full_chapter_blueprint: false,
      },
    }).eq('id', seed.project_id);
    return seed.project_id;
  }

  // Fresh spawn
  const exist = await s.from('novels').select('id').eq('slug', seed.slug).maybeSingle();
  if (exist.data) {
    console.log(`  ⚠ Slug ${seed.slug} exists — skip`);
    return null;
  }
  const novel = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novel.error || !novel.data) throw new Error(`novel: ${novel.error?.message}`);

  const project = await s.from('ai_story_projects').insert({
    novel_id: novel.data.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'active',
    pause_reason: null,
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 1.0,
    target_chapter_length: 2800,
    ai_model: 'gemini-3.1-flash-lite',
    style_directives: {
      disable_chapter_split: true,
      production_enabled: true,
      production_daily_chapter_quota: 50,
      require_full_chapter_blueprint: false,
    },
  }).select('id').single();
  if (project.error || !project.data) throw new Error(`project: ${project.error?.message}`);
  console.log(`  ✓ ${project.data.id} | ${seed.title.slice(0, 60)}`);
  return project.data.id;
}

async function seedQuota(projectId: string) {
  const existing = await s.from('project_daily_quotas').select('vn_date').eq('project_id', projectId).eq('vn_date', VN_DATE).maybeSingle();
  if (existing.data) return;
  await s.from('project_daily_quotas').insert({
    project_id: projectId,
    vn_date: VN_DATE,
    target_chapters: 50,
    written_chapters: 0,
    status: 'active',
  });
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase Q trio spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const seed of SEEDS) {
    console.log(`${seed.kind === 'reset' ? '[RESET]' : '[SPAWN]'} ${seed.title}`);
    console.log(`  slug: ${seed.slug}`);
    console.log(`  genre: ${seed.genre} | MC: ${seed.main_character}`);
    console.log(`  desc: ${seed.description.length} chars | world: ${seed.world_description.length} chars`);
  }

  if (!apply) {
    console.log('\nDRY RUN. Pass --apply to execute.\n');
    return;
  }

  const ownerId = await getOwnerId();
  const ids: string[] = [];
  for (const seed of SEEDS) {
    const id = await applySpawn(seed, ownerId);
    if (id) {
      await seedQuota(id);
      ids.push(id);
    }
  }

  console.log(`\n✓ ${ids.length} project(s) active + production_enabled. Quota seeded for ${VN_DATE}.`);
  console.log('Project IDs:');
  for (const id of ids) console.log(`  ${id}`);
  console.log('\nCron sẽ pickup tick sau (mỗi 5 min). Admin: /admin/production-toggle');
}

main().catch((e) => { console.error(e); process.exit(1); });
