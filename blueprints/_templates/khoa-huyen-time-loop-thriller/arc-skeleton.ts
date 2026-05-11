/**
 * Khoa-huyen "time-loop thriller" — 天才俱乐部 archetype.
 *
 * High-concept sci-fi với time-loop / time-travel mechanism. Thriller
 * pacing — mỗi loop = puzzle / mystery. Simulator-loop pattern: setup
 * loop → live → reveal → real-execute.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const KHOA_HUYEN_TIME_LOOP_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First loop awareness + small puzzle',
    corePayoff: 'MC awareness time-loop, solve first small mystery, join {{ORGANIZATION_NAME}}',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Time-loop first awareness — MC dies / event reset', payoff: 'loop confirmed' },
      { number: 2, range: [11, 20], theme: 'Loop 2-3 — small puzzle observation', payoff: 'pattern observed' },
      { number: 3, range: [21, 30], theme: 'Loop 4-5 — first solution attempt', payoff: 'first puzzle solved' },
      { number: 4, range: [31, 40], theme: 'Recruit by {{ORGANIZATION_NAME}}', payoff: 'organization joined' },
      { number: 5, range: [41, 50], theme: 'CLIMAX arc 1: small loop closure + bigger threat reveal', payoff: 'bigger mystery plant' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Medium puzzles + member growth',
    corePayoff: 'MC solve 3-4 medium mysteries, organization rank up',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Mystery 2 — historical event manipulation', payoff: 'history event resolved' },
      { number: 2, range: [76, 100], theme: 'Mystery 3 — assassination attempt prevention', payoff: 'assassination prevented' },
      { number: 3, range: [101, 125], theme: 'Mystery 4 — disease outbreak prevention', payoff: 'disease prevented' },
      { number: 4, range: [126, 150], theme: 'CLIMAX mystery 5 + cosmic-tier hint', payoff: 'cosmic plant' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Big mysteries + adversary reveal',
    corePayoff: 'MC face-off với {{ADVERSARY_NAME}}, mysteries cosmic-tier',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Mystery 6 — adversary scout reveal', payoff: 'adversary identified' },
      { number: 2, range: [181, 210], theme: 'Mystery 7 — cosmic event manipulation', payoff: 'cosmic event' },
      { number: 3, range: [211, 240], theme: 'Adversary direct confrontation 1', payoff: 'first face-off' },
      { number: 4, range: [241, 270], theme: 'Mystery 8 — adversary scheme dismantled', payoff: 'scheme dismantled' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: adversary identity revealed', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cosmic-tier puzzles + adversary major battles',
    corePayoff: 'Adversary major bại, multi-realm puzzles',
    subArcs: [
      { number: 1, range: [301, 335], theme: 'Cosmic puzzle 1 — multi-realm', payoff: 'multi-realm access' },
      { number: 2, range: [336, 370], theme: 'Adversary major attack', payoff: 'major attack defended' },
      { number: 3, range: [371, 405], theme: 'Cosmic puzzle 2 — origin universe', payoff: 'origin lore' },
      { number: 4, range: [406, 440], theme: 'Adversary scheme cosmic dismantled', payoff: 'cosmic scheme bại' },
      { number: 5, range: [441, 475], theme: 'Multi-realm allies', payoff: 'allies peak' },
      { number: 6, range: [476, 500], theme: 'CLIMAX arc 4: adversary major weakened', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Origin mystery + identity reveal',
    corePayoff: 'MC origin reveal — chosen one false / true',
    subArcs: [
      { number: 1, range: [501, 535], theme: 'Origin investigation deep', payoff: 'origin lore deeper' },
      { number: 2, range: [536, 570], theme: 'Identity reveal moments', payoff: 'identity reveal' },
      { number: 3, range: [571, 605], theme: 'Mass adversary face-off', payoff: 'adversary mass bại' },
      { number: 4, range: [606, 640], theme: 'Cosmic origin lore peak', payoff: 'lore peak' },
      { number: 5, range: [641, 700], theme: 'CLIMAX arc 5: adversary weakened, identity confirmed', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Final adversary showdown + cosmic loop',
    corePayoff: 'Adversary final form, MC + allies face-off',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Adversary final form reveal', payoff: 'final form' },
      { number: 2, range: [741, 780], theme: 'Cosmic loop full reveal', payoff: 'loop lore peak' },
      { number: 3, range: [781, 820], theme: 'Mass cosmic battle', payoff: 'mass battle' },
      { number: 4, range: [821, 860], theme: 'Adversary weakened major', payoff: 'major bại' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: adversary final, plan ready', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final loop closure',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, loop closed, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final adversary battle', payoff: 'adversary defeated' },
      { number: 2, range: [941, 970], theme: 'Loop closure ritual', payoff: 'loop closed' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'multi-realm stable, MC retire' },
    ],
  },
];
