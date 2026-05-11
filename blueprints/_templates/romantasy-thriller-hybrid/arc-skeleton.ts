/**
 * Romantasy-Thriller hybrid — Romance + Magic + Mystery thriller.
 *
 * Female MC (or co-lead) trong magical world có mystery/thriller plot.
 * Romance arc + investigation arc song song. Multi-layer plot — bí ẩn
 * sâu, conspiracy reveal late.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const ROMANTASY_THRILLER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First mystery + meet love interest',
    corePayoff: 'MC investigate first mystery + meet {{LOVE_INTEREST}}',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'MC arrive + first body / mystery', payoff: 'mystery setup' },
      { number: 2, range: [11, 22], theme: 'Investigation begin + meet {{LOVE_INTEREST}}', payoff: 'partner introduced' },
      { number: 3, range: [23, 35], theme: 'First suspect + tension romance', payoff: 'romance tension' },
      { number: 4, range: [36, 50], theme: 'CLIMAX arc 1: first case resolved + romance kiss', payoff: 'first kiss + case' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Bigger mystery + conspiracy hint',
    corePayoff: 'Mystery 2 reveals larger conspiracy, romance escalate',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Mystery 2 begins', payoff: 'mystery 2' },
      { number: 2, range: [76, 100], theme: 'Romance escalate + first betrayal hint', payoff: 'betrayal hint' },
      { number: 3, range: [101, 125], theme: 'Conspiracy hint emerges', payoff: 'conspiracy plant' },
      { number: 4, range: [126, 150], theme: 'CLIMAX mystery 2 resolved + relationship deepens', payoff: 'love confess' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Conspiracy investigation + magic system reveal',
    corePayoff: 'MC + {{LOVE_INTEREST}} investigate conspiracy + master magic system',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Conspiracy investigation start', payoff: 'investigation' },
      { number: 2, range: [181, 210], theme: 'Magic system mastery', payoff: 'magic mastery' },
      { number: 3, range: [211, 240], theme: 'Major suspect revealed', payoff: 'major suspect' },
      { number: 4, range: [241, 270], theme: 'Romance crisis + reconciliation', payoff: 'romance crisis resolved' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: conspiracy mid-reveal', payoff: 'mid-reveal' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Major confrontation + identity reveal',
    corePayoff: 'Major villain identity revealed, MC + love interest face confrontation',
    subArcs: [
      { number: 1, range: [301, 340], theme: 'Villain identity hint', payoff: 'identity hint' },
      { number: 2, range: [341, 380], theme: 'Romance commitment moments', payoff: 'commitment' },
      { number: 3, range: [381, 420], theme: 'Villain identity revealed', payoff: 'villain ID' },
      { number: 4, range: [421, 460], theme: 'First major confrontation', payoff: 'confrontation' },
      { number: 5, range: [461, 500], theme: 'CLIMAX arc 4: villain weakened + engagement', payoff: 'engagement' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic-tier conspiracy + ancient lore',
    corePayoff: 'Conspiracy origins ancient cosmic, ally network forms',
    subArcs: [
      { number: 1, range: [501, 545], theme: 'Ancient lore investigation', payoff: 'lore plant' },
      { number: 2, range: [546, 590], theme: 'Allies network forms', payoff: 'allies' },
      { number: 3, range: [591, 635], theme: 'Mass cosmic-tier face-off', payoff: 'cosmic face-off' },
      { number: 4, range: [636, 680], theme: 'Wedding event', payoff: 'wedding' },
      { number: 5, range: [681, 700], theme: 'CLIMAX arc 5: cosmic conspiracy unveiled', payoff: 'cosmic reveal' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Final showdown prep + cosmic villain',
    corePayoff: 'Cosmic villain final form, MC + love interest + allies prepare',
    subArcs: [
      { number: 1, range: [701, 745], theme: 'Cosmic villain final form', payoff: 'final form' },
      { number: 2, range: [746, 790], theme: 'Ancient lore peak reveal', payoff: 'lore peak' },
      { number: 3, range: [791, 835], theme: 'Allies network peak', payoff: 'allies peak' },
      { number: 4, range: [836, 880], theme: 'Major confrontation', payoff: 'major confront' },
      { number: 5, range: [881, 900], theme: 'CLIMAX arc 6: villain weakened, final prep', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — peace restored',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, peace restored, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final showdown villain', payoff: 'villain defeated' },
      { number: 2, range: [941, 970], theme: 'Peace restored', payoff: 'peace' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'kingdom stable, MC + love retire together' },
    ],
  },
];
