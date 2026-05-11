/**
 * Ngon-tinh "mã giáp reveal" — 夫人你马甲又掉了 archetype.
 *
 * Female MC từ bề ngoài bình thường nhưng có nhiều "mã giáp" (lớp
 * identities ẩn). Mỗi lần lộ 1 mã giáp = đảo vị thế. Cluster-dopamine
 * với reveal beats dày — không phải face-slap power, mà face-slap qua
 * reveal identity.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const NGON_TINH_MA_GIAP_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Mã giáp #1 — học vấn (top student)',
    corePayoff: 'Reveal MC là học bá top — lớp + gia đình ngạc nhiên',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Setup — Female MC vẻ bề ngoài ordinary, gia đình coi thường', payoff: 'identity baseline' },
      { number: 2, range: [8, 14], theme: 'Tình huống first hint mã giáp #1', payoff: 'first hint' },
      { number: 3, range: [15, 21], theme: '{{MALE_LEAD}} xuất hiện — first encounter', payoff: 'love interest meet' },
      { number: 4, range: [22, 28], theme: '{{RIVAL_FEMALE}} (kẻ cản) khinh thường', payoff: 'rival escalate' },
      { number: 5, range: [29, 35], theme: 'Mã giáp #1 partial reveal — top quốc gia exam', payoff: 'top quốc gia exam, family shock' },
      { number: 6, range: [36, 42], theme: 'Mass face-slap rivals via học vấn', payoff: 'rivals face-slap' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: mã giáp #1 fully revealed', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Mã giáp #2 — y học (top doctor / surgeon)',
    corePayoff: 'Reveal MC là y học prodigy',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Y học crisis event', payoff: 'first hint mã giáp #2' },
      { number: 2, range: [71, 90], theme: 'MC perform miracle surgery', payoff: 'reveal start' },
      { number: 3, range: [91, 110], theme: '{{MALE_LEAD}} witness — reaction', payoff: 'male lead shock' },
      { number: 4, range: [111, 130], theme: 'Mass face-slap medical rivals', payoff: 'rivals face-slap' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: mã giáp #2 fully revealed', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Mã giáp #3 — hacker / cyber genius',
    corePayoff: 'Reveal MC là top hacker, cyber-conspiracy dismantled',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Cyber attack event', payoff: 'crisis' },
      { number: 2, range: [181, 210], theme: 'MC silently hack-back', payoff: 'attack neutralized' },
      { number: 3, range: [211, 240], theme: '{{RIVAL_MALE}} (cyber rival) confrontation', payoff: 'rival face-slap' },
      { number: 4, range: [241, 270], theme: 'Mã giáp #3 partial reveal — circle suspects', payoff: 'suspects identify MC' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: mã giáp #3 revealed + cyber empire revealed', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Mã giáp #4 — business empire / hidden CEO',
    corePayoff: 'Reveal MC = hidden CEO of major corp, hào môn shock',
    subArcs: [
      { number: 1, range: [301, 335], theme: 'Hào môn family event', payoff: 'family politics escalate' },
      { number: 2, range: [336, 370], theme: 'Business crisis MC silently fixes', payoff: 'fix event' },
      { number: 3, range: [371, 405], theme: 'Mã giáp #4 partial reveal — corp employees see MC', payoff: 'reveal start' },
      { number: 4, range: [406, 440], theme: 'Mass family face-slap via business', payoff: 'family stunned' },
      { number: 5, range: [441, 475], theme: 'Mã giáp #4 full reveal — public board meeting', payoff: 'public reveal' },
      { number: 6, range: [476, 500], theme: 'CLIMAX arc 4: hidden CEO public + {{MALE_LEAD}} marriage proposal', payoff: 'engagement official' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Mã giáp #5 — bloodline reveal (hidden noble / royal)',
    corePayoff: 'Reveal MC là chân thiên kim của hidden noble family',
    subArcs: [
      { number: 1, range: [501, 535], theme: 'Hidden bloodline investigation', payoff: 'investigation clues' },
      { number: 2, range: [536, 570], theme: 'Noble family reach out', payoff: 'noble family contact' },
      { number: 3, range: [571, 605], theme: 'Mass face-slap fake heiress', payoff: 'fake heiress destroyed' },
      { number: 4, range: [606, 640], theme: 'Mã giáp #5 fully revealed — chân thiên kim', payoff: 'chân thiên kim confirmed' },
      { number: 5, range: [641, 700], theme: 'CLIMAX arc 5: noble family unite, MC peak public identity', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Mã giáp #6 — international / cosmic tier',
    corePayoff: 'Reveal MC là international figure / cosmic ally',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'International crisis', payoff: 'international event' },
      { number: 2, range: [741, 780], theme: 'MC reveal international identity', payoff: 'international reveal' },
      { number: 3, range: [781, 820], theme: 'Mass face-slap international rivals', payoff: 'rivals face-slap' },
      { number: 4, range: [821, 860], theme: 'Cosmic-tier ally reveal', payoff: 'cosmic tier reveal' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: cosmic reveal complete', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final reveal + wedding',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, wedding lavish, all mã giáp revealed warmly',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final reveal chain', payoff: 'all reveals complete' },
      { number: 2, range: [941, 970], theme: 'Wedding event', payoff: 'wedding lavish' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'family stable, MC + {{MALE_LEAD}} retire' },
    ],
  },
];
