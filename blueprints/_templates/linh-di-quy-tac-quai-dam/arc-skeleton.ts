/**
 * Linh-di "quy tắc quái đàm" — phó-bản pattern.
 * MC vào không gian bị nguyền (chung cư / văn phòng / metro / etc.),
 * survive bằng nhận diện rules thật/giả.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const LINH_DI_QUY_TAC_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First instance — apartment rules horror',
    corePayoff: 'MC survive first instance, biết về system rules, gặp {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [1, 25], theme: 'Phó bản 1 — apartment rules', payoff: 'first instance survive' },
      { number: 2, range: [26, 50], theme: 'Phó bản 2 — office rules', payoff: 'second instance survive + companion' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Multi-instance survival — rules pattern recognition',
    corePayoff: 'MC veteran of 4 instances, rules pattern grasped, {{ANTAGONIST_NPC}} reveal',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Phó bản 3 — metro instance', payoff: 'metro survive' },
      { number: 2, range: [76, 100], theme: 'Phó bản 4 — supermarket instance', payoff: 'supermarket survive' },
      { number: 3, range: [101, 125], theme: 'Phó bản 5 — school instance', payoff: 'school survive + lore' },
      { number: 4, range: [126, 150], theme: 'CLIMAX phó bản 6 — hospital instance', payoff: 'hospital survive + {{ANTAGONIST_NPC}} first sighting' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Difficult instances — peer competition',
    corePayoff: 'MC top 100 server, rules elite tier, mass face-slap competitors',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Phó bản 7 — abandoned hotel', payoff: 'hotel survive' },
      { number: 2, range: [181, 210], theme: 'Phó bản 8 — night shift instance', payoff: 'night shift survive' },
      { number: 3, range: [211, 240], theme: 'Phó bản 9 — funeral home instance', payoff: 'funeral home survive' },
      { number: 4, range: [241, 270], theme: 'Phó bản 10 — wedding instance', payoff: 'wedding survive' },
      { number: 5, range: [271, 300], theme: 'CLIMAX phó bản 11 — church/temple instance', payoff: 'religious instance survive + competitor face-slap' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Hard mode instances — system origin reveal',
    corePayoff: 'MC top 10 server, system origin first reveal, ancient horror entity awakening',
    subArcs: [
      { number: 1, range: [301, 340], theme: 'Phó bản 12 — historical museum', payoff: 'historical horror' },
      { number: 2, range: [341, 380], theme: 'Phó bản 13 — government bunker', payoff: 'government horror' },
      { number: 3, range: [381, 420], theme: 'Phó bản 14 — abandoned warship', payoff: 'naval horror' },
      { number: 4, range: [421, 460], theme: 'Phó bản 15 — alien spacecraft', payoff: 'alien horror reveal' },
      { number: 5, range: [461, 500], theme: 'CLIMAX phó bản 16 — system origin instance', payoff: 'system origin first lore reveal' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Cosmic horror instances — multi-realm rules',
    corePayoff: 'MC navigate cosmic instances, multi-realm rules reveal',
    subArcs: [
      { number: 1, range: [501, 540], theme: 'Phó bản 17 — cosmic horror dimension', payoff: 'cosmic horror survive' },
      { number: 2, range: [541, 580], theme: 'Phó bản 18 — multi-realm hub', payoff: 'multi-realm explored' },
      { number: 3, range: [581, 620], theme: 'Phó bản 19 — ancient deity domain', payoff: 'ancient deity face-slap' },
      { number: 4, range: [621, 660], theme: 'Phó bản 20 — false reality', payoff: 'reality manipulation lore' },
      { number: 5, range: [661, 700], theme: 'CLIMAX phó bản 21 — system master domain', payoff: 'system master first contact' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'System master confrontation',
    corePayoff: 'MC face-slap system master, true rules of system reveal',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Phó bản 22 — multiverse rules instance', payoff: 'multiverse rules grasped' },
      { number: 2, range: [741, 780], theme: 'Phó bản 23 — system architect domain', payoff: 'architect face-slap' },
      { number: 3, range: [781, 820], theme: 'Phó bản 24 — origin universe', payoff: 'origin lore reveal' },
      { number: 4, range: [821, 860], theme: 'Phó bản 25 — system master throne', payoff: 'master confrontation' },
      { number: 5, range: [861, 900], theme: 'CLIMAX phó bản 26 — false ending', payoff: 'master weakened, true ending preview' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final instance + escape',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, escape system, ending warm',
    subArcs: [
      { number: 1, range: [901, 950], theme: 'Phó bản 27 — final instance', payoff: 'final instance enter' },
      { number: 2, range: [951, 1000], theme: 'CLIMAX phó bản 28 — true ending + escape', payoff: 'system escaped, MC + companion free, ending warm' },
    ],
  },
];
