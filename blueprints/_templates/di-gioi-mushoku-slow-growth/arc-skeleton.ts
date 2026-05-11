/**
 * Di-gioi "mushoku slow growth" — Jobless Reincarnation archetype.
 *
 * MC tái sinh vào dị giới từ baby/teenager, growth 30+ năm. Slow
 * realistic character development. World-building xuất sắc. Linear-grind
 * + character-driven, KHÔNG cluster-dopamine.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const DI_GIOI_MUSHOKU_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Childhood (0-10 tuổi) — học pháp thuật + gia đình',
    corePayoff: 'MC trẻ tuổi học pháp thuật cơ bản, gia đình ấm áp',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Tái sinh + childhood early', payoff: 'identity setup' },
      { number: 2, range: [11, 20], theme: 'Pháp thuật basics + bài học đầu', payoff: 'basic magic' },
      { number: 3, range: [21, 30], theme: 'Family time + sibling bond', payoff: 'family bond' },
      { number: 4, range: [31, 40], theme: 'First mentor (visiting wizard)', payoff: 'mentor introduced' },
      { number: 5, range: [41, 50], theme: 'CLIMAX arc 1: skill milestone + departure prep', payoff: 'milestone skill' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Adventurer apprentice (10-15 tuổi)',
    corePayoff: 'MC adventurer rank C, gặp companion {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Apprentice + first adventure', payoff: 'first adventure' },
      { number: 2, range: [76, 100], theme: '{{COMPANION_NAME}} (childhood friend) joins', payoff: 'companion bond' },
      { number: 3, range: [101, 125], theme: 'Rank up to C', payoff: 'rank C confirmed' },
      { number: 4, range: [126, 150], theme: 'CLIMAX arc 2: regional reputation + skill milestone', payoff: 'regional rep' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Adventurer journey (15-20 tuổi)',
    corePayoff: 'MC adventurer rank B, gặp {{LIFE_PARTNER}}, mass adventures',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Multi-region journey', payoff: 'multi-region experience' },
      { number: 2, range: [181, 210], theme: '{{LIFE_PARTNER}} meet', payoff: 'love interest meet' },
      { number: 3, range: [211, 240], theme: 'Rank up to B', payoff: 'rank B confirmed' },
      { number: 4, range: [241, 270], theme: 'Adventure crisis + personal growth', payoff: 'character growth' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: romance development + skill milestone', payoff: 'romance + skill' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Settling + family formation (20-30 tuổi)',
    corePayoff: 'MC kết hôn {{LIFE_PARTNER}}, sinh con, build home',
    subArcs: [
      { number: 1, range: [301, 340], theme: 'Marriage proposal + family disapproval', payoff: 'marriage prep' },
      { number: 2, range: [341, 380], theme: 'Wedding + honeymoon', payoff: 'married' },
      { number: 3, range: [381, 420], theme: 'First child', payoff: 'child born' },
      { number: 4, range: [421, 460], theme: 'Settle in town + business', payoff: 'business stable' },
      { number: 5, range: [461, 500], theme: 'CLIMAX arc 4: second child + community recognition', payoff: 'family of 4' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Mid-life mastery (30-40 tuổi)',
    corePayoff: 'MC rank S adventurer, master mage, mentor others',
    subArcs: [
      { number: 1, range: [501, 545], theme: 'Mage academy mentor role', payoff: 'mentor role' },
      { number: 2, range: [546, 590], theme: 'Major crisis adventure (rank S)', payoff: 'rank S confirmed' },
      { number: 3, range: [591, 635], theme: 'Children growing — skill inheritance', payoff: 'children mastery' },
      { number: 4, range: [636, 680], theme: 'Ancient enemy emerge (long-foreshadowed)', payoff: 'ancient enemy hint' },
      { number: 5, range: [681, 700], theme: 'CLIMAX arc 5: ancient enemy first contact', payoff: 'first contact' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Late-life mastery + ancient enemy showdown (40-55 tuổi)',
    corePayoff: 'MC confronts ancient enemy, family + apprentices unite',
    subArcs: [
      { number: 1, range: [701, 745], theme: 'Ancient enemy investigation', payoff: 'enemy investigation' },
      { number: 2, range: [746, 790], theme: 'Apprentice network mobilized', payoff: 'apprentice network' },
      { number: 3, range: [791, 835], theme: 'Ancient enemy major weak', payoff: 'enemy weakened' },
      { number: 4, range: [836, 880], theme: 'Family + apprentices final prep', payoff: 'prep complete' },
      { number: 5, range: [881, 900], theme: 'CLIMAX arc 6: enemy final form', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — legacy + peaceful death',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending bittersweet legacy',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Ancient enemy final battle', payoff: 'enemy defeated' },
      { number: 2, range: [941, 970], theme: 'Children inherit MC mantle', payoff: 'inheritance' },
      { number: 3, range: [971, 1000], theme: 'ENDING: peaceful death / retirement', payoff: 'legacy stable, MC passes torch peacefully' },
    ],
  },
];
