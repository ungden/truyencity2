/**
 * Cozy Fantasy slice-of-life — anti-sảng-văn.
 *
 * Slow-burn + low-stakes + healing tone. MC mở quán nhỏ trong fantasy
 * world (bakery / bookshop / tea house / herb shop / tavern). Customers
 * come, gentle conflict, no major antagonist. Domain-shop pattern.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const COZY_FANTASY_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Setup quán nhỏ + first customers',
    corePayoff: 'Quán {{SHOP_NAME}} ổn định, 5 customers regulars, neighbor warm',
    subArcs: [
      { number: 1, range: [1, 8], theme: 'MC settle vào fantasy village + mở quán', payoff: 'quán mở, first customer' },
      { number: 2, range: [9, 16], theme: 'Regular customer 1 (neighbor heart-warming)', payoff: 'first regular' },
      { number: 3, range: [17, 24], theme: 'Customer 2 (lonely traveler)', payoff: 'second regular + traveler story' },
      { number: 4, range: [25, 32], theme: 'Customer 3 (lost child)', payoff: 'child saved' },
      { number: 5, range: [33, 40], theme: 'Seasonal festival event', payoff: 'community joined' },
      { number: 6, range: [41, 50], theme: 'CLIMAX arc 1: village adopts MC', payoff: 'village stable + 5 regulars' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Town expansion + magical familiar',
    corePayoff: 'Quán mở rộng + adopt magical familiar (e.g., spirit cat)',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Town visitors increase', payoff: 'town visibility' },
      { number: 2, range: [76, 100], theme: 'Magical familiar appears', payoff: 'familiar adopted' },
      { number: 3, range: [101, 125], theme: 'Customers 4-6 (multi-race fantasy)', payoff: 'multi-race regulars' },
      { number: 4, range: [126, 150], theme: 'CLIMAX seasonal community event', payoff: 'community deepens' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Adventure groups + recipe expansion',
    corePayoff: 'Adventurer parties visit, MC develop signature recipes / magical products',
    subArcs: [
      { number: 1, range: [151, 185], theme: 'First adventurer party visits', payoff: 'adventurer group regular' },
      { number: 2, range: [186, 220], theme: 'Recipe / product development', payoff: 'signature items' },
      { number: 3, range: [221, 255], theme: 'Customers across kingdom', payoff: 'kingdom-known shop' },
      { number: 4, range: [256, 290], theme: 'Adventure mentorship', payoff: 'MC mentor adventurers' },
      { number: 5, range: [291, 300], theme: 'CLIMAX arc 3: shop expands second branch', payoff: 'second branch' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Royal interest + gentle politics',
    corePayoff: 'Royal family visits, MC navigate politics gently',
    subArcs: [
      { number: 1, range: [301, 340], theme: 'Royal incognito visit', payoff: 'royal interested' },
      { number: 2, range: [341, 380], theme: 'MC provides emotional support to royal', payoff: 'royal bond' },
      { number: 3, range: [381, 420], theme: 'Gentle royal politics navigate', payoff: 'politics navigate' },
      { number: 4, range: [421, 460], theme: 'Royal patronage event', payoff: 'patronage' },
      { number: 5, range: [461, 500], theme: 'CLIMAX arc 4: kingdom recognition + shop chain', payoff: 'shop chain' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Ancient magical mystery (gentle)',
    corePayoff: 'Ancient gentle mystery resolved through cooking / hospitality, not combat',
    subArcs: [
      { number: 1, range: [501, 545], theme: 'Ancient mystery clue', payoff: 'mystery start' },
      { number: 2, range: [546, 590], theme: 'Recipe research history', payoff: 'history research' },
      { number: 3, range: [591, 635], theme: 'Gentle resolution through cooking', payoff: 'mystery resolved' },
      { number: 4, range: [636, 680], theme: 'Magical familiar grows', payoff: 'familiar bond deepens' },
      { number: 5, range: [681, 700], theme: 'CLIMAX arc 5: mystery resolved + magical heritage', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Multi-kingdom shops + healing pilgrimage',
    corePayoff: 'MC pilgrimage healing multiple kingdoms',
    subArcs: [
      { number: 1, range: [701, 745], theme: 'Pilgrimage start', payoff: 'pilgrimage active' },
      { number: 2, range: [746, 790], theme: 'Help multi-kingdom communities', payoff: 'multi-kingdom support' },
      { number: 3, range: [791, 835], theme: 'Major community crisis (drought / plague / loss)', payoff: 'community healed' },
      { number: 4, range: [836, 880], theme: 'Pilgrimage completion event', payoff: 'pilgrimage complete' },
      { number: 5, range: [881, 900], theme: 'CLIMAX arc 6: return to original village', payoff: 'home return' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — peaceful legacy',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, ending warm + legacy',
    subArcs: [
      { number: 1, range: [901, 950], theme: 'Settle in village, train apprentices', payoff: 'apprentices' },
      { number: 2, range: [951, 1000], theme: 'ENDING: gentle closure', payoff: 'shop legacy stable, MC peaceful' },
    ],
  },
];
