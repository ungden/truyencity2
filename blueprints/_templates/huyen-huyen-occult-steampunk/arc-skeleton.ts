/**
 * Huyen-huyen "occult-steampunk" — villain-shadow + investigation.
 *
 * Archetype: Lord of Mysteries style — MC xuyên vào world steampunk
 * + cosmic horror Lovecraftian. Path-based cultivation (đường tắt).
 * Khí quyển u ám, secret history, tầng tầng bí mật, không power-leveling
 * thuần. Mỗi "phi phàm tier" mở thêm thế giới.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const HUYEN_HUYEN_OCCULT_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: '{{CITY_NAME}} steampunk world — Sequence 9 awakening',
    corePayoff: 'MC awaken Sequence 9 (lowest tier), join {{ORDER_NAME}}, first occult case',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'Xuyên vào thế giới steampunk + first reading di vật', payoff: 'Sequence 9 awakened, occult vision' },
      { number: 2, range: [8, 14], theme: 'Join {{ORDER_NAME}} — initiation', payoff: 'official member, ritual basics' },
      { number: 2, range: [15, 21], theme: 'First investigation — cult activity', payoff: 'cult dismantled, secret history hint' },
      { number: 3, range: [22, 28], theme: 'Ritual study + ancient texts', payoff: 'pathway forbidden knowledge' },
      { number: 4, range: [29, 35], theme: '{{ANTAGONIST_NPC}} dark cult activity', payoff: 'dark cult traced' },
      { number: 5, range: [36, 42], theme: 'Sequence 8 ritual prep', payoff: 'materials gathered' },
      { number: 6, range: [43, 50], theme: 'CLIMAX arc 1: Sequence 8 ascension', payoff: 'Sequence 8 confirmed' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Sequence 8 → 7 — major investigations',
    corePayoff: 'Sequence 7 confirmed, dark cult network mapped',
    subArcs: [
      { number: 1, range: [51, 70], theme: 'Sequence 8 investigations — multiple cases', payoff: 'experience + clues' },
      { number: 2, range: [71, 90], theme: 'Dark cult Sequence 8 confrontation', payoff: 'cult member captured' },
      { number: 3, range: [91, 110], theme: 'Sequence 7 ritual prep + materials', payoff: 'rare materials acquired' },
      { number: 4, range: [111, 130], theme: 'Sequence 7 ascension', payoff: 'Sequence 7 confirmed' },
      { number: 5, range: [131, 150], theme: 'CLIMAX arc 2: dark cult network revealed', payoff: 'network mapped' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Sequence 6-5 — ancient god lore reveal',
    corePayoff: 'Sequence 5 confirmed, ancient god connection lộ',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Sequence 6 ritual prep', payoff: 'Sequence 6 confirmed' },
      { number: 2, range: [181, 210], theme: 'Ancient god #1 awakening signals', payoff: 'god trace identified' },
      { number: 3, range: [211, 240], theme: 'Dark cult Sequence 6 leaders engagement', payoff: 'leaders neutralized' },
      { number: 4, range: [241, 270], theme: 'Sequence 5 materials hunt', payoff: 'Sequence 5 materials' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: Sequence 5 ascension + god lore', payoff: 'Sequence 5 + god connection' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Sequence 4-3 — divine confrontation',
    corePayoff: 'Sequence 3 ascension, first ancient god neutralized',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Sequence 4 ritual + risks', payoff: 'Sequence 4 confirmed' },
      { number: 2, range: [331, 360], theme: 'Ancient god #2 cult mass activity', payoff: 'major cult dismantled' },
      { number: 3, range: [361, 390], theme: 'Ancient god #1 incarnation confrontation', payoff: 'god incarnation defeated' },
      { number: 4, range: [391, 420], theme: 'Sequence 3 prep + alliance', payoff: 'ally network' },
      { number: 5, range: [421, 450], theme: 'Sequence 3 ascension', payoff: 'Sequence 3 confirmed' },
      { number: 6, range: [451, 480], theme: 'Ancient god #2 cult final', payoff: 'cult disbanded' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: Sequence 3 + god #1 neutralized', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Sequence 2 — divine path approach',
    corePayoff: 'Sequence 2 ascension, multiple god cults face-slap',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Sequence 2 materials cosmic hunt', payoff: 'cosmic materials' },
      { number: 2, range: [531, 560], theme: 'Multi-god cult activity engagement', payoff: 'multiple cults engaged' },
      { number: 3, range: [561, 590], theme: 'Sequence 2 ritual + apocalyptic risks', payoff: 'Sequence 2 confirmed' },
      { number: 4, range: [591, 620], theme: 'Ancient god #3 incarnation confrontation', payoff: 'god #3 weakened' },
      { number: 5, range: [621, 650], theme: 'Multi-realm exploration', payoff: 'multi-realm access' },
      { number: 6, range: [651, 680], theme: 'Cosmic ally network peak', payoff: 'allies peak' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: Sequence 2 + god #3 weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Sequence 1 — divinity threshold',
    corePayoff: 'Sequence 1 ascension, original creator lore reveal',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Sequence 1 ritual approach', payoff: 'ritual designed' },
      { number: 2, range: [741, 780], theme: 'Original creator lore investigation', payoff: 'lore reveal start' },
      { number: 3, range: [781, 820], theme: 'Sequence 1 ascension', payoff: 'Sequence 1 confirmed' },
      { number: 4, range: [821, 860], theme: 'Original creator final confrontation prep', payoff: 'prep ready' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: Sequence 1 + creator confrontation start', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: 'Sequence 0 — Divinity / {{ENDING_GOAL}}',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, original creator neutralized, ending dark-warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Sequence 0 ritual + creator showdown', payoff: 'creator engaged' },
      { number: 2, range: [941, 980], theme: 'Sequence 0 ascension + final battle', payoff: 'creator defeated' },
      { number: 3, range: [981, 1000], theme: 'ENDING: {{ENDING_GOAL}} + cosmic stewardship', payoff: 'world stable, MC = guardian' },
    ],
  },
];
