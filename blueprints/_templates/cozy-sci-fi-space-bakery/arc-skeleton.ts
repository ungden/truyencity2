/**
 * Cozy Sci-fi space-bakery — anti-sảng-văn cozy in space opera setting.
 *
 * MC mở space-bakery / space-café / starship inn trên trạm vũ trụ.
 * Customers come from across galaxy. Slow-burn, low-stakes, healing.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const COZY_SCIFI_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Setup space-shop + first interstellar customers',
    corePayoff: 'Shop {{SHOP_NAME}} ổn định trên trạm {{STATION_NAME}}',
    subArcs: [
      { number: 1, range: [1, 8], theme: 'MC settle vào trạm vũ trụ + mở shop', payoff: 'shop mở, first customer' },
      { number: 2, range: [9, 16], theme: 'Alien customer 1 (gentle visitor)', payoff: 'first alien regular' },
      { number: 3, range: [17, 24], theme: 'Cyborg veteran customer', payoff: 'cyborg story' },
      { number: 4, range: [25, 32], theme: 'AI customer (lonely)', payoff: 'AI friendship' },
      { number: 5, range: [33, 40], theme: 'Station festival event', payoff: 'community joined' },
      { number: 6, range: [41, 50], theme: 'CLIMAX arc 1: station adopts MC', payoff: 'station stable + 5 regulars' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Sector expansion + cybernetic companion',
    corePayoff: 'Shop popular cross-sector + companion AI deepens',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Sector visitors increase', payoff: 'sector visibility' },
      { number: 2, range: [76, 100], theme: 'Companion AI develops personality', payoff: 'AI companion deepens' },
      { number: 3, range: [101, 125], theme: 'Alien customers multi-species', payoff: 'multi-species regulars' },
      { number: 4, range: [126, 150], theme: 'CLIMAX sector festival', payoff: 'community deeper' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Adventurer crews + recipe innovation',
    corePayoff: 'Star pilots + adventurer crews visit, signature recipes',
    subArcs: [
      { number: 1, range: [151, 190], theme: 'First crew visit', payoff: 'crew regular' },
      { number: 2, range: [191, 230], theme: 'Recipe innovation alien ingredients', payoff: 'signature alien recipes' },
      { number: 3, range: [231, 270], theme: 'Pilot mentorship', payoff: 'pilot mentor' },
      { number: 4, range: [271, 300], theme: 'CLIMAX arc 3: shop second branch on second station', payoff: 'second branch' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Royal / fleet captain incognito patronage',
    corePayoff: 'Fleet captain / royal visit incognito, MC support emotionally',
    subArcs: [
      { number: 1, range: [301, 345], theme: 'Captain incognito visit', payoff: 'captain interested' },
      { number: 2, range: [346, 390], theme: 'MC provide emotional support', payoff: 'captain bond' },
      { number: 3, range: [391, 435], theme: 'Gentle fleet politics navigate', payoff: 'politics navigate' },
      { number: 4, range: [436, 480], theme: 'Captain patronage event', payoff: 'patronage' },
      { number: 5, range: [481, 500], theme: 'CLIMAX arc 4: fleet recognition + shop chain', payoff: 'shop chain' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Ancient civilization gentle mystery',
    corePayoff: 'Ancient civ mystery resolved through hospitality',
    subArcs: [
      { number: 1, range: [501, 545], theme: 'Ancient civ artifact in shop', payoff: 'mystery start' },
      { number: 2, range: [546, 590], theme: 'Civ history research via customers', payoff: 'history research' },
      { number: 3, range: [591, 635], theme: 'Gentle resolution through recipe', payoff: 'mystery resolved' },
      { number: 4, range: [636, 680], theme: 'AI companion grows soul tier', payoff: 'AI soul tier' },
      { number: 5, range: [681, 700], theme: 'CLIMAX arc 5: civ heritage embraced', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Galactic pilgrimage healing tour',
    corePayoff: 'MC tour healing multi-galaxy communities',
    subArcs: [
      { number: 1, range: [701, 745], theme: 'Galactic tour start', payoff: 'tour active' },
      { number: 2, range: [746, 790], theme: 'Help multi-galaxy communities', payoff: 'multi-galaxy support' },
      { number: 3, range: [791, 835], theme: 'Major community crisis (war refugees)', payoff: 'community healed' },
      { number: 4, range: [836, 880], theme: 'Tour completion event', payoff: 'tour complete' },
      { number: 5, range: [881, 900], theme: 'CLIMAX arc 6: return to home station', payoff: 'home return' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — peaceful legacy',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm + apprentice legacy',
    subArcs: [
      { number: 1, range: [901, 950], theme: 'Train apprentices', payoff: 'apprentices' },
      { number: 2, range: [951, 1000], theme: 'ENDING: gentle closure', payoff: 'shop legacy stable, MC peaceful' },
    ],
  },
];
