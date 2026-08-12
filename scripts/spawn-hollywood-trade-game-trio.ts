/**
 * Spawn 3 sảng văn novels:
 *
 * 1) Đạo Diễn Hollywood 1991: MC đạo diễn phim Việt 2026 trọng sinh thành
 *    Adam Carter 18t Los Angeles 1991 — nhớ classic films từ kiếp trước
 *    (Pulp Fiction, Matrix, Titanic, LotR, Avengers, Inception, Parasite...)
 *    → adapt + film trước thời điểm gốc → trở thành huyền thoại Hollywood.
 *    Reference: 《Hollywood 1990》《Director in Hollywood》《Adrian's Story》.
 *
 * 2) Song Xuyên Thương Hội: MC sinh viên kinh tế VN 25t mở thừa kế tiệm
 *    tạp hóa cha → bind hệ thống "Vạn Giới Thương Hội" — mỗi ngày 4 giờ
 *    portal mở đến 1 thế giới (Tam Quốc / Đường / xianxia / Western fantasy
 *    / mạt thế / sci-fi). Earth tech (smartphone, antibiotic, sách kỹ
 *    thuật) ↔ linh thạch / cổ vật / magic artifacts → arbitrage tăng tài
 *    sản exponential. Reference: 《我家超市通万界》《诸天最强交易所》.
 *
 * 3) Game Developer Thế Giới Song Song: MC lập trình viên game Việt 28t
 *    đột tử → tỉnh trong Trái Đất song song 2015 — tech cao (VR + AI hoàn
 *    chỉnh) nhưng GAME NHÀM CHÁN (chỉ có puzzle + arcade đơn giản, không có
 *    FPS / MOBA / open-world / battle royale). MC nhớ CS, LoL, Minecraft,
 *    GTA V, PUBG, Elden Ring, Genshin, Fortnite → ra game thống trị ngành.
 *    Reference: 《全能游戏设计师》《我的游戏帝国》《超神游戏制作人》.
 *
 * Cron pickup tự động via `production_enabled=true`.
 *
 * Run dry: `npx tsx scripts/spawn-hollywood-trade-game-trio.ts`
 * Apply:   `npx tsx scripts/spawn-hollywood-trade-game-trio.ts --apply`
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
  // ── 1. ĐẠO DIỄN HOLLYWOOD 1991 ─────────────────────────────────────
  {
    title: 'Hollywood 1991: Ta Là Đạo Diễn Trẻ Mang Cả Trăm Phim Kinh Điển',
    slug: 'hollywood-1991-ta-la-dao-dien-tre-mang-ca-tram-phim-kinh-dien',
    genre: 'do-thi' as const,
    main_character: 'Adam Carter',
    description:
      'Đạo diễn phim Việt 35 tuổi Phan Vĩnh Lâm đột tử trên phim trường vì kiệt sức — tỉnh dậy thân phận Adam Carter 18 tuổi, sinh viên Đại học Nghệ thuật UCLA Los Angeles, năm 1991. Trong đầu Lâm ngồn ngộn ký ức 35 năm Việt Nam kiếp trước: 10.000+ bộ phim đã xem, 200+ phim đã thực hiện hoặc nghiên cứu — từ "Pulp Fiction" (1994) đến "The Matrix" (1999), "Titanic" (1997), "Lord of the Rings" (2001), "Inception" (2010), "Avengers Endgame" (2019), "Parasite" (2019), "Top Gun Maverick" (2022). Hollywood năm 1991 đang chuyển mình — Tarantino chưa nổi, Disney mới buy Pixar, CGI sắp explode với "Jurassic Park" 1993. Carter có 5 năm trước khi Pulp Fiction ra mắt để self-finance một bộ phim indie noir mở đường, sau đó từng bộ phim huyền thoại đều được hắn film trước thời điểm gốc — từ phòng thu indie hậu trường, hắn xây dựng đế chế đạo diễn lớn nhất lịch sử Hollywood, vượt Spielberg + Cameron + Nolan kết hợp.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC trẻ vô danh ở Hollywood 1991 dùng kho tàng ký ức 30+ năm phim kinh điển kiếp trước (Pulp Fiction, Matrix, Titanic, Avengers, Parasite, Inception...), film trước thời điểm gốc → biến từ sinh viên UCLA nghèo thành đạo diễn huyền thoại Hollywood, vượt Spielberg + Cameron + Tarantino kết hợp.
- Protagonist Engine: Adam Carter thắng bằng kho tàng 10.000+ bộ phim đã xem kiếp trước + 15 năm kinh nghiệm đạo diễn phim Việt + Hệ Thống Phim Khố Hollywood (UI nội tâm liệt kê chi tiết của từng bộ phim với đầy đủ kịch bản, shot list, casting recommendations, budget breakdown, release strategy). Hắn không cần invent — hắn execute với precision của showrunner đẳng cấp 2026.
- Pleasure Loop: Carter chọn 1 bộ phim từ Phim Khố (vd: Reservoir Dogs 1992) → adapt + writing script trong 2 tuần → pitch cho indie producer / studio nhỏ → bị từ chối hoặc accept với budget tight → MC tự đạo diễn → film hit Sundance / Cannes → critic + box office tung hô → studio lớn xếp hàng pitch tiếp theo → bigger budget + bigger film.
- System Mechanic: Hệ Thống Phim Khố Hollywood (Cosmic Cinema Library). Input: tâm trí MC focus vào tên 1 bộ phim đã xem kiếp trước + 1 điểm Đạo Diễn Khí (DK). Output: UI hiện đầy đủ trong tâm trí MC — full script + shot list (mỗi scene) + casting recommendations + cinematography notes + budget breakdown + release strategy + box office trajectory + critics' famous reviews + cultural impact. Limit: ban đầu 1 truy xuất / tuần; mỗi level up + 1; mỗi bộ phim MC complete + release thực tế tặng 5-50 điểm DK.
- Phase 1 Playground: UCLA Film School campus, Sunset Strip Los Angeles, Indie production houses ở Burbank, Sundance Park City. MC vận hành Phim Khố → script → indie pitch → film → award circuit → bigger studio interest.
- Social Reactor: Sarah Connor (bạn cùng lớp UCLA — Tài năng cinematography), Mike "Mick" Sullivan (sinh viên producer mê risk-taking — đầu tư indie đầu tiên cho MC), Quentin Tarantino (chính chàng — Carter ra mắt Reservoir Dogs 6 tháng trước Tarantino, biến cả industry ngạc nhiên), Roger Ebert (Chicago Sun-Times critic — review Carter's first film "10/10 masterpiece"), Harvey Weinstein (Miramax Founder — đề nghị distribution deal Phase 2).
- Novelty Ladder: Ch.1-30 (UCLA film school + indie noir thriller "Reservoir Dogs Tân Truyện" — Sundance vô địch). Ch.30-80 ("Pulp Fiction" Cannes Palme d'Or + studio đầu tiên ký hợp đồng 3 phim). Ch.80-150 ("The Matrix" cách mạng CGI + thành lập studio Carter Pictures). Ch.150-300 ("Titanic Tân Truyện" $2 tỷ box office + "LotR" trilogy preparation). Ch.300+ (Carter Pictures trở thành Disney/Warner level studio + MC làm chủ Marvel + DC + Pixar).
- Control Rules: Payoff sản phẩm mỗi 3-5 chương (1 phim hoàn thành, 1 award giành được); payoff industry mỗi 15-20 chương (studio deal lớn, critic recognition). Attention Gradient: UCLA campus → Indie producer Hollywood → Studio system → Quốc tế Cannes/Sundance → Cosmic cinema control.

### BỐI CẢNH
Hollywood 1991 — thời điểm chuyển mình cực kỳ thú vị cho phim ngành: Disney vừa buy Pixar (1991), CGI sắp explode với "Jurassic Park" 1993 + "Toy Story" 1995, indie boom với Tarantino "Reservoir Dogs" 1992 + Miramax rise + Sundance Festival establish. Trước "Pulp Fiction" 1994 còn 3 năm — đủ để 1 đạo diễn vô danh self-finance bộ noir indie và occupy slot Tarantino.

Studio system: 6 major (Universal, Paramount, Warner Bros, 20th Century Fox, Sony Pictures Columbia, Disney) + 100+ indie. Budget: indie $1-5M, mid $10-30M, major $30-80M, blockbuster $100M+. Sundance Park City January, Cannes May, Toronto September, Oscar March. Box office: $100M = blockbuster, $500M = mega-hit, $1B = generational classic (chỉ "Jurassic Park" 1993 đạt mốc $1B trước "Titanic" 1997).

UCLA School of Theater, Film and Television là tier-1 program tại Los Angeles, 4 năm BFA Filmmaking, 200 sinh viên. Carter ở junior year, gia đình middle-class New Jersey gốc Ý, bố là kế toán, mẹ là teacher. Đang preparing thesis film — "8 phút short" theo curriculum (typical UCLA junior).

### NHÂN VẬT CHÍNH
- Tên: Adam Carter
- Tuổi: 18 tuổi (kiếp trước 35t, Phan Vĩnh Lâm — đạo diễn phim VN 15 năm kinh nghiệm, từng làm 12 phim điện ảnh + 5 series Netflix, đột tử vì kiệt sức trên phim trường "Cây Táo Nở Hoa Mùa Đông")
- Nghề/Trạng thái: Junior năm 3 UCLA School of Theater, Film and Television. Major: Filmmaking. GPA: 3.5 (kém vì career trước đột tử focus practical). Đang chuẩn bị thesis film 8 phút theo curriculum.
- Tài sản hiện tại: $3,200 trong tài khoản ngân hàng (tiết kiệm từ part-time job pizza delivery), một Bolex 16mm cũ + 5 cuộn film stock Kodak, một MacBook 1991 cấu hình thấp (chưa có editing software), một xe Toyota Corolla 1985 60.000 miles. Gia đình bố mẹ middle-class New Jersey, không hỗ trợ tài chính ngoài tuition.
- Tính cách: Trầm tĩnh + máu lửa khi cần (combo 15 năm phim trường + đam mê visual storytelling), bảo vệ artistic vision cực kỳ. Quản lý budget chặt chẽ + lý trí. Không tin Hollywood politics dễ dàng — biết Weinstein là kẻ nguy hiểm sau scandal 2017 (chưa biết tránh thế nào để không lộ kiếp trước).
- Điểm yếu: Tiền không có, network không có (UCLA chỉ là campus + group bạn), reputation $0. Phải tự build từ đầu. Tuổi 18 nhìn quá trẻ — pitch script với 40-50t studio exec ban đầu KHÔNG ai take seriously.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Phim Khố Hollywood (Cosmic Cinema Library System).
- Cơ chế hoạt động: Trong tâm trí MC có UI ánh xanh nhạt — danh sách "Films Recalled" liệt kê tên 10.000+ bộ phim hắn đã xem hoặc nghiên cứu kiếp trước. Mỗi phim có metadata đầy đủ: full script (revisable), shot list (mỗi scene 50-200 shots), casting recommendations (3-5 lựa chọn cho mỗi role với rationale), cinematography notes (lens choice, lighting, color grade), budget breakdown ($1M-$500M tùy phim), production timeline, release strategy, box office projection, critic responses (Ebert, Pauline Kael, etc.), cultural impact analysis. Khi MC truy xuất 1 phim, toàn bộ info hiện trong tâm trí — hắn có thể tự sửa scenes / casting / setting để adapt cho 1991 era nếu cần.
- Trigger kích hoạt: Mỗi truy xuất tốn 1 điểm Đạo Diễn Khí (DK). MC khởi đầu 50 DK. Truy xuất nhanh (< 30 giây) tốn 1 DK; deep dive (đọc full script) tốn 5 DK; deep modification (rewrite scenes for 1991) tốn 10 DK. Mỗi phim MC complete + release thành công tặng 5-50 DK (tùy box office + critic + Award).
- Đường tăng trưởng cấp Đạo Diễn:
  • L1 (ch.1-30): Sinh viên indie. Self-finance + festival circuit.
  • L2 (ch.30-80): Indie auteur. Studio distribution deal.
  • L3 (ch.80-150): Studio director. Mid-budget $20-40M films.
  • L4 (ch.150-250): Blockbuster director. $100M+ budget.
  • L5 (ch.250-400): Studio mogul. Carter Pictures established.
  • L6 (ch.400-700): Industry titan. Buy + control major studio.
  • L7 (ch.700-1000): Cosmic cinema — make films across 多 universes, hợp nhất với "Cinema phần Thiên Đạo".
- Điểm yếu: Phim Khố chỉ TRUY XUẤT — KHÔNG TỰ VIẾT. MC phải work với đội ngũ (cinematographer, editor, sound designer, actors) để execute. Mỗi phim mất 6-18 tháng từ pre-production đến release. Mỗi quyết định casting / studio politics MC phải tự lo. CẤM MC reveal kiếp trước — nếu lộ → cosmic punishment.

### CAST CHÍNH
- Sarah Connor — bạn cùng lớp UCLA (19t, cinematography major) — Tài năng A, sau này là DP (Director of Photography) chính của MC. Đầu tiên tin MC từ chương 3 sau khi xem script "Reservoir Dogs Tân Truyện" — Love interest chính + đối tác production lifelong.
- Mike "Mick" Sullivan — sinh viên producer (20t, business major) — Cá lớn Hollywood future, đầu tư $50K cuối ch.10 cho indie đầu tiên MC + trở thành producer + business partner — Cánh tay phải kinh doanh.
- Diane Lambert — talent agent trẻ tại CAA Beverly Hills (28t, ambitious) — Đầu tiên ký với MC sau Sundance Award — Network MC vào Hollywood A-list.
- Roger Ebert — Chicago Sun-Times critic (50t, 1991 đỉnh điểm career) — Review "Reservoir Dogs Tân Truyện" 10/10 chương 25, thiết lập MC's reputation toàn quốc — Người chứng nhận MC là master.
- David Lynch — đạo diễn indie ngầm Hollywood (45t, đã có "Blue Velvet" 1986) — Mentor + drinking buddy của MC sau khi xem indie đầu tiên — Đồng minh ngành Phase 1-2.
- Yuki Tanaka — diễn viên Nhật trẻ (22t, gốc Tokyo, model + actress) — Female lead trong phim "Lost in Translation" Carter làm 1995 (8 năm trước phim gốc 2003 với ScarJo) — Vợ tương lai Phase 2.

### ANTAGONISTS
- Harvey Weinstein — Miramax founder (39t năm 1991, đã có thành tựu) — Đối thủ chính trị Phase 1-2 — Đề nghị distribution deal nhưng Carter biết Weinstein scandals từ kiếp trước, từ chối kéo theo Miramax oppose Carter. Cuối Phase 2 Carter setup pre-emptive media expose Weinstein từ 1995 thay vì 2017 (20+ năm sớm).
- James Cameron — đạo diễn 37t đã thành công với "Aliens" 1986 + "T2" 1991 — Đối thủ kỹ thuật Phase 2-3 — Cảm thấy Carter ăn cắp "ý tưởng tương lai" như Matrix 1999. Sẽ trở thành rival of all time.
- Joseph "Joe" Bianco — Mafia don tại Las Vegas (60t) — Đối thủ tài chính Phase 1-2 — Cố ép Carter accept "investment" vào phim đầu để rửa tiền. Carter từ chối khéo léo và setup chống lại.
- Studio executive Paul Stein — VP Sony Pictures (50t) — Đối thủ Phase 2-3 — Steal Carter's "Matrix" pitch từ failed studio meeting và try to develop competing project; bị Carter face-slap khi Matrix Carter release trước, Sony failure project flop.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — UCLA + Indie noir + Sundance: Goal — Carter complete + release "Reservoir Dogs Tân Truyện" tại Sundance Festival January 1992 (6 tháng trước Tarantino), giành Grand Jury Prize, gây bão Hollywood industry. Milestone — Roger Ebert review 10/10 (ch.45) + Diane Lambert (CAA) ký với MC (ch.80). Stakes — Nếu indie đầu fail, MC mất $50K của Mick + reputation về 0.
- PHASE 2 (Ch.100-300) — "Pulp Fiction" Cannes + Studio system entry: Goal — Carter direct "Pulp Fiction Tân Truyện" Cannes 1993, win Palme d'Or, sign 3-picture deal Universal Studios. Milestone — "Matrix Tân Truyện" 1995 cách mạng CGI (ch.200), $400M box office. Stakes — Cameron + Weinstein liên minh chống Carter.
- PHASE 3 (Ch.300-600) — Carter Pictures studio + Titanic + LotR: Goal — Carter founded Carter Pictures, "Titanic Tân Truyện" 1996 $2B box office, "Lord of the Rings" trilogy 1998-2000. Milestone — Carter Pictures IPO 1999 với valuation $5B (ch.450). Stakes — Major studios cartel pressure để destroy Carter Pictures.
- PHASE 4 (Ch.600-1000) — Cosmic cinema empire: Goal — Carter Pictures absorb Marvel + DC + Pixar + Lucasfilm. Endgame: MC chọn giữa retire ngôi vua điện ảnh + về Việt Nam kiếp trước cứu vợ con đã chết tai nạn 2025. Milestone — Cosmic reveal về Phim Khố Thiên Đạo (ch.900). Stakes — Thiên Đạo cũ muốn absorb MC + Phim Khố.

### OPENING SCENE
- Location: Ký túc xá UCLA Hedrick Hall room 412, 5 giờ sáng tháng 9 năm 1991, ánh đèn neon ngoài hành lang lờ mờ chiếu vào phòng đôi 12m² Carter share với roommate James.
- MC hành động: Adam Carter bừng tỉnh trong cơn đau đầu chát chúa, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam — 35 năm Phan Vĩnh Lâm, 15 năm đạo diễn 12 phim điện ảnh + 5 series Netflix, 10.000+ bộ phim đã xem hoặc nghiên cứu. Cùng lúc đó, trong tâm trí Carter bật lên giao diện UI ánh xanh: "Hệ Thống Phim Khố Hollywood — Active. Đạo Diễn Khí: 50/50. Films Recalled: 10,847. Sẵn sàng truy xuất?" Carter nín thở — UI hoàn toàn thật, danh sách phim từ "12 Angry Men" 1957 đến "Top Gun Maverick" 2022.
- Hook event: Carter chọn random "Reservoir Dogs" 1992 — Quentin Tarantino debut chưa ra mắt. Truy xuất tốn 1 DK. Trong 30 giây, toàn bộ script + shot list + casting recommendations hiện ra trong tâm trí — gangster heist gone wrong, 6 robbers in colored aliases (Mr. White, Mr. Pink, Mr. Blonde...), warehouse setting, $300K budget, Sundance January 1992. Carter ngồi dậy bệt xuống ghế làm việc, tay run nhẹ — hắn có 4 tháng để pre-production + filming + post + Sundance submission deadline. Hắn mở MacBook cũ, bắt đầu typing kịch bản đầu tiên: "INT. UNCLE BOB'S COFFEE SHOP — DAY. Eight men in black suits sit around a table..."
- Câu mở đầu: "Năm 1991 này, Tarantino vẫn đang vô danh ở video store Manhattan Beach, và ta — Adam Carter, 18 tuổi sinh viên UCLA — có 4 tháng để giành mất Sundance 1992 trước hắn, biến cả Hollywood phải chú ý."

### WORLD RULES
- Phim Khố là bí mật tuyệt đối của MC — Carter giả vờ "có ý tưởng kỳ quặc + xem nhiều phim quốc tế kỳ lạ".
- Hollywood era 1991 đang transition: studio system mạnh nhưng indie boom đang đến (Sundance + Miramax + Tarantino).
- Carter PHẢI film các phim BEFORE thời điểm gốc — sau khi 1 phim gốc release, Carter version sẽ bị accused plagiarism. Timing critical.
- Mỗi phim cần 6-18 tháng từ pre-production đến release. MC phải parallel plan 2-3 dự án.
- Cosmic reveal Phase 4: Phim Khố là 1 mảnh "Cinema phần Thiên Đạo" — Carter là sứ giả mang cinema từ thế hệ 2020 về 1991.

### TONE & ANTI-PATTERNS
- TONE: Showman tự tin 40% + ấm áp đối với cast/crew 25% + face-slap đối thủ industry 20% + cosmic Phase 4 + 15%. Pacing nhanh — mỗi 3-5 chương có 1 milestone phim (pre-production complete, shooting wrap, festival selection, award win). Tham khảo nhịp 《Hollywood 1990》.
- NEGATIVE SPACE:
  • KHÔNG là "MC viết script trong 1 đêm" thô — mỗi phim cần adapt cho 1991 era (kỹ thuật CGI, casting available, social context).
  • KHÔNG hậu cung sa đà — Sarah Connor + Yuki Tanaka + 1-2 nữ phụ key.
  • KHÔNG dùng Phim Khố lazy — MC phải work với crew, casting đúng, budget realistic, marketing plan.
  • KHÔNG drama gia đình bố mẹ — bố mẹ NJ làng nhàng, không cần xen vào.
  • KHÔNG tu tiên kiểu cũ — Carter "đột phá" bằng film release + award + box office milestone.
  • KHÔNG vi phạm timeline thực tế — Reservoir Dogs Carter must release TRƯỚC Tarantino January 1992.
`,
    total_planned_chapters: 1000,
  },

  // ── 2. SONG XUYÊN VẠN GIỚI THƯƠNG HỘI ───────────────────────────────
  {
    title: 'Vạn Giới Thương Hội: Mỗi Ngày Bốn Giờ Đi Buôn Đa Thế Giới',
    slug: 'van-gioi-thuong-hoi-moi-ngay-bon-gio-di-buon-da-the-gioi',
    genre: 'do-thi' as const,
    main_character: 'Trần Vũ Hào',
    description:
      'Sinh viên kinh tế VN 25 tuổi Trần Vũ Hào về quê thừa kế tiệm tạp hóa 30m² của bố sau khi bố đột tử vì tai nạn — đêm đầu tiên ngủ lại trong tiệm, đột nhiên một cánh cổng ánh xanh mở ra giữa kho hàng. Trong đầu Vũ Hào vang lên giọng nói cosmic: "Bind Hệ Thống Vạn Giới Thương Hội thành công. Mỗi ngày 4 giờ portal mở đến 1 thế giới ngẫu nhiên/được chọn. Mua bán tự do giữa các thế giới. Tỷ giá tự điều chỉnh theo demand/supply. Welcome to multidimensional commerce, broker." Bước qua cổng, hắn đứng giữa chợ Đường Thành Trường An năm 632 — một bà lão bán bát thuốc đông y có thể chữa ung thư hiện đại đang ngồi vắng khách. Tiệm tạp hóa 30m² của bố lập tức trở thành đầu mối thương mại vĩ đại nhất nhân loại: smartphone bán cho gia đình Vương Hi Phượng Tam Quốc đổi lấy 100 chỉ vàng cổ trấn yểm, sách tu vi từ xianxia world bán cho cao thủ võ giả hiện đại, kháng sinh penicillin cứu cả triều đình Bắc Tống đổi lấy bản đồ kho báu Tần Thuỷ Hoàng. Mỗi ngày 4 giờ, mỗi thế giới một deal, Vũ Hào từ chủ tiệm tạp hóa nghèo trở thành tỷ phú vô danh điều khiển thương mại đa vũ trụ.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC sinh viên nghèo thừa kế tiệm tạp hóa 30m² của bố quá cố, đột nhiên bind hệ thống mở portal đa thế giới 4 giờ/ngày — biến tiệm nhỏ thành đầu mối thương mại vũ trụ, mỗi chương 1 deal arbitrage mới (smartphone đổi vàng cổ, kháng sinh đổi bản đồ Tần Thủy Hoàng, đan dược xianxia đổi tu vi cho cao thủ võ giả VN), tài sản từ $1000 lên $1 tỷ trong 100 chương.
- Protagonist Engine: Trần Vũ Hào thắng bằng kiến thức kinh tế Đại học Ngoại Thương VN (specialization International Trade + Supply Chain) + Hệ Thống Vạn Giới Thương Hội (cosmic broker portal). Hắn không cần đánh nhau — hắn là broker đa vũ trụ, mỗi deal arbitrage giữa 2 thế giới có incompatible economies = lợi nhuận khổng lồ. MC dần học cultivation từ xianxia trade + magic từ western fantasy trade + tech từ sci-fi trade → cá nhân hắn cũng mạnh lên qua cross-world training.
- Pleasure Loop: MC mở portal đến thế giới N → khảo sát market 30 phút → tìm 1 món cheap ở thế giới N (vàng cổ Tam Quốc, đan dược xianxia, magic potions Western fantasy) → mang về Earth tiệm → khách Earth hỏi mua (collectors, doctors, soldiers, cultivators) → bán giá gấp 10-1000 lần → tận dụng profit mua thêm Earth items mang về thế giới N (smartphone, antibiotics, tech books) → MC tài sản tăng exponential + khách Earth + khách thế giới N đều grateful + MC face-slap các tỷ phú Earth ngạc nhiên về wealth source bí ẩn.
- System Mechanic: Hệ Thống Vạn Giới Thương Hội (Multi-World Commerce Portal). Input: kích hoạt portal mỗi 5 giờ sáng (4 giờ window/ngày). MC chọn 1 thế giới từ danh sách 50+ thế giới mở khóa (ban đầu chỉ 3 thế giới: Tam Quốc, Đường, Tống cổ đại VN/TQ; mở khóa thêm thế giới sau khi level up Thương Hội Khí). Output: portal ánh xanh giữa kho tiệm Earth + tương ứng vị trí thế giới N. MC có thể đi qua lại trong 4 giờ. Mọi item mang theo / mang về được. Limit: 4 giờ/ngày, MISS nếu không kích hoạt; mỗi level up + 30 phút và + 5 thế giới mở khóa. Reward: mỗi deal thành công tặng 1-100 điểm Thương Hội Khí (THK) tùy giá trị; mỗi cosmic-level deal (cứu cả vương triều, deliver tech breakthrough) tặng 1000-10000 THK + cosmic recognition.
- Phase 1 Playground: Tiệm tạp hóa "Cửa Hàng Trần" 30m² ở thị xã Hà An (hư cấu) Việt Nam 2026, kho hàng phía sau (portal mở ở đây), 3 thế giới mở khóa ban đầu: Tam Quốc Trường An (208 AD), Đường Thành (632 AD), Tống Triều Khai Phong (1050 AD). MC vận hành Thương Hội → 1 deal/ngày → tài sản tăng exponential.
- Social Reactor: Mẹ Trần Lệ Hằng (mẹ MC, 50t, ban đầu lo MC ngày càng giàu bí ẩn nhưng tin MC), Đặng Minh Châu (cô bạn cùng lớp Đại học Ngoại Thương 25t, hiện làm thương hội tại Saigon, đối tác kinh doanh Earth), Vương Hi Phượng (gia chủ Vương gia Tam Quốc, mua smartphone đầu tiên ch.5), Lý Hoàng Đế Đường (vua Đường nghe tin tức MC qua sứ giả ch.40), bác sĩ Nguyễn Văn An (chuyên gia ung thư Bệnh viện K, mua đan dược xianxia chữa bệnh hiểm nghèo cho bệnh nhân).
- Novelty Ladder: Ch.1-30 (Tam Quốc + Đường + Tống cổ đại — vàng/đồ cổ/lụa thư đổi smartphone/antibiotic). Ch.30-80 (Xianxia world mở khóa — đan dược + linh thạch + công pháp đổi tech). Ch.80-150 (Western fantasy LotR + Harry Potter — magic potions + wand wood đổi gold). Ch.150-300 (Sci-fi + space + cyberpunk world mở khóa — AI tech đổi cultivation). Ch.300+ (50+ thế giới đầy đủ, MC trở thành cosmic broker).
- Control Rules: Payoff vật chất mỗi 2-3 chương (1 deal closed, profit cụ thể); payoff cosmic-level mỗi arc 20 chương (cứu 1 vương triều, MC level up cá nhân tu vi/magic). Attention Gradient: tiệm tạp hóa Hà An → quận xung quanh → giới tỷ phú VN → cosmic figures đa thế giới.

### BỐI CẢNH
Trái Đất Việt Nam 2026 — thế giới chính của MC. Tất cả các thế giới khác là parallel universes mở qua portal. Earth có internet + AI + smartphone + medical breakthrough nhưng KHÔNG có magic/cultivation. Vàng cổ tại Earth giá $200/chỉ; antibiotic đỉnh cao như vancomycin giá $50/liều; smartphone iPhone 17 Pro Max giá $1200; sách lập trình + binh pháp + y học hiện đại miễn phí online.

Thế giới Tam Quốc (208 AD Trường An): chiến tranh liên miên, nông dân chết đói, vàng + lụa + đồ cổ rẻ (vàng $5/chỉ tương đương Earth giá), tu vi quân sĩ võ giả sơ cấp, chưa có firearm. Cao thủ nhất Lữ Bố vũ lực 100 — đối với 1 khẩu súng AK-47 chỉ là target. Vương Hi Phượng (gia chủ Vương gia) là thương nhân + có quân riêng + cần tech để thắng Tào Tháo.

Thế giới Đường Thành (632 AD Trường An): Đường Triều thịnh thế dưới Lý Thế Dân, kinh tế dồi dào, văn hóa cosmopolitan (Phật giáo + Hồi giáo + Cơ Đốc giáo trộn lẫn), nhưng y học chỉ có đông y cổ điển, không có antibiotic + surgery hiện đại. Hoàng đế bệnh tật mãn tính cần thuốc Earth, đổi lấy vàng kho + bản đồ kho báu + cổ vật quý.

Thế giới Tống Triều (1050 AD Khai Phong): kinh tế phát triển nhất lịch sử cổ đại TQ, nhưng quân sự yếu đối với Liêu + Tây Hạ. Vua Tống nghèo về kỹ thuật quân sự, đổi vàng + lụa lấy súng + xe cộ Earth.

Thế giới Xianxia (mở khóa ch.30): đại lục tu tiên giả tưởng, không gắn với lịch sử Earth, có linh thạch + đan dược + công pháp + linh thú. Tu sĩ cấp Hậu Thiên tốt nghiệp + đan dược cấp Trung phẩm + công pháp cấp Hoàng phẩm có thể đổi tech books + medical equipment Earth.

### NHÂN VẬT CHÍNH
- Tên: Trần Vũ Hào
- Tuổi: 25 tuổi (kiếp này, không phải xuyên qua — tỉnh dậy nguyên thân với hệ thống mới)
- Nghề/Trạng thái: Vừa tốt nghiệp Đại học Ngoại Thương Hà An (hư cấu) Specialization International Trade + Supply Chain Management. Trước khi bố đột tử, đang chuẩn bị apply MBA Singapore. Hiện tại quay về Hà An nhận thừa kế tiệm tạp hóa "Cửa Hàng Trần" 30m² của bố.
- Tài sản hiện tại: Tiệm tạp hóa 30m² + kho hàng 50m² phía sau (cha để lại, hết hợp đồng thuê 2 tháng), $3,000 tiết kiệm cá nhân, 1 xe máy Honda Wave Alpha cũ, một MacBook Air M3 (mua qua mortgage còn nợ $800). Mẹ Trần Lệ Hằng (50t) sống cùng phía trên tiệm.
- Tính cách: Trầm tĩnh + tính toán kinh tế chặt chẽ (combo 4 năm Đại học International Trade + kinh nghiệm phụ tiệm bố từ 13 tuổi), bảo vệ mẹ tuyệt đối, không tin người ngoài dễ dàng. Học vấn cao + đầu óc kinh doanh nhạy bén — biết exactly cách negotiate trong từng văn hóa.
- Điểm yếu: Cá nhân yếu (không võ giả, không cultivation), nếu portal đóng giữa lúc đi qua bị mắc kẹt → KHÔNG có khả năng tự vệ trong thế giới cổ đại đầy nguy hiểm. Phase 1 phụ thuộc hoàn toàn vào tốc độ buôn nhanh + kế hoạch kỹ.

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Vạn Giới Thương Hội (Multi-World Commerce Portal System).
- Cơ chế hoạt động: Tại kho hàng phía sau tiệm tạp hóa, 5 giờ sáng mỗi ngày, một cánh cổng ánh xanh tự mở. UI cosmic hiện trong tâm trí MC: "Danh sách thế giới mở khóa: [3 thế giới ban đầu] / [extra unlocked sau level up]. Chọn destination?" MC chọn → portal stabilize → MC bước qua, đứng trong thế giới N tại vị trí cố định của portal (vd: trong góc khuất chợ Trường An). 4 giờ window, sau đó portal tự đóng. Mọi vật MC mang qua / mang về đều xuyên qua được (kể cả động vật + người nếu MC dẫn).
- Trigger kích hoạt: Tự refresh 5 giờ sáng mỗi ngày. MISS nếu MC ngủ qua / không kích hoạt trong 30 phút đầu.
- Đường tăng trưởng cấp Thương Hội Khí (THK):
  • L1 (ch.1-30): 4h/ngày, 3 thế giới mở khóa (Tam Quốc + Đường + Tống cổ đại).
  • L2 (ch.30-80): 4.5h/ngày, +xianxia world.
  • L3 (ch.80-150): 5h/ngày, +western fantasy (LotR + Harry Potter + GoT).
  • L4 (ch.150-300): 6h/ngày, +sci-fi space + cyberpunk + mạt thế.
  • L5 (ch.300-500): 8h/ngày, +50 thế giới đặc biệt (mỗi cosmic broker chỉ 1 broker access).
  • L6 (ch.500-750): 12h/ngày, +access đến God-realms.
  • L7 (ch.750-1000): Cosmic broker — MC tự mở portal đến mọi thế giới, hợp nhất với "Commerce phần Thiên Đạo".
- Điểm yếu: 4 giờ/ngày Phase 1 cứng. Nếu mắc kẹt bên kia (portal close khi MC đang giữa thế giới N) → chờ 24 giờ portal refresh. MC chết bên kia → KHÔNG có phục sinh — chỉ có Earth phục sinh nếu MC đang ở Earth khi chết.

### CAST CHÍNH
- Trần Lệ Hằng — mẹ MC (50t), goá phụ vừa mất chồng — Cảm xúc trung tâm — Người duy nhất biết MC có hệ thống (sau ch.5 khi mẹ thấy MC mang về 100 chỉ vàng cổ).
- Đặng Minh Châu — cô bạn cùng lớp Đại học Ngoại Thương (25t, hiện làm tại Vincom Saigon Trade Center) — Đối tác Earth Phase 1-2 — Giúp MC sell antique items + tech contracts trong VN. Love interest chính.
- Vương Hi Phượng — gia chủ Vương gia tại Trường An Tam Quốc (45t, thương nhân + có quân riêng) — Đối tác Tam Quốc Phase 1 — Mua smartphone đầu tiên ch.5, đổi 50 chỉ vàng + 5 cuộn lụa quý. Tin MC từ ch.20 và trở thành đại lý Tam Quốc.
- Lý Thế Dân — Hoàng đế Đường Thái Tông (40t năm 632 AD) — Đại đối tác Phase 2 (sau khi mở khóa qua sứ giả ch.40) — Mua antibiotic + medical equipment chữa bệnh hoàng tộc, đổi bản đồ kho báu + đồ cổ + cultural artifacts.
- Bs. Nguyễn Văn An — chuyên gia ung thư Bệnh viện K (55t) — Đầu tiên mua đan dược xianxia chữa bệnh hiểm nghèo ch.60 — Đại lý y tế Earth của MC.
- Linh sư phụ "Vô Trần Đạo Nhân" — tu sĩ cấp Tông Sư xianxia (300t, gốc đại tông môn Vô Trần) — Đối tác xianxia Phase 2 — MC bán smartphone + sách technology, đổi đan dược + công pháp + linh thạch. Mentor MC về cultivation từ ch.80.

### ANTAGONISTS
- Trần Văn Tài — chú út MC (45t, tham + ích kỷ) — Đối thủ trong gia đình Phase 1 — Định bán tiệm tạp hóa khi bố MC vừa mất; bị MC dùng kế hợp đồng + thanh toán nợ cũ cô lập.
- Tống Hoàng Anh — chủ chuỗi tạp hóa lớn Hà An (50t) — Đối thủ kinh doanh Earth Phase 1 — Định nuốt tiệm MC, bị MC dùng cosmic items (vàng cổ + đan dược) outcompete.
- Tào Tháo — Ngụy Vũ Đế Tam Quốc (60t năm 220 AD) — Đối thủ Tam Quốc Phase 1-2 — Phát hiện Vương Hi Phượng có "tiên khí" (smartphone), gửi gián điệp truy ra portal MC. Cuối Phase 1 Tào Tháo đột phá vào Earth qua portal MC vô tình mở.
- Hắc Diện Thương Hội — tổ chức cosmic broker đối thủ Phase 3+ — MC không phải broker duy nhất, có ~10 brokers khác trong cosmic system, một số là enemies tranh giành thế giới mở khóa.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Tiệm tạp hóa Trần + 3 thế giới cổ đại: Goal — MC mở 100 deal thành công, tài sản tăng từ $3,000 lên $5 triệu USD, mẹ MC + Đặng Minh Châu biết bí mật, Vương Hi Phượng trở thành đại lý Tam Quốc. Milestone — Mua được cửa hàng phố lớn Hà An $500K (ch.50) + biệt thự 2 tầng cho mẹ (ch.85). Stakes — Chú út tranh giành thừa kế, Tống Hoàng Anh dìm giá tiệm.
- PHASE 2 (Ch.100-300) — Mở rộng Xianxia + Western fantasy: Goal — MC tu vi cá nhân lên Sơ Cảnh xianxia + biết casting magic Western fantasy. Tài sản $50M USD. Đặng Minh Châu trở thành CEO Công Ty TNHH Vũ Hào Commerce VN. Milestone — Cứu được Hoàng tử Đường + được tặng bản đồ kho báu Tần Thuỷ Hoàng (ch.200). Stakes — Cosmic broker khác phát hiện MC, gửi assassin.
- PHASE 3 (Ch.300-600) — Sci-fi + Cosmic Commerce: Goal — MC mở 50 thế giới, trở thành 1 trong 10 cosmic brokers top. Personal tu vi Hậu Thiên + magic Mage level 5. Milestone — Buy out Hắc Diện Thương Hội (ch.480). Stakes — God-realm phát hiện cosmic brokers, gửi quan sát.
- PHASE 4 (Ch.600-1000) — Cosmic Commerce Empire: Goal — MC hợp nhất với "Commerce phần Thiên Đạo", trở thành Cosmic Broker tối thượng. Endgame: MC chọn giữa cosmic life + trở về 2024 Earth cứu bố đã chết tai nạn. Milestone — Cosmic reveal ch.900. Stakes — Thiên Đạo cũ muốn absorb MC.

### OPENING SCENE
- Location: Tiệm tạp hóa "Cửa Hàng Trần" 30m² tại số 47 phố Quan Đào (hư cấu) thị xã Hà An (hư cấu), đêm thứ 7 sau đám tang bố MC, 4 giờ 50 phút sáng, mưa phùn đầu đông Bắc Bộ.
- MC hành động: Trần Vũ Hào tỉnh dậy trên ghế gập sau quầy thu ngân, đêm nay đầu tiên hắn ngủ lại tiệm sau đám tang bố. Mẹ ngủ phía trên tầng. Hắn đang đếm sổ kế toán cũ của bố, cố tìm xem có nợ nào chú út biết chưa. Đột nhiên trong kho hàng phía sau, một cánh cổng ánh xanh nhạt mở ra giữa không trung 1.8m cao 80cm rộng. Trong đầu Vũ Hào vang lên giọng nói trầm: "Bind Hệ Thống Vạn Giới Thương Hội thành công. Broker ID: TVH-7741. Mỗi ngày 4 giờ portal mở. Welcome to multidimensional commerce." UI hiện danh sách 3 thế giới mở khóa: [Tam Quốc Trường An 208 AD] / [Đường Thành 632 AD] / [Tống Khai Phong 1050 AD]. Còn 23 giờ 50 phút trước portal đóng tự động.
- Hook event: Vũ Hào sửng sốt 3 phút, sau đó tính toán nhanh: ngày 7 sau bố mất, tiệm còn 2 tháng thuê, mẹ cần $2000/tháng hỗ trợ y tế, chú út sắp đòi $30K tiền nợ cũ. Hắn lấy chiếc smartphone iPhone 15 Pro cũ của bố ($600 hiện tại Earth), mở Google "vàng cổ Tam Quốc giá hiện tại Earth" → $200/chỉ. Chọn portal Tam Quốc, bước qua. Đứng giữa chợ Trường An sáng sớm, hắn thấy 1 thương nhân già đang bán cuộn lụa cổ + 5 chỉ vàng dưới gốc cây bồ đề: "Quân tử trẻ, lụa Vương gia 3 lượng vàng, bán nguyên cuộn." Vũ Hào mở smartphone show video YouTube Bayern Munich vs Real Madrid → ông lão sửng sốt, gọi quân Vương gia đến. Hai giờ sau, Vũ Hào bước về Earth tay xách 50 chỉ vàng cổ + 5 cuộn lụa Đường thượng phẩm. Tại Earth, hắn nhắn tin Đặng Minh Châu — bạn cùng lớp Ngoại Thương Saigon: "Châu, anh có 50 chỉ vàng cổ chứng nhận sinh thái Tam Quốc, em có network buyer không?"
- Câu mở đầu: "Tiệm tạp hóa 30m² của bố ta vừa trở thành đầu mối thương mại lớn nhất nhân loại — và ta là broker đa vũ trụ với 4 giờ mỗi ngày."

### WORLD RULES
- Hệ Thống Vạn Giới Thương Hội là bí mật của MC — chỉ mẹ + Đặng Minh Châu (Phase 1) + Hắc Diện Thương Hội biết.
- Portal mở 4 giờ/ngày bắt đầu 5h sáng. MISS = lose 1 ngày trade.
- MC có thể mang tối đa 100kg vật / 1 người / 1 động vật qua portal mỗi chiều.
- Vật thuộc về người sống tỉnh táo KHÔNG mang qua được (chỉ vật MC sở hữu hoặc đã đồng ý trao đổi).
- Tỷ giá Earth ↔ thế giới N tự động điều chỉnh theo demand/supply — MC không thể infinite arbitrage cùng món.
- Cosmic reveal Phase 4: Thương Hội Khí là 1 mảnh "Commerce phần Thiên Đạo".

### TONE & ANTI-PATTERNS
- TONE: Tỷ phú toan tính 40% + ấm áp gia đình + đối tác 30% + face-slap đối thủ + adventure đa thế giới 30%. Pacing nhanh — mỗi 2-3 chương 1 deal mới. Tham khảo nhịp 《我家超市通万界》《诸天最强交易所》.
- NEGATIVE SPACE:
  • KHÔNG là MC kungfu mạnh — MC là broker, dựa vào đầu óc + tốc độ + chiến lược.
  • KHÔNG hậu cung sa đà — Đặng Minh Châu + 1-2 nữ phụ.
  • KHÔNG dùng portal lazy — mỗi deal cần research + negotiation + execution.
  • KHÔNG drama gia đình quá nhiều — focus vào commerce + adventure.
  • KHÔNG tu tiên kiểu cũ — MC tu vi qua cross-world training với mentor xianxia.
  • KHÔNG vi phạm timeline cổ đại — MC không thay đổi lịch sử lớn (không giết Tào Tháo sớm chẳng hạn).
`,
    total_planned_chapters: 1000,
  },

  // ── 3. GAME DEVELOPER THẾ GIỚI SONG SONG ────────────────────────────
  {
    title: 'Game Developer Thế Giới Song Song: Ta Mang Cả Trăm Game Quốc Dân',
    slug: 'game-developer-the-gioi-song-song-ta-mang-ca-tram-game-quoc-dan',
    genre: 'do-thi' as const,
    main_character: 'Phan Quốc Khang',
    description:
      'Lập trình viên game Việt 28 tuổi Phan Quốc Khang đột tử vì kiệt sức tại văn phòng VNG sau khi vừa code xong build cuối "Đột Kích Mobile 4.0" — tỉnh dậy trên giường ký túc xá Đại học Bách Khoa Phương Nam Mới (hư cấu), năm 2015, thân phận Phan Quốc Khang 22 tuổi, sinh viên năm 4 ngành Công Nghệ Phần Mềm. Khang sửng sốt phát hiện đây là Trái Đất SONG SONG — công nghệ vượt xa kiếp trước: VR full immersion ($500/headset đã phổ biến), AI GPT-tier hiện diện 2010, cloud computing 100x faster, 6G mobile network. NHƯNG ngành game CỰC KỲ NHÀM CHÁN: chỉ có puzzle (Tetris clone), arcade (Pac-Man clone), turn-based RPG đơn giản. KHÔNG có FPS, KHÔNG có MOBA, KHÔNG có Battle Royale, KHÔNG có open-world, KHÔNG có soulslike, KHÔNG có Minecraft sandbox. Trong đầu Khang ngồn ngộn ký ức 8 năm code game Việt kiếp trước: 200+ tựa game đã chơi sâu — Counter-Strike, League of Legends, Minecraft, Dota 2, GTA V, PUBG, Genshin Impact, Elden Ring, Fortnite, Among Us, Tetris original, Mario Bros. Khang mở MacBook ký túc xá lập tức code 1.0 prototype "Đột Kích" (CS clone đầu tiên) — 30 ngày sau release trên Steam (hư cấu này có Steam version 2010), 1 triệu downloads tuần đầu, ngành game thế giới sụp đổ và rebuild quanh studio nhỏ của hắn.',
    world_description: `### STORY KERNEL SUMMARY
- Reader Fantasy: Người đọc trải nghiệm cảm giác MC lập trình viên Việt đột tử kiếp trước, tỉnh dậy 22 tuổi trong Trái Đất song song 2015 nơi tech vượt xa (VR, AI, 6G phổ biến) NHƯNG game industry stuck ở Tetris/arcade level — MC mỗi chương release 1 game iconic Earth-kiếp-trước (CS, LoL, Minecraft, GTA V, PUBG, Elden Ring) → ngành game thế giới sụp đổ và rebuild quanh studio MC, biến từ sinh viên nghèo Đại học Bách Khoa thành tỷ phú game industry monopolist.
- Protagonist Engine: Phan Quốc Khang thắng bằng kho tàng 8 năm code game Việt kiếp trước (200+ tựa game đã chơi sâu + 50+ game đã thực hiện hoặc nghiên cứu) + Hệ Thống Game Khố (UI nội tâm liệt kê đầy đủ source code, art assets, game design document, monetization strategy của từng game). Hắn không cần invent — hắn execute với tech tools tier-1 của thế giới song song 2015 (VR ready, AI assist coding).
- Pleasure Loop: Khang chọn 1 game từ Game Khố (vd: Counter-Strike 1.6) → 30-60 ngày prototype solo → release Steam-equivalent platform → 100K-1M downloads tuần đầu → critic + player tung hô → revenue spike → MC reinvest budget mở studio + next game → competitor (existing boring game companies) panic + tìm cách copy nhưng thiếu Earth game design insights → MC face-slap → Khang trở thành industry monopolist.
- System Mechanic: Hệ Thống Game Khố (Cosmic Game Library). Input: tâm trí MC focus vào tên 1 game đã chơi kiếp trước + 1 điểm Code Lực. Output: UI hiện trong tâm trí MC — full source code (revisable, adaptable cho parallel tech stack), art assets list + 3D models references, game design document đầy đủ (gameplay loop, monetization, balance), sound design + music tracks references, marketing/launch strategy, sequel/DLC roadmap, esports/community building blueprint, player retention metrics. Limit: ban đầu 1 truy xuất / tuần; mỗi level up + 1; mỗi game complete + release thành công tặng 10-100 điểm Code Lực (CL).
- Phase 1 Playground: Ký túc xá Đại học Bách Khoa Phương Nam Mới (hư cấu) tại Phương Nam (Saigon hư cấu) Việt Nam song song 2015, lab Công Nghệ Phần Mềm Khang dùng làm dev studio, Steam-equivalent platform "GameHub" (hư cấu). Khang vận hành Game Khố → 1 game/30 ngày Phase 1 → release → revenue → reinvest.
- Social Reactor: Đỗ Thanh Bình (bạn cùng phòng ký túc xá, Computer Graphics major, đầu tiên thấy MC code "Đột Kích" prototype ch.3), Nguyễn Quỳnh Anh (sinh viên Game Design Đại học Bách Khoa, gặp MC tại GameJam local ch.10 — Lead game designer của studio sau này), giáo sư Trần Văn Lý (mentor Software Engineering 50t, đầu tiên tin MC có potential lớn), Đinh Quốc Cường (CEO GameHub Phương Nam 35t, ký phụ deal phát hành đầu cho MC ch.20), Quách Hoàng Sơn (game journalist top Phương Nam, review "Đột Kích" 10/10 ch.30).
- Novelty Ladder: Ch.1-30 (FPS revolution — "Đột Kích" CS clone, 1M downloads tuần đầu). Ch.30-80 (MOBA revolution — "League of Legends Phương Nam", esports boom). Ch.80-150 (Sandbox revolution — "Minecraft Phương Nam", education market). Ch.150-300 (Open-world AAA — "GTA Phương Nam" + "Elden Ring Phương Nam"). Ch.300-600 (Battle Royale + MMORPG cosmic — "PUBG Phương Nam" + "World of Warcraft Phương Nam"). Ch.600+ (Cosmic game empire — VR universe, metaverse).
- Control Rules: Payoff game release mỗi 30-60 chương (1 game đại thành công); payoff industry mỗi 80-100 chương (đối thủ sụp đổ, MC monopolize 1 genre). Attention Gradient: ký túc xá → ngành game Phương Nam → ngành game VN → toàn châu Á → cosmic.

### BỐI CẢNH
Trái Đất song song 2015 — kinh tế + công nghệ vượt xa Trái Đất kiếp trước MC 10-15 năm trong tech tier. VR full immersion headsets phổ biến giá $500-800 (như Oculus Quest 4 thực tế 2026), AI GPT-4 tier hiện diện 2010 (Microsoft + Google + DeepMind đều đã có), cloud computing 100x faster (Azure + AWS + GCP edge tier-1), 6G mobile network everywhere với latency 1ms, neural interface beta testing tại Thung lũng Silicon Phương Nam.

NHƯNG ngành game CỰC KỲ NHÀM CHÁN. Top games 2015:
- "Star Crystal" (puzzle Tetris clone, 5 năm chưa update)
- "Tower Defender" (arcade pixel art đơn giản)
- "Sky Quest" (turn-based RPG cốt truyện linear 10 giờ)
- "Pixel Racing" (2D racing, không có 3D physics)
- "Adventure Park" (theme park sim với 5 rides)

KHÔNG có FPS modern (Half-Life style chưa có). KHÔNG có MOBA (Dota/LoL chưa được invent). KHÔNG có Battle Royale (PUBG concept chưa có). KHÔNG có open-world (GTA chưa). KHÔNG có Minecraft (sandbox creative không tồn tại). KHÔNG có soulslike (Dark Souls không có). KHÔNG có MMO modern (WoW chưa). Lý do: game industry song song stuck vì giả thuyết "game phải đơn giản + ngắn + cho casual", investor không invest vào hardcore game.

Phương Nam (Saigon hư cấu) là tech hub Việt Nam, có Đại học Bách Khoa Phương Nam Mới (top 5 châu Á), 50+ startup studios, GameHub platform 100M users (PC + mobile + VR), VC funding $1B+/năm cho gaming. Hà An (hư cấu) là thủ đô chính trị.

### NHÂN VẬT CHÍNH
- Tên: Phan Quốc Khang
- Tuổi: 22 tuổi (kiếp trước 28t, lập trình viên VNG Việt Nam 6 năm kinh nghiệm mobile game, đã code 12 mobile games, chết do tăng ca code build "Đột Kích Mobile 4.0" 30 ngày liền không nghỉ)
- Nghề/Trạng thái: Sinh viên năm 4 Công Nghệ Phần Mềm Đại học Bách Khoa Phương Nam Mới. GPA: 3.7. Đang chuẩn bị thesis project (typical: AI chatbot hoặc mobile app). 5 tháng nữa tốt nghiệp, đã apply 3 công ty tech Phương Nam.
- Tài sản hiện tại: $2,500 trong tài khoản ngân hàng, một MacBook Pro M3 (mua qua sinh viên program $1500), một VR headset cũ Meta Quest 3 ($300 second-hand), một xe máy Honda Wave Alpha cũ. Ở ký túc xá 4 người Bách Khoa, share phòng 16m². Gia đình bố mẹ middle-class Phương Nam, không hỗ trợ tài chính ngoài tuition.
- Tính cách: Tỉ mỉ + game designer thinking (combo 6 năm VNG + đam mê game vô tận), bảo vệ vision creative cực kỳ, hard worker. Không socialize nhiều — fan game thuần, biết rõ nhịp đập của player community.
- Điểm yếu: Tiền không có (chỉ $2,500), không network industry, không đội ngũ (solo dev). Thân thể yếu sau 6 năm tăng ca kiếp trước, dễ kiệt sức. Phải tránh repeat mistake kiếp trước (tăng ca quá mức → đột tử).

### GOLDEN FINGER
- Tên hệ thống: Hệ Thống Game Khố (Cosmic Game Library System).
- Cơ chế hoạt động: Trong tâm trí MC có UI ánh xanh nhạt — danh sách "Games Recalled" liệt kê tên 200+ tựa game hắn đã chơi sâu hoặc nghiên cứu kiếp trước. Mỗi game có metadata đầy đủ: full source code (revisable, port-able cho parallel tech stack 2015), art assets list + 3D models references, game design document đầy đủ (core gameplay loop, monetization strategy, balance tables, progression curves), sound design + music tracks references, marketing/launch strategy, sequel/DLC roadmap, esports/community building blueprint, player retention curves. Khi MC truy xuất 1 game, toàn bộ info hiện trong tâm trí — hắn có thể tự sửa code/balance để adapt cho parallel tech 2015 (VR/AI features có thể added).
- Trigger kích hoạt: Mỗi truy xuất tốn 1 điểm Code Lực (CL). MC khởi đầu 30 CL. Truy xuất nhanh (< 30 giây gameplay overview) tốn 1 CL; deep dive (full source code review) tốn 10 CL; deep modification (rewrite core engine for parallel tech) tốn 30 CL. Mỗi game MC complete + release thành công tặng 10-100 CL (tùy commercial success + critic reception).
- Đường tăng trưởng cấp Code Lực:
  • L1 (ch.1-30): Sinh viên solo dev. 1 game/30 ngày, FPS đầu tiên.
  • L2 (ch.30-80): Studio mới founded. 1 game/45 ngày, MOBA + Sandbox.
  • L3 (ch.80-150): Mid-tier studio. AAA games + esports tournaments.
  • L4 (ch.150-300): Industry leader. Multi-platform releases + global publishing.
  • L5 (ch.300-500): Cosmic game studio. VR/Metaverse universe.
  • L6 (ch.500-750): Tech empire. Buy out competitors + console manufacturing.
  • L7 (ch.750-1000): Cosmic — hợp nhất với "Gaming phần Thiên Đạo", control entertainment industry cosmically.
- Điểm yếu: Game Khố CHỈ TRUY XUẤT — KHÔNG TỰ DEV. MC + team phải implement với tech parallel 2015 (mạnh hơn Earth kiếp trước nhưng vẫn cần effort). Mỗi game tối thiểu 30 ngày → 6 tháng. Tăng ca quá mức → MC có thể chết lần nữa (kiếp trước đã chết vì điều này).

### CAST CHÍNH
- Đỗ Thanh Bình — bạn cùng phòng ký túc xá (22t, Computer Graphics major) — Tài năng S 3D art — Đầu tiên thấy MC code prototype ch.3 + giúp art assets — Cánh tay phải art cho studio MC sau này.
- Nguyễn Quỳnh Anh — sinh viên Game Design Đại học Bách Khoa (21t) — Gặp MC tại GameJam local ch.10, Tài năng S Game Design — Lead game designer của Quốc Khang Studios. Love interest chính.
- Giáo sư Trần Văn Lý — mentor Software Engineering (50t, gốc Phương Nam, từng founder startup tech) — Đầu tiên tin MC ch.5 + đầu tư $50K personal vào studio MC — Cố vấn chiến lược.
- Đinh Quốc Cường — CEO GameHub Phương Nam (35t, Steam-equivalent platform 100M users) — Ký phụ deal phát hành đầu cho MC ch.20 + sau này đối tác chính trị industry Phase 2.
- Quách Hoàng Sơn — game journalist hàng đầu Phương Nam (40t, founder GameViet.com) — Review "Đột Kích" 10/10 ch.30, thiết lập MC's reputation toàn quốc — Người ủng hộ media.
- Kawai Yuki — game designer Nhật trẻ (23t, gốc Tokyo) — Female designer Phase 2-3, joined Quốc Khang Studios ch.150 — Đối tác cosmic Phase 3+.

### ANTAGONISTS
- Lý Hồng Thắng — CEO Star Crystal Studios (50t, ông trùm puzzle game industry Phương Nam) — Đối thủ Phase 1-2 — Vì "Đột Kích" của MC kill puzzle game market share, lén lút lobby để platform ban MC, fail.
- Tony Wang — investor Phương Nam VC firm (45t) — Đối thủ tài chính Phase 1 — Định ép MC accept "investment" $5M để control studio, MC từ chối kéo theo VC ban MC; bị face-slap sau khi "Đột Kích" release.
- Christopher Lee — CEO American Game Corp (Phương Nam division) (55t) — Đối thủ international Phase 2-3 — Liên minh với Lý Hồng Thắng để destroy Quốc Khang Studios khi MC vào MOBA market.
- Cosmic Game Council — tổ chức cosmic game studios cross-universe — Đối thủ Phase 3-4 — Phát hiện Phương Nam có Code-Khí Khố, gửi observer + sau đó thử ngăn MC growth.

### PHASE ROADMAP
- PHASE 1 (Ch.1-100) — Ký túc xá + "Đột Kích" + thành lập studio: Goal — MC release "Đột Kích" FPS đầu tiên trên GameHub, 1M+ downloads tuần đầu, $10M revenue tháng đầu. Founded Quốc Khang Studios với Đỗ Thanh Bình + Quỳnh Anh + 5 sinh viên cùng trường. Milestone — "Đột Kích" league pro tournament Phương Nam Cup ch.85 — esports boom. Stakes — Lý Hồng Thắng try platform ban, Tony Wang try hostile investment.
- PHASE 2 (Ch.100-300) — MOBA + Sandbox + Studio expansion: Goal — Release "Mộng Tranh Hùng" (LoL clone) + "Sáng Tạo Vũ Trụ" (Minecraft clone). Studio expand to 200 employees + offices Hà An + Phương Nam + Hong Kong. Milestone — IPO Quốc Khang Studios ch.250 với valuation $5B USD. Stakes — Christopher Lee + Lý Hồng Thắng cartel.
- PHASE 3 (Ch.300-600) — AAA games + Cosmic game industry: Goal — Release "GTA Phương Nam" (open-world) + "Elden Ring Phương Nam" (soulslike) + "PUBG Phương Nam" (battle royale). Buy out competitors. Studio 5000 employees globally. Milestone — Win "Game of the Year" 5 lần liên tiếp ch.450. Stakes — Cosmic Game Council interference.
- PHASE 4 (Ch.600-1000) — Cosmic gaming empire + Metaverse: Goal — MC hợp nhất với "Gaming phần Thiên Đạo", trở thành cosmic game architect. Endgame: MC chọn giữa cosmic life + về kiếp trước cứu mẹ VN đã chết tai nạn 2030. Milestone — Metaverse cosmic launch ch.900. Stakes — Thiên Đạo cũ muốn absorb MC.

### OPENING SCENE
- Location: Ký túc xá phòng 408 toà B7 Đại học Bách Khoa Phương Nam Mới (hư cấu) tại Phương Nam Việt Nam song song, 5 giờ sáng tháng 9 năm 2015, ánh đèn LED yếu trong phòng 16m² 4 sinh viên (3 người đang ngủ).
- MC hành động: Phan Quốc Khang bừng tỉnh trên giường tầng, đầu óc đột nhiên ngồn ngộn ký ức kiếp trước Việt Nam 2026 — 28 năm Phan Quốc Khang, 6 năm code VNG, 200+ tựa game đã chơi sâu (CS, LoL, Minecraft, GTA V, PUBG, Elden Ring, Genshin, Fortnite, Among Us...), 12 mobile games đã code. Khang ngồi dậy, thò tay xuống lấy MacBook Pro M3 dưới gầm giường. Mở ra — thấy desktop có 4 game đỉnh điểm Phương Nam 2015: "Star Crystal" (Tetris clone đã 5 năm chưa update), "Tower Defender", "Sky Quest", "Pixel Racing". Khang sửng sốt: Phương Nam 2015 có VR + AI + 6G nhưng game vẫn ở Tetris level??? Cùng lúc đó, trong tâm trí Khang bật lên UI ánh xanh: "Hệ Thống Game Khố — Active. Code Lực: 30/30. Games Recalled: 247. Sẵn sàng truy xuất?"
- Hook event: Khang chọn "Counter-Strike 1.6" — FPS đại thành công 2000 Earth kiếp trước. Truy xuất tốn 1 CL. Trong 30 giây, full source code + map design Dust2/Inferno/Mirage + weapon balance + game mode (5v5 bomb defusal) hiện ra trong tâm trí Khang. Hắn mở Visual Studio Code (parallel 2015 có), bắt đầu typing: "// CS 1.6 Phương Nam port — main game engine init. C++ với DirectX 12 (parallel 2015 already has)..." Đỗ Thanh Bình bạn cùng phòng tỉnh dậy đi vệ sinh, ngó qua màn hình MC: "Mày code gì lúc 5h sáng vậy Khang?" Khang chỉ vào screen: "Một game FPS thực sự. Trước Tết âm lịch ra mắt. Phương Nam 2015 này sẽ phải re-evaluate cả ngành game của họ."
- Câu mở đầu: "Phương Nam 2015 này có VR + AI + 6G — nhưng top game vẫn là Tetris clone từ 2010. Ta là Phan Quốc Khang, 22 tuổi sinh viên Bách Khoa, và ta sẽ mang cả lịch sử game Earth kiếp trước về đây."

### WORLD RULES
- Hệ Thống Game Khố là bí mật của MC — Khang giả vờ "đam mê game lâu năm + có inspiration từ giấc mơ kỳ quặc".
- Phương Nam 2015 song song có TECH vượt xa Earth kiếp trước MC nhưng GAME content nhàm chán — đây là cosmic anomaly mà MC khai thác.
- Mỗi game cần MC adapt cho parallel tech (VR support, AI assist, cloud sync) — KHÔNG thể port thẳng từ kiếp trước.
- MC PHẢI tránh tăng ca quá mức — kiếp trước đã chết vì điều này. Engine enforces "8h sleep + 2h break/day rule".
- Cosmic reveal Phase 4: Game Khố là 1 mảnh "Gaming phần Thiên Đạo" — Khang là sứ giả mang gaming culture từ thế giới gốc về parallel.

### TONE & ANTI-PATTERNS
- TONE: Game designer thinking 40% + ấm áp đội ngũ studio 25% + face-slap đối thủ industry 25% + cosmic Phase 4 10%. Pacing nhanh — mỗi 3-5 chương 1 milestone game (prototype done, alpha test, beta launch, release). Tham khảo nhịp 《全能游戏设计师》《我的游戏帝国》.
- NEGATIVE SPACE:
  • KHÔNG là "MC code 1 đêm xong AAA game" thô — mỗi game cần adapt + test + iterate.
  • KHÔNG hậu cung sa đà — Quỳnh Anh + Kawai Yuki + 1-2 nữ phụ.
  • KHÔNG dùng Game Khố lazy — MC + team phải code, balance, marketing.
  • KHÔNG drama gia đình bố mẹ — focus vào studio + game industry.
  • KHÔNG tu tiên kiểu cũ — MC "đột phá" bằng release game + revenue milestone.
  • KHÔNG tăng ca quá mức — character flaw critical cần được nhắc thường xuyên (MC kiếp trước chết vì đột tử kiệt sức).
`,
    total_planned_chapters: 1000,
  },
];

async function getOwnerId(): Promise<string> {
  const { data } = await s.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function applySpawn(seed: typeof SEEDS[0], ownerId: string): Promise<string | null> {
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
  console.log(`  Hollywood + Trade + Game trio spawn  ${apply ? '[APPLY]' : '[DRY RUN]'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const seed of SEEDS) {
    console.log(`[SPAWN] ${seed.title}`);
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
