/**
 * Do-thi "y tế hệ thống" — medical system archetype.
 *
 * MC bác sĩ + AI/future-tech system grant. Procedural medical drama +
 * sảng văn. Mỗi sub-arc = 1 medical case + 1 system tier ascension.
 * Phó-bản pattern.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DO_THI_Y_TE_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Bác sĩ residents + hệ thống active + first cases',
    corePayoff: 'MC residents → attending tier 1, solve 3 cases impossible',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'MC residents + system active + first cardiac case', payoff: 'cardiac saved' },
      { number: 2, range: [11, 22], theme: 'Case 2 — neuro emergency', payoff: 'neuro saved' },
      { number: 3, range: [23, 34], theme: 'Case 3 — pediatric impossible', payoff: 'peds saved' },
      { number: 4, range: [35, 42], theme: 'Hospital reaction + attending promotion', payoff: 'attending tier 1' },
      { number: 5, range: [43, 50], theme: 'CLIMAX arc 1: rival doctor face-slap', payoff: 'rival face-slap' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Đại bệnh viện + complex cases',
    corePayoff: 'MC top doctor đại bệnh viện, solve 5 complex cases',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Đại bệnh viện transfer + first complex case', payoff: 'first complex' },
      { number: 2, range: [76, 100], theme: 'Cases 5-7 — surgical innovation', payoff: 'innovations' },
      { number: 3, range: [101, 125], theme: 'Mass research + paper publish', payoff: 'papers published' },
      { number: 4, range: [126, 150], theme: 'CLIMAX case 8 — VIP patient saved', payoff: 'VIP saved + system tier 2' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Hospital director + admin power',
    corePayoff: 'MC director tier, mass procedural cases',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Cases 9-11 — cosmic-tier complexity', payoff: 'cosmic cases' },
      { number: 2, range: [181, 210], theme: 'Hospital admin politics', payoff: 'admin politics navigate' },
      { number: 3, range: [211, 240], theme: 'Mass innovation + research lab', payoff: 'research lab' },
      { number: 4, range: [241, 270], theme: 'Director promotion event', payoff: 'director tier' },
      { number: 5, range: [271, 300], theme: 'CLIMAX cases 12-13 — national recognition', payoff: 'national recognition' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'National medical association + reform',
    corePayoff: 'MC national director, push medical reform',
    subArcs: [
      { number: 1, range: [301, 335], theme: 'National board appointment', payoff: 'national board' },
      { number: 2, range: [336, 370], theme: 'Mass medical reform push', payoff: 'reform passing' },
      { number: 3, range: [371, 405], theme: 'Anti-reform opposition', payoff: 'opposition counter' },
      { number: 4, range: [406, 440], theme: 'Cases 14-16 — international interest', payoff: 'international interest' },
      { number: 5, range: [441, 475], theme: 'International conference present', payoff: 'global recognition' },
      { number: 6, range: [476, 500], theme: 'CLIMAX arc 4: reform passed + Nobel candidate', payoff: 'Nobel hint' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'International medical empire',
    corePayoff: 'MC global medical pioneer, save 10+ international cases',
    subArcs: [
      { number: 1, range: [501, 540], theme: 'International cases (Mỹ, EU, Châu Á)', payoff: 'mass international' },
      { number: 2, range: [541, 580], theme: 'Mass innovation cosmic-tier', payoff: 'cosmic innovations' },
      { number: 3, range: [581, 620], theme: 'Pharmaceutical empire', payoff: 'pharma empire' },
      { number: 4, range: [621, 660], theme: 'Nobel award', payoff: 'Nobel won' },
      { number: 5, range: [661, 700], theme: 'CLIMAX arc 5: medical empire + Nobel', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic medical pioneer + AI ethics',
    corePayoff: 'MC + AI ethics debate, cosmic-tier system origin reveal',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'AI ethics debate emerge', payoff: 'debate active' },
      { number: 2, range: [741, 780], theme: 'Cosmic system origin investigation', payoff: 'origin lore' },
      { number: 3, range: [781, 820], theme: 'Mass face-slap AI critics', payoff: 'critics bại' },
      { number: 4, range: [821, 860], theme: 'Cosmic medical alliance', payoff: 'cosmic alliance' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: cosmic origin revealed', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — pioneer legacy',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm + legacy',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final medical milestone', payoff: 'milestone đạt' },
      { number: 2, range: [941, 970], theme: '{{ENDING_GOAL}} đạt', payoff: 'goal đạt' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'legacy + retire to teach' },
    ],
  },
];
