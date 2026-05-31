/**
 * Genre Process Blueprints — per-genre customization of setup + outline + execution.
 *
 * Each genre has different "rules of the game":
 *   - Cast composition (sect hierarchy vs business team vs household)
 *   - Golden finger mechanics (cultivation realm vs system app vs pet evolution)
 *   - Phase roadmap structure (realm progression vs business scale vs world swap cadence)
 *   - Scene types (bế quan/đan dược/đấu pháp vs deal/khách hàng/scandal)
 *   - Quality bottlenecks over 1000 chapters (power inflation vs trope fatigue vs pacing drift)
 *   - Creative space (where AI should improvise vs follow strict template)
 *
 * This module emits GENRE-SPECIFIC overlays for 4 pipeline layers:
 *   1. seed-blueprint (world_description requirements per genre)
 *   2. master-outline (arc structure framework per genre)
 *   3. story-outline (cast roles + world rules templates per genre)
 *   4. arc-plan / architect (scene types + quality floor + creative space)
 *
 * Goal: each genre reaches its own bestseller-grade ceiling, NOT a generic average.
 */

import type { GenreType } from '../types';

export interface GenreProcessBlueprint {
  /** One-line genre essence — display-friendly. */
  essence: string;
  /** Setup-time requirements customized for this genre. */
  setup: {
    /** Required cast roles unique to this genre (≥4). */
    requiredCastRoles: string[];
    /** What golden finger mechanic looks like for this genre (1-2 sentences). */
    goldenFingerType: string;
    /** Phase roadmap framework — what tracks does the story progress along. */
    phaseFramework: string;
    /** What world rules are mandatory for this genre. */
    worldRulesFocus: string[];
    /** Chapter 1 opening pattern specific to this genre. */
    openingPattern: string;
  };
  /** Process notes — quality + quantity sustainability over 1000 chapters. */
  process: {
    /** Quality floor — minimum bar for this genre. */
    qualityFloor: string;
    /** How to sustain 1000 chapters without fatigue. */
    quantitySustainability: string;
    /** Common failure modes over long-form. */
    commonFailures: string[];
    /** Creative space — what AI should improvise within. */
    creativeSpace: string;
  };
  /** Genre-specific scene types Architect can use. */
  sceneTypes: string[];
  /** Per-arc structural template (how a 50-100 chapter arc unfolds). */
  arcTemplate: string;
  /** Stakes ladder — escalation framework for this genre. */
  stakesLadder: string[];
  /**
   * The canonical recurring arcs/beats that DEFINE the genre — readers expect
   * these to show up (e.g. tien-hiep: đại hội tỉ thí, bí cảnh, đan hội face-slap,
   * thiên kiếp). Architect must schedule them across the outline.
   */
  signatureTropes: string[];
  /**
   * Concrete vocabulary / rituals / honorifics / item types / etiquette that
   * make prose feel genre-true (cung-dau-level texture). Writer pulls from here
   * so chapters don't read generic.
   */
  textureDetails: string[];
}

