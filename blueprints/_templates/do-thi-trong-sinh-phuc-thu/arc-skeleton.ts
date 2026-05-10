/**
 * Do-thi "trọng sinh phục thù" — cluster-dopamine với revenge focus.
 *
 * MC chết / bị phản bội kiếp trước (vợ ngoại tình + bạn lừa + bố đẻ ép),
 * trọng sinh về 5-10 năm trước để báo thù. Tone lạnh đạm, dark-edged.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DO_THI_PHUC_THU_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Trọng sinh + first face-slap traitor #1',
    corePayoff: 'MC tỉnh dậy 5 năm trước, plan revenge, face-slap đầu tiên (best friend / fiancée / step-mother)',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Trọng sinh vào tuổi trẻ — nhớ lại bị phản bội', payoff: 'memories active, plan formed' },
      { number: 2, range: [8, 14], theme: 'Sự kiện cũ chuẩn bị repeat — MC pivot', payoff: 'first divergence từ canon' },
      { number: 3, range: [15, 21], theme: 'Traitor #1 (best friend) lộ ý đồ', payoff: 'face-slap small first' },
      { number: 4, range: [22, 28], theme: 'MC build foundation — tài sản nhỏ', payoff: 'first venture' },
      { number: 5, range: [29, 35], theme: 'Traitor #1 mass face-slap', payoff: 'best friend bại danh' },
      { number: 6, range: [36, 42], theme: '{{LIFE_PARTNER_REAL}} (true love) xuất hiện', payoff: 'true partner found' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: Traitor #1 destroyed', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Traitor #2 (fiancée / family member) face-slap',
    corePayoff: 'MC đè bẹp traitor #2 (vợ cũ / con trai bố / chị gái), lập công ty top thành phố',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Traitor #2 manipulate MC', payoff: 'MC counter-manipulate' },
      { number: 2, range: [66, 80], theme: 'Mass build company', payoff: 'top thành phố' },
      { number: 3, range: [81, 95], theme: 'Traitor #2 mass face-slap', payoff: 'fiancée bại danh public' },
      { number: 4, range: [96, 110], theme: 'Family reconcile (parents support MC)', payoff: 'family stable' },
      { number: 5, range: [111, 125], theme: 'IPO local', payoff: 'company niêm yết' },
      { number: 6, range: [126, 140], theme: 'Mass charity foundation', payoff: 'public hero' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: Traitor #2 destroyed', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Traitor #3 (cosmic-tier mafia / father figure) face-slap',
    corePayoff: 'MC đè bẹp cosmic-tier traitor (bố đẻ / mafia / cosmic conspiracy), top quốc gia',
    subArcs: [
      { number: 1, range: [151, 170], theme: 'Cosmic-tier traitor reveal', payoff: 'kẻ địch chính lộ' },
      { number: 2, range: [171, 190], theme: 'Mass company expansion', payoff: 'top quốc gia' },
      { number: 3, range: [191, 210], theme: 'Traitor #3 first attack', payoff: 'face-slap counter' },
      { number: 4, range: [211, 230], theme: 'Mass M&A', payoff: 'thị phần lớn' },
      { number: 5, range: [231, 250], theme: 'Traitor #3 mass coup attempt', payoff: 'phòng thủ thành công' },
      { number: 6, range: [251, 270], theme: 'IPO Mỹ', payoff: 'tài phiệt USD' },
      { number: 7, range: [271, 290], theme: 'Traitor #3 final face-slap', payoff: 'mafia bại' },
      { number: 8, range: [291, 300], theme: 'CLIMAX arc 3: Mafia destroyed + tài phiệt USD', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Global expansion + Forbes',
    corePayoff: 'MC top 100 Forbes, mass M&A MNC',
    subArcs: [
      { number: 1, range: [301, 325], theme: 'IPO NASDAQ', payoff: 'Forbes 100' },
      { number: 2, range: [326, 350], theme: 'MNC tấn công', payoff: 'face-slap MNC' },
      { number: 3, range: [351, 375], theme: 'Mass M&A MNC nhỏ', payoff: 'expand global' },
      { number: 4, range: [376, 400], theme: 'TIME 100', payoff: 'global respect' },
      { number: 5, range: [401, 425], theme: 'Liên minh tỷ phú', payoff: 'cosmic-tier ally' },
      { number: 6, range: [426, 450], theme: '{{LIFE_PARTNER_REAL}} kết hôn + có con', payoff: 'gia đình hoàn chỉnh' },
      { number: 7, range: [451, 475], theme: 'Top 10 Forbes', payoff: 'top 10 confirmed' },
      { number: 8, range: [476, 500], theme: 'CLIMAX arc 4: top 10 + family', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Mass cosmic-tier conspiracy reveal',
    corePayoff: 'Reveal traitors là cosmic conspiracy puppet, MC face-slap cosmic puppet master',
    subArcs: [
      { number: 1, range: [501, 528], theme: 'Cosmic puppet master reveal', payoff: 'lore expand' },
      { number: 2, range: [529, 556], theme: 'Mass conspiracy investigation', payoff: 'evidence + ally' },
      { number: 3, range: [557, 584], theme: 'Cosmic puppet first confront', payoff: 'first cosmic confrontation' },
      { number: 4, range: [585, 612], theme: 'Cosmic ally network', payoff: 'cosmic network ally' },
      { number: 5, range: [613, 640], theme: 'Mass face-slap puppet master', payoff: 'puppet bại đợt 1' },
      { number: 6, range: [641, 668], theme: 'Davos keynote — global respect', payoff: 'global influence' },
      { number: 7, range: [669, 700], theme: 'CLIMAX arc 5: cosmic puppet weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic puppet master final showdown',
    corePayoff: 'MC + cosmic ally face-slap puppet master, full cosmic conspiracy reveal',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic puppet master mass invasion', payoff: 'conspiracy peak' },
      { number: 2, range: [731, 760], theme: 'Cosmic ally peak power', payoff: 'cosmic peak' },
      { number: 3, range: [761, 790], theme: 'Mass cosmic conspiracy reveal', payoff: 'lore peak' },
      { number: 4, range: [791, 820], theme: 'Cosmic puppet bại major', payoff: 'puppet retreat' },
      { number: 5, range: [821, 850], theme: 'Final plan cosmic-tier ready', payoff: 'plan ready' },
      { number: 6, range: [851, 880], theme: 'Cosmic puppet final form', payoff: 'final form xuất hiện' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: cosmic puppet final', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm + thế hệ 2',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Final cosmic threat', payoff: 'phát hiện protocol' },
      { number: 2, range: [926, 950], theme: 'Build solution', payoff: 'plan ready' },
      { number: 3, range: [951, 975], theme: 'Final battle', payoff: 'cosmic puppet thua' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'thế hệ 2 lên, MC + {{LIFE_PARTNER_REAL}} retire' },
    ],
  },
];
