/**
 * Tien-hiep "meta comedy" — 谁让他修仙的 + Eminence in Shadow merged.
 *
 * Archetype: MC trong tu tiên world, có hài-meta-aware tone. MC nghĩ
 * mình bịa ra một secret organization / power technique nhưng hoá ra
 * có thật. Hoặc MC bị mọi người hiểu lầm và sự hiểu lầm chain tạo ra
 * progression. Cluster-dopamine với comedy beats dày.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const TIEN_HIEP_META_COMEDY_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'MC bịa ra secret org → hoá ra thật + first misunderstanding',
    corePayoff: 'MC bịa ra {{FAKE_ORG_NAME}} → mọi người tin → MC trở thành founder',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'MC xuyên + bịa truyện tu tiên cho fun', payoff: 'tổ chức bịa hé lộ' },
      { number: 2, range: [8, 14], theme: 'Đệ tử đầu tiên tin và join', payoff: 'first follower (clueless)' },
      { number: 3, range: [15, 21], theme: 'Hiểu lầm chain — MC tưởng đệ tử đang đùa', payoff: 'misunderstanding escalate' },
      { number: 4, range: [22, 28], theme: 'Sect lớn nghe tin, send người dò', payoff: 'first scout dò' },
      { number: 5, range: [29, 35], theme: 'MC làm việc bình thường, sect tưởng cosmic plan', payoff: 'big misunderstanding' },
      { number: 6, range: [36, 42], theme: '{{FAKE_ORG_NAME}} cấp tỉnh', payoff: 'tỉnh-level recognition' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: tỉnh sect đến chúc mừng', payoff: 'MC blank, tổ chức coi như peak event' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Quốc gia recognition + power leveling vô thức',
    corePayoff: 'MC unknowingly Trúc Cơ, đệ tử rất tin, quốc gia sect tier',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'MC random tu luyện, lên Trúc Cơ', payoff: 'Trúc Cơ confirmed' },
      { number: 2, range: [66, 80], theme: 'Đệ tử lan rộng — 100 thành viên', payoff: 'org 100 members' },
      { number: 3, range: [81, 95], theme: 'Hiểu lầm: rival sect "tuyên chiến"', payoff: 'rival sect war start' },
      { number: 4, range: [96, 110], theme: 'MC tránh né, rival hiểu sai = MC thâm sâu', payoff: 'rival face-slap mass' },
      { number: 5, range: [111, 125], theme: 'Quốc gia sect tier confirmed', payoff: 'quốc gia level' },
      { number: 6, range: [126, 140], theme: 'Hiểu lầm thứ 3 — đại sư huynh xuất hiện', payoff: 'sư huynh follow' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: quốc gia confirmed + Trúc Cơ peak', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Đại lục tier — Kim Đan vô thức',
    corePayoff: 'MC Kim Đan unconsciously, đại lục công nhận = top sect',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Đại lục tournament random join', payoff: 'top 100 đại lục' },
      { number: 2, range: [171, 190], theme: 'Misunderstanding 4 — tổng cộng 5 đại sư đến', payoff: 'cosmic-tier visitors' },
      { number: 3, range: [191, 215], theme: 'MC random Kim Đan đột phá', payoff: 'Kim Đan confirmed' },
      { number: 4, range: [216, 240], theme: 'Đại lục sect engagement', payoff: 'mass face-slap đại lục' },
      { number: 5, range: [241, 265], theme: 'Hiểu lầm 5 — cosmic-tier hint xuất hiện', payoff: 'cosmic hint plant' },
      { number: 6, range: [266, 285], theme: 'Đại lục bá chủ candidate', payoff: 'top candidate' },
      { number: 7, range: [286, 300], theme: 'CLIMAX arc 3: đại lục top + Kim Đan peak', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Nguyên Anh + cosmic visitors',
    corePayoff: 'MC Nguyên Anh peak, cosmic visitors tới, MC vẫn nghĩ mình nhỏ',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Cosmic visitors arrive', payoff: 'visitors confirmed' },
      { number: 2, range: [331, 360], theme: 'Misunderstanding 6 — MC random Nguyên Anh', payoff: 'Nguyên Anh confirmed' },
      { number: 3, range: [361, 390], theme: 'Cosmic faction war — MC nghĩ là internal squabble', payoff: 'faction war participate' },
      { number: 4, range: [391, 420], theme: 'MC accidentally face-slap cosmic', payoff: 'cosmic mass face-slap' },
      { number: 5, range: [421, 450], theme: 'Cosmic admin scouts hidden', payoff: 'scout reveal' },
      { number: 6, range: [451, 480], theme: 'Cosmic-tier ally network', payoff: 'cosmic allies (clueless MC)' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: Nguyên Anh peak + cosmic ally', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Hoá Thần + cosmic admin meta-reveal',
    corePayoff: 'MC Hoá Thần unaware, cosmic admin reveal MC = chosen one (false)',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Cosmic admin scout mass confrontation', payoff: 'scouts neutralized accidentally' },
      { number: 2, range: [531, 560], theme: 'MC Hoá Thần đột phá random', payoff: 'Hoá Thần confirmed' },
      { number: 3, range: [561, 590], theme: 'Admin reveal MC chosen one — MC denies', payoff: 'meta reveal trolled' },
      { number: 4, range: [591, 620], theme: 'Cosmic battles intensify', payoff: 'cosmic mass face-slap' },
      { number: 5, range: [621, 650], theme: 'Multi-realm allies', payoff: 'multi-realm peak' },
      { number: 6, range: [651, 680], theme: 'Admin major retreat', payoff: 'admin major retreat' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: Hoá Thần + admin retreat', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic showdown + MC realization (partial)',
    corePayoff: 'MC bắt đầu nghi ngờ — có thể mình thật mạnh? Final battle prep',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Cosmic invasion peak', payoff: 'invasion peak' },
      { number: 2, range: [741, 780], theme: 'MC realization moments', payoff: 'MC bắt đầu suspect' },
      { number: 3, range: [781, 820], theme: 'Final ally network', payoff: 'allies peak' },
      { number: 4, range: [821, 860], theme: 'Admin final form', payoff: 'final form' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: admin weakened, MC ready', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final realization comedy',
    corePayoff: 'MC final battle, realization complete, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final cosmic battle', payoff: 'admin defeated' },
      { number: 2, range: [941, 970], theme: 'MC final realization — yes mình thật mạnh!', payoff: 'realization complete' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'multi-realm peace, MC retire, comedy ending' },
    ],
  },
];