const BLUEPRINTS: Record<GenreType, GenreProcessBlueprint> = {

  // ════════════════════════════════════════════════════════════════════════
  'tien-hiep': {
    essence: 'Cultivation tiệm tiến + cảnh giới rõ + sư môn/gia tộc + đan dược/pháp bảo',
    setup: {
      requiredCastRoles: [
        'Sư phụ / Trưởng lão (mentor — uy tín nhưng có giới hạn riêng)',
        'Sư huynh-đệ thân (≥1 — đồng hành, có rivalry nhỏ)',
        'Đối thủ cùng cấp (≥1 sư huynh khác phái / thiên kiêu cùng thế hệ)',
        'Đối thủ thượng cấp ẩn (≥1 trưởng lão phái thù địch hoặc cao thủ cổ tộc)',
        'Người yêu / hồng nhan tri kỷ (≥1 — không harem)',
        'Pháp thiết / linh thú trợ thủ (1 — vd con chim cuồng tổ huyết mạch)',
      ],
      goldenFingerType: 'Bí pháp/huyết mạch/lò luyện ẩn từ tiền kiếp/cổ vật. KHÔNG instant max-level — tăng theo công phu + tài nguyên cụ thể.',
      phaseFramework: 'Theo cảnh giới: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Đại Thừa → Độ Kiếp. Mỗi cảnh giới ≈ 100-150 chương.',
      worldRulesFocus: [
        'Cấp độ cảnh giới + điều kiện đột phá (tài nguyên + ngộ tính + thời gian)',
        'Quy tắc luyện đan / luyện khí / phù pháp (cấp phẩm, thành công rate, side-effect)',
        'Sect hierarchy + môn quy + nội ngoại môn',
        'Bí cảnh / cấm địa cycle (mở mỗi N năm, quy tắc tuyển)',
      ],
      openingPattern: 'MC mở mắt trong sư môn/gia tộc, đan điền trống/thấp cảnh giới NHƯNG có thần thức/ký ức/bí pháp ẩn. Scene 1: thân xác hiện tại + golden finger ẩn nhận thức được. Scene 2: bystander khinh thường (sư huynh / đệ tử khác) + MC small face-slap đầu tiên qua kỹ năng tu luyện. Hook: cơ hội/bí cảnh sắp mở.',
    },
    process: {
      qualityFloor: 'Mỗi chương phải có ≥1 chi tiết tu tiên cụ thể (đan phẩm gì, cảnh giới chỗ X, quy tắc môn phái Y). KHÔNG vague "MC tu luyện cả ngày".',
      quantitySustainability: 'Cảnh giới progression giữ pacing cho 1000 chương. Mỗi cảnh giới có 3-5 mini-arc (gặp đối thủ → tài nguyên → đột phá → tham gia bí cảnh → tận dụng cảnh giới mới). KHÔNG được skip cảnh giới.',
      commonFailures: [
        'Power inflation chương 1-100 (MC vọt từ Luyện Khí → Kim Đan trong 50 chương) → mất pacing 800 chương sau',
        'Sect/gia tộc politics quên mất sau arc 2 → world flat',
        'Đan dược/pháp bảo trở thành deus-ex-machina (cứ lúc nguy hiểm là rút ra)',
        'MC quá đơn độc — quên giới thiệu sư huynh đệ',
      ],
      creativeSpace: 'AI tự sáng tạo: tên đan dược, tên bí cảnh, tên kỹ năng (pháp quyết). KHÔNG tự sáng tạo: cảnh giới progression order, sect hierarchy frame.',
    },
    sceneTypes: [
      'Bế quan luyện công (scene chậm, internal growth + insight)',
      'Đan dược/luyện khí (skill scene — process + result)',
      'Đấu pháp đại hội (combat scene với rules cụ thể)',
      'Sư môn nghị sự (politics scene — sect hierarchy)',
      'Bí cảnh khám phá (exploration + discovery)',
      'Đột phá cảnh giới (breakthrough — emotional climax + power-up)',
      'Truy sát / chạy trốn (chase scene — danger from upper-realm enemy)',
      'Đạo lý ngộ đạo (philosophical introspection)',
    ],
    arcTemplate: 'Arc 80-100 chương: ch.1-15 setup mới (cảnh giới mới / thử thách mới) → ch.16-40 escalation (gặp đối thủ + tài nguyên + sub-quest) → ch.41-60 mid-climax (1 đối thủ lớn ngã + tài nguyên đột phá đắc) → ch.61-80 thu hoạch (consolidate + new threats hint) → ch.81-100 arc climax (đột phá cảnh giới + reveal layer thế giới mới).',
    stakesLadder: ['Cá nhân (sống/chết)', 'Sư môn (sect war)', 'Khu vực (vực này / phái này)', 'Đại lục', 'Tinh không'],
    signatureTropes: [
      'Đại hội tỉ thí / so tài thiên kiêu cùng thế hệ (lôi đài, bảng xếp hạng đệ tử)',
      'Bí cảnh / cấm địa khai mở → khám phá đoạt cơ duyên + truyền thừa',
      'Đan hội / luyện khí đại hội → face-slap qua tay nghề luyện chế',
      'Đấu giá hội: bảo vật hiếm xuất hiện + tranh mua + lộ thân thế',
      'Thiên kiếp / độ kiếp — milestone đột phá đại cảnh giới (Nguyên Anh, Hóa Thần...)',
      'Đạo lữ / hồng nhan tri kỷ subplot (slow-burn, không harem)',
      'Truy sát từ cổ tộc / ma đạo / phái thù → chạy trốn + phản kích',
    ],
    textureDetails: [
      'Cảnh giới jargon CỤ THỂ: Luyện Khí tầng X, Trúc Cơ sơ/trung/hậu kỳ, kết Kim Đan, ngưng Nguyên Anh',
      'Xưng hô tu chân: đạo hữu, sư huynh/sư tỷ, tiền bối, vãn bối, đạo tôn, chân nhân',
      'Vật phẩm phân phẩm cấp: linh thạch hạ/trung/thượng phẩm, đan dược + đan phương, pháp bảo + phẩm giai, phù lục, linh thảo theo niên hạn',
      'Địa danh tu chân: Tụ Linh trận, động phủ, linh mạch, bí cảnh, tông môn sơn môn',
      'Nghi thức: bái sư, kết đạo lữ, truyền công, đả tọa điều tức, đột phá quan',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'kiem-hiep': {
    essence: 'Giang hồ + nghĩa khí + võ công + ân oán + không tu tiên jargon nặng',
    setup: {
      requiredCastRoles: [
        'Sư phụ võ học (mentor — có lai lịch giang hồ)',
        'Bằng hữu / sư đệ (≥1 — keo sơn)',
        'Hồng nhan tri kỷ / nữ chính (≥1)',
        'Kẻ thù võ lâm (≥1 — có lý do private grievance)',
        'Đại bang phái thù địch (1 — institutional enemy)',
        'Lão giang hồ trung lập (1 — informant / fence)',
      ],
      goldenFingerType: 'Tâm pháp ẩn / kiếm pháp gia truyền / nội công đặc thù. Tăng theo luyện tập + thực chiến, không có shortcut đan dược.',
      phaseFramework: 'Theo võ công progression: Sơ học → Nội công sơ thành → Tuyệt kỹ thành tựu → Nhất phương cao thủ → Võ lâm minh chủ → Tông sư. Mỗi cấp ≈ 100-150 ch.',
      worldRulesFocus: [
        'Võ lâm phái hệ (Thiếu Lâm, Võ Đang, Cái Bang...) + thế lực địa lý',
        'Quy tắc giang hồ (báo thù tự xử, ân oán không lan can)',
        'Trận đấu protocol (đơn đả, vũ khí lựa chọn, danh dự win conditions)',
        'Quan vs giang hồ — government không can thiệp võ lâm',
      ],
      openingPattern: 'MC ở quán trọ / đại đường / khoảng dã giang hồ. Scene 1: MC một mình (rượu/trà), 4-6 kẻ áo đen vào — quái khách. Scene 2: MC giải quyết bằng 1-2 chiêu sắc lẻm. Hook: lý do đối thủ tìm đến hé lộ — ân oán cũ.',
    },
    process: {
      qualityFloor: 'Mỗi đoạn võ công phải có chiêu thức tên cụ thể + body movement chi tiết + tactical layer (đánh chỗ nào trên người).',
      quantitySustainability: 'Mỗi 100 chương = 1 đại sự kiện giang hồ (võ lâm đại hội / minh chủ tranh đoạt / bí kíp xuất hiện). Mỗi 200 chương = 1 power tier mới mở.',
      commonFailures: [
        'Battle scenes chỉ "X tung chưởng đánh Y, Y bay ra" — repetitive',
        'Quên tên võ công đã giới thiệu, lặp lại bằng tên khác',
        'MC trở thành thiên hạ vô địch quá sớm → mất stakes',
        'Bỏ subplot ân oán (revenge thread) sau khi gặp arc mới',
      ],
      creativeSpace: 'AI tự sáng tạo: tên chiêu thức (theo motif cảnh vật / khí công), tên môn phái nhỏ, tên quán trọ. KHÔNG tự sáng tạo: phái lớn (Thiếu Lâm/Võ Đang) đã có canon.',
    },
    sceneTypes: [
      'Đối thoại quán trọ (subtext + foreshadow ân oán)',
      'Giao đấu tay đôi (1-on-1 với tactical layer)',
      'Quần chiến (group battle — tactical positioning)',
      'Truy sát bịt đường (chase scene — tactical retreat)',
      'Học võ / tâm pháp (training scene)',
      'Đại hội võ lâm (political/competitive scene)',
      'Giải bí kíp / cổ vật khám phá',
      'Hồng nhan emotional pivot',
    ],
    arcTemplate: 'Arc 80-100 ch: ch.1-15 setup ân oán mới → ch.16-40 thu thập đồng minh + tin đồn → ch.41-60 giao đấu mid-tier → ch.61-80 reveal mastermind → ch.81-100 final showdown + new revenge seed for next arc.',
    stakesLadder: ['Bản thân + bằng hữu', 'Bang phái nhỏ', 'Một vùng giang hồ', 'Toàn võ lâm', 'Triều đình + giang hồ + hải ngoại'],
    signatureTropes: [
      'Tỉ võ chiêu thân / lôi đài tranh hùng',
      'Bí kíp / tuyệt học bị võ lâm dòm ngó → tranh đoạt',
      'Ân oán môn phái / huyết hải thâm cừu báo thù',
      'Hành hiệp trượng nghĩa cứu người yếu → kết giao bằng hữu',
      'Tửu lâu / khách điếm nghe tin tức + kết giao + đụng độ',
      'Minh chủ võ lâm đại hội / quần hùng tụ hội',
      'Trúng độc / trọng thương → kỳ ngộ liệu thương → võ công tăng tiến',
    ],
    textureDetails: [
      'Võ công terms: nội công tâm pháp, khinh công, kiếm/đao pháp có tên chiêu thức, điểm huyệt, chân khí kinh mạch',
      'Xưng hô giang hồ: đại hiệp, thiếu hiệp, cô nương, lão phu, tại hạ, các hạ, tiền bối',
      'Địa danh: khách điếm, tửu lâu, tiêu cục, phân đà / tổng đà, sơn trại',
      'Vật phẩm: bảo kiếm/đao có tên, ám khí, kim sang dược, giải độc đan, ngân lượng / ngân phiếu',
      'Giang hồ quy củ: ân oán phân minh, không đánh kẻ ngã ngựa, tỉ võ điểm tới vi chỉ',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'huyen-huyen': {
    essence: 'Epic fantasy hoành tráng + thiên địa rộng + cổ tộc + thần ma cấp cao',
    setup: {
      requiredCastRoles: [
        'Cổ tộc tổ tiên / linh hồn cổ xưa (≥1 — guidance)',
        'Đồng đội đại đế cấp (≥2 — formidable allies)',
        'Đại đế / thần vương cấp đối thủ (≥2)',
        'Cổ tộc đối thủ (≥1 cấu trúc — institutional)',
        'Đạo lữ / hồng nhan có lai lịch (≥1)',
        'Linh thú cổ huyết / thần thú trợ (1)',
      ],
      goldenFingerType: 'Huyết mạch cổ thần / cổ kinh / mảnh xương đại đế. Power scale visible, có giới hạn rõ.',
      phaseFramework: 'Theo cấp bậc thần ma: Phàm → Thần Cảnh → Đế Cảnh → Tôn Cảnh → Hỗn Độn → Thiên Đạo. Mỗi cấp ≈ 150-200 ch.',
      worldRulesFocus: [
        'Cấu trúc thiên địa (vực / đại lục / tinh không / hỗn độn)',
        'Cổ tộc + thần ma family trees + huyết mạch hierarchy',
        'Bí thuật / thần thông cấp cao + điều kiện kích hoạt',
        'Thiên đạo / luân hồi / đại kiếp cycle',
      ],
      openingPattern: 'MC nhỏ bé phàm cấp đứng trước cảnh hoành tráng (vực / cấm khu / vạn tộc liên minh). Scene 1: MC + 1 vật cổ huyết hồng (mảnh xương / cổ kinh). Scene 2: 1 cổ tộc thượng cấp xuất hiện đòi đồ → MC dùng GF lần đầu, GF biểu lộ scale lớn. Hook: cổ tộc/đại đế ẩn nhận biết MC.',
    },
    process: {
      qualityFloor: 'Mỗi big setpiece phải có scope visible (X vạn dặm, Y tộc, Z ngàn năm). KHÔNG vague "rất lớn".',
      quantitySustainability: '1000 chương = 5-6 cấp bậc lớn × 2-3 sub-arc/cấp. Mỗi cấp đột phá = world expansion mới (vực mới mở, cổ tộc mới reveal).',
      commonFailures: [
        'Power inflation — MC ch.50 đã solo cổ tộc → no headroom',
        'Boss reveal jump-cut, không multi-layer (bystander → equal → upper)',
        'Thiên địa chỉ mention 1 lần → flat world',
        'Đồng đội đại đế cấp bị bỏ quên sau giới thiệu',
      ],
      creativeSpace: 'AI tự sáng tạo: tên đại đế cổ xưa, tên cổ tộc, tên cấm khu, tên bí thuật. KHÔNG tự sáng tạo: cấp bậc thần ma progression.',
    },
    sceneTypes: [
      'Cổ tộc đại đường nghị sự',
      'Cấm khu khám phá (exploration with cosmic stakes)',
      'Đấu pháp đại đế cấp (epic combat — multi-realm scope)',
      'Truyền thừa nhận lĩnh (mentor handoff scene)',
      'Tu luyện đột phá (training + breakthrough)',
      'Thiên đạo trial (cosmic test scene)',
      'Đạo lữ emotional pivot (epic romance moment)',
      'Vạn tộc đối kháng (faction war scene)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 reveal cấp mới (mở vực/cổ tộc) → ch.21-50 build alliance + collect cổ tộc tài nguyên → ch.51-80 confrontation mid-tier cổ tộc → ch.81-110 final cổ tộc enemy fall → ch.111-150 đột phá thiên đạo + tease cấp tiếp.',
    stakesLadder: ['Bản thân', 'Một cổ tộc', 'Một vực', 'Một đại lục', 'Tinh không', 'Hỗn độn / thiên đạo'],
    signatureTropes: [
      'Thí luyện thiên kiêu — long phượng bảng / thiên kiêu bảng tranh phong',
      'Viễn cổ di tích / thần ma mộ / đế tàng khai mở',
      'Huyết mạch giác tỉnh / phản tổ → sức mạnh khủng bố',
      'Thánh địa / đế tộc kết oán → bị truy sát toàn vực',
      'Đoạt xá / thôn phệ cơ duyên nguy cơ (kẻ địch ẩn trong cơ duyên)',
      'Vực ngoại chí tôn / cổ lão giáng lâm áp chế',
      'Chí bảo / tiên duyên tranh đoạt vạn tộc hỗn chiến',
    ],
    textureDetails: [
      'Cấp bậc khoa trương rõ tier (vd Đấu Giả → Đại Đế → Chí Tôn → Thánh, hoặc thang tự đặt nhưng phải đặt rõ thứ tự)',
      'Xưng hô: đạo hữu, thánh tử / thánh nữ, thiên kiêu, lão tổ, đế tộc hậu duệ, vô thượng',
      'Vật phẩm: thần binh + giai phẩm, đế chủng / thánh huyết, viễn cổ truyền thừa, hồng mông tử khí, khí vận chi bảo',
      'Địa danh: thần tàng, viễn cổ chiến trường, thánh địa, vực giới, tinh vực',
      'Pháp tắc / đại đạo: đại đạo chi âm, pháp tắc oai áp, đạo vận, khí vận long, thiên địa dị tượng',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'do-thi': {
    essence: 'Hiện đại + business/career + golden finger app + numbers cụ thể + non-combat',
    setup: {
      requiredCastRoles: [
        'Bạn thân / co-founder (≥1 — đồng hành kinh doanh)',
        'Mentor business (≥1 — early backer hoặc cố vấn)',
        'Người yêu / love interest (≥1 — slow-burn)',
        'Đối thủ cạnh tranh trực tiếp (≥1 — mid-tier competitor)',
        'Tập đoàn lớn đối kháng (≥1 — institutional antagonist mid/late game)',
        'Quan chức / authority figure (≥1 — gateway to scale)',
        'Family member (mẹ/bố/anh/em — emotional grounding)',
      ],
      goldenFingerType: 'App smartphone / dị năng predictive / kiến thức tương lai. KHÔNG combat ability — chỉ business/info advantage.',
      phaseFramework: 'Theo business scale: Cá nhân/freelance → Quầy/shop nhỏ → Quán/agency địa phương → Chuỗi cấp tỉnh → Cấp quốc gia → Đa quốc gia → IPO/empire. Mỗi cấp ≈ 80-120 ch.',
      worldRulesFocus: [
        'Golden finger trigger conditions (khi nào active, cooldown, weakness)',
        'Tier system của golden finger (Sơ → Đại Sư hoặc Cấp 1-99)',
        'VN-specific business rules (đăng ký doanh nghiệp, thuế, regulators)',
        'Geographic markers (Phượng Đô = Hà Nội, Hải Long Đô = TP.HCM)',
      ],
      openingPattern: 'MC trong domain nhỏ ĐÃ vận hành (quầy cơm/quán net/studio nhỏ). Scene 1: MC làm việc routine + golden finger active. Scene 2: customer/cơ hội bước vào → small face-slap đầu (đối thủ khinh, MC giải quyết). Scene 4-5: deal lớn ký kết / recognition mass-witnessed. Hook: opportunity-driven (deal lớn / customer giàu xuất hiện).',
    },
    process: {
      qualityFloor: 'Mỗi chương phải có ≥3 numbers cụ thể (revenue, customer count, deal value). Subtext trong dialogue ≥1 scene.',
      quantitySustainability: '1000 chương = 5-6 phases business scale × 5 sub-arc/phase. Mỗi phase phase mở thêm 1 thị trường + 1 institutional enemy mới.',
      commonFailures: [
        'Combat scene drift (MC bị gangster đánh, MC đánh bảo kê) — VI PHẠM non-combat genre',
        'Numbers vague ("doanh thu lớn", "rất nhiều tiền") thay vì cụ thể',
        'Romance bị bỏ rơi — slow-burn forgot subplot',
        'Đối thủ chỉ "đối thủ" không có name + agenda + escalation timing',
        'Golden finger trở thành cheat code (luôn cứu kịp lúc) — mất stakes',
      ],
      creativeSpace: 'AI tự sáng tạo: tên brand, tên dish/sản phẩm, tên customer cụ thể. KHÔNG tự sáng tạo: VND currency rules, VN city names mapping.',
    },
    sceneTypes: [
      'Deal negotiation (commercial — subtext nặng)',
      'Customer service scene (small face-slap potential)',
      'Đối thủ phá giá / scandal (commercial conflict)',
      'M&A / hợp đồng ký kết (milestone scene)',
      'Phỏng vấn báo chí / PR (recognition scene)',
      'Họp ban quản trị (politics-light scene)',
      'Family dinner (emotional grounding)',
      'Romantic moment (slow-burn pivot)',
      'Lobby / quan chức (gateway to scale)',
    ],
    arcTemplate: 'Arc 80-120 ch: ch.1-15 mở rộng quy mô tiếp (lên tier mới) → ch.16-40 đối thủ mới phản ứng → ch.41-60 mid-conflict (PR / lobby / phá giá) → ch.61-80 MC counter-strategy + win → ch.81-120 thu hoạch + romance arc beat + tease tier tiếp.',
    stakesLadder: ['Cá nhân (tiền trọ)', 'Gia đình (mẹ chữa bệnh)', 'Cộng đồng (khu phố)', 'Thành phố', 'Quốc gia', 'Quốc tế / IPO'],
    signatureTropes: [
      'Deal / hợp đồng lật kèo → face-slap đối thủ thương trường (bằng số liệu, không bạo lực)',
      'Ra mắt sản phẩm / sự kiện gây chấn động ngành',
      'Bị khinh thường ban đầu (nhà giàu / đại lão / người cũ) → công nhận ngược',
      'Thâu tóm / M&A / giành thị phần / chiến giá',
      'Cứu giúp đúng người (ân nhân / quý nhân) → báo đáp về sau',
      'Khủng hoảng truyền thông / PR → xử lý cao tay',
      'Gặp lại người cũ (đồng môn / người yêu cũ / kẻ từng coi thường) đổi vế',
    ],
    textureDetails: [
      'Con số CỤ THỂ: doanh thu, vốn, % thị phần, định giá, lương, KPI — KHÔNG "rất nhiều"',
      'Brand / địa danh hiện đại: toà nhà văn phòng, khu CBD, nhà hàng cao cấp, xe/đồng hồ hiệu',
      'Xưng hô đời thường: anh/chị/em, giám đốc, tổng, sếp, đồng nghiệp, đối tác',
      'Chứng từ / công cụ: hợp đồng, slide pitch, báo cáo tài chính, app/dashboard golden finger',
      'Nghi thức kinh doanh: họp HĐQT, ký kết, gọi vốn, roadshow, đàm phán. KHÔNG combat vật lý',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'quan-truong': {
    essence: 'Chính trị + thứ bậc quan + subtext nặng + KHÔNG combat + politics qua văn bản',
    setup: {
      requiredCastRoles: [
        'Mentor quan trường (≥1 — đại học sĩ / phó bí thư cấp trên)',
        'Đồng nghiệp đồng minh (≥1 — cùng phe phái)',
        'Đối thủ cùng cấp (≥1 — competing for promotion)',
        'Cấp trên đối nghịch (≥1 — bí thư cũ / phe đối thủ)',
        'Family (vợ/con — political asset hoặc liability)',
        'Phe trung lập (≥1 — tỉnh trưởng / tỉnh ủy)',
      ],
      goldenFingerType: 'Trí tuệ + ký ức tương lai + analytical mind. KHÔNG có hệ thống cheat — purely political acumen.',
      phaseFramework: 'Theo cấp quan: Xã/phường → Huyện → Tỉnh → Trung ương → Bộ Chính Trị. Mỗi cấp ≈ 150-200 ch.',
      worldRulesFocus: [
        'Hệ thống chức quan + thứ bậc + cycle bổ nhiệm',
        'Quy tắc ngầm phe phái (ai theo ai, kế thừa thế lực)',
        'Văn bản pháp luật + thanh tra + quy trình điều tra',
        'Subtext culture (gõ bàn 3 tiếng = tín hiệu, im lặng có nghĩa)',
      ],
      openingPattern: 'MC nhậm chức cấp thấp (Phó Bí Thư Huyện / Trưởng Phòng). Scene 1: phòng họp / phòng làm việc, MC đọc hồ sơ + nhận ra inconsistency. Scene 2: MC đối chất 1 cấp trên qua câu thoại subtext. Scene 4-5: MC gửi báo cáo lên cấp cao hơn → bystander/đồng nghiệp shocked. Hook: cấp trên đối nghịch để ý.',
    },
    process: {
      qualityFloor: 'Mỗi scene chính trị phải có subtext (nói A ý B), thứ bậc rõ, văn bản/báo cáo cụ thể. KHÔNG generic "phe đối thủ chống đối".',
      quantitySustainability: '1000 chương = 5-6 cấp quan × 3-4 sub-arc/cấp. Mỗi cấp phải có 1 đại scandal + 1 cải cách MC đẩy thành công.',
      commonFailures: [
        'Combat drift (MC bị gangster đánh) — VI PHẠM non-combat',
        'Subtext mất, dialogue trở nên straightforward → genre flatten',
        'Family bị bỏ rơi → mất emotional layer',
        'Mentor figures forgotten sau khi giới thiệu',
      ],
      creativeSpace: 'AI tự sáng tạo: tên phòng/cục/dự án, tên scandal cụ thể. KHÔNG tự sáng tạo: cấp quan progression, VN political structure.',
    },
    sceneTypes: [
      'Phòng họp đối chất (subtext intense)',
      'Đọc/viết báo cáo (analytical scene)',
      'Cuộc họp Thường Vụ (group political scene)',
      'Tiệc / banquet (informal politics)',
      'Lobby Tỉnh Ủy (vertical politics)',
      'Family dinner (emotional + political asset)',
      'Thanh tra / điều tra (procedural scene)',
      'Tin đồn / báo chí (PR politics)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 nhận chức cấp mới + survey terrain → ch.21-50 phát hiện scandal/cơ hội cải cách → ch.51-80 đối đầu phe đối thủ qua văn bản → ch.81-120 leverage cấp trên neutral → ch.121-150 cải cách success + thăng cấp tease.',
    stakesLadder: ['Cá nhân (sự nghiệp)', 'Gia đình', 'Đơn vị / cơ quan', 'Một tỉnh', 'Trung ương', 'Quốc gia / quốc tế'],
    signatureTropes: [
      'Thăng chức / điều động bất ngờ → cục diện mới',
      'Dự án / chính sách thành tích đột phá ghi điểm',
      'Phe phái đấu đá (mượn tay, gài bẫy qua văn bản / quy trình)',
      'Chống tham nhũng / thanh tra / xử lý vụ việc nhạy cảm',
      'Cứu vãn sự cố dân sinh (thiên tai, sự kiện) → uy tín tăng',
      'Tiếp đón cấp trên / đoàn khảo sát → màn trình diễn chính trị',
      'Reveal hậu trường liên minh / thế lực chống lưng',
    ],
    textureDetails: [
      'Chức danh + thứ bậc rõ: khoa viên → phó/chính khoa → huyện → sở → tỉnh → trung ương',
      'Xưng hô: đồng chí, lãnh đạo, thủ trưởng, tiểu X (cấp dưới), lão X (cấp trên thân)',
      'Văn bản: báo cáo, công văn, nghị quyết, biên bản họp, chỉ thị',
      'Bối cảnh: phòng họp, hội nghị, khảo sát thực địa, tiếp khách, bữa cơm chính trị',
      'SUBTEXT NẶNG: lời nói 2 nghĩa, ẩn ý qua chỗ ngồi / thứ tự phát biểu / cách rót trà. KHÔNG combat',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'lich-su': {
    essence: 'Cổ phong văn ngôn + triều đình + cung đấu + mưu lược + subtext NẶNG',
    setup: {
      requiredCastRoles: [
        'Hoàng đế / quân vương (≥1 — distant authority)',
        'Cha / sư phụ chính trị (≥1 — mentor)',
        'Đồng minh triều thần (≥1)',
        'Quyền thần đối thủ (≥1 — institutional villain)',
        'Hậu cung / nữ chính (≥1 với agenda riêng)',
        'Thám tử / mật thám (≥1 — info network)',
      ],
      goldenFingerType: 'Trí tuệ hiện đại + ký ức kiếp trước + analytical mind. Có thể có chút modern tech knowledge nhưng phải subtle.',
      phaseFramework: 'Theo bậc quan triều đình: Tân khoa → Hàn lâm → Thượng thư → Tể tướng → Thái sư / nhiếp chính. Mỗi cấp ≈ 200 ch.',
      worldRulesFocus: [
        'Thứ bậc triều đình + protocol cung đình',
        'Văn ngôn cổ phong (cách xưng hô, dụng ngữ thời đại)',
        'Cycle cải cách / thanh tẩy / thay phe',
        'Quan vs hoàng đế (loyalty contract)',
      ],
      openingPattern: 'MC tân khoa Trạng Nguyên vào triều ngày đầu. Scene 1: triều đình họp, MC đứng dưới chiếu. Scene 2: hoàng đế hỏi 1 câu trial, MC đáp 1 câu thử thách phe phái. Scene 4-5: cha/mentor hiểu MC đã chọn phe — emotional pivot. Hook: phe đối thủ chú ý.',
    },
    process: {
      qualityFloor: 'Văn ngôn cổ phong (khanh/thần/thiếp/chức), câu dài, subtext ≥3/chương. KHÔNG modern slang.',
      quantitySustainability: '1000 chương = nhiều cải cách + nhiều scandal triều đình + 2-3 đời hoàng đế. Cycle: peace → corruption → reform → conflict → peace.',
      commonFailures: [
        'Slip into modern dialogue ("OK", "không thể tin được") — break period',
        'MC quá thông minh → trở thành deus ex machina',
        'Cung đấu trở thành soap opera, mất stakes chính trị',
      ],
      creativeSpace: 'AI tự sáng tạo: tên cải cách, tên scandal, tên thám tử. KHÔNG tự sáng tạo: VN/TQ history thật (dùng Đại Nam fictional).',
    },
    sceneTypes: [
      'Triều đình nghị sự',
      'Tấu chương / phụng chỉ (analytical scene)',
      'Hậu cung / yến tiệc',
      'Mật đàm phe phái',
      'Vi hành (incognito investigation)',
      'Chiến trường (rare — military politics)',
      'Family dinner (gia tộc politics)',
      'Khoa cử / tuyển hiền',
    ],
    arcTemplate: 'Arc 150-200 ch: ch.1-30 bổ nhiệm cấp mới + phong cảnh chính trị mới → ch.31-70 cải cách proposal + đối thủ phản kháng → ch.71-120 scandal break + investigation → ch.121-170 leverage hoàng đế / phe trung lập → ch.171-200 cải cách success + power consolidation.',
    stakesLadder: ['Cá nhân', 'Gia tộc', 'Một bộ', 'Triều đình', 'Quốc gia', 'Lưỡng quốc / vạn dân'],
    signatureTropes: [
      'Triều nghị / thiết triều tranh biện chính sự',
      'Khoa cử / đề bạt thăng tiến quan lộ',
      'Biên quan chiến sự / dẹp loạn / chinh phạt',
      'Cung đấu hậu cung / ngoại thích tranh quyền',
      'Cải cách / kế sách chấn động triều đình',
      'Sứ thần / hoà thân / bang giao lưỡng quốc',
      'Trung-gian thần ám đấu → reveal phản thần / mưu phản',
    ],
    textureDetails: [
      'Quan chế + xưng hô: bệ hạ, vi thần, ái khanh, thần thiếp, điện hạ, lão phu, vi huynh',
      'Văn ngôn cổ phong: chiếu chỉ, tấu chương, hịch, biểu, sớ',
      'Nghi thức triều đình: quỳ bái, sơn hô vạn tuế, ban yến, thượng triều, bãi triều',
      'THỜI ĐẠI LOCK: chọn 1 triều cụ thể (trang phục / quân chế / tiền tệ / lịch pháp khớp era, CẤM mix)',
      'Vật phẩm: ngọc tỷ, binh phù, thánh chỉ, ngân lượng / quan tiền, ấn tín',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'khoa-huyen': {
    essence: 'Hard sci-fi + tech advance + AI + lab/corp + numbers chính xác',
    setup: {
      requiredCastRoles: [
        'Co-founder / partner research (≥1)',
        'Mentor giáo sư / advisor (≥1)',
        'Đối thủ research lab (≥1 — competing on same problem)',
        'Tập đoàn corporate antagonist (≥1)',
        'Government agency (regulator / military)',
        'Romance interest (often đồng nghiệp lab)',
      ],
      goldenFingerType: 'AI assistant / database tương lai / dị năng predictive. Tăng theo problem solved.',
      phaseFramework: 'Theo tech tier: Lab nhỏ → Startup → Mid corp → Big tech → Quốc gia chiến lược → Đa quốc gia / cosmic. Mỗi cấp ≈ 100-150 ch.',
      worldRulesFocus: [
        'Tech progression realistic (CRISPR, AI, quantum...) cụ thể',
        'Lab/research procedure + funding cycle',
        'Patent/IP system + corporate espionage',
        'Geopolitics tech (US-China-EU competition)',
      ],
      openingPattern: 'MC trong lab giờ khuya, vừa hoàn thành thí nghiệm break record. Scene 1: numbers cụ thể trên màn hình (0.003 giây vs current best 0.05). Scene 2: tin nhắn từ mentor/đối thủ. Scene 4-5: paper publish / press conference shock cộng đồng. Hook: corporate/government interest spike.',
    },
    process: {
      qualityFloor: 'Mỗi tech scene phải có terminology chính xác + numbers benchmark vs current SOTA. KHÔNG technobabble.',
      quantitySustainability: '1000 chương = 5-6 tech tier × 3-4 problem/tier. Mỗi tier mở 1 application domain mới.',
      commonFailures: [
        'Tech ngày càng vague theo arc → "AI thông minh" without specifics',
        'Lab politics drift sang corporate drama',
        'MC trở thành genius cứu mọi vấn đề → mất stakes',
      ],
      creativeSpace: 'AI tự sáng tạo: tên dự án, tên lab cụ thể, tên người. KHÔNG tự sáng tạo: tech terms (phải dùng đúng CRISPR/quantum etc.).',
    },
    sceneTypes: [
      'Lab experiment (process + result + numbers)',
      'Paper writing / publication (recognition)',
      'Conference presentation',
      'Corporate negotiation (IP / acquisition)',
      'Government meeting (regulatory / strategic)',
      'Espionage / cyber attack',
      'Romance moment (lab partner)',
      'Family time (grounding)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 problem mới reveal + market opportunity → ch.21-50 research breakthrough + corporate notice → ch.51-100 đối thủ phản ứng (espionage / poaching / litigation) → ch.101-130 MC counter + scale → ch.131-150 milestone + government attention.',
    stakesLadder: ['Cá nhân (tenure)', 'Lab', 'Tập đoàn', 'Ngành', 'Quốc gia', 'Văn minh / cosmic'],
    signatureTropes: [
      'Đột phá công nghệ / phát minh chấn động ngành',
      'Thử nghiệm / demo thành công trước hội đồng / nhà đầu tư',
      'Tranh chấp bản quyền / gián điệp công nghiệp',
      'AI / hệ thống thức tỉnh hoặc vượt kiểm soát',
      'Khủng hoảng kỹ thuật → giải cứu bằng tri thức chính xác',
      'Hội nghị / giải thưởng khoa học công nhận',
      'Reveal mối đe doạ cosmic / văn minh cấp cao',
    ],
    textureDetails: [
      'Thuật ngữ kỹ thuật CHÍNH XÁC: thông số, đơn vị đo, công thức, kiến trúc hệ thống',
      'Bối cảnh: lab, phòng sạch, data center, trạm vũ trụ, khu R&D',
      'Xưng hô: giáo sư, tiến sĩ, kỹ sư, giám đốc công nghệ, trưởng nhóm',
      'Vật phẩm: prototype, chip, drone, cảm biến, mã nguồn, vật liệu mới',
      'Con số đo lường: hiệu năng, độ chính xác, ngân sách, timeline. Logic nhân quả khoa học chặt — KHÔNG magic trá hình',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'vong-du': {
    essence: 'VR full-immersion (mũ giáp/cabin) "thế giới thứ hai" + IRL impact mạnh + e-sport/streamer/giải đấu thực tế. KHÔNG pure game.',
    setup: {
      requiredCastRoles: [
        'Đồng đội thân in-game (≥1 — bond cả IRL nếu có)',
        'Guild master / leader (≥1 — political + IRL connection)',
        'Top player rival (≥1 — public face-off, IRL identity reveal arc)',
        'IRL family / friend (≥1 — life-stakes anchor: học/sự nghiệp/tài chính)',
        'IRL business contact (≥1 — sponsor/agent/club owner — game results → real money)',
        'Đối thủ guild/clan lớn (≥1 — institutional, có IRL backing — corp/quỹ đầu tư)',
        'Game dev / admin (≥1 — meta layer; có thể reveal AI sentience hoặc bí mật world arc 5+)',
        'Streamer/báo chí game (≥1 — public visibility lever)',
      ],
      goldenFingerType: 'Hidden skill / kiến thức wiki tương lai / equipment cổ / dị năng VR-sync (giác quan thứ 6 trong VR). MC dùng knowledge advantage trong VR + leverage IRL. KHÔNG modify game code.',
      phaseFramework: 'VR + IRL parallel: Solo low-tier → Local guild + IRL part-time → Pro guild + IRL sponsorship → Top 100 + e-sport contract → Server #1 + nhân vật quốc gia → Cross-server championship + IRL fame/family pressure resolved. Mỗi tier ≈ 100-150 ch — VR và IRL escalate cùng nhau.',
      worldRulesFocus: [
        'VR rig technology (mũ helmet basic / full-suit + cabin pod premium / brain-link dangerous & rare)',
        'Sync mechanics: pain feedback, fatigue, login time limits (8h/ngày — IRL health rule)',
        'Game economy → IRL economy bridge (gold → cash conversion rate, item flipping, sponsorship deal sizes)',
        'Guild politics + alliance war + REAL-WORLD corporate backing (guild lớn = clan có corp owner)',
        'Streaming + e-sport circuit (giải league mỗi tháng, world championship cuối năm — IRL milestone)',
        'IRL stakes: học bị ảnh hưởng nếu chơi quá / family pressure / job opportunity từ game performance',
      ],
      openingPattern: 'MC IRL routine (sinh viên / nhân viên văn phòng / vận động viên thất bại) → đeo mũ VR / vào cabin → LOG IN. Scene 1: IRL trạng thái ngắn (status + pressure cụ thể). Scene 2: Login + small in-game competence flex. Scene 3: First IRL impact (bạn cùng phòng nhận ra MC giỏi / mẹ bảo "đừng chơi nhiều" / sponsor message). Scene 4-5: Game result → IRL opportunity hé lộ. Hook: IRL stakes escalate (giải đấu local, sponsor offer, scout liên hệ).',
    },
    process: {
      qualityFloor: 'Mỗi chương phải BLEND: ≥1 in-game scene + ≥1 IRL scene + ≥1 number/stat (damage / drop value / IRL tiền / xếp hạng). VR ≠ pure escape — luôn có hậu quả IRL.',
      quantitySustainability: '1000 chương = 5-6 tier game × parallel IRL career arc. Mỗi tier mở: in-game new content + IRL new opportunity (sponsor/club/giải đấu/fame).',
      commonFailures: [
        'Pure-game drift (10+ chương liền in-game, 0 IRL scene) → reader feel "lửng lơ"',
        'IRL chỉ ăn ngủ — KHÔNG có conflict / opportunity từ game success',
        'Game numbers vague ("MC trở nên mạnh") thay vì cụ thể (HP 12k / skill cooldown 30s)',
        'MC solo mọi thing → guild/team mất ý nghĩa',
        'Treat VR như game online cũ (thiếu helmet/cabin sensory layer) → out of date',
      ],
      creativeSpace: 'AI tự sáng tạo: tên guild, tên player, tên item, brand cabin/helmet (vd "NeuroGear X1"), tên giải đấu, tên sponsor. KHÔNG tự sáng tạo: VR rig physics (helmet vs cabin tier), sync rules, IRL stakes mapping.',
    },
    sceneTypes: [
      'IRL routine (1 cảnh ngắn anchor đời thực — phòng trọ / bữa cơm / lớp học / công việc)',
      'Login transition (mũ → cabin → loading → 2nd world feel — sensory rich)',
      'Solo boss / dungeon clear (in-game)',
      'PvP duel ranking (in-game)',
      'Guild raid (in-game group strategy)',
      'Streamer broadcast (visibility lever — viewer count, chat, sponsor logo)',
      'Sponsor/agent meeting (IRL — game perf → tiền/contract/đề nghị)',
      'IRL family pressure (mẹ/bố/vợ/con phản ứng việc chơi VR — anchor stakes)',
      'E-sport tournament (climax — VR battle + IRL studio hall + camera + audience cheering)',
      'Auction / market (in-game item flip → IRL cash conversion)',
      'Logout aftermath (out of cabin, IRL impact: tin nhắn, news, deal)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-15 unlock tier mới + IRL pressure setup → ch.16-50 farm + skill build + IRL part-time job/sponsor first contact → ch.51-90 guild conflict + first e-sport tournament local → ch.91-120 raid endgame + IRL fame rising / sponsor signed → ch.121-150 tier resolved + IRL milestone (chuyển trường / nghỉ việc full-time pro / family chấp nhận) + tease tier sau.',
    stakesLadder: [
      'Cá nhân (in-game lvl + IRL kinh tế cá nhân)',
      'Guild + IRL family/social circle',
      'Server top 100 + IRL local fame (báo địa phương)',
      'Cross-server + IRL national fame (truyền thông quốc gia)',
      'E-sport quốc gia + IRL career-defining contract (corp/club lớn)',
      'World championship + IRL legacy (tỷ phú game / huyền thoại / di sản)',
    ],
    signatureTropes: [
      'First clear phó bản / raid boss thế giới (server-first announcement)',
      'PK / đấu trường / công thành chiến quy mô lớn',
      'Ẩn nghề / ẩn nhiệm vụ / trang bị thần khí drop hiếm',
      'Leo bảng xếp hạng server → top + IRL local fame',
      'Giải đấu e-sport IRL + khán giả + livestream',
      'Guild war / liên minh chính trị trong game',
      'IRL identity reveal (cao thủ ẩn danh = người bình thường ngoài đời)',
    ],
    textureDetails: [
      'Game terms: cấp độ, HP/MP, CD kỹ năng, DPS, aggro, drop rate, BUFF/debuff',
      'UI mô tả: bảng thuộc tính, log chiến đấu, thông báo hệ thống, NPC thoại',
      'IRL layer song hành: livestream, đội tuyển, hợp đồng, fan, báo chí',
      'Vật phẩm: trang bị + phẩm cấp theo màu, vật liệu chế tạo, đan/dược in-game, tài khoản/điểm',
      'Nghi thức: tổ đội, đấu giá hội, công hội, báo danh giải. IRL impact LUÔN đi kèm',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'dong-nhan': {
    essence: 'Fan-fic + reference IP gốc + canon timeline aware + meta voice',
    setup: {
      requiredCastRoles: [
        'Canon character ally (≥2 — well-known từ IP gốc)',
        'Canon character mentor (≥1)',
        'Canon antagonist (≥1)',
        'Original character ally MC bring (≥1)',
        'Romance (canon hoặc original)',
      ],
      goldenFingerType: 'Knowledge của canon timeline + system hỗ trợ. MC biết tương lai → action ngược canon hoặc fix canon.',
      phaseFramework: 'Theo canon timeline arc: Pre-canon setup → Canon arc 1 → Canon arc 2 → Post-canon. Match độ dài tương ứng IP gốc.',
      worldRulesFocus: [
        'Canon rules (specific to IP gốc — Naruto chakra system, Marvel powers, etc.)',
        'AU divergence points (đâu MC fix, đâu giữ canon)',
        'Power scale của IP gốc',
      ],
      openingPattern: 'MC xuyên không vào canon timeline trong thân xác parallel character (em họ / cousin / tribe member). Scene 1: MC nhận ra timeline + identity. Scene 2: gặp 1 canon character (junior version). Hook: big canon event (Uchiha massacre / Avengers split) sắp đến → MC quyết định.',
    },
    process: {
      qualityFloor: 'Mỗi reference canon phải accurate (tên / power / timeline). KHÔNG sai canon.',
      quantitySustainability: 'Canon arc cycle giữ pacing. Mỗi canon big event = 1 mini-arc cho MC choose involvement.',
      commonFailures: [
        'OOC canon characters → fans angry',
        'MC bend canon quá xa → IP recognition lost',
        'AU divergence không có rule clear → reader confused',
      ],
      creativeSpace: 'AI tự sáng tạo: original characters MC bring vào canon, AU divergence storylines. KHÔNG tự sáng tạo: canon character personality/power.',
    },
    sceneTypes: [
      'Canon character interaction (fan-service)',
      'Canon big event (MC choose to participate or not)',
      'AU divergence pivot',
      'Original side-arc',
      'Power-up training (with canon mentor)',
      'Romance (canon / original blend)',
    ],
    arcTemplate: 'Arc theo canon timeline: setup canon precursor → canon big event approach → MC intervenes/observes → AU divergence consequence → next canon arc setup.',
    stakesLadder: ['Cá nhân', 'Faction trong IP gốc', 'World canon', 'Multi-verse / AU spread'],
    signatureTropes: [
      'Nhập vai vào thời điểm canon then chốt → đổi kịch bản gốc',
      'Gặp + tương tác nhân vật canon nổi tiếng',
      'Dùng foreknowledge canon đón đầu kiếp nạn / sự kiện',
      'Reveal thân phận / kim thủ chỉ với nhân vật gốc',
      'Butterfly làm canon lệch → hệ quả ngoài dự đoán',
      'Đối đầu nhân vật / thế lực mạnh trong nguyên tác',
      'AU / multiverse mở rộng vượt canon gốc',
    ],
    textureDetails: [
      'Reference IP gốc ĐÚNG TÊN: nhân vật / chiêu thức / địa danh / tổ chức canon',
      'Meta voice nhẹ: MC ý thức đang trong tác phẩm nhưng KHÔNG phá không khí',
      'Timeline canon có mốc: sự kiện gốc xảy ra ở chương/năm nào',
      'Xưng hô + setting bám theo IP gốc (giữ đúng quy tắc nguyên tác)',
      'Vật phẩm / năng lực canon giữ đúng cơ chế gốc. Cover story cho khả năng biết trước',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'mat-the': {
    essence: 'Apocalypse + survival + resource scarcity + bunker + interpersonal tension',
    setup: {
      requiredCastRoles: [
        'Family (≥1 — primary motivation)',
        'Trusted survivor (≥1 — early ally)',
        'Antagonist gang leader (≥1 — local threat)',
        'Big organization (≥1 — government remnant / cult)',
        'Mysterious stranger (≥1 — info source)',
        'Romance (slow-burn, trust ladder)',
      ],
      goldenFingerType: 'Inventory/space stockpile + system thông tin + dị năng predictive. MC biết danh sách resources cần.',
      phaseFramework: 'Theo apocalypse stage: Day 1-30 (collapse) → Day 30-100 (early survival) → Year 1 (community rebuild) → Year 2-5 (regional power) → Year 5+ (civilization restoration).',
      worldRulesFocus: [
        'Apocalypse cause + effect on resources/environment/people',
        'Resource scarcity rules (food, water, fuel, ammo decay rates)',
        'Mutation / evolution rules (zombie tier, ability awakening)',
        'Trust system (ngày 1-30 trust 0%, build từ proof of action)',
      ],
      openingPattern: 'MC trong bunker / safehouse, ngày X sau apocalypse, đếm inventory cụ thể. Scene 1: routine check + threat detection (Hệ thống nháy / âm thanh ngoài cửa). Scene 2: encounter (zombie / survivor / bandit). Scene 4-5: MC competence visible (inventory advantage). Hook: signal/contact từ bên ngoài.',
    },
    process: {
      qualityFloor: 'Mỗi chương đếm inventory cụ thể (X lon, Y lít, Z viên đạn). Resource depletion realistic.',
      quantitySustainability: '1000 chương = 5-6 stages × 3-4 community/region arc/stage. Mỗi stage threat tier mới + resource type mới.',
      commonFailures: [
        'Resource math broken (MC unlimited ammo / food)',
        'Trust ladder bỏ — strangers trust nhau quá nhanh',
        'Action movie drift — combat liên tục, mất resource scarcity drama',
      ],
      creativeSpace: 'AI tự sáng tạo: tên survivor, location cụ thể, mutation tier names. KHÔNG tự sáng tạo: apocalypse cause logic.',
    },
    sceneTypes: [
      'Inventory check (resource scarcity drama)',
      'Scavenge run (exploration + danger)',
      'Negotiate with stranger (trust ladder)',
      'Defend bunker (combat with stakes)',
      'Community decision (politics — share resource?)',
      'Encounter mutated / new tier (info reveal)',
      'Family moment (emotional anchor)',
      'Travel to new region (world expansion)',
    ],
    arcTemplate: 'Arc 80-100 ch: ch.1-15 stage mới (cause changes) → ch.16-40 community building / threat scout → ch.41-60 conflict (gang/cult/mutation) → ch.61-80 resource breakthrough + travel → ch.81-100 next stage threat preview.',
    stakesLadder: ['Cá nhân sống/chết', 'Gia đình', 'Bunker (10-50 người)', 'Cộng đồng (vài trăm)', 'Region', 'Cấp quốc gia / civilization'],
    signatureTropes: [
      'Ngày tận thế bùng phát / biến dị khởi đầu',
      'Tranh đoạt / tích trữ vật tư khan hiếm',
      'Thanh tẩy / phòng thủ căn cứ trước sóng quái',
      'Nội bộ phản bội / tranh quyền trong bunker',
      'Gặp nhóm sống sót → thu nạp hoặc loại trừ',
      'Tiến hoá / dị năng giác tỉnh nâng cấp',
      'Reveal nguồn gốc thảm hoạ + thế lực sau màn',
    ],
    textureDetails: [
      'Tài nguyên ĐẾM CỤ THỂ: lương thực/nước/đạn/thuốc/nhiên liệu — số ngày còn lại',
      'Bối cảnh hậu tận thế: đô thị đổ nát, an toàn khu, bunker, trạm tiếp tế',
      'Quái/zombie phân cấp: cấp độ tiến hoá, type biến dị',
      'Xưng hô sinh tồn: đội trưởng, người sống sót, kẻ cướp, dị năng giả',
      'Golden finger: kho không gian, hệ tiến hoá, hệ năng lực. Tension nhân tính: đói khát + đạo đức xám',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'linh-di': {
    essence: 'Horror + supernatural + atmosphere + dread + ngỗ tác/đạo sĩ procedural',
    setup: {
      requiredCastRoles: [
        'Mentor đạo sĩ / pháp sư (≥1)',
        'Đồng đội ngỗ tác / điều tra (≥1)',
        'Antagonist ma quỷ cấp cao (≥1)',
        'Tổ chức bí mật (≥1 — institutional, có agenda)',
        'Romance (often qua case)',
        'Authority (cảnh sát / chính quyền — interaction layer)',
      ],
      goldenFingerType: 'Âm dương nhãn / pháp khí gia truyền / kiếp trước memory. Tăng theo case solved.',
      phaseFramework: 'Theo supernatural tier: Ma vặt → Yêu trung cấp → Quỷ vương → Cổ thần → Thiên đạo. Mỗi tier ≈ 150-200 ch.',
      worldRulesFocus: [
        'Phân loại ma/quỷ/yêu (theo cấp + cách trừ)',
        'Bùa chú / pháp khí (cấp + activation rules)',
        'Yin-Yang balance + cycle thời gian (giờ ma / ngày sát)',
        'Thế giới song song (âm gian / dương gian transition)',
      ],
      openingPattern: 'MC trong setting procedural (phòng giải phẫu / nhà tang lễ / ngõ tối). Scene 1: case present (xác / hiện tượng lạ). Scene 2: MC dùng âm dương nhãn / discover anomaly. Scene 4-5: encounter ma/quỷ first reveal. Hook: tin nhắn / dấu hiệu unexplainable.',
    },
    process: {
      qualityFloor: 'Mỗi scene horror phải có atmosphere build (ánh sáng / âm thanh / khứu giác). Reveal SLOW.',
      quantitySustainability: '1000 chương = 5-6 supernatural tier × 4-5 case arc/tier. Mỗi case tier có rule mới.',
      commonFailures: [
        'Jumpscare cliché thay vì atmosphere',
        'MC over-powered → mất dread',
        'Reveal full explanation → mất ambiguity',
        'Case episodic không có overarching mystery',
      ],
      creativeSpace: 'AI tự sáng tạo: tên ma/quỷ, tên case, tên pháp khí. KHÔNG tự sáng tạo: yin-yang philosophy basics.',
    },
    sceneTypes: [
      'Case present (procedural opening)',
      'Investigation (clue gathering)',
      'Encounter ma/quỷ (atmospheric horror)',
      'Ritual / pháp sự (procedural climax)',
      'Reveal ambiguous (partial answer)',
      'Mentor consultation (info dump nhẹ)',
      'Romance / emotional pivot',
      'Cycle thời gian (giờ ma scene)',
    ],
    arcTemplate: 'Arc 80-100 ch: ch.1-15 case mới + tier hint → ch.16-40 investigation + minor encounter → ch.41-60 mid-reveal + ally betrayal? → ch.61-80 ritual climax + tier boss face-off → ch.81-100 partial resolution + new tier hint.',
    stakesLadder: ['Cá nhân', 'Gia đình / cộng đồng nhỏ', 'Một thành phố', 'Một nước', 'Yin-Yang balance', 'Cosmic order'],
    signatureTropes: [
      'Nhận án / uỷ thác điều tra hiện tượng quái dị',
      'Nghi thức trừ tà / trấn yểm / phong thuỷ',
      'Ngỗ tác / khám nghiệm thi thể procedural → manh mối',
      'Truyền thuyết dân gian / cấm kỵ làng quê',
      'Quỷ / oan hồn báo oán → giải oan',
      'Nhập mộ / cổ trạch / u minh thám hiểm',
      'Reveal nguồn gốc lời nguyền + phá giải',
    ],
    textureDetails: [
      'Dụng cụ trừ tà: bùa, chu sa, gạo nếp, mực đen, kiếm đào, đèn dầu, hương',
      'Thuật ngữ: âm khí/dương khí, hồn phách, trận pháp, long mạch, mệnh cách',
      'Nghi thức cụ thể: vẽ bùa, niệm chú, bày trận, đặt cấm kỵ',
      'Bối cảnh không khí: đêm, nghĩa địa, cổ trạch, sương mù, đèn leo lét',
      'Ngỗ tác chi tiết: tử ban, thi biến, dấu vết khám nghiệm. Atmosphere DREAD > jump-scare',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'di-gioi': {
    essence: 'Isekai + modern knowledge gap + culture clash + tech uplift / lord building',
    setup: {
      requiredCastRoles: [
        'Local guide / first ally (≥1 — translation + culture)',
        'Mentor (local) — sage / chief / sect master',
        'Romance / love interest (local)',
        'Antagonist faction (≥1 — institutional)',
        'Original-world memory (occasionally activated)',
        'Henchmen / followers (≥2 — MC build base)',
      ],
      goldenFingerType: 'Modern knowledge database / system / inventory. Tăng theo problem-solving.',
      phaseFramework: 'Theo scope: Village → Town → County → Kingdom → Continent → World/Multiverse. Mỗi cấp ≈ 100-150 ch.',
      worldRulesFocus: [
        'Local magic / power system (nếu có)',
        'Culture/customs/language gap',
        'Tech level local + uplift constraints (material limits)',
        'Political map + faction relations',
      ],
      openingPattern: 'MC tỉnh dậy ở location lạ (rừng / làng / hostel). Scene 1: observe + nhận ra modern knowledge advantage. Scene 2: encounter local + first culture clash + MC competence visible. Scene 4-5: MC propose solution local thấy magic. Hook: opportunity (recruit / project / love interest).',
    },
    process: {
      qualityFloor: 'Tech uplift realistic (material limits, time to build). Culture gap visible mỗi chương.',
      quantitySustainability: '1000 chương = scope expansion ladder × tech tier ladder × political layer.',
      commonFailures: [
        'MC instant master (xuyên không 1 tuần đã thành lord) — mất stakes',
        'Local culture/language quên — flat world',
        'Tech jump quá nhanh (modern → industrial → digital trong 100 ch)',
        'MC over-powered — mất sense of struggle',
      ],
      creativeSpace: 'AI tự sáng tạo: tên local cities/factions, custom names. KHÔNG tự sáng tạo: tech uplift logic.',
    },
    sceneTypes: [
      'Culture clash discovery',
      'Tech uplift project (engineering scene)',
      'Recruit followers',
      'Negotiate with local faction',
      'Battle (small-scale, building militia)',
      'Romance / cross-culture pivot',
      'Memory activation (modern world flashback)',
      'Scope expansion (new region)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 scope mới (city/region) → ch.21-50 build infrastructure + tech uplift → ch.51-90 politics + faction conflict → ch.91-120 breakthrough + recognition → ch.121-150 next scope tease.',
    stakesLadder: ['Cá nhân sống', 'Village', 'Town', 'County', 'Kingdom', 'Continent / world'],
    signatureTropes: [
      'Xây dựng lãnh địa / bộ lạc từ con số không',
      'Nâng cấp công nghệ / canh tác / luyện kim (tech uplift)',
      'Chinh phục / liên minh bộ lạc - vương quốc lân cận',
      'Chống quái thú triều / thiên tai dị giới',
      'Thương đoàn / giao thương xuyên vương quốc',
      'Phong hàm / sắc phong leo bậc quý tộc',
      'Reveal bí mật dị giới / thần linh / nguồn gốc thế giới',
    ],
    textureDetails: [
      'Tri thức hiện đại BẢN ĐỊA HOÁ: muối/sắt/thuốc súng/nông cụ/y học — quy trình cụ thể, có thiếu nguyên liệu (cost)',
      'Hệ thống lãnh chúa/quý tộc: tước vị, thuế, dân số, tài nguyên lãnh địa',
      'Chủng tộc dị giới: elf / orc / thú nhân / người lùn + đặc tính riêng',
      'Xưng hô: lãnh chúa đại nhân, bệ hạ, hiệp sĩ, trưởng lão bộ lạc',
      'Vật phẩm: ma thạch, vũ khí rèn, nông sản, bản đồ. Cover story nguồn gốc tri thức',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'ngon-tinh': {
    essence: 'Romance + lyrical voice + emotional depth + slow-burn + female POV thường',
    setup: {
      requiredCastRoles: [
        'Male lead (≥1 — concrete occupation, flaws, past)',
        'Female protagonist career path (occupation rõ)',
        'Best friend / confidant (≥1 — voice of reason)',
        'Romantic rival (≥1 — but NOT cliché tổng tài)',
        'Family of MC (≥1 — emotional grounding)',
        'Past obstacle (≥1 — old breakup / family dispute)',
      ],
      goldenFingerType: 'Career/skill mastery + emotional intelligence. KHÔNG có hệ thống fantasy — purely realistic.',
      phaseFramework: 'Theo relationship stage: Reunion/meet → tentative connection → trust building → conflict + resolution → commitment → growth together. Total 800-1200 ch.',
      worldRulesFocus: [
        'Realistic occupation rules (đừng vague "anh ấy là CEO")',
        'Emotional/communication culture (Vietnamese/Chinese-East Asian)',
        'Family pressure dynamics',
        'Past wound triggers + healing arc',
      ],
      openingPattern: 'Scene atmospheric (location concrete + season/weather + time). MC introspective. Scene 2: gặp male lead (encounter — không necessarily romantic ngay). Scene 4-5: emotional pivot — past memory triggered. Hook: male lead unexpectedly kind / honest moment.',
    },
    process: {
      qualityFloor: 'Mỗi chương ≥1 emotional layered moment (3-tier inner monologue). Dialogue subtext ≥1.',
      quantitySustainability: '1000 chương đòi hỏi career progress parallel với relationship arc + supporting characters arcs.',
      commonFailures: [
        'Tổng tài lạnh lùng cliché (đã chán)',
        'Female protagonist passive — chỉ chờ male lead rescue',
        'Family / friend bị bỏ rơi → flat',
        'Drama vô lý (misunderstanding kéo dài 50 ch)',
      ],
      creativeSpace: 'AI tự sáng tạo: tên brand/cafe/setting cụ thể, tên friend. KHÔNG tự sáng tạo: emotional culture norms.',
    },
    sceneTypes: [
      'Encounter scene (atmospheric)',
      'Tentative dialogue (subtext nặng)',
      'Career milestone (parallel arc)',
      'Family dinner / pressure',
      'Past flashback (memory trigger)',
      'Romantic moment (slow-burn pivot)',
      'Conflict + apology (emotional climax)',
      'Friend confidant scene',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 relationship stage mới → ch.21-50 build trust + career parallel → ch.51-90 obstacle (past wound / family / rival) → ch.91-120 breakthrough emotional → ch.121-150 commitment + tease next stage.',
    stakesLadder: ['Cá nhân (career)', 'Family pressure', 'Couple stability', 'Reputation / public', 'Marriage / lifelong'],
    signatureTropes: [
      'Gặp gỡ định mệnh / hiểu lầm ban đầu',
      'Ghen tuông / tình địch xen vào',
      'Chăm sóc lúc yếu đuối → tim rung động',
      'Gia đình / môn đăng hộ đối phản đối',
      'Chia ly do hiểu lầm → đoàn tụ',
      'Ngọt sủng / độc chiếm khoảnh khắc',
      'Cầu hôn / cột mốc cam kết lâu dài',
    ],
    textureDetails: [
      'Tâm lý nội tâm tinh tế: mạch cảm xúc, do dự, rung động được miêu tả kỹ',
      'Ngôn ngữ trữ tình: ẩn dụ, cảnh vật hoà với cảm xúc',
      'Xưng hô tình cảm: anh/em, tên gọi thân mật, biệt danh riêng',
      'Cử chỉ nhỏ giàu subtext: ánh mắt, chạm tay, im lặng, hơi thở',
      'Bối cảnh lãng mạn: mưa, hoàng hôn, cafe, nhà. SLOW-BURN — KHÔNG yêu nhanh tình nhanh. Female POV thường',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'quy-tac-quai-dam': {
    essence: 'Rules horror + uncanny valley + paranoia + sinh tồn = tuân thủ',
    setup: {
      requiredCastRoles: [
        'Đồng đội cùng phó bản (≥2 — mỗi người có rule sub-set khác)',
        'Mentor cũ / informant (≥1)',
        'Antagonist NPC (≥1 — entity bí ẩn)',
        'Tổ chức bí mật (≥1 — knows about phó bản)',
        'Player phản bội (≥1 — twist mid-arc)',
      ],
      goldenFingerType: 'Logic/quan sát sắc / memory chính xác / system hé lộ rule ẩn. KHÔNG combat ability.',
      phaseFramework: 'Theo phó bản tier: Tutorial (chung cư / văn phòng) → Trung cấp (metro / bệnh viện) → Cao cấp (city-wide) → Đỉnh (multi-realm). Mỗi tier ≈ 200 ch.',
      worldRulesFocus: [
        'Rule structure (10 điều / phó bản, một số mâu thuẫn)',
        'Phó bản trigger conditions (giờ giấc / địa điểm / vật phẩm)',
        'Death rules (vi phạm = chết, không retry)',
        'Meta layer (ai/cái gì tạo ra phó bản)',
      ],
      openingPattern: 'MC nhận tờ giấy 10 quy tắc / vào phó bản. Scene 1: đọc rule + reflexive paranoia. Scene 2: 1 rule trigger (giờ đến) + lựa chọn. Scene 4-5: confirm rule đúng (qua việc tuân thủ). Hook: rule mâu thuẫn / discovery 1 rule có dual meaning.',
    },
    process: {
      qualityFloor: 'Mỗi rule trigger phải có concrete observation + logical reasoning. KHÔNG random.',
      quantitySustainability: '1000 chương = 5-6 phó bản tier × 3-4 phó bản instance/tier. Mỗi phó bản ~50-80 chương.',
      commonFailures: [
        'Rule arbitrary → reader cảm thấy unfair',
        'MC lucky guess hoài → mất logic appeal',
        'Combat drift (MC fight entity) → break genre',
        'Reveal full mythology → mất uncanny',
      ],
      creativeSpace: 'AI tự sáng tạo: rule cụ thể từng phó bản, entity descriptions. KHÔNG tự sáng tạo: meta rules (cấm combat, sinh tồn = tuân thủ).',
    },
    sceneTypes: [
      'Rule reading + reasoning',
      'Rule trigger event (climax-let)',
      'Đồng đội disagree (politics)',
      'Phó bản exploration',
      'Twist player betray',
      'Encounter NPC ambiguous',
      'Rule mâu thuẫn discovery',
      'Meta layer hint',
    ],
    arcTemplate: 'Arc 50-80 ch: ch.1-10 phó bản entry + rule reveal → ch.11-30 rule testing + early death (one teammate) → ch.31-50 mid-twist (rule mâu thuẫn / NPC reveal) → ch.51-70 meta layer hint → ch.71-80 phó bản clear + next tier preview.',
    stakesLadder: ['Cá nhân (sống/chết phó bản)', 'Đồng đội (sacrifice)', 'Phó bản tier', 'Multi-phó-bản', 'Meta entity'],
    signatureTropes: [
      'Nhập phó bản đời thường biến dị + nhận bảng quy tắc',
      'Phân biệt quy tắc thật / giả + thử nghiệm',
      'NPC quái dị tuân / phá quy tắc',
      'Suy luận tìm điều kiện thoát',
      'Phản quy tắc đoạt phần thưởng / manh mối',
      'Reveal cơ chế phó bản + kẻ tạo ra nó',
      'Sống sót qua đêm / vòng lặp lặp lại',
    ],
    textureDetails: [
      'Bảng quy tắc ĐÁNH SỐ (Quy tắc 1..N) có mâu thuẫn cài cắm thật/giả',
      'Bối cảnh đời thường nhiễu: văn phòng / metro / bệnh viện / siêu thị / chung cư đêm',
      'Chi tiết uncanny: sai lệch nhỏ gây bất an (cửa thừa, người thiếu mặt, đồng hồ sai giờ)',
      'Cơ chế trừng phạt khi phạm quy tắc (chết / biến mất / bị thay thế)',
      'Xưng hô lạnh / thủ tục. PARANOIA + tuân thủ = sinh tồn, KHÔNG combat vật lý',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'ngu-thu-tien-hoa': {
    essence: 'Beast taming + pet evolution + asymmetric info + pet vs pet combat',
    setup: {
      requiredCastRoles: [
        'Bạn ngự thú sư (≥1 — đồng hành)',
        'Mentor ngự thú học (≥1 — sage)',
        'Đối thủ học viện (≥1 — same level)',
        'Đối thủ gia tộc / faction (≥1 — institutional)',
        'Linh thú trợ (chủ pet — companion + arc)',
        'Romance / partner (often qua pet trade)',
      ],
      goldenFingerType: 'Tuyến Tiến Hóa Ẩn (asymmetric info) + công thức feed + memory pattern matching.',
      phaseFramework: 'Theo pet tier: Sơ Cấp → Trung → Cao → Đại Sư → Thần Cấp. Mỗi tier ≈ 150-200 ch. Pet count expand từ 1 → 6+ over story.',
      worldRulesFocus: [
        'Pet tier system (cấp + thuộc tính + evolution conditions)',
        'Feeding rules (food X cho pet Y → tăng Z stat)',
        'Battle protocol (pet vs pet — MC chỉ huy)',
        'Học viện / gia tộc politics',
      ],
      openingPattern: 'MC ở học viện ngự thú, chuẩn bị thí đấu / chọn pet đầu. Scene 1: equipment check + đồng đội tease. Scene 2: chọn 1 pet "tệ" theo wiki nhưng MC biết Tuyến Tiến Hóa Ẩn → người khác cười. Scene 4-5: pet break expectation lần đầu. Hook: thí đấu / next tier opportunity.',
    },
    process: {
      qualityFloor: 'Mỗi pet evolution phải có feed chi tiết + tier name + ability description.',
      quantitySustainability: '1000 chương = 5-6 tier × pet count expand × world expansion. Mỗi pet có sub-arc riêng.',
      commonFailures: [
        'Pet trở thành unit thay vì character → flat',
        'Evolution shortcut (MC luôn biết) → mất struggle',
        'MC tự fight (vi phạm genre) → drift',
        'Combat repetitive — same skill names',
      ],
      creativeSpace: 'AI tự sáng tạo: pet names, evolution lineage names, feed item names. KHÔNG tự sáng tạo: tier progression order.',
    },
    sceneTypes: [
      'Pet selection / acquire',
      'Feeding / training (process scene)',
      'Pet evolution (climax scene)',
      'Battle pet vs pet (MC commands)',
      'Học viện thí đấu',
      'Gia tộc politics',
      'Romance / pet trade',
      'Wild discovery (rare species)',
    ],
    arcTemplate: 'Arc 100-150 ch: ch.1-20 acquire/evolve pet mới → ch.21-50 train + skill build → ch.51-90 thí đấu / battle escalation → ch.91-120 confrontation institutional enemy → ch.121-150 milestone + new tier preview.',
    stakesLadder: ['Cá nhân học viện', 'Gia tộc', 'Khu vực (vùng beast)', 'Quốc gia ngự thú', 'World rare beast preserve'],
    signatureTropes: [
      'Bắt / thuần hoá thú khế ước mới',
      'Tiến hoá / giác tỉnh huyết mạch ẩn của pet',
      'Thi đấu ngự thú sư đối kháng (pet vs pet)',
      'Cấm khu / dã ngoại đoạt trứng / thú hiếm',
      'Học viện thí luyện / xếp hạng',
      'Thương hội đấu giá thú + vật liệu',
      'Reveal dòng giống thần thú / cổ chủng',
    ],
    textureDetails: [
      'Thông tin BẤT ĐỐI XỨNG: golden finger nhìn tuyến tiến hoá ẩn + công thức nuôi',
      'Phân cấp thú: cấp / tinh, hệ năng lực, kỹ năng pet',
      'Xưng hô: ngự thú sư, huấn luyện sư, thú vương, khế ước giả',
      'Vật phẩm: đan tiến hoá, thức ăn chuyên biệt, khế ước văn, trang bị chiến đấu cho pet',
      'Nghi thức: khế ước nghi, tiến hoá nghi, đối chiến quy củ. Combat = pet vs pet, KHÔNG MC tay đôi',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  'khoai-xuyen': {
    essence: 'Quick transmigration + episodic modular + 30-50 ch / world + Hub Space',
    setup: {
      requiredCastRoles: [
        'AI 0001 / Hub System (≥1 — narrator + brief giver)',
        'Per-world: nguyên chủ original identity',
        'Per-world: nam chính / nữ chính nguyên thế giới',
        'Per-world: pháo hôi / villain nguyên thế giới',
        'Recurring (rare): đồng nghiệp Hub Space / boss Hub',
      ],
      goldenFingerType: 'System + multi-world memory + identity swap + nguyên chủ memories accessible.',
      phaseFramework: 'Theo nhiệm vụ count: 1-10 (mặc định easy worlds) → 11-20 (mid difficulty) → 21+ (high stakes / connected lore). Mỗi nhiệm vụ ≈ 30-50 chương.',
      worldRulesFocus: [
        'Hub Space rules (giữa các thế giới)',
        'Identity swap mechanics (memories, body, voice)',
        'Goal types (cứu nguyên chủ / phục thù / mature original character)',
        'Anti-goals (KHÔNG yêu nam chính / KHÔNG break canon harshly)',
      ],
      openingPattern: 'Hub Space, AI 0001 brief nhiệm vụ. Scene 1: MC đọc hồ sơ nguyên chủ (concrete details — age/job/situation). Scene 2: enter world, đến nguyên chủ body. Scene 4-5: first major plot point reroute. Hook: nam chính / villain encounter early.',
    },
    process: {
      qualityFloor: 'Mỗi mini-arc 30-50 chương phải có 4-act structure complete (setup → escalate → climax → resolution → Hub return).',
      quantitySustainability: '1000 chương = 25-30 nhiệm vụ. Mỗi nhiệm vụ standalone but có thể connected lore (mid-game arc).',
      commonFailures: [
        'Nhiệm vụ kéo dài (60+ ch) → genre identity lost',
        'MC quá strong → mỗi nhiệm vụ trivial',
        'Nguyên chủ bị bỏ rơi → MC chỉ "win" thay vì "save"',
      ],
      creativeSpace: 'AI tự sáng tạo: từng thế giới setting, nhân vật in-world, chi tiết nhiệm vụ. KHÔNG tự sáng tạo: Hub Space rules, anti-goals.',
    },
    sceneTypes: [
      'Hub Space briefing',
      'Identity arrival (1 chương cố định)',
      'Reroute first plot point (cứu nguyên chủ)',
      'Confront pháo hôi / villain',
      'Build alternative path (career / relationship)',
      'Nam chính rebuff / decline',
      'Climax mission objective',
      'Hub return + next mission tease',
    ],
    arcTemplate: 'Mini-arc 30-50 ch: ch.1-3 Hub brief + arrive → ch.4-10 reroute first plot point + show competence → ch.11-25 build alternative path → ch.26-40 confront pháo hôi/villain + climax → ch.41-50 mission complete + Hub return.',
    stakesLadder: ['Nguyên chủ life', 'Một thế giới', 'Multi-world impact', 'Hub Space / system survival'],
    signatureTropes: [
      'Nhận nhiệm vụ + nhập thân phận mới mỗi thế giới',
      'Cứu / bù đắp nguyên chủ + lật ngược kịch bản pháo hôi',
      'Phản diện / nữ phụ counter-play',
      'Thu thập điểm / đạo cụ từ hệ thống',
      'Lỗi / biến số hệ thống reveal',
      'Hub Space nghỉ ngơi + nâng cấp giữa các thế giới',
      'Main couple / lord arc xuyên suốt các thế giới',
    ],
    textureDetails: [
      'Cấu trúc MODULAR 4 hồi: nhập vai 5ch + leo 15ch + cao trào 15ch + thu 10ch',
      'Hệ thống UI: nhiệm vụ, điểm, cửa hàng đạo cụ, độ hảo cảm nguyên chủ',
      'Mỗi thế giới đổi setting / xưng hô / luật riêng nhưng MC core giữ nguyên',
      'Nguyên chủ ký ức / oán niệm bàn giao cho MC',
      'Cover story khả năng "biết kịch bản". Episodic nhưng meta-plot Hub Space xuyên suốt',
    ],
  },

};

/**
 * Get the process blueprint for a genre. Returns null if genre not in registry.
 */
export function getGenreProcessBlueprint(genre: GenreType): GenreProcessBlueprint | null {
  return BLUEPRINTS[genre] || null;
}

/**
 * Inject genre process blueprint as additional setup requirements (for seed-blueprint generation).
 * Returns blank string if genre not registered.
 */
export function getGenreSetupRequirements(genre: GenreType): string {
  const bp = BLUEPRINTS[genre];
  if (!bp) return '';
  return `\n\n=== GENRE-SPECIFIC SETUP — "${genre}" ===
ESSENCE: ${bp.essence}

REQUIRED CAST ROLES (CASTROSTER phải có):
${bp.setup.requiredCastRoles.map(r => `  - ${r}`).join('\n')}

GOLDEN FINGER TYPE:
  ${bp.setup.goldenFingerType}

PHASE FRAMEWORK:
  ${bp.setup.phaseFramework}

WORLD RULES PHẢI focus:
${bp.setup.worldRulesFocus.map(r => `  - ${r}`).join('\n')}

OPENING PATTERN (Chương 1):
  ${bp.setup.openingPattern}

SIGNATURE TROPES (cốt truyện PHẢI lên lịch các trope kinh điển này — đây là thứ reader mua vé để xem):
${bp.signatureTropes.map(t => `  ★ ${t}`).join('\n')}

TEXTURE DETAILS (từ vựng / nghi thức / xưng hô / vật phẩm đặc trưng — lock cụ thể từ setup, KHÔNG generic):
${bp.textureDetails.map(d => `  ◦ ${d}`).join('\n')}

STAKES LADDER:
  ${bp.stakesLadder.join(' → ')}
=== END GENRE SETUP ===`;
}

/**
 * Compact genre contract for Critic — promise / loop / taboos / opening_must
 * derived from the existing blueprint. Critic is verbose (~14K-token prompt
 * already) so we compress to ~600 chars: essence, opening pattern (truncated),
 * top-3 commonFailures, stakes ladder. Used to detect genre drift WITHOUT
 * re-injecting the entire blueprint.
 */
export function getGenreContractForCritic(genre: GenreType): string {
  const bp = BLUEPRINTS[genre];
  if (!bp) return '';
  const trimmedOpening = bp.setup.openingPattern.length > 220
    ? bp.setup.openingPattern.slice(0, 220) + '...'
    : bp.setup.openingPattern;
  const topFailures = bp.process.commonFailures.slice(0, 3);
  return `\n[GENRE CONTRACT — "${genre}" — gu tổng biên tập, BẮT BUỘC kiểm tra drift]
PROMISE: ${bp.essence}
OPENING PATTERN (ch.1-3 phải bám sát): ${trimmedOpening}
TABOOS / LỖI THƯỜNG GẶP (CẤM):
${topFailures.map(f => `  ✗ ${f}`).join('\n')}
STAKES LADDER: ${bp.stakesLadder.join(' → ')}
[/GENRE CONTRACT]`;
}

/**
 * Inject genre process blueprint into Architect/Critic prompts.
 * Includes scene types + arc template + quality floor + creative space.
 */
export function getGenreArchitectGuide(genre: GenreType): string {
  const bp = BLUEPRINTS[genre];
  if (!bp) return '';
  return `\n\n=== GENRE ARCHITECT GUIDE — "${genre}" ===
GENRE-SPECIFIC SCENE TYPES (chọn cho scenes):
${bp.sceneTypes.map(s => `  • ${s}`).join('\n')}

ARC TEMPLATE (cho 50-150 chương):
  ${bp.arcTemplate}

SIGNATURE TROPES (lên lịch rải đều — reader chờ các beat kinh điển này):
${bp.signatureTropes.map(t => `  ★ ${t}`).join('\n')}

TEXTURE DETAILS (dùng từ vựng/nghi thức/vật phẩm đặc trưng — KHÔNG generic flavor):
${bp.textureDetails.map(d => `  ◦ ${d}`).join('\n')}

QUALITY FLOOR (mỗi chương phải đạt):
  ${bp.process.qualityFloor}

QUANTITY SUSTAINABILITY (giữ chất lượng 1000 chương):
  ${bp.process.quantitySustainability}

CREATIVE SPACE (AI sáng tạo):
  ${bp.process.creativeSpace}

COMMON FAILURES (CẤM):
${bp.process.commonFailures.map(f => `  ✗ ${f}`).join('\n')}
=== END ARCHITECT GUIDE ===`;
}
