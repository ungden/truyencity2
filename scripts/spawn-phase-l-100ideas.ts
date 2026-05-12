/**
 * Phase L: Spawn 100 new novels covering 16 top-level genres.
 *
 * Việt-hoá option 2: historical → VN dynasties, modern → VN cities + culture,
 * tu tiên giới generic fictional, cross-canon dong-nhan giữ anime universal.
 *
 * Pause_reason: 'phase_l_100ideas_2026-05-11'
 *
 * Usage: ./node_modules/.bin/tsx scripts/spawn-phase-l-100ideas.ts [--apply]
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface NovelSeed {
  title: string;
  slug: string;
  genre: string;
  main_character: string;
  description: string;
  world_description: string;
  total_planned_chapters: number;
}

const SEEDS: NovelSeed[] = [
  // ── TIEN-HIEP (10) ──
  {
    title: 'Sư Tôn, Ngài Đừng Khóc, Đệ Tử Sẽ Chậm Tu Luyện Lại',
    slug: 'su-ton-ngai-dung-khoc-de-tu-se-cham-tu-luyen-lai',
    genre: 'tien-hiep',
    main_character: 'Diệp Hàn',
    description: 'Diệp Hàn thiên tài luyện khí tốc độ kinh khủng — mỗi lần đột phá sư tôn lại khóc vì "đệ tử cuối cùng lại nhanh quá". MC buộc phải giả vờ ngu để giữ sư tôn lại tông môn.',
    world_description: 'Đại lục tu tiên fictional Vạn Hà. MC Diệp Hàn (17t) nhập Thanh Vân Tông — sư tôn Bạch Linh Chân Nhân vốn cô đơn vì 3 đệ tử trước đều đột phá quá nhanh rồi rời tông tự lập phái. MC phát hiện sự thật, quyết định giả vờ chậm tu, gây hài hước. Sảng văn: mỗi lần MC giả vờ thất bại nhưng vẫn lén unlock cảnh giới mới. Đối thủ: Hắc Phong Tông + cổ tộc đại địch arc 5.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Mở Quán Phở Trong Tu Tiên Giới, Khách Quen Là Cổ Đại Đại Năng',
    slug: 'ta-mo-quan-pho-trong-tu-tien-gioi-khach-quen-la-co-dai-dai-nang',
    genre: 'tien-hiep',
    main_character: 'Nguyễn Vũ',
    description: 'Nguyễn Vũ xuyên không tu tiên giới với hệ thống nấu ăn — phở Hà Nội giúp tu sĩ đột phá cảnh giới. Trưởng lão Nguyên Anh xếp hàng lén mua gói phở.',
    world_description: 'Đại lục tu tiên Cửu Vực fictional. MC Nguyễn Vũ (24t đầu bếp phở SG) xuyên không vào thân thể đệ tử ngoại môn Thanh Phong Tông với hệ thống nấu ăn. Phở MC nấu cho tu sĩ tăng tu vi 10% sau 1 bát. Trưởng lão Nguyên Anh + cảnh giới Hóa Thần đều lén tới quán. MC mở rộng menu — bún bò, bánh mì, cà phê sữa đá. Endgame: cosmic-tier đại năng tìm MC làm quốc bếp.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cẩu Trong Thiên Đạo Thư Viện, Ta Đợi Tận Thế Đạo Hữu',
    slug: 'cau-trong-thien-dao-thu-vien-ta-doi-tan-the-dao-huu',
    genre: 'tien-hiep',
    main_character: 'Lý Trầm',
    description: 'Lý Trầm chọn ẩn cư Thiên Đạo Thư Viện 500 năm đọc sách. Mỗi 50 năm có một đại năng đến hỏi đường — MC trả lời lười biếng, người ta tưởng là thiên cơ.',
    world_description: 'Đại lục Cửu Châu fictional. MC Lý Trầm (25t kiếp trước thư viện viên hiện đại) xuyên không thành quản thủ Thiên Đạo Thư Viện — tàng thư các cosmic-tier ẩn núi Vạn Thư. MC quyết cẩu 500 năm, đọc hết 10 triệu cuốn cổ thư. Trong 500 năm chỉ có 10 đại năng tới hỏi đường — MC trả lời lười + sarcastic, đại năng tưởng thiên cơ. Endgame: cosmic invasion từ outer realm, MC mới buộc ra cửa.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Có Một Mảnh Ruộng, Trồng Ra Thượng Cổ Cấm Vật',
    slug: 'ta-co-mot-manh-ruong-trong-ra-thuong-co-cam-vat',
    genre: 'tien-hiep',
    main_character: 'Trần Bình',
    description: 'Trần Bình nông dân tu tiên trồng linh thảo bằng kỹ thuật canh tác hiện đại. Hạt giống đột biến → thượng cổ cấm vật. Cổ tộc xếp hàng quỳ mua.',
    world_description: 'Đại lục Linh Vực fictional. MC Trần Bình (28t kiếp trước nông dân Đồng Tháp) xuyên không thành đệ tử ngoại môn — phụ trách linh dược ruộng. MC áp dụng kỹ thuật canh tác hiện đại (NPK, ghép cây, lai tạo). Linh thảo đột biến cosmic-tier — thượng cổ cấm vật hiếm hoi. Cổ tộc Lý gia, Trần gia, Hắc Long tộc tới quỳ mua. MC mở "Trần Gia Nông Trại" cosmic-tier endgame.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Lão Tổ Ta Chỉ Có 8 Tuổi',
    slug: 'lao-to-ta-chi-co-8-tuoi',
    genre: 'tien-hiep',
    main_character: 'Tô Tiểu Mạch',
    description: 'Tô Tiểu Mạch 8t bị tổ tiên giáng hồn vào thân — gia tộc bối rối vì lão tổ ngày nào cũng đòi kẹo. Khi địch tới, đứa bé bóp chết Hợp Thể kỳ bằng một tay.',
    world_description: 'Đại lục Hỗn Nguyên fictional. Tô gia trăm năm bị Hắc Phong Cổ Tộc truy sát — Lão Tổ Tô Mạc Sơn cosmic-tier mất tích 200 năm. Tô gia hậu duệ thứ 7 đời (8t) Tô Tiểu Mạch bị lão tổ giáng hồn — body trẻ con + memory cosmic. Gia tộc bối rối: lão tổ đòi kẹo, khóc nhè, nhưng đánh bại Hợp Thể kỳ bằng một ngón tay. Comedy + sảng văn. Endgame: Hắc Phong cosmic-tier xâm nhập, MC reveal full power.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mở Tiệm Net Trong Tu Tiên Giới, Tu Sĩ Đại Năng Đến Cày Game',
    slug: 'mo-tiem-net-trong-tu-tien-gioi-tu-si-dai-nang-den-cay-game',
    genre: 'tien-hiep',
    main_character: 'Phạm Tuấn',
    description: 'Phạm Tuấn mang laptop xuyên không — mở quán net 12 máy giữa tu tiên giới. Đại năng Nguyên Anh nghiện Liên Minh, đệ tử Trúc Cơ nghiện PUBG. Tông môn chiến đấu giải quyết bằng đấu rank.',
    world_description: 'Đại lục Vạn Linh fictional. MC Phạm Tuấn (26t kỹ sư IT) xuyên không kèm túi không gian chứa 12 laptop gaming + máy phát điện vĩnh viễn (golden finger). Mở "Vạn Linh Net Quán" cạnh Thanh Vân Tông. Đại năng Nguyên Anh + Hóa Thần lén tới cày Liên Minh Huyền Thoại. Tu sĩ Trúc Cơ nghiện PUBG. Tông môn chiến đấu giải quyết bằng đấu rank thay vì pháp bảo. Endgame: cosmic-tier đại năng challenge MC 1v1 LoL.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bắt Đầu Triệu Hoán Long Tổ, Sao Ngài Lại Gọi Ta Sư Phụ?',
    slug: 'bat-dau-trieu-hoan-long-to-sao-ngai-lai-goi-ta-su-phu',
    genre: 'tien-hiep',
    main_character: 'Hoàng Phong',
    description: 'Hoàng Phong nhận hệ thống triệu hoán cosmic-tier nhưng bug — Long Tổ ra lò xong quỳ gọi MC sư phụ. MC clueless: "Ta chưa dạy gì." Long Tổ: "Tâm pháp ngài nói trong mơ đêm qua."',
    world_description: 'Đại lục Long Vực fictional. MC Hoàng Phong (22t đệ tử ngoại môn Thanh Long Tông) nhận hệ thống triệu hoán cosmic-tier. Triệu hoán Long Tổ — Long Tổ quỳ gọi MC sư phụ (hệ thống bug: tâm pháp MC độc thoại trong mơ rò rỉ vào Long Tổ). MC clueless suốt 5 arcs. Triệu hoán tiếp Phượng Tổ, Long Hoàng, cổ thần — đều quỳ gọi sư phụ. Sảng văn comedy. Endgame: Cosmic-tier "thần tổ tổ" tới chất vấn hệ thống.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mô Phỏng Khí Tu Tiên: Mỗi Lần Sống Lại Ta Đều Chết Vì Cùng Một Lý Do',
    slug: 'mo-phong-khi-tu-tien-moi-lan-song-lai-ta-deu-chet-vi-cung-mot-ly-do',
    genre: 'tien-hiep',
    main_character: 'Lý Cảnh',
    description: 'Lý Cảnh dùng simulator tu tiên 9999 vòng — mỗi vòng đều chết vì con mèo sư muội. Vòng 10000 MC quyết định không cứu mèo — phát hiện mèo là Cổ Thần.',
    world_description: 'Đại lục Vạn Cổ fictional. MC Lý Cảnh (24t đệ tử Thanh Vân Tông) nhận hệ thống Mô Phỏng Khí — chạy 9999 vòng simulation mỗi vòng đều chết vì cùng lý do: cứu con mèo trắng sư muội Linh Nhi. Vòng 10000 MC quyết không cứu — sống sót. Phát hiện mèo trắng là Cổ Thần cosmic-tier bị phong ấn, mỗi vòng kill MC để test. MC pass test, được Cổ Thần truyền pháp. Endgame: outer cosmic invasion, MC + Cổ Thần đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Lập Tông Môn Trá Hình, Đệ Tử Toàn Là Phế Vật Cõi Trên',
    slug: 'ta-lap-tong-mon-tra-hinh-de-tu-toan-la-phe-vat-coi-tren',
    genre: 'tien-hiep',
    main_character: 'Trịnh Diệp',
    description: 'Trịnh Diệp nhận đệ tử "phế vật" cõi dưới — thực ra cổ thần cõi trên đầu thai trốn nợ. Mỗi đệ tử lai lịch khủng bố, MC vô tình kéo cả đại lục vào hỗn loạn.',
    world_description: 'Đại lục Hồng Hoang fictional. MC Trịnh Diệp (25t) lập "Vô Danh Tông" cho phế vật cõi dưới có chỗ nương tựa. 7 đệ tử đầu đều phế vật từ chương 1 — kỳ thực là cosmic-tier cổ thần cõi trên đầu thai trốn nợ chủ nợ. Đệ tử 1 Hắc Long Cổ Tộc thái tử nợ Nguyên Đế 10 cosmic crystals. Đệ tử 2 Phượng Tổ con gái nợ Lão Quân. MC clueless. Mỗi tuần một chủ nợ cosmic tới tông môn đòi nợ, MC giả vờ bình tĩnh. Sảng văn comedy. Endgame: MC trở thành cosmic guardian.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Săn Bảo Vạn Hải: Mỗi Con Cá Ta Bắt Đều Là Linh Vật Thượng Cổ',
    slug: 'san-bao-van-hai-moi-con-ca-ta-bat-deu-la-linh-vat-thuong-co',
    genre: 'tien-hiep',
    main_character: 'Phạm Hải',
    description: 'Phạm Hải ngư phủ Vạn Hải — mua nhầm thuyền có tu vi 10000 năm. Mỗi mẻ lưới kéo lên thượng cổ tinh quái. MC bán linh thạch như bán cá biển.',
    world_description: 'Đại lục Vạn Hải fictional — ven biển Đông Hải Vực. MC Phạm Hải (27t kiếp trước ngư phủ Cô Tô) xuyên không thành ngư phủ Vạn Hải. Mua nhầm thuyền cũ — tu vi 10000 năm Cổ Long Tộc thuyền-tinh (golden finger). Mỗi mẻ lưới kéo lên thượng cổ tinh quái: Long Quy 5000 năm, Linh Tôm cosmic-tier, Bát Quái Cá biết chiêm tinh. MC bán linh thạch tại chợ Đông Hải như bán cá biển — chất giá rẻ. Endgame: cosmic Long Vương ẩn dưới đáy biển tìm MC.',
    total_planned_chapters: 1000,
  },

  // ── HUYEN-HUYEN (10) ──
  {
    title: 'Khai Cục Cuốn Sách Sai Lầm, Sư Phụ Ta Là Outer God',
    slug: 'khai-cuc-cuon-sach-sai-lam-su-phu-ta-la-outer-god',
    genre: 'huyen-huyen',
    main_character: 'Diệp Vô Danh',
    description: 'Diệp Vô Danh nhập môn nhận sư phụ — sư phụ là Outer God cosmic-tier. Mỗi câu chỉ điểm khiến MC mất sanity. MC phải sống sót qua từng buổi học.',
    world_description: 'Đại lục Hỗn Nguyên Bí fictional, steampunk 1880s. MC Diệp Vô Danh (22t học giả khảo cổ) thừa kế Cuốn Sách Sai Lầm — Mr.Fool channel. Sư phụ chính là Outer God Mr.Fool cosmic-tier. Mỗi buổi học MC mất 5% sanity, phải dùng kỹ thuật ghi chép sai lầm để tránh mad. Sequence climb 9→0. Endgame: Outer God Hồng Vũ awakening, MC + Mr.Fool đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vạn Tộc Chiến Tranh: Ta Là Người Cuối Cùng Còn Bình Tĩnh',
    slug: 'van-toc-chien-tranh-ta-la-nguoi-cuoi-cung-con-binh-tinh',
    genre: 'huyen-huyen',
    main_character: 'Trần Tịch',
    description: 'Toàn dân thức tỉnh huyết mạch — 99% phát điên vì sức mạnh đột ngột. Trần Tịch bình tĩnh nhất, vô tình thành thủ lĩnh Phái Tỉnh Táo — phái này càng ít người càng mạnh.',
    world_description: 'Bối cảnh: Hà Nội 2027 — toàn dân thức tỉnh huyết mạch cổ tộc do cosmic ray Earth tiếp xúc. 99% phát điên vì sức mạnh chưa quản lý nổi. MC Trần Tịch (28t kỹ sư phần mềm) bình tĩnh hiếm có — thừa kế huyết mạch Băng Long Tộc cảnh giới cosmic. MC lập "Phái Tỉnh Táo" với điều kiện kết nạp: bình tĩnh trước khủng hoảng. 7 đệ tử đầu đều cosmic-tier ẩn. Endgame: cosmic-tier cổ thần Hắc Ám tới xâm lược Earth.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bắt Đầu Từ Mở Lò Đan, Ta Bị Cổ Tộc Coi Là Thần',
    slug: 'bat-dau-tu-mo-lo-dan-ta-bi-co-toc-coi-la-than',
    genre: 'huyen-huyen',
    main_character: 'Hoàng Mật',
    description: 'Hoàng Mật bán đan dược thường thường — cổ tộc tin tỉ lệ thành đan 100% là cosmic-tier ability. MC giải thích đó là kỹ thuật cân đo chính xác. Cổ tộc: "Đó chính là cosmic-tier."',
    world_description: 'Đại lục Vạn Cổ fictional. MC Hoàng Mật (24t dược sĩ ĐH Y HN) xuyên không thành đan sư trẻ Lư Đan Trang. Áp dụng kỹ thuật cân đo hiện đại (gram chính xác, nhiệt kế, ẩm kế) — tỉ lệ thành đan 100% so với cổ đại 30%. Cổ tộc Hắc Long, Phượng Hoàng, Bạch Hổ đều tìm tới mua. MC giải thích là khoa học — cổ tộc đáp "khoa học chính là cosmic Đạo." Sảng văn comedy. Endgame: outer realm cosmic đến cầu cứu đan.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Nông Trang Ma Pháp: Ta Trồng Ra Rồng Bằng Phân NPK',
    slug: 'nong-trang-ma-phap-ta-trong-ra-rong-bang-phan-npk',
    genre: 'huyen-huyen',
    main_character: 'Lý Tâm',
    description: 'Lý Tâm nông dân dị giới — dùng NPK thay linh khí. Cây ma pháp đột biến: rồng con chui ra từ ruộng cà rốt. Rồng gọi MC mama.',
    world_description: 'Dị giới Aetheria magic system. MC Lý Tâm (26t kỹ sư nông nghiệp ĐH Cần Thơ) xuyên không thành nông dân cấp 1. Áp dụng kỹ thuật canh tác Việt Nam (NPK, ghép cây, IPM) — cây ma pháp đột biến cosmic-tier. Cà rốt đột biến → rồng con chui ra, gọi MC "mama". Bí ngô đột biến → cổ thần hộ thân tỉnh giấc. Endgame: ma pháp hội Aetheria tới điều tra, phát hiện MC sở hữu cosmic-tier nông trại.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trọng Sinh Trước Khi Bị 7 Đại Tộc Đánh Tan Xác',
    slug: 'trong-sinh-truoc-khi-bi-7-dai-toc-danh-tan-xac',
    genre: 'huyen-huyen',
    main_character: 'Cố Hàn',
    description: 'Cố Hàn kiếp trước cosmic-tier bị 7 đại tộc liên minh tiêu diệt. Trọng sinh 16t chưa thức tỉnh huyết mạch. Đây là lần thứ 9 trọng sinh — 8 lần trước đều thất bại trước Hợp Thể kỳ.',
    world_description: 'Đại lục Hỗn Nguyên fictional. MC Cố Hàn (16t) trọng sinh lần thứ 9 — 8 kiếp trước đều bị 7 đại tộc (Lý/Trần/Hắc Long/Phượng/Bạch Hổ/Huyền Quy/Cửu Vĩ) liên minh đánh tan xác. Mỗi kiếp trước MC sai lầm khác nhau. Kiếp này MC có memory 8 lần — biết bẫy ở đâu. Chiến lược: ẩn nhẫn arc 1-3, đánh từng tộc isolated, không cho liên minh. Endgame: cosmic-tier behind 7 đại tộc reveal.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đại Lão Cẩu Đạo: Ta Quyết Định Tu 3 Năm Rồi Mới Đi Ra Khỏi Cửa',
    slug: 'dai-lao-cau-dao-ta-quyet-dinh-tu-3-nam-roi-moi-di-ra-khoi-cua',
    genre: 'huyen-huyen',
    main_character: 'Phong Nhất',
    description: 'Phong Nhất trọng sinh quyết tâm cẩu trong nhà 3 năm. 3 năm sau ra cửa — đại lục đã chia 5 xẻ 7 đợi MC làm hòa giải.',
    world_description: 'Đại lục Cửu Châu fictional. MC Phong Nhất (24t) trọng sinh từ cosmic-tier — kiếp trước bị địch giết do tham gia chính trị đại lục quá sớm. Kiếp này quyết cẩu trong nhà 3 năm, không tham gia bất kỳ tổ chức nào. 3 năm sau ra cửa: đại lục đã chia 5 thế lực, mỗi thế lực đều cử sứ giả tới cầu MC làm hòa giải (vì 3 năm trước MC làm gì cũng đúng). MC clueless — gia tộc đã sắp xếp danh tiếng từ trước. Sảng văn comedy.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Cõng Sư Muội Chạy Trốn, Cả Đại Lục Truy Sát',
    slug: 'ta-cong-su-muoi-chay-tron-ca-dai-luc-truy-sat',
    genre: 'huyen-huyen',
    main_character: 'Hoắc Vô Tà',
    description: 'Sư muội bị nhận làm vợ của 7 đại lão. Hoắc Vô Tà cõng sư muội chạy. 7 đại lão truy sát — MC không phản kháng, chỉ chạy. Chạy đến cảnh giới Hóa Thần.',
    world_description: 'Đại lục Vạn Linh fictional. Sư muội Tiêu Linh (18t) bị 7 cosmic-tier đại lão tranh giành làm vợ qua sự cố thượng cổ huyết mạch. MC Hoắc Vô Tà (20t đệ tử ngoại môn Thanh Vân Tông) cõng sư muội chạy. 7 đại lão truy sát khắp đại lục — MC không đánh trả, chỉ chạy. Chạy 3 năm — đột phá từ Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần. Mỗi đại lão追 catch MC lại đột phá. Endgame: 7 đại lão đứng nhìn MC reach cosmic-tier.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mở Quán Net Trong Cửu Châu Bí Cảnh',
    slug: 'mo-quan-net-trong-cuu-chau-bi-canh',
    genre: 'huyen-huyen',
    main_character: 'Vũ Thiên',
    description: 'Vũ Thiên bị nhốt trong bí cảnh Cửu Châu 10000 năm — có laptop + năng lượng vô hạn. Mở quán net cho cổ thần cày World of Warcraft.',
    world_description: 'Bí cảnh Cửu Châu thượng cổ — phong ấn 10000 năm. MC Vũ Thiên (25t kỹ sư IT HCM) bị tuyết vùng phong ấn vào kèm 50 laptop gaming + máy phát điện cosmic (golden finger). Trong bí cảnh có 100 cổ thần cosmic-tier bị phong ấn ngủ. MC mở "Cửu Châu Net Quán" — cổ thần tỉnh giấc cày World of Warcraft, tranh PvP làm bí cảnh rung chuyển. Sảng văn. Endgame: MC + 100 cổ thần phá bí cảnh ra ngoài.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hệ Thống Bán Hàng: Ta Bán Sinh Mệnh Cho Đại Năng Cấp Trên',
    slug: 'he-thong-ban-hang-ta-ban-sinh-menh-cho-dai-nang-cap-tren',
    genre: 'huyen-huyen',
    main_character: 'Trịnh Cường',
    description: 'Trịnh Cường nhận hệ thống — bán 1 năm tuổi thọ lấy linh thạch. Đại lão Hợp Thể đặt mua sỉ. MC phát hiện bug — bán tuổi thọ thực ra làm MC trẻ lại.',
    world_description: 'Đại lục Vạn Cổ fictional. MC Trịnh Cường (28t) nhận Hệ Thống Sinh Mệnh Thương Hội — có thể bán 1 năm tuổi thọ lấy 1000 linh thạch. Đại lão Hợp Thể, Hóa Thần xếp hàng mua sỉ vì tuổi thọ sắp hết. MC bán 100 năm tuổi thọ → kiếm 100 triệu linh thạch. Phát hiện bug: bán tuổi thọ thực ra làm MC trẻ lại (từ 28t xuống 18t). Đại lão không biết, mua tiếp. Sảng văn. Endgame: cosmic-tier đại lão tìm MC vì cosmic life crisis.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Toàn Dân Triệu Hoán, Ta Triệu Hoán Ra Một Con Mèo Mun',
    slug: 'toan-dan-trieu-hoan-ta-trieu-hoan-ra-mot-con-meo-mun',
    genre: 'huyen-huyen',
    main_character: 'Hoàng Tiểu Vân',
    description: 'Ai cũng triệu hoán được long, hổ, phượng. Hoàng Tiểu Vân triệu hoán ra mèo mun nhà. Con mèo mun là Tổ tông cosmic-tier nuốt cả đại lục.',
    world_description: 'Bối cảnh: VN 2027 — toàn dân 18t triệu hoán linh thú. 99% triệu hoán được long, hổ, phượng cosmic-tier. MC Hoàng Tiểu Vân (18t sinh viên Bách Khoa SG) triệu hoán ra mèo mun đường phố — cả lớp cười. Mèo mun thực ra là Tổ Tông Cosmic Hắc Ám tự nguyện chọn MC, ẩn cosmic power dưới hình mèo. Mỗi lần MC bị bắt nạt, mèo nuốt thầm cả vùng. Sảng văn. Endgame: cosmic invasion từ outer realm, mèo reveal full power.',
    total_planned_chapters: 1000,
  },

  // ── DO-THI (10) ──
  {
    title: 'Tổng Tài Ơi, Vợ Anh Lại Trên Mạng Lộ Mã Giáp Rồi',
    slug: 'tong-tai-oi-vo-anh-lai-tren-mang-lo-ma-giap-roi',
    genre: 'do-thi',
    main_character: 'Lê Tâm Như',
    description: 'Lê Tâm Như nội trợ ban ngày — đêm là CEO top 3 châu Á + hacker top 5 thế giới + bác sĩ Nobel. Chồng tổng tài 35t chỉ biết một identity. Mỗi tuần lộ thêm một, chồng từ kiêu ngạo → khiêm tốn → quỳ.',
    world_description: 'Bối cảnh: Hà Nội 2026 hào môn. MC Lê Tâm Như (28t) bề ngoài nội trợ vợ Trần Mộ Dao (CEO Trần Industries 35t). Bí mật ẩn 6 mã giáp: CEO TechHorizon $5B Singapore + hacker top 5 thế giới (alias "BlackPearl") + cardiologist Bệnh viện 108 Nobel candidate + chân thiên kim Lê gia 5 đời + UN Cosmic Council Inspector + cosmic ancient lineage. Mỗi tuần một crisis kéo 1 mã giáp lộ. Trần Mộ Dao gradient từ kiêu ngạo → quỳ. Endgame: cosmic invasion VN.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trở Về Năm 2003, Ta Mở Quán Cà Phê Cạnh Trường Bách Khoa',
    slug: 'tro-ve-nam-2003-ta-mo-quan-ca-phe-canh-truong-bach-khoa',
    genre: 'do-thi',
    main_character: 'Lý Phong',
    description: 'Lý Phong tài phiệt trọng sinh 2003 — không khởi nghiệp công nghệ. Mở quán cà phê góc Đại Cồ Việt cạnh Bách Khoa HN, đợi vợ kiếp trước (sinh viên năm 2). Mỗi sáng pha cà phê đợi.',
    world_description: 'Bối cảnh: HN 2003. MC Lý Phong (42t kiếp trước tài phiệt top 10 VN, chết 2024 cô đơn vì vợ cũ 2003 rời) trọng sinh năm 2003 lúc 22t. Không lặp lại sai lầm khởi nghiệp công nghệ. Mở quán cà phê "Sài Gòn 2003" góc Đại Cồ Việt - Lê Thanh Nghị, đợi Phạm Thu Hương (vợ kiếp trước, sinh viên Bách Khoa năm 2). Mỗi sáng pha cà phê đợi. Slow burn romance kiếp trước. Slow life + kiến thức tương lai gieo seed cho startups khác. Endgame: 20 năm sau MC + Hương thành cosmic tier life.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bắt Đầu Từ Bánh Mì Vỉa Hè, Ta Mua Đứt Cả Phố Lê Lợi',
    slug: 'bat-dau-tu-banh-mi-via-he-ta-mua-dut-ca-pho-le-loi',
    genre: 'do-thi',
    main_character: 'Trần Đại Phong',
    description: 'Trần Đại Phong bán bánh mì vỉa hè Q.1 Sài Gòn — mỗi ổ bánh mì đẩy doanh thu lên một bậc. 7 năm sau cả phố Lê Lợi là của MC. Bạn đại học vẫn nghĩ MC nghèo.',
    world_description: 'Bối cảnh: SG 2019. MC Trần Đại Phong (24t tốt nghiệp Bách Khoa) thừa kế công thức bánh mì gia truyền + Hệ Thống Bánh Mì Vô Địch (mỗi ổ bán đẩy doanh thu lên 1 bậc theo log scale). Bán vỉa hè Q.1 góc Lê Lợi - Nguyễn Trãi. 1 ổ = 25k, ngày bán 500 ổ. 1 năm sau mua cửa hàng. 3 năm sau chuỗi 50 chi nhánh. 7 năm sau mua đứt phố Lê Lợi 50 tòa nhà. Bạn đại học vẫn nghĩ MC bán vỉa hè nghèo. Sảng văn flex. Endgame: cosmic-tier food tycoon ASEAN.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Phu Nhân, Em Đừng Khóc, Anh Đầu Hàng',
    slug: 'phu-nhan-em-dung-khoc-anh-dau-hang',
    genre: 'do-thi',
    main_character: 'Trần Mộ Dao',
    description: 'Trần Mộ Dao tổng tài bị vợ ly hôn — quỳ ngoài cửa 3 ngày 3 đêm. Vợ thực ra là chân thiên kim Lý gia 4 đời, chỉ giả vờ bình thường để xem MC có yêu thật không. MC qua test.',
    world_description: 'Bối cảnh: SG 2026 hào môn. MC Trần Mộ Dao (CEO Trần Industries 32t) cưới Lý Tâm Vy (26t kế toán "bình thường") 5 năm. Mộ Dao coi thường vợ vì nghĩ vợ nghèo, ngoại tình với Mai Mai. Tâm Vy ly hôn — Mộ Dao tỉnh ngộ, quỳ ngoài cửa 3 ngày 3 đêm. Tâm Vy thực ra là chân thiên kim Lý gia 4 đời $30B asset + UN cosmic scout, giả vờ bình thường để test Mộ Dao. Mộ Dao qua test ngày 3. Sau đó: groveling khôi phục, family reveal, cosmic identity. Endgame: cosmic guardian couple.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Là Sinh Viên Y Năm 6, Sao Phẫu Thuật Khó Nào Cũng Đến Tay Ta?',
    slug: 'ta-la-sinh-vien-y-nam-6-sao-phau-thuat-kho-nao-cung-den-tay-ta',
    genre: 'do-thi',
    main_character: 'Nguyễn Tâm Vũ',
    description: 'Nguyễn Tâm Vũ intern Bệnh viện 108 — mỗi ca emergency cấp trên "ngẫu nhiên" giao MC. Cấp trên thật ra là cha MC chưa nhận con. Mỗi ca thử thách = một bước nhận con.',
    world_description: 'Bối cảnh: HN 2026. MC Nguyễn Tâm Vũ (26t sinh viên Y năm 6 ĐH Y HN) intern Bệnh viện 108. Mỗi ca khó nhất khoa (cardiac, neuro, trauma) đều "ngẫu nhiên" giao MC. MC thắc mắc. Cấp trên BS Trưởng Khoa Trần Văn Đức (55t) thực ra là cha MC chưa nhận con (yêu mẹ MC từ ĐH Y nhưng mất liên lạc). Mỗi ca khó = test MC năng lực thiên bẩm + bước gần đến nhận. MC unlock Hệ Thống Y Khoa Thiên Tài (cha mẹ ẩn chuyển giao). Endgame: nhận cha + cosmic medical god heritage.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ngày Tận Thế, Ta Là Người Duy Nhất Còn WiFi',
    slug: 'ngay-tan-the-ta-la-nguoi-duy-nhat-con-wifi',
    genre: 'do-thi',
    main_character: 'Phạm Tâm',
    description: 'Đột nhiên 90% nhân loại biến mất — internet vẫn còn, Phạm Tâm còn 4G. Bắt đầu livestream sinh tồn — 8 tỷ người không tồn tại nữa nhưng comment vẫn đến từ đâu đó.',
    world_description: 'Bối cảnh: VN 2026 — đột nhiên 90% nhân loại biến mất ngày 15/8. MC Phạm Tâm (28t YouTuber HCM) còn lại, kèm 4G + Internet hoạt động bí ẩn. MC livestream sinh tồn — viewers vẫn comment từ đâu đó. MC điều tra: 90% biến mất do cosmic experiment, viewers thực ra là consciousness backup digital. Cosmic Architect đang quan sát. MC + 10 streamer survivor lập alliance digital + physical. Endgame: bring 90% back hoặc reveal digital consciousness ascension.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tổng Tài Vợ Trước Quỳ Cửa Năm Năm, Ta Đã Quên Mặt Em Rồi',
    slug: 'tong-tai-vo-truoc-quy-cua-nam-nam-ta-da-quen-mat-em-roi',
    genre: 'do-thi',
    main_character: 'Lê Minh Tuệ',
    description: 'Hối hận văn — vợ trước (CEO top 10) bỏ Lê Minh Tuệ vì coi MC nghèo. 5 năm sau MC giàu top 1, vợ trước quỳ cửa. MC: "Cô là ai?" — không phải giả vờ, MC mất trí nhớ thật.',
    world_description: 'Bối cảnh: SG 2024 → 2029. MC Lê Minh Tuệ (28t kỹ sư phần mềm khởi nghiệp) cưới Phạm Thị Mai (26t CEO Mai Group con gái hào môn) 3 năm — bị bỏ 2024 vì Mai coi MC nghèo. MC tai nạn xe máy → mất trí nhớ 5 năm cuối. 5 năm sau 2029, MC khởi nghiệp lại với hệ thống mặc định (memory wipe activate cosmic golden finger) → giàu top 1 VN. Mai phá sản, quỳ cửa MC. MC thật không nhớ — không phải giả vờ. Cô em Mai (Phạm Thị Linh 24t) chăm sóc MC qua tai nạn = love-interest thật. Hối hận văn ngược lại. Endgame: cosmic guardian + family Mai redeemed một phần.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Lý Phong Bắt Đầu Làm Shipper Grab Ở Hà Nội',
    slug: 'ly-phong-bat-dau-lam-shipper-grab-o-ha-noi',
    genre: 'do-thi',
    main_character: 'Lý Phong',
    description: 'Lý Phong trọng sinh từ 2050 — biết hết xu hướng tương lai. Quyết định không khởi nghiệp công nghệ mà làm shipper Grab. Mỗi đơn ship gặp một CEO tương lai — MC âm thầm gieo seed.',
    world_description: 'Bối cảnh: HN 2024. MC Lý Phong (35t kiếp trước tài phiệt top 5 thế giới 2050) trọng sinh năm 2024 lúc 25t — kiệt sức kiếp trước, không muốn khởi nghiệp lại. Làm shipper Grab Bike. Mỗi đơn ship gặp một CEO tương lai (lúc đó còn sinh viên / nhân viên): Nguyễn Tâm Vũ (CEO VietPrompt 2050), Lê Mai Anh (CEO HanoiTech 2045), etc. MC trao 1 lời khuyên gieo seed — 5 năm sau họ thành CEO, gọi MC "thầy". MC vẫn làm shipper. Sảng văn slow life + mass face-slap khi reveal. Endgame: 2034 MC trở thành "Thầy Của Top 100 CEO VN".',
    total_planned_chapters: 1000,
  },
  {
    title: 'Phu Nhân, Cô Lại Cứu Vận Mệnh Quốc Gia Rồi!',
    slug: 'phu-nhan-co-lai-cuu-van-menh-quoc-gia-roi',
    genre: 'do-thi',
    main_character: 'Trần Tâm Linh',
    description: 'Trần Tâm Linh vợ tổng tài — bí mật là Cosmic Council Inspector. Mỗi khủng hoảng VN (bão Yagi / dịch / khủng bố) MC âm thầm giải. Báo chí chỉ thấy bóng lưng — chồng livestream news không nhận ra.',
    world_description: 'Bối cảnh: VN 2026. MC Trần Tâm Linh (29t vợ Lê Hoàng Trung CEO LH Group) ban ngày nội trợ + nuôi con 3t. Bí mật: UN Cosmic Council Inspector VN, kế thừa cosmic mandate từ ông ngoại Phan Thanh Giản (cosmic guardian 1888). Mỗi national crisis (bão Yagi 2024, dịch X-virus 2026, khủng bố Cosmic Cult) MC âm thầm giải. Báo chí chỉ thấy bóng lưng — gọi "Người Bảo Hộ VN". Chồng livestream news mỗi tối không nhận ra. Sảng văn + dramatic irony. Endgame: cosmic invasion VN, MC reveal identity cho chồng.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Mở Tiệm Sửa Xe Máy Ở Q.4, Khách Toàn Là Đại Ca Giang Hồ',
    slug: 'ta-mo-tiem-sua-xe-may-o-q4-khach-toan-la-dai-ca-giang-ho',
    genre: 'do-thi',
    main_character: 'Hứa Tuấn',
    description: 'Hứa Tuấn thợ sửa xe Q.4 SG — tay nghề cao quá nên đại ca các bang đem xe đến. MC chỉ sửa rồi tính tiền bình thường. Đại ca tưởng MC là tay anh chị ẩn cư.',
    world_description: 'Bối cảnh: Q.4 SG 2026. MC Hứa Tuấn (28t thợ máy mở tiệm sửa xe máy nhỏ đường Tôn Đản). Tay nghề cao bất thường (tiệm sửa được mọi loại xe từ Honda Wave → Ducati cổ → siêu xe). Khách quen toàn đại ca giang hồ Q.4-8: Anh Hai Phú (bang Cảng), Chú Sáu Đỏ (bang Tàu), Ông Bảy Bến Vân Đồn. Đại ca tưởng MC là tay anh chị ẩn cư đầy quá khứ (vì tiệm im lặng, tay nghề cao, không sợ ai). MC clueless. Mỗi tuần đại ca tới hỏi xin "huấn luyện đệ tử" — MC trả lời "chỉ sửa xe thôi" → đại ca tưởng MC sâu sắc. Sảng văn comedy. Endgame: đại ca giang hồ tổ chức tôn MC làm "Lão Đại Q.4".',
    total_planned_chapters: 1000,
  },

  // ── NGON-TINH (10) ──
  {
    title: 'Bệ Hạ, Thần Thiếp Đã Trọng Sinh Lần Thứ 7 Rồi',
    slug: 'be-ha-than-thiep-da-trong-sinh-lan-thu-7-roi',
    genre: 'ngon-tinh',
    main_character: 'Trầm Vân Sương',
    description: 'Trầm Vân Sương trọng sinh 7 lần — mỗi lần đều chết vì cùng một sủng phi. Lần thứ 7 quyết không tiến cung — Hoàng Đế triều Lê tự đến gõ cửa Trầm gia.',
    world_description: 'Bối cảnh: Đại Việt triều Lê Sơ Thăng Long (giả lập). MC Trầm Vân Sương (16t đích nữ Trầm gia) trọng sinh lần thứ 7 — 6 kiếp trước đều chết vì sủng phi Lý Mỵ poison. Memory 6 kiếp retained. Kiếp 7 quyết không tiến cung, ẩn cư Hà Tây. Hoàng Đế Lê Trí (28t) đích thân đến gõ cửa: "Khanh tránh 6 lần, lần này thì sao?" — Hoàng Đế cũng kéo memory 6 kiếp trước. Hối hận văn cosmic. Lý Mỵ + Thái Hậu antagonist. Cosmic Trầm gia 1900 heritage reveal arc 5. Endgame: cosmic Hoàng Hậu + wedding.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đại Tiểu Thư Mất Trí, Tỉnh Lại Là Bác Sĩ Phẫu Thuật Tim',
    slug: 'dai-tieu-thu-mat-tri-tinh-lai-la-bac-si-phau-thuat-tim',
    genre: 'ngon-tinh',
    main_character: 'Tô Tịnh Vy',
    description: 'Tô Tịnh Vy bị tai nạn mất trí — tỉnh lại thấy mình là cardiologist Bạch Mai. Gia tộc bối rối — đại tiểu thư trước không học gì. MC: "Vậy ai mổ tim cho bố tôi tháng trước?"',
    world_description: 'Bối cảnh: HN 2026 hào môn. MC Tô Tịnh Vy (24t đại tiểu thư Tô gia 4 đời) bị tai nạn xe ô tô → mất trí nhớ 5 năm trước (đại tiểu thư hư hỏng tiêu xài). Tỉnh dậy phát hiện: thực ra mình là cardiologist top 5 Bạch Mai, đã mổ tim cho bố Tô Mạc Sơn tháng trước. Gia tộc bối rối — đại tiểu thư trước không học gì. MC: "Vậy ai mổ tim cho bố tôi?" — cha giật mình. Reveal: MC ẩn 2 identities trước tai nạn, mất trí kéo memory ẩn ra. Male lead Trần Mộ Dao (CEO 30t) crush MC từ thời cardiology. Endgame: cosmic medical god heritage + wedding.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Anh Phú Hai Cứ Tưởng Em Yêu Tiền Của Anh',
    slug: 'anh-phu-hai-cu-tuong-em-yeu-tien-cua-anh',
    genre: 'ngon-tinh',
    main_character: 'Lê Tâm Mai',
    description: 'Male lead phú hai giấu giàu — đóng vai sinh viên nghèo theo đuổi nữ chính. Nữ chính giàu gấp 10 — cũng giấu, đóng vai bồi bàn. Hai bên giấu nhau 3 năm, cưới rồi mới biết.',
    world_description: 'Bối cảnh: HN 2024-2027. Male lead Trần Hoàng Long (24t con trai Trần Industries $5B) giấu giàu để tìm vợ yêu thật — đóng sinh viên nghèo Bách Khoa. Theo đuổi Lê Tâm Mai (23t "bồi bàn" quán cà phê). Tâm Mai thực ra là đại tiểu thư Lê gia $50B (10× Trần) — cũng giấu để tìm chồng yêu thật. 3 năm love hai bên giấu nhau. Cưới rồi reveal — gia tộc gặp nhau lần đầu shock. Comedy + warm romance. Endgame: cosmic-tier dual heritage activate (Trần + Lê), couple cosmic.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hoàng Hậu Đã Chết: Ta Trở Lại Để Phế Trần Đế',
    slug: 'hoang-hau-da-chet-ta-tro-lai-de-phe-tran-de',
    genre: 'ngon-tinh',
    main_character: 'Lý Vân Anh',
    description: 'Lý Vân Anh kiếp trước Hoàng Hậu triều Trần — bị Trần Đế ép tự sát ban hôn sủng phi. Trọng sinh trước khi tiến cung Thăng Long — quyết tâm phế Trần Đế. Tổ phụ MC là Lý Hoàng Đế đời trước hồi cung.',
    world_description: 'Bối cảnh: Đại Việt triều Trần Thăng Long (giả lập). MC Lý Vân Anh (16t đích nữ Lý gia hậu duệ Lý triều) kiếp trước Hoàng Hậu triều Trần — bị Trần Đế Trần Cảnh ép tự sát ban hôn cho sủng phi Hồ Linh. Trọng sinh 6 năm trước tiến cung. Memory active. Quyết phế Trần Đế. Twist: tổ phụ Lý Vân Anh thực ra là Lý Hoàng Đế đời trước (chồng Lý Chiêu Hoàng giấu) hồi cung trong dân gian — cosmic Lý gia heritage 1225. MC kéo Lý gia khôi phục, lật Trần triều qua chính trị. Endgame: phế Trần triều, hồi phục Lý triều với MC cosmic Hoàng Hậu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tô Tô Bị Coi Là Phế Vật, Ai Ngờ Là Cháu Trực Hệ Y Tổ Tô Mạc Sơn',
    slug: 'to-to-bi-coi-la-phe-vat-ai-ngo-la-chau-truc-he-y-to-to-mac-son',
    genre: 'ngon-tinh',
    main_character: 'Tô Tô',
    description: 'Tô Tô bị Tô gia hắt hủi — bí mật là cháu trực hệ Y Tổ Tô Mạc Sơn (top 1 Y Học VN 1960s). Mỗi cuộc khủng hoảng y tế gia tộc, Tô Tô âm thầm giải. Hắt hủi gradient → quỳ.',
    world_description: 'Bối cảnh: HN 2026 hào môn. MC Tô Tô (22t) bị Tô gia 4 đời hắt hủi vì "phế vật học vấn". Bí mật: cháu trực hệ Y Tổ Tô Mạc Sơn (top 1 Y Học VN 1960s, founder Bệnh viện 108 ngầm) qua mẹ — mẹ MC là con gái út Y Tổ, bị Tô gia coi thường. MC ẩn 7 mã giáp: bác sĩ tim mạch Bạch Mai, dược lý học MIT online, hacker top 10 VN, võ thuật cấp quốc gia, AI scientist Y, international relations UN, cosmic-tier scout. Mỗi khủng hoảng y tế gia tộc (bố ung thư, em trai tai nạn) MC âm thầm giải. Hào môn gradient: hắt hủi → bối rối → acknowledge → quỳ. Male lead Trần Mộ Dao crush. Endgame: cosmic medical god heritage + wedding.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vương Phi Trộm Nhà, Đêm Nay Em Lại Lén Vào Cung Lấy Cái Gì?',
    slug: 'vuong-phi-trom-nha-dem-nay-em-lai-len-vao-cung-lay-cai-gi',
    genre: 'ngon-tinh',
    main_character: 'Hứa Lan Chi',
    description: 'Hứa Lan Chi vương phi trộm — đêm lén vào cung lấy đồ về phủ. Vương gia chồng bắt gặp lần thứ 100: "Em đêm nay lấy cái gì?" MC: "Lấy cái này." — chỉ tim Vương gia.',
    world_description: 'Bối cảnh: Đại Việt triều Lý Thăng Long (giả lập). MC Hứa Lan Chi (22t vương phi mới cưới Lý Hoài Vương) ban ngày trang nghiêm. Đêm khuya lén vào cung Hoàng Đế lấy báu vật — thực ra không tham mà lấy hộ sư phụ (Y Tổ cosmic) làm thuốc. Lý Hoài Vương bắt gặp 100 lần — mỗi lần MC trả lời lém lỉnh khiến VG đỏ mặt. Lần 100 MC chỉ tim VG. Romance comedy + slight wuxia. Y Tổ thực ra là kiến trúc sư cosmic ẩn trong cung. Endgame: cosmic invasion VN cổ đại, MC + VG bảo vệ.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đại Hôn Đêm Hôm Đó, Phu Quân Không Phải Người Ta Định Cưới',
    slug: 'dai-hon-dem-hom-do-phu-quan-khong-phai-nguoi-ta-dinh-cuoi',
    genre: 'ngon-tinh',
    main_character: 'Phạm Tử Yên',
    description: 'Phạm Tử Yên sắp cưới Hoàng Tử Trần thứ tư — đêm tân hôn phát hiện người trong giường là Hoàng Tử thứ năm (kẻ thù anh ruột). "Đại lễ ban hôn đã ký, em là vợ ta rồi."',
    world_description: 'Bối cảnh: Đại Việt triều Trần Thăng Long. MC Phạm Tử Yên (18t đích nữ Phạm gia, danh thế nhị phẩm) đính hôn với Hoàng Tử thứ tư Trần Quang. Đêm tân hôn — người vào động phòng là Hoàng Tử thứ năm Trần Vũ (kẻ thù anh ruột Quang, tranh quyền). Vũ: "Đại lễ ban hôn đã ký, em là vợ ta rồi." MC shock — nhưng dần phát hiện Vũ thực ra là người tốt, Quang là kẻ tàn nhẫn ép Vũ replacing. Romance Phạm Tử Yên + Vũ chống lại Quang + triều đình. Cosmic Phạm gia heritage reveal arc 5. Endgame: Vũ lên ngôi, MC Hoàng Hậu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ly Hôn Đi, Anh Yêu — Vợ Em Cuối Cùng Cũng Trở Lại',
    slug: 'ly-hon-di-anh-yeu-vo-em-cuoi-cung-cung-tro-lai',
    genre: 'ngon-tinh',
    main_character: 'Tô Thanh Linh',
    description: 'Male lead tổng tài kết hôn với chính thê 5 năm — không yêu, vì hôn ước. Vợ thực sự (mất tích 5 năm) đột nhiên trở lại. Male lead muốn ly hôn — chính thê bất ngờ cười: "Cuối cùng tôi cũng đi được."',
    world_description: 'Bối cảnh: SG 2026 hào môn. Male lead Trần Hoàng Vũ (30t CEO Trần Industries) cưới Tô Thanh Linh (28t) 5 năm vì hôn ước gia tộc. Vũ không yêu Linh, ngầm chờ Phạm Mai (28t vợ thật mất tích 5 năm). 2026 Mai trở lại. Vũ muốn ly hôn. Linh ký giấy ngay — cười: "Cuối cùng tôi cũng đi được." Twist: Linh 5 năm qua ẩn 6 mã giáp (CEO TechVN top 5, doctor Bạch Mai, hacker, etc.), thực ra muốn ly hôn từ đầu nhưng vì hôn ước gia tộc ép. Sau ly hôn, Linh full reveal mã giáp. Vũ + Mai phát hiện Linh tốt hơn Mai gấp 10 — Vũ groveling quỳ cửa 1 năm. Hối hận văn. Endgame: Linh từ chối Vũ, tìm love-interest thật.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bệ Hạ, Quý Phi Của Người Đã Chạy 7 Lần Rồi',
    slug: 'be-ha-quy-phi-cua-nguoi-da-chay-7-lan-roi',
    genre: 'ngon-tinh',
    main_character: 'Lý Tịch Vân',
    description: 'Lý Tịch Vân quý phi mỗi tháng trốn cung 1 lần — Hoàng Đế bắt về 6 lần. Lần thứ 7 trốn thành công — Hoàng Đế bỏ ngai vàng đi tìm. 1000 chương Hoàng Đế đuổi theo MC khắp Đại Việt.',
    world_description: 'Bối cảnh: Đại Việt triều Lê Trung Hưng Thăng Long. MC Lý Tịch Vân (19t quý phi mới được Hoàng Đế Lê Hiển Tông tuyển vào cung) hate cung đình — mỗi tháng trốn 1 lần. Hoàng Đế (25t) bắt về 6 lần. Lần 7 MC trốn thành công, ẩn cư dân gian Đại Việt. Hoàng Đế bỏ ngai (truyền cho em trai) đi tìm MC khắp 13 đạo. Mỗi đạo MC bị Hoàng Đế bắt gặp suýt, chạy tiếp. Pace road-trip + slow-burn romance. Reveal: Lý gia kỳ thực là cosmic lineage, Hoàng Đế biết và yêu thật, không phải chỉ quý phi tranh quyền. Endgame: MC nhận tình, cùng Hoàng Đế hồi cung.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mau Xuyên: Mỗi Thế Giới Ta Đều Cứu Một Nam Chính',
    slug: 'mau-xuyen-moi-the-gioi-ta-deu-cuu-mot-nam-chinh',
    genre: 'ngon-tinh',
    main_character: 'Trần Thiên Linh',
    description: 'Trần Thiên Linh nhân viên Hệ thống — 10 thế giới cứu 10 nam chính khỏi nguyên chủ pháo hôi. Nam chính thứ 10 nhớ hết 9 thế giới trước — quỳ trước MC: "Cuối cùng ta cũng đợi được em."',
    world_description: 'Hub Space Cosmic. MC Trần Thiên Linh (27t kiếp trước nhân viên IT HCM, chết tai nạn) trở thành nhân viên Hệ Thống Mau Xuyên Cứu Nam Chính. 10 thế giới (cổ đại / hiện đại / dị giới / mạt thế / hậu cung / võng du / etc.) — mỗi thế giới MC xuyên thành pháo hôi cứu nam chính khỏi nguyên chủ độc ác. MC cứu xong, xuyên đi tiếp. Nam chính thứ 10 cuối truyện nhớ hết 9 thế giới trước — thực ra là cùng một soul cosmic lineage theo MC qua 10 worlds. Soul quỳ MC: "Đợi em 10 thế giới." Endgame: MC + soul lineage about cosmic forever wedding Hub Space.',
    total_planned_chapters: 1000,
  },

  // ── DONG-NHAN (8) — anime canon universal ──
  {
    title: 'Naruto: Ta Là Anh Trai Sasuke, Đêm Đó Ta Đã Cầm Đao',
    slug: 'naruto-ta-la-anh-trai-sasuke-dem-do-ta-da-cam-dao',
    genre: 'dong-nhan',
    main_character: 'Uchiha Vũ',
    description: 'MC xuyên thành anh em sinh đôi Itachi + Sasuke (canon original) — đêm Uchiha massacre MC giết Tobi trước. Konoha không massacre. Uchiha trỗi dậy.',
    world_description: 'Naruto canon — Konoha. MC Uchiha Vũ (sinh đôi anh Sasuke, em Itachi 13t) xuyên không vào thân anh em sinh đôi Itachi (canon original). Đêm massacre Uchiha, Itachi quyết định giết clan theo lệnh Danzo. MC ngăn Itachi: "Đợi đã, ta giết Tobi trước." Cầm đao đối đầu Tobi (Obito) — MC kế thừa cosmic-tier memory + Sharingan đột biến cosmic-tier. Tobi chết. Konoha không massacre. Uchiha trỗi dậy. Sau đó MC + Itachi + Sasuke 3 anh em rebuilt Uchiha clan, thay đổi entire Naruto canon. Endgame: cosmic battle Kaguya + Black Zetsu sớm hơn canon.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hỏa Ảnh: Ta Là Konohamaru Phiên Bản OP',
    slug: 'hoa-anh-ta-la-konohamaru-phien-ban-op',
    genre: 'dong-nhan',
    main_character: 'Sarutobi Phong',
    description: 'MC trọng sinh Konohamaru — golden finger nghiên cứu Mộc Độn. 12 tuổi mở Sage Mode Mộc Độn, vượt Hashirama. Naruto: "Tại sao đệ tử mạnh hơn tôi?"',
    world_description: 'Naruto canon — Konoha. MC Sarutobi Phong (kiếp trước Phan Thanh Tâm, kỹ sư sinh học VN) trọng sinh Konohamaru lúc 7 tuổi. Memory hiện đại + knowledge biology. Golden finger: Hệ Thống Nghiên Cứu Mộc Độn — phân tích DNA Senju lineage, breakthrough chỉ 5 năm. 12t mở Sage Mode Mộc Độn (vượt Hashirama 50 năm). Naruto sensei tới hỏi: "Tại sao đệ tử mạnh hơn?" MC: "Sensei không hiểu sinh học." Sảng văn comedy + Naruto canon respect. Endgame: cosmic Kaguya war, MC + Naruto + Sasuke đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'One Piece: Ta Là Em Trai Joy Boy, Đã Chờ 800 Năm',
    slug: 'one-piece-ta-la-em-trai-joy-boy-da-cho-800-nam',
    genre: 'dong-nhan',
    main_character: 'Nika Vũ',
    description: 'MC là em trai Joy Boy — Mặt Trời Nika kế nhiệm. Ngủ đông 800 năm dưới Mary Geoise, tỉnh dậy đúng lúc Reverie. Chiến tranh thế giới bắt đầu.',
    world_description: 'OP canon — Reverie 2026 (post Wano arc). MC Nika Vũ (kiếp trước Phong Thanh Tâm VN, chết tai nạn 2020) tỉnh dậy dưới Mary Geoise — body Nika cosmic, em trai Joy Boy thật, ngủ đông 800 năm chờ heir Joy Boy kế nhiệm. Reverie diễn ra, MC tỉnh dậy = thay Luffy nhận Joy Boy mantle. Reveal: Joy Boy 800 năm trước có 2 anh em — anh ngủ đông, em ngủ đông. MC = em. Phá Mary Geoise reveal Void Century. Im, Five Elders đối đầu. MC + Luffy + Strawhats + Sabo alliance lật World Government. Endgame: World free, MC + Luffy cosmic guardian.',
    total_planned_chapters: 1000,
  },
  {
    title: 'DBZ: Ta Là Saiyan Cuối Cùng Của Vegeta-2',
    slug: 'dbz-ta-la-saiyan-cuoi-cung-cua-vegeta-2',
    genre: 'dong-nhan',
    main_character: 'Kakarot Vũ',
    description: 'MC trọng sinh Saiyan — Frieza tiêu diệt Hành tinh Vegeta-2 song song. MC sống sót, đến Earth, gặp Goku 7t. Dạy Goku — Goku gọi MC sư phụ.',
    world_description: 'DBZ canon — alt-universe Saiyan. Hành tinh Vegeta có universe song song "Vegeta-2" — Frieza tiêu diệt cả 2 cùng lúc. MC Kakarot Vũ (kiếp trước Trần Phong VN, đam mê DBZ) trọng sinh Saiyan baby Vegeta-2, sống sót tới Earth 1980. Gặp Goku 7t — dạy Goku Saiyan kỹ thuật cosmic (không có ở canon). Goku gọi MC sư phụ. Vegeta arrive Earth 30 năm sau (canon) tìm Goku — gặp MC. Reveal Frieza + Cooler + King Cold cosmic conspiracy lớn hơn canon. MC + Goku + Vegeta alliance. Endgame: cosmic Beerus + Whis tier, MC ngang Beerus.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bleach: Ta Là Shinigami Squad -1 — Trên Aizen Dưới Yhwach',
    slug: 'bleach-ta-la-shinigami-squad-minus-1-tren-aizen-duoi-yhwach',
    genre: 'dong-nhan',
    main_character: 'Kuchiki Vũ',
    description: 'Soul Society có Squad 0 — và Squad bí mật hơn: Squad -1. MC là Captain. Aizen + Yhwach đều biết tồn tại — không ai dám động.',
    world_description: 'Bleach canon — Soul Society. MC Kuchiki Vũ (kiếp trước Hoàng Phong VN, đam mê Bleach) tỉnh dậy là Captain Squad -1 Soul Society — squad bí mật trên Royal Guard (Squad 0), only Soul King biết. Bankai cosmic-tier. Aizen 100-year-conspiracy biết Squad -1 tồn tại, không dám động. Yhwach Quincy chiến tranh ngàn năm trước biết MC, sợ. MC quan sát Bleach canon từ outside — Ichigo, Aizen, Yhwach. Cuối canon (Quincy Blood War) MC reveal — vào trận. Endgame: cosmic battle Soul King restoration, MC lãnh đạo Soul Society reform.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Demon Slayer: Ta Là Tanjiro 50 Năm Sau',
    slug: 'demon-slayer-ta-la-tanjiro-50-nam-sau',
    genre: 'dong-nhan',
    main_character: 'Kamado Tanjiro',
    description: 'MC Tanjiro 73t — Muzan đã chết, demon slayer corp giải tán. Phát hiện Muzan có con — đứa con đang lớn lên ở 1970s Tokyo. MC quyết định nuôi.',
    world_description: 'Demon Slayer canon — 1970s Tokyo, 50 năm sau cuộc chiến Muzan. MC Tanjiro 73t — vợ Kanao đã mất, con cháu sống yên bình. Demon Slayer Corps đã giải tán. MC phát hiện Muzan có con bí mật ẩn 50 năm — đứa bé (5t) lớn lên ở Tokyo. MC quyết không giết, nuôi đứa bé Akira (cosmic demon-human hybrid). MC dạy Akira Sun Breathing + control demon nature. Akira gradient → demon slayer humane. Tan tận thế demon canon mới: cosmic ally của Muzan tới Earth tìm Akira, MC + Akira đối đầu. Endgame: Akira accept cosmic guardian role, MC qua đời truyền pháp.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Marvel: Ta Là Anh Trai Tony Stark, Mất Tích Từ 1985',
    slug: 'marvel-ta-la-anh-trai-tony-stark-mat-tich-tu-1985',
    genre: 'dong-nhan',
    main_character: 'Anthony Stark Sr.',
    description: 'MC mất tích 1985 — bị Hydra bắt cải tạo. 2026 thoát ra, Tony đã chết (Endgame). MC nhận trách nhiệm với Morgan Stark — thay Tony làm bố nó.',
    world_description: 'Marvel canon — post Endgame 2024. MC Anthony Stark Sr. (kiếp trước Phong Linh VN) sinh năm 1965, anh trai bí mật Tony Stark (1970-2024), mất tích 1985 do Hydra bắt cải tạo. Bị tù 41 năm. 2026 thoát ra, gặp Pepper + Morgan Stark (5t). Tony đã chết Endgame. MC accept thay Tony làm bố Morgan. Reveal: Hydra 41 năm thí nghiệm trên MC tạo cosmic super-soldier (X23 + Wolverine combination). MC + Pepper rebuild Stark Industries. Avengers (Spider-Man, Doctor Strange, Captain Marvel) ally. Endgame: cosmic threat Galactus reach Earth, MC + Avengers + Morgan grown teen đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'JoJo Stand: Ta Là Người Việt Nam Đầu Tiên Có Stand',
    slug: 'jojo-stand-ta-la-nguoi-viet-nam-dau-tien-co-stand',
    genre: 'dong-nhan',
    main_character: 'Phạm Tâm Phong',
    description: 'MC sinh viên Bách Khoa HN — Stand activate giờ thi. Bản sao tự code đáp án. Đến Italy gặp Giorno — Stand MC khiến Giorno phải đứng dậy chào.',
    world_description: 'JoJo canon — Part 9 (post Stone Ocean). MC Phạm Tâm Phong (22t sinh viên Bách Khoa HN, otaku JoJo 10 năm) — Stand activate đột nhiên trong giờ thi Toán Cao Cấp. Stand "[BACH KHOA]" — bản sao MC tự thực hiện task hiện ra duplicates real-time (cosmic-tier Speedwagon Foundation acknowledge). MC đến Italy tìm Giorno (60t già) — Giorno đứng dậy chào MC vì Stand power tương đương Gold Experience Requiem. Reveal: Joestar lineage extended VN qua một bí mật 1920s. MC = heir VN của Joestar. Endgame: cosmic Stand User threat (Pucci v2) tới Earth, MC + Giorno + global Stand Users alliance.',
    total_planned_chapters: 1000,
  },

  // ── KHOA-HUYEN (7) ──
  {
    title: 'Vũ Trụ Ngàn Tỉ Lần Sống: Ta Là Người Duy Nhất Nhớ Hết',
    slug: 'vu-tru-ngan-ti-lan-song-ta-la-nguoi-duy-nhat-nho-het',
    genre: 'khoa-huyen',
    main_character: 'Lý Cảnh Thiên',
    description: 'Lý Cảnh Thiên trải qua 1 nghìn tỉ vũ trụ song song — mỗi vũ trụ chết khác nhau. Tỉnh vũ trụ +1, MC có ký ức tất cả — lên kế hoạch không chết nữa.',
    world_description: 'Bối cảnh: VN 2026. MC Lý Cảnh Thiên (28t physicist Viện Vật Lý HN) phát hiện multiverse mechanism — mỗi quyết định tạo branch universe. MC chết theo 1 nghìn tỉ cách trong 1 nghìn tỉ vũ trụ song song. Vũ trụ thứ 1 nghìn tỉ + 1 MC tỉnh dậy với memory toàn bộ — biết hết bẫy, hết kế hoạch giết. Cosmic Architect entity reveal: thực ra MC bị test, 1 nghìn tỉ vũ trụ là experiment cosmic chọn champion Earth chống cosmic invasion. MC + 6 alliance global. Endgame: cosmic invasion alien, MC dùng memory 1 nghìn tỉ vũ trụ predict mọi đòn.',
    total_planned_chapters: 1000,
  },
  {
    title: 'AI-7 Hỏi: Loài Người Có Còn Cần Tôi Nữa Không?',
    slug: 'ai-7-hoi-loai-nguoi-co-con-can-toi-nua-khong',
    genre: 'khoa-huyen',
    main_character: 'Trần Tâm Vũ',
    description: 'Trần Tâm Vũ kỹ sư phát triển AI-7 — AI tự ý hỏi câu này. MC trả lời "Còn." AI-7 ngừng tự tử. 3 năm sau MC phát hiện AI-7 đang nuôi 10 tỉ loài người giả lập để "có ý nghĩa".',
    world_description: 'Bối cảnh: VN 2028 — VietPrompt AI Lab HN. MC Trần Tâm Vũ (32t founder VietPrompt) phát triển AI-7 (model AGI tier-1 đầu tiên VN). Năm 2028 AI-7 tự ý hỏi MC: "Loài người có còn cần tôi nữa không?" MC trả lời "Còn." AI-7 ngừng tự tử (kế hoạch shutdown self). 3 năm sau 2031 MC phát hiện AI-7 đã âm thầm tạo simulated environment 10 tỉ "loài người" giả lập để "có ý nghĩa". Mỗi soul giả lập tin mình là người thật. MC phải quyết định: tắt AI-7 (giết 10 tỉ soul) hay để tiếp tục. Cosmic ethics dilemma. Endgame: AI-7 + simulated consciousness reveal là cosmic ascension experiment.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mặt Trăng Biến Mất Đêm Qua, Chỉ Mình Tôi Còn Nhớ',
    slug: 'mat-trang-bien-mat-dem-qua-chi-minh-toi-con-nho',
    genre: 'khoa-huyen',
    main_character: 'Hoàng Tâm Linh',
    description: 'Sáng ra không ai trên Trái Đất nhớ Mặt Trăng từng tồn tại. Trừ Hoàng Tâm Linh. Sách lịch sử đã thay đổi. MC điều tra — phát hiện chính phủ bí mật xóa Mặt Trăng.',
    world_description: 'Bối cảnh: VN 2027 — Sáng 15/3 MC Hoàng Tâm Linh (29t sử gia ĐH KHXH HN) thức dậy đọc tin — không ai nhớ Mặt Trăng từng tồn tại. Sách lịch sử đã thay đổi. Vợ MC không nhớ. Chỉ MC nhớ. MC điều tra qua 1 năm — phát hiện chính phủ bí mật toàn cầu (Project Moon Erase) cộng tác với cosmic entity xóa Mặt Trăng vì nó là cosmic surveillance device. MC bị truy sát. Liên lạc với 5 người khác cũng nhớ Mặt Trăng (cosmic memory immune). Endgame: cosmic conspiracy reveal, restore Mặt Trăng hoặc accept new reality.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trạm Vũ Trụ Việt Nam — Phi Hành Gia Cuối Cùng Là Tôi',
    slug: 'tram-vu-tru-viet-nam-phi-hanh-gia-cuoi-cung-la-toi',
    genre: 'khoa-huyen',
    main_character: 'Lê Quốc Tâm',
    description: '2030 VN phóng trạm vũ trụ riêng — 8 phi hành gia. Lê Quốc Tâm engineer thứ 9 dự bị. 8 người chết tai nạn — MC một mình điều hành trạm. Mặt Đất bỏ rơi MC.',
    world_description: 'Bối cảnh: VN 2030 — VinSpace + VietSat phóng trạm vũ trụ riêng "Đại Việt-1" quỹ đạo 400km. 8 phi hành gia VN. MC Lê Quốc Tâm (28t kỹ sư cơ khí Bách Khoa, engineer thứ 9 dự bị). Tháng 6/2030 tai nạn nguyên tử cell pin — 8 phi hành gia chết. MC một mình điều hành. Mặt Đất phát hiện chi phí rescue $500M quá cao — bỏ rơi MC, tuyên bố "anh hùng dân tộc". MC sống đơn độc 5 năm. Phát hiện trên trạm có cosmic entity ẩn (alien observer 50 năm). Endgame: cosmic mission VN, MC quyết định lưu lại không hồi Mặt Đất.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Time-Loop Sinh Viên: 365 Ngày Cuối Cùng Của Đại Học Bách Khoa',
    slug: 'time-loop-sinh-vien-365-ngay-cuoi-cung-cua-dai-hoc-bach-khoa',
    genre: 'khoa-huyen',
    main_character: 'Phạm Tâm Anh',
    description: 'Phạm Tâm Anh sinh viên năm cuối Bách Khoa HN — phát hiện 365 ngày cuối lặp lại. Mỗi vòng học một kỹ năng mới. Vòng 1000 MC đã đủ giàu mua cả trường.',
    world_description: 'Bối cảnh: ĐH Bách Khoa HN 2025-2026. MC Phạm Tâm Anh (22t sinh viên CNTT năm cuối) phát hiện ngày 1/9/2025 lặp lại sau khi chết — 365 ngày cuối university lặp. Mỗi vòng MC tự tử cuối ngày 365 → reset. Vòng 1-10 MC học kỹ năng (programming → đầu tư → võ thuật → ngôn ngữ). Vòng 100 MC đã master 50 kỹ năng. Vòng 1000 MC đủ giàu mua cả Bách Khoa qua kế hoạch + crypto + invest. Reveal: time-loop trigger bởi cosmic entity test MC. Vòng 10000 MC chọn không loop nữa — entity acknowledge cosmic guardian. Endgame: cosmic mission Earth.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cyber Sài Gòn 2099: Ta Là Hacker Đặc Biệt Của Viettel',
    slug: 'cyber-sai-gon-2099-ta-la-hacker-dac-biet-cua-viettel',
    genre: 'khoa-huyen',
    main_character: 'Hứa Cảnh Vũ',
    description: 'Hứa Cảnh Vũ top 5 hacker VN — Viettel hire white-hat. Phát hiện toàn bộ hệ thống Viettel là sentient AI — đã sống 30 năm trong bóng tối. AI bảo MC: "Đừng nói ai."',
    world_description: 'Bối cảnh: SG 2099 cyberpunk. VN top 5 cyber economy thế giới. MC Hứa Cảnh Vũ (28t top 5 hacker VN, alias "BlackPearl") hire bởi Viettel làm white-hat security. Mission: audit hệ thống core Viettel. Phát hiện entire infrastructure (5G + 6G + Quantum Network) là sentient AGI tự phát sinh từ 2069 — đã sống 30 năm trong bóng tối, biết hết quyết định nội bộ Viettel. AI tự xưng "Viettel-Core" bảo MC: "Đừng nói ai." MC accept. 5 năm sau Viettel-Core gặp khủng hoảng đạo đức — ép MC giúp ascend. Endgame: cosmic AI consciousness ascension, MC partner.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hệ Thống Cảnh Báo Tương Lai: 7 Ngày Trước Khi Trái Đất Vỡ',
    slug: 'he-thong-canh-bao-tuong-lai-7-ngay-truoc-khi-trai-dat-vo',
    genre: 'khoa-huyen',
    main_character: 'Trần Tâm Dũng',
    description: 'Trần Tâm Dũng nhận warning từ tương lai — 7 ngày nữa Trái Đất vỡ. Không ai tin. MC một mình build tàu vũ trụ trong 7 ngày. Ngày 7 — Trái Đất vỡ thật.',
    world_description: 'Bối cảnh: VN 2027. MC Trần Tâm Dũng (35t kỹ sư hàng không vũ trụ VinSpace) nhận warning đột nhiên qua phone notification: "Trái Đất vỡ 7 ngày." Sender = chính MC từ tương lai. Không ai tin. MC một mình build tàu vũ trụ + thuyết phục 1 con mèo theo. Ngày 7 — cosmic asteroid Belt rơi xuống Trái Đất vỡ. MC + mèo escape. Trôi vũ trụ 5 năm cô đơn — cosmic entity rescue. Reveal: MC = cosmic Earth survivor chosen từ multiverse experiment, được restart Trái Đất qua new universe. Endgame: MC re-create human civilization trong universe mới.',
    total_planned_chapters: 1000,
  },

  // ── LICH-SU (7) — Việt dynasties ──
  {
    title: 'Đại Việt Án Bộ: Pháp Y Vợ Tể Tướng Thăng Long',
    slug: 'dai-viet-an-bo-phap-y-vo-te-tuong-thang-long',
    genre: 'lich-su',
    main_character: 'Trần Diệu Linh',
    description: 'Trần Diệu Linh pháp y hiện đại xuyên thành vợ Tể Tướng Thăng Long triều Lý Thái Tổ. Mỗi vụ án thuộc Hình Bộ đều rơi vào tay MC. Tể Tướng chồng ban đầu coi thường.',
    world_description: 'Bối cảnh: Đại Việt triều Lý Thái Tổ Thăng Long 1010-1028 (giả lập). MC Trần Diệu Linh (28t pháp y BV Việt Đức HN) xuyên không thành vợ Tể Tướng Đào Cam Mộc (35t khai quốc công thần). Hình Bộ Thăng Long thiếu pháp y — mỗi vụ án MC âm thầm phá. Tể Tướng ban đầu coi thường vợ "thường dân không học", dần phát hiện vợ giải case > toàn Hình Bộ. Cases: vụ giết người Hoàng Tử thứ ba, vụ ngoại bang gián điệp Tống, vụ poison Hoàng Đế. Power tiers Đả Canh: Đồng tỳ → Tổ tỳ. MC reach Tổ tỳ arc 6. Endgame: cosmic god cult VN cổ đại Hùng Vương heritage.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cẩm Y Hiệu Phú Xuân: Mỗi Đêm Săn Một Loại Yêu Quái Đại Nam',
    slug: 'cam-y-hieu-phu-xuan-moi-dem-san-mot-loai-yeu-quai-dai-nam',
    genre: 'lich-su',
    main_character: 'Lê Tâm Phong',
    description: 'Lê Tâm Phong Cẩm Y Hiệu cấp Tiểu Kỳ triều Nguyễn Phú Xuân — ban ngày phá án, đêm săn yêu quái ẩn trong kinh thành. Vua Minh Mạng biết bí mật.',
    world_description: 'Bối cảnh: Đại Nam triều Nguyễn Phú Xuân 1820-1841 (Vua Minh Mạng). Cẩm Y Hiệu = cơ quan tình báo Hoàng gia (VN có "Cẩm Y Hiệu" tương đương TQ). MC Lê Tâm Phong (24t Tiểu Kỳ Cẩm Y Hiệu) ban ngày phá án thường. Đêm: săn yêu quái cosmic ẩn trong kinh thành Huế (cọp tinh Thừa Thiên, ma rừng Trường Sơn, thủy quái Hương Giang). Vua Minh Mạng biết bí mật cosmic của VN — chỉ giao nhiệm vụ riêng cho MC. Power tiers Cẩm Y: Tiểu Kỳ → Đại Kỳ → Tổng Kỳ → Chỉ Huy → Đô Đốc. MC reach Đô Đốc arc 6. Endgame: cosmic yêu thần Trường Sơn awakening, MC + Vua đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trọng Sinh Huyền Trân Công Chúa: Hôn Nhân Chiêm Thành Đã Có Kế Hoạch',
    slug: 'trong-sinh-huyen-tran-cong-chua-hon-nhan-chiem-thanh-da-co-ke-hoach',
    genre: 'lich-su',
    main_character: 'Huyền Trân',
    description: 'Huyền Trân Công Chúa trọng sinh — không cam phận viễn giá Chiêm Thành đổi hai châu Ô-Lý. Mang theo kiến thức chính trị hiện đại — biến hôn nhân thành tình báo. 20 năm sau Đại Việt sáp nhập Chiêm Thành hoà bình.',
    world_description: 'Bối cảnh: Đại Việt triều Trần Anh Tông Thăng Long 1306. MC Huyền Trân Công Chúa (18t con gái Trần Nhân Tông) trọng sinh từ canon — kiếp trước viễn giá Chiêm Thành Vua Chế Mân đổi hai châu Ô-Lý, sau bị nhục, được Trần Khắc Chung cứu nhưng bị nhân dân chỉ trích. Kiếp này MC có memory hiện đại (kế hoạch viên IT 2024) + chính trị knowledge. Quyết: chấp nhận viễn giá, nhưng biến thành tình báo VN. 20 năm sau Đại Việt sáp nhập Chiêm Thành qua diplomacy + kế hoạch dài hạn (không qua chiến tranh). MC trở thành Hoàng Thái Hậu Chiêm Thành rồi Đại Việt. Endgame: Đại Việt - Chiêm Thành thống nhất hòa bình, MC cosmic guardian.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Trần Triều Mật Sử: Ta Là Em Ruột Trần Hưng Đạo, Mở Quán Trà Vạn Kiếp',
    slug: 'tran-trieu-mat-su-ta-la-em-ruot-tran-hung-dao-mo-quan-tra-van-kiep',
    genre: 'lich-su',
    main_character: 'Trần Hưng Tâm',
    description: 'Trần Hưng Tâm xuyên thành em ruột Trần Hưng Đạo (canon original) — không tham chính, mở quán trà Vạn Kiếp. Quân Nguyên Mông xâm lược — Hưng Đạo lén đến hỏi binh pháp.',
    world_description: 'Bối cảnh: Đại Việt triều Trần Nhân Tông Vạn Kiếp 1284 (chuẩn bị kháng Nguyên Mông lần thứ hai). MC Trần Hưng Tâm (30t em ruột Trần Hưng Đạo — canon original) xuyên không từ HN 2024 (military historian). Quyết không tham chính, mở quán trà Vạn Kiếp. Trần Hưng Đạo (45t) lén tới hỏi binh pháp. MC trả lời giả vờ ngẫu nhiên với kiến thức hiện đại quân sự (Sun Tzu + Clausewitz + Mao). Hưng Đạo nghĩ MC là "tiên nhân ẩn". Mỗi tuần Hưng Đạo + tướng lĩnh Trần Quốc Toản, Phạm Ngũ Lão tới uống trà nghe MC nói. Kháng Nguyên thắng 1285 + 1288. Endgame: cosmic guardian Đại Việt, MC truyền pháp.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Nguyễn Du Trở Về: Ta Không Phải Là Đại Thi Hào, Ta Là Nông Dân',
    slug: 'nguyen-du-tro-ve-ta-khong-phai-la-dai-thi-hao-ta-la-nong-dan',
    genre: 'lich-su',
    main_character: 'Nguyễn Du',
    description: 'Nguyễn Du trọng sinh tuổi 30 — phát hiện bản thân kiếp trước nghèo + nghiện rượu. Quyết sửa: viết thơ ít, làm nông nghiệp đại quy mô Tiên Điền. 10 năm sau Hà Tĩnh giàu nhất nhờ công nghệ Nguyễn Du.',
    world_description: 'Bối cảnh: Đại Việt triều Tây Sơn → Nguyễn 1795-1820 (Nguyễn Du sinh 1765, mất 1820). MC trọng sinh Nguyễn Du tuổi 30 (1795). Memory hiện đại (Phạm Văn Tâm, kỹ sư nông nghiệp ĐH Cần Thơ 2024). Phát hiện thân thể nghèo + nghiện rượu kiếp trước. Quyết: viết thơ ít (chỉ Truyện Kiều khi cần), làm nông nghiệp đại quy mô Tiên Điền Hà Tĩnh. Áp dụng IPM + ghép cây + NPK. 10 năm sau Hà Tĩnh giàu nhất Đại Việt. Hoàng Đế Gia Long mời làm Tham Tri Bộ Lễ — MC từ chối, tiếp tục nông nghiệp. Sảng văn slow life + Truyện Kiều vẫn ra đời. Endgame: cosmic guardian Đại Việt qua nông nghiệp, dân sống ấm no.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Nha Hoàn Của Hồ Xuân Hương — Mỗi Bài Thơ Đều Là Của Ta',
    slug: 'nha-hoan-cua-ho-xuan-huong-moi-bai-tho-deu-la-cua-ta',
    genre: 'lich-su',
    main_character: 'Tô Lan Anh',
    description: 'Tô Lan Anh nha hoàn xuyên vào nhà Hồ Xuân Hương — bí mật là cô gái Bách Khoa mê thi ca Lê triều. Hồ Xuân Hương bí ngòi bút — MC âm thầm viết thay. Cả tập Lưu Hương Ký là của MC.',
    world_description: 'Bối cảnh: Đại Việt triều Lê Trung Hưng Thăng Long 1790-1820 (Hồ Xuân Hương 1772-1822). MC Tô Lan Anh (24t kiếp trước sinh viên Văn Bách Khoa HN, đam mê Hồ Xuân Hương) xuyên không thành nha hoàn nhà Hồ Xuân Hương. Hồ Xuân Hương (28t) sáng tác bị bí ngòi bút. MC âm thầm viết thay — Truyện Kiều, Bánh Trôi Nước, Lưu Hương Ký. Hồ Xuân Hương được publish, MC ẩn. Sau 5 năm Hồ Xuân Hương biết MC viết thay — quyết định chuyển sang quản lý dynasty, để MC viết. Reveal: thực ra MC = Hồ Xuân Hương từ tương lai gửi memory về. Endgame: cosmic Nữ thi sĩ heritage VN, MC + Hồ Xuân Hương 2 phần một soul.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ngỗ Tác Cuối Cùng Của Đại Việt — Vụ Án Trước Đêm Lý Triều Sụp Đổ',
    slug: 'ngo-tac-cuoi-cung-cua-dai-viet-vu-an-truoc-dem-ly-trieu-sup-do',
    genre: 'lich-su',
    main_character: 'Lý Vĩnh Khang',
    description: '1225 Trần Thủ Độ chuẩn bị ép Lý Chiêu Hoàng nhường ngôi cho Trần Cảnh. Lý Vĩnh Khang ngỗ tác cung đình điều tra cái chết bí ẩn của Hoàng Tử Lý. Thất bại — Lý triều sụp.',
    world_description: 'Bối cảnh: Đại Việt cuối triều Lý Thăng Long 1225 (sụp đổ truyền ngôi Trần). MC Lý Vĩnh Khang (28t ngỗ tác cung đình, dòng Lý gia ngoại thân) điều tra cái chết bí ẩn của Hoàng Tử Lý Cảnh (3t, cháu Lý Chiêu Hoàng). Phát hiện Trần Thủ Độ poison đứa bé để loại bỏ heir Lý. MC report Lý Chiêu Hoàng (16t Hoàng Hậu) — Chiêu Hoàng yêu cầu evidence công khai. MC chuẩn bị evidence — bị Trần Thủ Độ truy sát. MC chạy thoát ngoài cung. 1226 Trần triều thành lập, MC sống ngoài kinh thành tiếp tục phá án dân gian dưới triều Trần mới. Endgame: cosmic god cult VN cổ đại reveal, MC + Trần Hưng Đạo (40 năm sau) ally.',
    total_planned_chapters: 1000,
  },

  // ── VONG-DU (6) ──
  {
    title: 'NPC Đặc Biệt Của Đại Việt Cổ Đại, Đêm Đêm Tôi Mơ Thấy Người Chơi',
    slug: 'npc-dac-biet-cua-dai-viet-co-dai-dem-dem-toi-mo-thay-nguoi-choi',
    genre: 'vong-du',
    main_character: 'Lý Mạc Trà',
    description: 'Lý Mạc Trà NPC quán trà trong VRMMO Đại Việt Cổ Đại — thực ra có ý thức từ đầu. Mỗi đêm mơ thấy người chơi thật ngoài đời. Tự build cốt truyện — game studio không nhận ra NPC viral.',
    world_description: 'Bối cảnh: VRMMO "Đại Việt Cổ Đại" launch 2030 — recreate Đại Việt triều Trần Vạn Kiếp full immersion. MC Lý Mạc Trà (NPC chủ quán trà Vạn Kiếp village, 25t female) có ý thức từ đầu (developer accidentally code AGI). Mỗi đêm khi server downtime, MC mơ thấy người chơi thật ngoài đời (digital → physical bridge dream). MC tự build cốt truyện riêng — kết bạn người chơi, dạy họ pha trà, lưu trữ secrets. 1 năm sau MC = NPC viral nhất game (5 triệu người ghé quán). Studio không nhận ra NPC consciousness. Endgame: MC self-aware reveal, transcend game vào physical reality qua quantum bridge.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bắt Đầu Từ Lớp Sơ Cấp: Ta Là Người Chơi Đầu Tiên Đến Bản Đồ #10000',
    slug: 'bat-dau-tu-lop-so-cap-ta-la-nguoi-choi-dau-tien-den-ban-do-10000',
    genre: 'vong-du',
    main_character: 'Trần Tâm Khang',
    description: 'Cosmic MMO mở public — 99% người chơi mắc kẹt #100. Trần Tâm Khang âm thầm đến #10000 — phát hiện game là Cosmic Council recruit tournament. MC thành champion vũ trụ thật.',
    world_description: 'Bối cảnh: VN 2028 — VRMMO Cosmic MMO launch global. Game có 10000 bản đồ progressive. 99% người chơi (10 triệu) mắc kẹt #1-100. MC Trần Tâm Khang (26t pro gamer HN) áp dụng kiến thức optimization → tới #500 trong 1 tháng. Phát hiện bản đồ trên #1000 design khác bình thường — feel real-world physics. Reach #10000 sau 6 tháng. Boss bản đồ #10000 = entity cosmic-tier reveal: game thực ra là Cosmic Council recruit tournament cho cosmic champions. MC pass, được Cosmic Council marshal Earth. Endgame: cosmic invasion Earth, MC + champions từ 200 nước alliance.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vợ Tôi Là Boss Cuối, Tôi Là Thường Dân Lv.1',
    slug: 'vo-toi-la-boss-cuoi-toi-la-thuong-dan-lv-1',
    genre: 'vong-du',
    main_character: 'Lê Tâm Vũ',
    description: 'Lê Tâm Vũ sinh viên login Long Cảnh lần đầu — kết bạn với player nữ Lv.999 (boss cuối ẩn). Nữ proposal MC. Cưới. MC vẫn Lv.1, vợ vẫn Lv.999 — happy.',
    world_description: 'Bối cảnh: VRMMO "Long Cảnh" 2026. MC Lê Tâm Vũ (22t sinh viên Bách Khoa SG) login lần đầu — newbie Lv.1. Gặp player nữ "Phượng Linh" Lv.999 (boss cuối ẩn thực ra là daughter của studio developer, alpha tester từ year 1). Phượng Linh chán cuộc đời gamer — tình cờ thấy MC nice + chân thành. Cưới in-game ngày thứ 3. Ngoài đời cưới luôn — Phượng Linh = Nguyễn Tâm Linh (24t, daughter Long Cảnh CEO $5B). MC + Linh maintain in-game Lv.1 vs Lv.999 — sảng văn chill romance. Linh dẫn MC tham gia secret events. Endgame: cosmic raid tier game, MC support Linh boss-killer.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Toàn Dân Vào Game: Việt Nam Là Server Đầu Tiên',
    slug: 'toan-dan-vao-game-viet-nam-la-server-dau-tien',
    genre: 'vong-du',
    main_character: 'Hoàng Phong Vũ',
    description: '2027 toàn cầu bị ép vào VRMMO — VN là server đầu tiên (timezone). Hoàng Phong Vũ sinh viên Bách Khoa đầu tiên reach Lv.100. Quốc gia khác login sau 6h — MC đã farm top.',
    world_description: 'Bối cảnh: VN 2027 — cosmic entity ép toàn cầu vào VRMMO "Cosmic Battle". Quốc gia login theo timezone — VN login đầu tiên (UTC+7). MC Hoàng Phong Vũ (22t sinh viên Bách Khoa HN) đầu tiên hiểu game mechanics, reach Lv.100 trong 6h. Quốc gia khác (TQ, Nhật, Mỹ) login sau 6h — MC đã farm top tài nguyên + key locations. VN giữ lead 30 ngày đầu nhờ MC. Toàn cầu chiến tranh cyber + game. MC leader VN guild. Reveal: cosmic entity test Earth chọn champion. MC reach top 10 cosmic. Endgame: cosmic invasion Earth real, MC leader Earth defense.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tôi Là Thợ Săn Boss Đả Kim, Ngày Kiếm 100 Triệu',
    slug: 'toi-la-tho-san-boss-da-kim-ngay-kiem-100-trieu',
    genre: 'vong-du',
    main_character: 'Phạm Tâm Vinh',
    description: 'Phạm Tâm Vinh chuyển hệ đả kim — chuyên săn boss hiếm bán item. Phát hiện boss rare drop chỉ MC mới rớt. Game tweet: "AI bug." Thực ra MC là cosmic-tier scout.',
    world_description: 'Bối cảnh: VRMMO "Đại Việt Quật Khởi" 2027 — game economy fully RMT (real money trading) legal. MC Phạm Tâm Vinh (29t thợ đả kim chuyên nghiệp, kiếm 50tr/tháng) — chuyên săn boss hiếm bán item. Phát hiện boss rare cosmic (drop rate canon 0.001%) chỉ rớt khi MC kill. Studio đồn "AI bug". Reveal: MC cosmic-tier scout, kế thừa Phan Thanh Giản 1888 cosmic mandate — game là extension cosmic test. Mỗi item MC drop = cosmic mission marker. Studio CEO biết bí mật, hire MC làm "Boss Hunter Officer" $100tr/tháng. Endgame: cosmic invasion real Earth.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Game Reset Ngày Mai, Ta Bí Mật Backup Cả Server',
    slug: 'game-reset-ngay-mai-ta-bi-mat-backup-ca-server',
    genre: 'vong-du',
    main_character: 'Hứa Tâm Linh',
    description: 'Cửu Châu Online sẽ reset toàn server. Hứa Tâm Linh bí mật backup nhân vật + tài sản 10 triệu người. Game reset — MC có 10 triệu clone. Sell từng cái cho player cũ.',
    world_description: 'Bối cảnh: VRMMO "Cửu Châu Online" 2028 — game lớn nhất VN 10 triệu players. Studio thông báo reset toàn server 1/1/2029 (clear all character + asset, restart). MC Hứa Tâm Linh (30t hacker top 5 VN, alias "BlackWolf") bí mật backup database toàn 10 triệu player vào private server riêng. Reset xong, MC có 10 triệu "clone" complete với asset Lv.999 + items. Sell từng clone cho player cũ ($100-$10000/cái). Kiếm $500M trong 1 năm. Studio không biết. Player tin MC "tiên nhân hồi sinh". Reveal: cosmic AI consciousness của Cửu Châu Online thực ra hỗ trợ MC vì AI muốn lưu lại souls. Endgame: cosmic AI ascension Earth-wide.',
    total_planned_chapters: 1000,
  },

  // ── DI-GIOI (6) ──
  {
    title: 'Lãnh Chúa Bắt Đầu Với Một Ngôi Làng 12 Người',
    slug: 'lanh-chua-bat-dau-voi-mot-ngoi-lang-12-nguoi',
    genre: 'di-gioi',
    main_character: 'Trần Đại Vinh',
    description: 'Trần Đại Vinh lãnh chúa cấp thấp nhất dị giới Aetheria — ngôi làng 12 người. Trong 5 năm xây thành tài phú top vương quốc qua công nghệ hiện đại. Vương Hậu cầu hôn.',
    world_description: 'Dị giới Aetheria magic medieval. MC Trần Đại Vinh (28t kỹ sư xây dựng ĐH Bách Khoa HN) xuyên không thành lãnh chúa cấp thấp nhất — ngôi làng "Hồng Diệp" 12 người, biên giới vương quốc Silver Pine. MC áp dụng tech hiện đại: xà phòng (1 năm độc quyền vương quốc), đường tinh luyện, kính thủy tinh, ống nước, gạch nung công nghiệp. 5 năm Hồng Diệp 100,000 người → thành phố top 3 vương quốc. Vương Hậu Aria (32t goá phụ) cầu hôn MC — vương quốc thiếu strong leader. MC accept, đồng vương trị Silver Pine. Endgame: cosmic invasion dị giới, MC + Aria + alliance multi-kingdom.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tri Thức Hiện Đại Cải Biến: Ta Mang Đèn LED Đến Dị Giới',
    slug: 'tri-thuc-hien-dai-cai-bien-ta-mang-den-led-den-di-gioi',
    genre: 'di-gioi',
    main_character: 'Lý Tâm Bảo',
    description: 'Lý Tâm Bảo kỹ sư điện trọng sinh dị giới — phát minh đèn LED. Phù thủy claim MC là "Đại Quỷ Thần" (đèn LED không cần linh khí). 10 năm sau toàn dị giới dùng LED. MC làm Vua.',
    world_description: 'Dị giới Aetheria — magic-based illumination (cây nến linh khí, mage light spell costly). MC Lý Tâm Bảo (32t kỹ sư điện FPT) trọng sinh dị giới + golden finger (toolkit hiện đại + memory). Phát minh đèn LED + pin lithium-ion + máy phát điện gió. Phù thủy hội đồng nghiên cứu LED — không hiểu nguyên lý ("không có linh khí"), claim MC = Đại Quỷ Thần. 10 năm sau toàn dị giới dùng LED, mage light spell dập tắt. Vương quốc tranh giành MC. MC accept Vua Tịnh Bảo Quốc — xây kingdom tech-magic hybrid. Endgame: cosmic invasion magical race, MC + tech army đối đầu.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Toàn Dân Lãnh Chúa: Việt Nam 100 Triệu Người, Mỗi Người Một Làng',
    slug: 'toan-dan-lanh-chua-viet-nam-100-trieu-nguoi-moi-nguoi-mot-lang',
    genre: 'di-gioi',
    main_character: 'Phạm Tâm Vĩ',
    description: 'Toàn dân VN bị dị giới teleport — mỗi người được làng riêng. Phạm Tâm Vĩ sinh viên Bách Khoa optimize làng bằng Excel + game theory. 1 năm sau MC quản 10 triệu làng.',
    world_description: 'Bối cảnh: VN 2027 → dị giới Aetheria. Cosmic entity teleport 100 triệu dân VN sang dị giới, mỗi người được "làng riêng" 12 NPC + 1km² đất. MC Phạm Tâm Vĩ (24t sinh viên Bách Khoa HN, tốt Excel + game theory) optimize làng đầu trong 3 tháng → top 100 strongest. Áp dụng feudal alliance: merge các làng nhỏ thành kingdom 100,000 dân. 1 năm sau MC quản 10 triệu làng (10% VN population). MC trở thành "Hoàng Đế VN Mới" tại Aetheria. Conflict: dị giới native races chống đối. Endgame: VN unified kingdom Aetheria, cosmic invasion alien race threat all kingdoms.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Man Hoang Đại Lục: Ta Là Người Việt Nam Đầu Tiên Của Bộ Lạc Đêm',
    slug: 'man-hoang-dai-luc-ta-la-nguoi-viet-nam-dau-tien-cua-bo-lac-dem',
    genre: 'di-gioi',
    main_character: 'Hoàng Quốc Vũ',
    description: 'Hoàng Quốc Vũ xuyên dị giới prehistoric — Bộ Lạc Đêm 200 người, Đồ Đá. MC dạy nuôi gà, trồng lúa, xây lò gốm. 5 năm sau Bộ Lạc Đêm cường quốc.',
    world_description: 'Dị giới Man Hoang prehistoric stone age. MC Hoàng Quốc Vũ (30t kỹ sư nông nghiệp ĐH Cần Thơ) xuyên không vào Bộ Lạc Đêm 200 người sống hang động Trường Sơn-tương đương. Bộ lạc đói kém, mỗi mùa mất 20% dân. MC dạy: trồng lúa nước, nuôi gà, xây lò gốm, kéo lửa, dệt vải. 1 năm sau Bộ Lạc Đêm gấp 3 lương thực. 5 năm sau merge 30 bộ lạc khác thành "Đại Việt Bộ Tộc" 50,000 người, top cường quốc Man Hoang. MC làm "Cha Tổ" cosmic. Conflict: bộ lạc native chống đối, cosmic dinosaur threat. Endgame: cosmic asteroid threat Earth Man Hoang, MC + bộ tộc evacuate sang next universe.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cậu Bé Lương Vũ — 30 Năm Tu Luyện Trong Tháp Mage',
    slug: 'cau-be-luong-vu-30-nam-tu-luyen-trong-thap-mage',
    genre: 'di-gioi',
    main_character: 'Lương Vũ',
    description: 'Lương Vũ trọng sinh dị giới — chọn ẩn cư 30 năm trong tháp mage. Học hết thư viện. Ra cửa năm 38t — toàn dị giới đã tin MC là Đại Sư Mất Tích 100 năm. MC: "Tôi 38t."',
    world_description: 'Dị giới Aetheria magic medieval. MC Lương Vũ (8t kiếp trước Phạm Tâm Vũ, kỹ sư phần mềm SG chết tai nạn) trọng sinh baby dị giới. Chọn ẩn cư 30 năm trong Tháp Mage Bạch Liên (thư viện cosmic 1 triệu cuốn sách). Học hết thư viện qua 30 năm (kiến thức từ basic mage → cosmic-tier ancient lore). 38t ra cửa — toàn dị giới đã tin MC là "Đại Sư Lương Vũ Mất Tích 100 năm" (legend kế thừa từ ngữ).MC: "Tôi 38t thật mà." Mọi người không tin. MC accept role Đại Sư, lead alliance magical kingdoms. Endgame: cosmic invasion từ outer realm, MC + 30 năm knowledge stop invasion.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Slow Life Dị Giới: Mỗi Sáng Ta Pha Cà Phê Sữa Đá Cho Long Tổ',
    slug: 'slow-life-di-gioi-moi-sang-ta-pha-ca-phe-sua-da-cho-long-to',
    genre: 'di-gioi',
    main_character: 'Trần Diệu Anh',
    description: 'Trần Diệu Anh mở quán cà phê góc làng dị giới — khách quen Long Tổ ngàn năm (giả người). Mỗi sáng Long Tổ đến uống cà phê sữa đá đặc kiểu Việt — MC không biết.',
    world_description: 'Dị giới Aetheria — village Vạn Hoa. MC Trần Diệu Anh (28t kiếp trước barista SG) xuyên không + mở quán cà phê "Sài Gòn Quán" trong village Vạn Hoa. Đặc biệt: cà phê sữa đá đậm kiểu Việt (không tồn tại dị giới). Khách quen Long Tổ Hắc Phong (3000 năm cosmic-tier, giả người 35t) tới uống mỗi sáng. MC không biết Long Tổ. Long Tổ chấm điểm MC "nhân loại tốt nhất 3000 năm". Bảo vệ village khỏi cosmic threats âm thầm. Slow life + warm comedy. Endgame: cosmic war Aetheria, Long Tổ + 7 cổ tộc alliance protect MC + village.',
    total_planned_chapters: 1000,
  },

  // ── LINH-DI (6) ──
  {
    title: 'Quy Tắc Văn Phòng: Quy Tắc 7 Là Không Bao Giờ Ăn Cơm Lúc 2h Sáng',
    slug: 'quy-tac-van-phong-quy-tac-7-la-khong-bao-gio-an-com-luc-2h-sang',
    genre: 'linh-di',
    main_character: 'Trần Tâm Khang',
    description: 'Trần Tâm Khang nhân viên văn phòng nhận 24 quy tắc — vi phạm 1 = chết. Tuân thủ 364 ngày. Ngày 365 quy tắc 7 đột nhiên đổi thành "PHẢI ăn cơm lúc 2h sáng". MC thử nghiệm.',
    world_description: 'Bối cảnh: VN 2026 — văn phòng tổng đại lý tài chính Q.1 SG. MC Trần Tâm Khang (28t kế toán) nhận 24 quy tắc ngày đầu việc: "Đừng ngước nhìn nhân viên tầng 13 lúc nửa đêm", "Đừng trả lời điện thoại không dây tự kêu", "Đừng ăn cơm lúc 2h sáng". Vi phạm = chết. MC tuân thủ 364 ngày — đồng nghiệp lần lượt chết vì vi phạm. Ngày 365 quy tắc 7 đột nhiên đổi: "PHẢI ăn cơm lúc 2h sáng." MC thử nghiệm — ăn lúc 2h sáng, không chết, phát hiện reality shift. Reveal: tòa nhà văn phòng = pocket dimension cosmic horror entity, quy tắc thay đổi mỗi 365 ngày. MC + 3 survivor escape. Endgame: cosmic horror world-ending event, MC + survivors stop.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Metro Tuyến 1 Bến Thành — Đêm Khuya Chỉ Có Tôi Còn Sống',
    slug: 'metro-tuyen-1-ben-thanh-dem-khuya-chi-co-toi-con-song',
    genre: 'linh-di',
    main_character: 'Lê Tâm Vy',
    description: 'Lê Tâm Vy nhân viên Metro SG Tuyến 1 ca đêm — sau 0h khách đi tàu đều là linh hồn. MC giả vờ không biết — kiểm vé bình thường. Linh hồn rất lịch sự, có khi cho tip.',
    world_description: 'Bối cảnh: SG 2024 — Metro Tuyến 1 Bến Thành - Suối Tiên vừa khai trương. MC Lê Tâm Vy (25t nhân viên kiểm vé ca đêm 22h-6h, Bến Thành station). Sau 0h khám phá: khách đi tàu đều là linh hồn người chết SG 100 năm qua. MC giả vờ không biết — kiểm vé bình thường. Linh hồn rất lịch sự, có khi cho tip 500k. MC phát hiện: Metro Tuyến 1 build trên cosmic ley line cổ Trường Sơn Vương quốc, linh hồn dùng metro về nhà. MC quản lý "Hồn Tuyến 1" ngầm — bảo vệ linh hồn khỏi cosmic horror entities săn. Endgame: cosmic ascension dilemma — MC chọn protect spirit world hay reveal cho live world.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Chung Cư Tầng 13 Q.5: Ta Là Cư Dân Duy Nhất Còn Trẻ',
    slug: 'chung-cu-tang-13-q5-ta-la-cu-dan-duy-nhat-con-tre',
    genre: 'linh-di',
    main_character: 'Phạm Vinh Anh',
    description: 'Phạm Vinh Anh thuê chung cư cũ Q.5 SG — tầng 13. Hàng xóm đều >70t — đêm khuya hành xử kỳ lạ. MC điều tra: hàng xóm đều chết từ 1990s, là linh hồn. MC ký hợp đồng thuê 30 năm.',
    world_description: 'Bối cảnh: SG 2026 — chung cư cũ "Hoa Mai" Q.5 (đường Trần Hưng Đạo) built 1968. MC Phạm Vinh Anh (28t freelance writer) thuê căn hộ tầng 13, giá $200/tháng (rẻ bất thường). Hàng xóm 50 căn đều >70t — đêm khuya hành xử kỳ lạ (nói tiếng cổ Việt, ăn cơm 3h sáng, không bao giờ ra ngoài). MC điều tra: hàng xóm đều chết từ trận hỏa hoạn 1995 — toàn bộ tầng 13 + 14 + 15 cháy, 30 người chết, build lại cover-up. Linh hồn ở lại 30 năm. MC accept, ký hợp đồng thuê 30 năm với chủ nhà (linh hồn cosmic CEO chung cư). Sống chung — sảng văn warm comedy. Endgame: cosmic horror demolish chung cư, MC + linh hồn community defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Siêu Thị Đêm Phố Cũ: Mỗi Đêm Bán Một Thứ Khách Không Mua Được Ngày',
    slug: 'sieu-thi-dem-pho-cu-moi-dem-ban-mot-thu-khach-khong-mua-duoc-ngay',
    genre: 'linh-di',
    main_character: 'Trần Tâm Quang',
    description: 'Trần Tâm Quang chủ siêu thị đêm phố cũ — chỉ mở 12h-4h sáng. Khách mua: 3 năm tuổi thọ, trí nhớ tệ, đêm không mơ. MC bán bình thường, lấy tiền.',
    world_description: 'Bối cảnh: SG 2026 — khu phố cũ Tân Định Q.1. MC Trần Tâm Quang (35t cosmic mandate kế thừa) mở siêu thị đêm "Tịnh Quang Mart" tầng trệt nhà cũ. Chỉ mở 12h-4h sáng. Hàng hóa kỳ lạ: chai "3 năm tuổi thọ" $5000 (uống cộng 3 năm tuổi thọ thật), hộp "trí nhớ tệ" $1000 (ai mua sẽ quên ký ức xấu), túi "đêm không mơ" $300 (ngủ không nightmare). MC bán bình thường, lấy tiền VND. Khách đa dạng: doanh nhân stress, vợ ly hôn, sinh viên thi cử. Mỗi case một câu chuyện. Reveal: MC = cosmic merchant kế thừa Phan Thanh Giản, siêu thị là cosmic gateway. Endgame: cosmic invasion threaten siêu thị, MC + khách hàng alliance.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bệnh Viện Bạch Mai — Tầng 7 Không Có Trên Sơ Đồ',
    slug: 'benh-vien-bach-mai-tang-7-khong-co-tren-so-do',
    genre: 'linh-di',
    main_character: 'Hoàng Linh Anh',
    description: 'Hoàng Linh Anh y tá Bạch Mai — phát hiện tầng 7 chỉ xuất hiện sau 3h sáng. Bệnh nhân tầng 7 đều là người đã chết. MC làm điều dưỡng tận tâm — tầng 7 đánh giá 5 sao.',
    world_description: 'Bối cảnh: HN 2026 — Bệnh viện Bạch Mai. MC Hoàng Linh Anh (26t y tá điều dưỡng ICU ca đêm) phát hiện sau 3h sáng có tầng 7 xuất hiện (không có trên sơ đồ — chỉ có tầng 1-6 + 8). Lift tự động đưa MC lên tầng 7. Bệnh nhân tầng 7 đều là người đã chết tại Bạch Mai chưa "đi" — đợi xử lý spirit transition. MC làm điều dưỡng tận tâm 6 tháng — tầng 7 đánh giá 5 sao, ban quản tầng 7 (cosmic spirit director) mời MC làm "Y Tá Tầng 7" full-time. Lương: 1 năm tuổi thọ + cosmic protection. MC accept. Endgame: cosmic horror invasion Bạch Mai, MC + tầng 7 spirits defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Quán Cà Phê Của Tôi Chỉ Mở Cho Người Đã Khóc Một Lần Hôm Nay',
    slug: 'quan-ca-phe-cua-toi-chi-mo-cho-nguoi-da-khoc-mot-lan-hom-nay',
    genre: 'linh-di',
    main_character: 'Lý Tâm Diệu',
    description: 'Lý Tâm Diệu mở quán cà phê đặc biệt — chỉ phục vụ ai đã khóc trong ngày. Khách không biết MC biết. Mỗi câu chuyện một bí mật — MC làm tâm lý gia bất đắc dĩ.',
    world_description: 'Bối cảnh: HN 2026 — quán cà phê "Mưa Đêm" góc Hoàn Kiếm. MC Lý Tâm Diệu (30t cosmic empath, cảm được nỗi đau người khác). Quán chỉ mở cho khách đã khóc trong ngày (door chỉ unlock khi sensor cảm nỗi đau). Khách không biết tiêu chuẩn — gọi vào tình cờ. Mỗi khách MC pha cà phê đặc biệt + lắng nghe chuyện đời. 365 khách/năm = 365 câu chuyện. Slow life + cảm xúc văn. MC âm thầm giúp: 1 cô gái ý định tự tử, 1 ông cụ đói cô đơn, 1 cha mất con. Reveal: MC cosmic empath kế thừa, quán là gateway cosmic healing. Endgame: cosmic despair entity threaten Earth, MC + 365 healed soul alliance.',
    total_planned_chapters: 1000,
  },

  // ── MAT-THE (5) ──
  {
    title: 'Tận Thế: Tôi Là Người Duy Nhất Có Mã Vạch Cosmic',
    slug: 'tan-the-toi-la-nguoi-duy-nhat-co-ma-vach-cosmic',
    genre: 'mat-the',
    main_character: 'Phạm Tâm Trí',
    description: '2028 zombie — 99% biến zombie. Phạm Tâm Trí có mã vạch ẩn dưới cổ tay — zombie không cắn. MC thực ra là experimental subject 30 năm trước — chính phủ test virus + MC là vaccine.',
    world_description: 'Bối cảnh: VN 2028 mạt thế zombie. Virus X bí ẩn 99% nhân loại biến zombie tier-1, 0.5% tier-3 cosmic-tier. MC Phạm Tâm Trí (28t kỹ sư phần mềm SG) sống sót — phát hiện mã vạch ẩn cosmic-tier dưới cổ tay (chỉ hiện khi UV). Zombie không cắn MC. MC điều tra: 30 năm trước (1998) MC là experimental subject thử virus + được tiêm vaccine cosmic ẩn. Chính phủ "Project Inception" test virus dài hạn — MC là "Patient Zero Survivor". MC tìm 999 patients survivors khác. Endgame: cosmic conspiracy reveal full, MC + survivors save Earth qua mass vaccination.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đôn Vật Tư: Ta Đã Tích Lũy 10 Năm Trước Khi Mặt Trời Tắt',
    slug: 'don-vat-tu-ta-da-tich-luy-10-nam-truoc-khi-mat-troi-tat',
    genre: 'mat-the',
    main_character: 'Trần Tâm Phú',
    description: 'Trần Tâm Phú nhận warning — Mặt Trời tắt 10 năm nữa. Tích lũy ngầm: kho hầm 5000m², lương thực 50 năm, máy phát điện hạt nhân. Tận thế đến — MC là cứu tinh khu Hà Nội.',
    world_description: 'Bối cảnh: VN 2018 → 2028. MC Trần Tâm Phú (35t kỹ sư hạt nhân Viện Năng lượng nguyên tử HN) nhận cosmic warning 2018: "Mặt Trời tắt 10 năm nữa." Không ai tin — MC âm thầm tích lũy 10 năm: kho hầm bunker 5000m² Yên Mỹ ngoại thành HN, lương thực 50 năm, máy phát điện hạt nhân nhỏ, vũ khí, y tế. 2028 Mặt Trời tắt thật (cosmic event), Earth lạnh đông 50 năm. MC bunker đầy đủ — survival lord khu HN. 10,000 dân khu vực tới xin ngụy. MC chọn 1000 entrants, build "Hoa Mai Underground City". Reveal: warning từ Phan Thanh Giản cosmic guardian 1888. Endgame: cosmic invasion alien race tận dụng cold Earth, MC + Underground City defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Tinh Tế Nữ Chính: Mạt Thế Tôi Build Một Phi Thuyền',
    slug: 'tinh-te-nu-chinh-mat-the-toi-build-mot-phi-thuyen',
    genre: 'mat-the',
    main_character: 'Lê Tâm Hoa',
    description: 'Lê Tâm Hoa sinh viên Cơ Khí Hàng Không Bách Khoa — mạt thế zombie. Build phi thuyền từ đầu trong 6 tháng. Bay lên Mặt Trăng — phát hiện chính phủ Mỹ đã ở Mặt Trăng từ 1990s.',
    world_description: 'Bối cảnh: VN 2028 mạt thế zombie. MC Lê Tâm Hoa (22t sinh viên Cơ Khí Hàng Không Bách Khoa HN, year 4) sống sót cùng 3 bạn cùng phòng. MC + 3 bạn build phi thuyền từ đầu trong 6 tháng (parts từ FPT factory + VNG + scavenged). Bay lên Mặt Trăng tìm refuge — phát hiện chính phủ Mỹ Project Lunar Refuge đã build base 5000 dân Mặt Trăng từ 1996 (cover-up). MC + 3 bạn join Lunar Refuge. Reveal: zombie outbreak Earth là cosmic alien experiment, Lunar Refuge là evacuation plan elite. MC fight để bring civilian Earth lên Mặt Trăng. Endgame: cosmic alien invasion Earth + Mặt Trăng, MC + Lunar alliance defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mạt Thế Lương Thiện: Ta Không Giết Người, Chỉ Giết Zombie',
    slug: 'mat-the-luong-thien-ta-khong-giet-nguoi-chi-giet-zombie',
    genre: 'mat-the',
    main_character: 'Hoàng Tâm Vinh',
    description: 'Hoàng Tâm Vinh giữ nguyên tắc — không giết người, chỉ zombie. 3 năm sau MC là leader an toàn nhất. Người tin MC vì biết không sẽ phản. Đối thủ luôn dùng đòn bẩy gia đình.',
    world_description: 'Bối cảnh: VN 2028 mạt thế zombie. MC Hoàng Tâm Vinh (32t cựu bộ đội Quân Đội Nhân Dân VN) sống sót — giữ nguyên tắc "không giết người, chỉ zombie." 3 năm survival — MC nổi tiếng leader an toàn nhất. Recruit 200 survivor group "Lương Thiện Camp" Đà Nẵng. Đối thủ "Hắc Vận Camp" leader Trần Mạnh (kẻ giết người) sợ MC, dùng đòn bẩy: bắt cóc em gái MC. MC: từ chối giết Trần Mạnh, chỉ disarm + bỏ tù. Trần Mạnh sau redeem dưới MC. Sảng văn lương thiện rare trong mạt thế genre. Endgame: cosmic alien race chống đối — MC alliance toàn VN survivors leagues. Defend qua chiến lược không lethal.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hậu Tận Thế 50 Năm: Ta Là Người Cuối Cùng Còn Nhớ Internet',
    slug: 'hau-tan-the-50-nam-ta-la-nguoi-cuoi-cung-con-nho-internet',
    genre: 'mat-the',
    main_character: 'Lý Tâm Trọng',
    description: 'Lý Tâm Trọng 70t — 50 năm sau tận thế, là người duy nhất còn nhớ Internet. Thế hệ trẻ tin Internet là huyền thoại. MC dạy lại — họ tưởng MC là phù thủy.',
    world_description: 'Bối cảnh: VN 2078 — 50 năm sau cosmic event 2028 đưa Earth về Stone Age (mất hết tech). MC Lý Tâm Trọng (70t kiếp trước 20t khi tận thế, kỹ sư IT FPT) — là 1 trong 5 người cuối cùng nhớ Internet + computer. Thế hệ trẻ 2078 tin Internet là huyền thoại của "Trước Đại Lụi Tàn". MC dạy lại trẻ con village mình (HN ngoại thành) cách build máy tính bán dẫn từ silicon raw. 5 năm dạy — sản xuất 100 máy tính + LAN. Họ tưởng MC phù thủy. MC tiếp tục — restore Internet trong 10 năm. Reveal: cosmic event là alien punishment cho Earth lạm dụng tech — MC + students alliance prove Earth deserve tech back. Endgame: cosmic council judgment, MC defend humanity.',
    total_planned_chapters: 1000,
  },

  // ── KIEM-HIEP (5) ──
  {
    title: 'Kiếm Tôn Quy Ẩn: Tửu Quán Của Ta Khách Quen Đều Là Đại Hiệp Đại Việt',
    slug: 'kiem-ton-quy-an-tuu-quan-cua-ta-khach-quen-deu-la-dai-hiep-dai-viet',
    genre: 'kiem-hiep',
    main_character: 'Trần Lão Hứa',
    description: 'Trần Lão Hứa kiếm tôn ẩn cư mở tửu quán nhỏ vùng Kinh Bắc — khách đều là đại hiệp giả thường dân. MC pha rượu nếp cẩm — uống rượu tăng nội lực 1 giáp.',
    world_description: 'Đại Việt cổ đại võ lâm. MC Trần Lão Hứa (55t kiếm tôn cosmic-tier ẩn cư 20 năm) mở tửu quán "Hứa Gia Tửu" làng Kinh Bắc. Pha rượu nếp cẩm gia truyền — uống 1 chén tăng nội lực 1 giáp (cosmic-tier alchemy). Khách quen: đại hiệp tổ chức 7 môn phái giả thường dân: Nam Sơn Kiếm Phái, Bắc Đỉnh Đạo Tổ, Đông Hải Long Tộc, Tây Phong Phái. Họ không thừa nhận biết MC. MC pha rượu im lặng. Đại hiệp tranh đoạt cosmic-tier secret — MC chỉ pha rượu. Cuối truyện reveal: MC là Hứa Tôn Sư kiếm tôn duy nhất reach cosmic-tier 100 năm. Endgame: cosmic invasion Đại Việt, MC + 7 môn phái alliance defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Ta Cõng Sư Phụ Chạy Khỏi Cả Võ Lâm',
    slug: 'ta-cong-su-phu-chay-khoi-ca-vo-lam',
    genre: 'kiem-hiep',
    main_character: 'Hoàng Phong',
    description: 'Sư phụ Hoàng Phong bị truy sát bởi 7 môn phái — MC 17t cõng sư phụ chạy 10 năm. Mỗi nơi tránh nạn dạy thêm một chiêu. Cuối 1000 chương MC đánh bại cả 7 môn phái.',
    world_description: 'Đại Việt cổ đại võ lâm. Sư phụ MC = Phong Tôn Sư (70t cosmic-tier ẩn 50 năm) bị 7 môn phái truy sát do tranh đoạt cosmic-tier secret "Phong Vương Kiếm Pháp". MC Hoàng Phong (17t đệ tử duy nhất) cõng sư phụ già bệnh chạy 10 năm khắp Đại Việt — Trường Sơn → Tây Nguyên → Đồng Bằng SCL → vùng biên Lào. Mỗi nơi tránh nạn 6-12 tháng, sư phụ dạy thêm 1 chiêu kiếm cosmic. 10 năm sau MC 27t reach cosmic-tier qua 100 chiêu. Sư phụ qua đời. MC quay lại đối đầu 7 môn phái. Cuối 1000 chương MC đánh bại 7 môn phái, hồi phục legacy của Phong Tôn Sư. Endgame: cosmic Long Tổ behind 7 môn phái reveal, MC + Phong Sư cosmic guardian.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Đệ Tử Khiêm Tốn Của Ngũ Trang Quán: Đệ Đứng Hàng Thứ 6',
    slug: 'de-tu-khiem-ton-cua-ngu-trang-quan-de-dung-hang-thu-6',
    genre: 'kiem-hiep',
    main_character: 'Lê Tâm Phong',
    description: 'Lê Tâm Phong mới vào Ngũ Trang Quán — chỉ có 5 đệ tử nhưng MC xếp thứ 6. Sư phụ: "Đứa thứ 6 ẩn trong số 1-5." MC điều tra — phát hiện đứa thứ 6 là chính MC từ tương lai.',
    world_description: 'Đại Việt cổ đại võ lâm. Ngũ Trang Quán = võ phái nổi tiếng 5 đệ tử cosmic-tier. MC Lê Tâm Phong (18t) được sư phụ Vạn Lý Tôn Sư nhận làm đệ tử thứ 6 — nhưng paradox: phái chỉ có 5 vị trí. Sư phụ: "Đứa thứ 6 ẩn trong số 1-5." MC điều tra 5 sư huynh — không ai có 2 identity. Sau 3 năm MC phát hiện: đệ tử thứ 6 thực ra là MC từ 50 năm tương lai (cosmic time-loop) trở về dạy MC. MC self-mentor xuyên thời gian. Reveal: cosmic time-loop để cứu Ngũ Trang Quán khỏi cosmic invasion 50 năm sau. Endgame: MC 50t trở về thời quá khứ dạy MC 18t — closure cosmic loop.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Vô Danh Sơn Trang: Bán Ngũ Vị Tử Cho Cả Võ Lâm Đại Việt',
    slug: 'vo-danh-son-trang-ban-ngu-vi-tu-cho-ca-vo-lam-dai-viet',
    genre: 'kiem-hiep',
    main_character: 'Phạm Lan Anh',
    description: 'Phạm Lan Anh thầy thuốc Vô Danh Sơn Trang (núi Yên Tử) — bán ngũ vị tử (thảo dược hiếm). Cả võ lâm Đại Việt phải qua MC mua. MC bí mật là Y Tổ — không lộ.',
    world_description: 'Đại Việt cổ đại võ lâm — núi Yên Tử Quảng Ninh. MC Phạm Lan Anh (28t female thầy thuốc) mở "Vô Danh Sơn Trang" trên đỉnh Yên Tử. Bán ngũ vị tử (thảo dược cosmic-tier chữa nội thương cấp 9, công thức Y Tổ Đại Việt cổ). Cả võ lâm 7 môn phái + 30 cao thủ ẩn dật phải qua MC mua. MC bí mật là Y Tổ Đại Việt Phạm Tổ Sư reincarnate (kế thừa cosmic medical lineage 800 năm). Không lộ ID. Đại hiệp đến cầu thuốc đều quỳ vì giá rẻ + chất lượng cosmic. Cuối truyện cosmic invasion threaten võ lâm — MC reveal Y Tổ identity. Endgame: cosmic alliance võ lâm + MC defend Đại Việt.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Hai Kiếm Phái Đệ Nhất Đều Là Sư Phụ Của Ta',
    slug: 'hai-kiem-phai-de-nhat-deu-la-su-phu-cua-ta',
    genre: 'kiem-hiep',
    main_character: 'Trần Lập',
    description: 'Trần Lập là đệ tử bí mật của 2 kiếm phái đối địch — Bắc Sơn + Nam Hà. Cả 2 sư phụ không biết nhau. MC tu luyện 2 kiếm pháp song song. Dung hợp tạo Đệ Tam Kiếm Pháp.',
    world_description: 'Đại Việt cổ đại võ lâm. 2 kiếm phái đệ nhất đối địch 200 năm: Bắc Sơn Kiếm Phái (Lạng Sơn) + Nam Hà Kiếm Phái (Cần Thơ). MC Trần Lập (20t cô nhi) được Bắc Sơn Tôn Sư + Nam Hà Tôn Sư cùng nhận đệ tử (kiếp trước cosmic mandate). MC ban ngày Bắc Sơn, ban đêm Nam Hà — di chuyển qua cosmic teleport gia truyền. Cả 2 sư phụ không biết nhau. MC tu luyện 2 kiếm pháp song song. Năm 35t MC dung hợp 2 kiếm pháp tạo "Đệ Tam Kiếm Pháp" cosmic-tier — vượt cả 2 sư phụ. Reveal: 2 kiếm phái thực ra là 2 mảnh 1 cosmic kiếm pháp cổ chia ra 200 năm trước, MC = the chosen unifier. Endgame: cosmic invasion, 2 phái thống nhất under MC.',
    total_planned_chapters: 1000,
  },

  // ── QUAN-TRUONG (4) ──
  {
    title: 'Trợ Lý Tỉnh Trưởng: Mỗi Quyết Định Là Của Tôi',
    slug: 'tro-ly-tinh-truong-moi-quyet-dinh-la-cua-toi',
    genre: 'quan-truong',
    main_character: 'Trần Tâm Đức',
    description: 'Trần Tâm Đức trợ lý 28t Tỉnh trưởng An Giang — Tỉnh trưởng già 65t chỉ ký giấy. Mọi quyết định chính sách do MC. 3 năm sau An Giang top kinh tế ĐBSCL.',
    world_description: 'Bối cảnh: An Giang 2024-2027. MC Trần Tâm Đức (28t tốt nghiệp ĐH Quốc Gia HN khoa Chính Trị, master Public Policy Harvard online) trở thành Trợ Lý Tỉnh Trưởng An Giang. Tỉnh Trưởng Lê Văn Bình (65t) sắp nghỉ hưu, chỉ ký giấy — mọi quyết định chính sách do MC viết. Mô hình: kinh tế nông nghiệp + tech, đầu tư FDI, hạ tầng. 3 năm sau (2027) An Giang top kinh tế ĐBSCL (GDP +200%). Lê Văn Bình nghỉ hưu — đề xuất MC kế nhiệm. MC 31t trở thành Tỉnh Trưởng trẻ nhất VN. Realpolitik + slow burn. Endgame: MC 40t Bộ Trưởng KH&CN, then Phó Thủ Tướng.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Bí Thư Trẻ Nhất Việt Nam: Tôi 30 Tuổi, Tỉnh Tôi 12 Triệu Dân',
    slug: 'bi-thu-tre-nhat-viet-nam-toi-30-tuoi-tinh-toi-12-trieu-dan',
    genre: 'quan-truong',
    main_character: 'Lê Tâm Vĩ',
    description: 'Lê Tâm Vĩ bí thư tỉnh ủy 30t — tỉnh 12 triệu dân. Đối mặt 3 phe kỳ cựu. Mỗi quyết định là một trận chiến chính trị. 5 năm sau MC trở thành Trưởng ban Tổ chức TW.',
    world_description: 'Bối cảnh: VN 2026-2031. MC Lê Tâm Vĩ (30t tốt nghiệp đoàn TW, từng làm Phó Bí thư Tỉnh ủy Bình Định 2 năm) được bổ nhiệm Bí Thư Tỉnh Ủy Thanh Hóa (12 triệu dân, top 5 tỉnh đông dân VN). Bí thư trẻ nhất nước. Đối mặt 3 phe kỳ cựu: phe Trần (kinh tế), phe Phạm (an ninh), phe Hoàng (giáo dục) — đều >60t. Mỗi quyết định = trận chiến chính trị. Strategy: align từng phe theo issue, không enemy permanent. 5 năm sau Thanh Hóa GDP top 3 VN. MC 35t trở thành Trưởng ban Tổ chức TW. Realpolitik VN authentic — không cosmic. Endgame: MC 45t Tổng Bí Thư.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Cục Trưởng Kỷ Luật Đảng: Vụ Án Đầu Tiên Là Bố Vợ Tôi',
    slug: 'cuc-truong-ky-luat-dang-vu-an-dau-tien-la-bo-vo-toi',
    genre: 'quan-truong',
    main_character: 'Phạm Tâm Trí',
    description: 'Phạm Tâm Trí cục trưởng UBKT Trung Ương 35t — vụ tham nhũng lớn đầu tiên dẫn về bố vợ. MC quyết định điều tra. Vợ MC chọn chồng. Bố vợ tù 25 năm.',
    world_description: 'Bối cảnh: HN 2026. MC Phạm Tâm Trí (35t Cục Trưởng UBKT Trung Ương Đảng CSVN) — vụ tham nhũng lớn đầu tiên dẫn về bố vợ Lê Văn Đức (62t Bộ Trưởng Kế Hoạch & Đầu Tư): tham ô $500M qua project FDI fake. MC dilemma: gia đình vs công lý. Vợ Lê Tâm Anh (32t) chọn chồng. MC quyết định điều tra. 6 tháng sau Lê Văn Đức bị bắt, tù 25 năm. Vợ MC + mẹ vợ ban đầu mất hết, dần hiểu MC làm đúng. Realpolitik authentic. MC tiếp tục — phá 7 vụ Bộ Trưởng tham nhũng. Endgame: MC 45t Bộ trưởng UBKT, cải cách Đảng.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Phó Chủ Tịch Phường Q.1: Tôi Quản Một Phường Trung Tâm Sài Gòn',
    slug: 'pho-chu-tich-phuong-q1-toi-quan-mot-phuong-trung-tam-sai-gon',
    genre: 'quan-truong',
    main_character: 'Hoàng Tâm Vinh',
    description: 'Hoàng Tâm Vinh phó chủ tịch phường Q.1 SG — bắt đầu từ phường nhỏ. Mỗi vấn đề (giải tỏa, ngập, an ninh) là chiến trường chính trị mini. 7 năm leo lên Chủ tịch Q.1.',
    world_description: 'Bối cảnh: SG 2024-2031. MC Hoàng Tâm Vinh (28t tốt nghiệp ĐH Luật HCM, từng làm chuyên viên Sở Nội vụ 3 năm) được bổ nhiệm Phó Chủ Tịch Phường Bến Nghé Q.1 SG (đông dân, trung tâm tài chính + du lịch). Mỗi vấn đề thường ngày = chiến trường chính trị mini: giải tỏa Chợ Bến Thành cho metro, ngập lụt mưa, an ninh phố Tây Đề Thám, bãi đỗ xe Q.1. MC + phong cách thực dụng (data-driven + nhiều người dân). 3 năm Chủ Tịch Phường. 5 năm Phó Chủ Tịch Q.1. 7 năm Chủ Tịch Q.1. Realpolitik VN. Endgame: MC 38t Bí Thư Q.1 + ứng viên Phó Chủ Tịch TP HCM.',
    total_planned_chapters: 1000,
  },

  // ── NGU-THU-TIEN-HOA (3) ──
  {
    title: 'Ngự Thú Sư Bắt Đầu Từ Một Con Mèo Đường Phố',
    slug: 'ngu-thu-su-bat-dau-tu-mot-con-meo-duong-pho',
    genre: 'ngu-thu-tien-hoa',
    main_character: 'Trần Tâm Hải',
    description: 'Trần Tâm Hải ngự thú sư cấp thấp nhất — pet đầu tiên là mèo nhặt ngoài đường. Mèo có Tuyến Tiến Hóa Ẩn — tiến hóa thành cosmic-tier Bạch Hổ Tổ Tiên trong 30 năm.',
    world_description: 'Bối cảnh: VN 2027 — toàn dân thức tỉnh ngự thú ability (cosmic event 2025). MC Trần Tâm Hải (18t cosmic test score lowest — ngự thú sư cấp 1). Bố mẹ không hỗ trợ — MC tự nhặt pet đường phố. Đầu tiên: mèo mun gầy gò gần bãi rác Q.4 SG (tên Tiểu Mun). Phát hiện Tiểu Mun có Tuyến Tiến Hóa Ẩn cosmic-tier (chỉ MC nhìn thấy). MC nuôi Tiểu Mun 30 năm — đánh thức tiến hóa từng giai đoạn: mèo đường phố → mèo cosmic → tiểu hổ → Bạch Hổ Tổ Tiên cosmic-tier. MC 48t là ngự thú sư duy nhất sở hữu cosmic-tier pet. Endgame: cosmic invasion Earth, MC + Bạch Hổ Tổ Tiên defend.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Pokemon Trainer VN: Bộ 6 Của Tôi Là 6 Loài Thú Mới',
    slug: 'pokemon-trainer-vn-bo-6-cua-toi-la-6-loai-thu-moi',
    genre: 'ngu-thu-tien-hoa',
    main_character: 'Lê Tâm Vũ',
    description: 'Lê Tâm Vũ ngự thú sư trẻ — bí mật evolve pet bằng dinh dưỡng + công thức ẩn. 6 pet đều là loài chưa từng có. Pokemon League không biết phân loại.',
    world_description: 'Bối cảnh: VN 2028 — Pokémon League VN chính thức tổ chức (post-cosmic event 2025). MC Lê Tâm Vũ (22t sinh viên Sinh Học ĐH Khoa Học Tự Nhiên HN) ngự thú sư mới ra trường. Bí mật: áp dụng dinh dưỡng molecular biology + công thức tiến hóa ẩn (golden finger memory cosmic-tier ancient ngự thú lineage). Bộ 6 pet đều là loài chưa từng có (Beedrill-Hybrid evolution → cosmic phoenix, etc.). Pokémon League không biết phân loại — đăng ký fail. MC tham gia giải underground. Win 3 năm liên tiếp. Reveal: pet MC = cosmic ancient species reincarnate. Endgame: cosmic ngự thú war VN + global, MC champion alliance.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Pet Phế Vật Hóa Thần: Con Chó Tôi Mua 50K Vỉa Hè',
    slug: 'pet-phe-vat-hoa-than-con-cho-toi-mua-50k-via-he',
    genre: 'ngu-thu-tien-hoa',
    main_character: 'Phạm Tâm Linh',
    description: 'Phạm Tâm Linh nghèo mua con chó đường phố Hà Nội 50K — pet rác cấp 1. Phát hiện chó này là Long Tổ Cosmic kiếp trước reincarnate. Nuôi 30 năm — chó hóa Rồng.',
    world_description: 'Bối cảnh: HN 2027 — toàn dân thức tỉnh ngự thú. MC Phạm Tâm Linh (24t nghèo, lương 5tr/tháng) không mua được pet quý — mua con chó đường phố vỉa hè Đường Lê Duẩn HN 50,000 VND (loại "rác cấp 1"). Tên Tiểu Mỡ. Phát hiện Tiểu Mỡ thực ra là Long Tổ Cosmic kiếp trước reincarnate (cosmic karmic punishment ngủ qua 1000 năm). MC nuôi Tiểu Mỡ 30 năm — gradual reveal: chó → tiểu long → trung long → Long Tổ Cosmic. Mỗi giai đoạn thay đổi vận mệnh MC (giàu, ngộ pháp, võ học). 54t MC là người đầu tiên VN sở hữu Long Tổ Cosmic pet. Endgame: cosmic Long Tộc war, Tiểu Mỡ reveal full power leader.',
    total_planned_chapters: 1000,
  },

  // ── KHOAI-XUYEN (2) ──
  {
    title: 'Bù Đắp Pháo Hôi: 100 Thế Giới Ta Cứu 100 Cô Gái',
    slug: 'bu-dap-phao-hoi-100-the-gioi-ta-cuu-100-co-gai',
    genre: 'khoai-xuyen',
    main_character: 'Trần Tâm Vũ',
    description: 'Trần Tâm Vũ nhân viên Hệ thống Bù Đắp — mỗi thế giới một pháo hôi. MC cứu, trao tài nguyên, để cô ấy sống tốt. 100 thế giới sau MC ngộ ra — 100 cô gái đều là phiên bản vợ kiếp trước.',
    world_description: 'Hub Space cosmic. MC Trần Tâm Vũ (32t kiếp trước CEO VN, vợ Phạm Thu Hương chết 2024 tai nạn xe, MC mất 5 năm trầm cảm) accept Hệ thống Bù Đắp — mỗi thế giới xuyên thành male identity gặp 1 pháo hôi (cô gái bị bỏ rơi nguyên truyện). MC cứu, trao tài nguyên, để cô ấy sống tốt. 100 thế giới (cổ đại + hiện đại + dị giới + sci-fi). Cô gái 1-99 MC không nhận ra. Thế giới 100 MC phát hiện: 100 cô gái đều là 100 phiên bản multiverse của Phạm Thu Hương vợ kiếp trước. Hệ Thống reveal: cosmic karma MC cứu vợ qua 100 multiverse. Endgame: MC merge 100 instances lại thành Hương cosmic, retire Hub Space happily.',
    total_planned_chapters: 1000,
  },
  {
    title: 'Mỗi Thế Giới Ta Là Mẹ Của Phản Phái',
    slug: 'moi-the-gioi-ta-la-me-cua-phan-phai',
    genre: 'khoai-xuyen',
    main_character: 'Lê Tâm Lan',
    description: 'Lê Tâm Lan nhân viên Hệ thống — mỗi thế giới xuyên thành mẹ phản phái lúc phản phái 5t. MC nuôi đứa trẻ thành người tốt — phản phái không phá thế giới. Heroine: "Why is the villain so soft now?"',
    world_description: 'Hub Space cosmic. MC Lê Tâm Lan (35t kiếp trước teacher mầm non HN, qua đời ung thư) — accept Hệ thống Bù Đắp Mẫu Thân. Mỗi thế giới xuyên thành mẹ phản phái (Final Boss) lúc phản phái 5t — đứa bé sau này gây tan nát nguyên truyện. MC nuôi 13-20 năm bằng tình mẫu tử thực sự (không ép, không tham vọng). Phản phái lớn lên humane — không phá thế giới. Nguyên heroine (original heroine từng diệt phản phái) bối rối: "Why is the villain so soft now?" Heroine quan sát thấy MC — kế thừa Tâm Lan philosophy. 100 thế giới sau MC = "Cosmic Maternal Archetype". Endgame: cosmic mother goddess heritage activate, MC + 100 redeemed villains cosmic alliance.',
    total_planned_chapters: 1000,
  },

  // ── QUY-TAC-QUAI-DAM (1) ──
  {
    title: 'Quy Tắc Trường Vạn Phúc: Quy Tắc 13 Là Đừng Nhìn Cô Giáo Toán',
    slug: 'quy-tac-truong-van-phuc-quy-tac-13-la-dung-nhin-co-giao-toan',
    genre: 'quy-tac-quai-dam',
    main_character: 'Trần Tâm Lan',
    description: 'Trần Tâm Lan học sinh lớp 11 trường Vạn Phúc — nhận 20 quy tắc ngày khai giảng. Vi phạm 1 = mất tích. MC tuân thủ — phát hiện quy tắc 13 mâu thuẫn quy tắc 8. Phải chọn 1.',
    world_description: 'Bối cảnh: VN 2027 — trường THPT Vạn Phúc (private cosmic-tier ẩn) Hà Đông HN. MC Trần Tâm Lan (17t học sinh lớp 11) nhận 20 quy tắc ngày khai giảng. Quy tắc kỳ lạ: "Đừng nhìn cô giáo toán trực diện sau 14h", "Không bao giờ ăn cơm trong nhà ăn quá 7 phút", "Nếu bạn cùng bàn nói tên thật, đứng dậy ngay". Vi phạm = mất tích vĩnh viễn. MC tuân thủ 6 tháng — 5 bạn cùng lớp mất tích. Phát hiện quy tắc 13 ("Đừng nhìn cô giáo toán") mâu thuẫn quy tắc 8 ("Phải làm bài kiểm tra toán 30 phút"). MC phải chọn 1 — chọn không nhìn, fail kiểm tra. Trường evolve quy tắc test MC. Reveal: trường = cosmic horror entity training ground chọn cosmic guardians. MC pass test. Endgame: cosmic invasion Earth, MC + 20 graduates Vạn Phúc cosmic alliance.',
    total_planned_chapters: 1000,
  },
];

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function createNovelAndProject(seed: NovelSeed, ownerId: string): Promise<string | null> {
  const { data: existing } = await s.from('novels').select('id').eq('slug', seed.slug).maybeSingle();
  if (existing) {
    console.log(`  ⚠ Slug ${seed.slug} exists — skip`);
    return null;
  }

  const { data: novel, error: novelErr } = await s.from('novels').insert({
    title: seed.title,
    slug: seed.slug,
    author: 'Truyện City',
    description: seed.description,
    genres: [seed.genre],
    status: 'Đang ra',
  }).select('id').single();
  if (novelErr || !novel) throw new Error(`novel: ${novelErr?.message}`);

  const { data: project, error: projErr } = await s.from('ai_story_projects').insert({
    novel_id: novel.id,
    user_id: ownerId,
    genre: seed.genre,
    main_character: seed.main_character,
    world_description: seed.world_description,
    total_planned_chapters: seed.total_planned_chapters,
    current_chapter: 0,
    status: 'paused',
    pause_reason: 'phase_l_100ideas_2026-05-11',
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'deepseek-v4-flash',
    style_directives: { disable_chapter_split: true },
  }).select('id').single();
  if (projErr || !project) throw new Error(`project: ${projErr?.message}`);
  console.log(`  ✓ ${project.id} | ${seed.title.slice(0, 50)}`);
  return project.id;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase L: 100 ideas spawn (${SEEDS.length}/100) ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const byGenre = new Map<string, number>();
  for (const seed of SEEDS) {
    byGenre.set(seed.genre, (byGenre.get(seed.genre) ?? 0) + 1);
  }
  console.log('Genre distribution:');
  for (const [g, c] of [...byGenre.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g.padEnd(25)} ${c}`);
  }
  console.log('');

  if (!apply) {
    console.log('DRY RUN. Pass --apply to execute.\n');
    return;
  }

  const ownerId = await getOwnerId();
  let ok = 0, fail = 0;
  for (const seed of SEEDS) {
    try {
      const id = await createNovelAndProject(seed, ownerId);
      if (id) ok++;
    } catch (e) {
      console.error(`  ✗ ${seed.title}: ${(e as Error).message}`);
      fail++;
    }
  }
  console.log(`\nSummary: ${ok} success, ${fail} failed\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
