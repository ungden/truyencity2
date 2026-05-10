/**
 * Ngon-tinh "trọng sinh phục thù" — cluster-dopamine female revenge.
 * Female MC chết / bị phản bội kiếp trước, trọng sinh báo thù.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const NGON_TINH_PHUC_THU_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Trọng sinh + first face-slap (chính thê / mẹ kế)',
    corePayoff: 'Female MC trở lại tuổi trẻ, plan revenge, face-slap traitor #1',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Trọng sinh — nhớ lại kiếp trước', payoff: 'memories active, plan formed' },
      { number: 2, range: [8, 14], theme: 'First small revenge — chính thê / mẹ kế', payoff: 'face-slap small' },
      { number: 3, range: [15, 21], theme: 'MC build new life path', payoff: 'career start solo' },
      { number: 4, range: [22, 28], theme: 'Mass face-slap traitor #1', payoff: 'traitor #1 bại' },
      { number: 5, range: [29, 35], theme: '{{TRUE_LOVE}} (Mr. Right) xuất hiện', payoff: 'true love ban đầu meet' },
      { number: 6, range: [36, 42], theme: 'Career milestone first', payoff: 'job/business stable' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: traitor #1 destroyed + true love spark', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Traitor #2 (chồng cũ / fiancé) face-slap',
    corePayoff: 'MC face-slap chồng cũ, business empire startup',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Chồng cũ approach — thử lừa lại MC', payoff: 'MC reject, public humiliation chồng cũ' },
      { number: 2, range: [71, 90], theme: 'Build career empire', payoff: 'top job/business' },
      { number: 3, range: [91, 110], theme: '{{TRUE_LOVE}} relationship bloom', payoff: 'official dating' },
      { number: 4, range: [111, 130], theme: 'Mass face-slap chồng cũ family', payoff: 'family traitor bại' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: chồng cũ destroyed + dating', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Traitor #3 (gia đình thâm độc / hidden cosmic)',
    corePayoff: 'MC face-slap final traitor, business empire top, kết hôn {{TRUE_LOVE}}',
    subArcs: [
      { number: 1, range: [151, 175], theme: 'Cosmic conspiracy reveal — final traitor lộ', payoff: 'traitor #3 reveal' },
      { number: 2, range: [176, 200], theme: 'Business empire scale up — IPO', payoff: 'IPO milestone' },
      { number: 3, range: [201, 225], theme: 'Engagement {{TRUE_LOVE}}', payoff: 'engagement official' },
      { number: 4, range: [226, 250], theme: 'Traitor #3 final attack — coup attempt', payoff: 'phòng thủ thành công' },
      { number: 5, range: [251, 275], theme: 'Mass face-slap traitor #3', payoff: 'traitor #3 bại' },
      { number: 6, range: [276, 300], theme: 'CLIMAX arc 3: kết hôn + traitor destroyed', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Family + business empire global',
    corePayoff: 'Family stable + business top global',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Wedding ceremony lavish', payoff: 'official marriage' },
      { number: 2, range: [331, 360], theme: 'Honeymoon + intimacy bloom', payoff: 'deeper connection' },
      { number: 3, range: [361, 390], theme: 'Business expand global', payoff: 'top global' },
      { number: 4, range: [391, 420], theme: 'First child', payoff: 'family of 3' },
      { number: 5, range: [421, 450], theme: 'Mass cosmic conspiracy second wave', payoff: 'face-slap cosmic conspiracy' },
      { number: 6, range: [451, 480], theme: 'Second child', payoff: 'family of 4' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: family + business empire', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic conspiracy origin + multi-realm',
    corePayoff: 'MC reveal cosmic origin, multi-realm allies',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Cosmic conspiracy origin investigation', payoff: 'lore reveal' },
      { number: 2, range: [531, 560], theme: 'Multi-realm contact', payoff: 'multi-realm allies' },
      { number: 3, range: [561, 590], theme: 'Mass face-slap cosmic puppet master', payoff: 'puppet major bại' },
      { number: 4, range: [591, 620], theme: 'Charity foundation cosmic-tier', payoff: 'global hero' },
      { number: 5, range: [621, 650], theme: 'Children grow into power', payoff: 'thế hệ 2' },
      { number: 6, range: [651, 680], theme: 'Cosmic final form preview', payoff: 'final form preview' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: cosmic puppet weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic puppet master final showdown',
    corePayoff: 'MC + family + multi-realm allies face-slap puppet final',
    subArcs: [
      { number: 1, range: [701, 730], theme: 'Cosmic puppet final invasion', payoff: 'invasion peak' },
      { number: 2, range: [731, 760], theme: 'Family unite cosmic-tier', payoff: 'family cosmic peak' },
      { number: 3, range: [761, 790], theme: 'Mass cosmic alliance', payoff: 'multi-realm peak' },
      { number: 4, range: [791, 820], theme: 'Mass cosmic puppet face-slap', payoff: 'puppet retreat' },
      { number: 5, range: [821, 850], theme: 'Reveal: puppet origin = first kiếp tragedy', payoff: 'lore peak' },
      { number: 6, range: [851, 880], theme: 'Final plan ready', payoff: 'plan ready' },
      { number: 7, range: [881, 900], theme: 'CLIMAX arc 6: puppet weakened, final prep', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm với family + {{TRUE_LOVE}}',
    subArcs: [
      { number: 1, range: [901, 925], theme: 'Final cosmic puppet', payoff: 'puppet protocol confront' },
      { number: 2, range: [926, 950], theme: 'Final battle puppet', payoff: 'puppet bại' },
      { number: 3, range: [951, 975], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 4, range: [976, 1000], theme: 'ENDING: warm closure', payoff: 'thế hệ 2 lên, MC + {{TRUE_LOVE}} retire' },
    ],
  },
];
