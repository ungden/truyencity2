/**
 * Ngon-tinh "khoái xuyên" — phó-bản pattern.
 * Female MC nhân viên đa vũ trụ system, mỗi 30-50 chương xuyên thân
 * phận pháo hôi / villain / nữ phụ cứu nguyên chủ.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const NGON_TINH_KHOAI_XUYEN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First world — pháo hôi tổng tài văn',
    corePayoff: 'MC xuyên pháo hôi nữ phụ trong tổng tài văn, save nguyên chủ, complete mission',
    subArcs: [
      { number: 1, range: [1, 7], theme: 'System assignment + xuyên world 1', payoff: 'identity active' },
      { number: 2, range: [8, 14], theme: 'Pháo hôi backstory + first face-slap', payoff: 'face-slap chính thê' },
      { number: 3, range: [15, 21], theme: 'Save nguyên chủ key event', payoff: 'nguyên chủ saved' },
      { number: 4, range: [22, 28], theme: 'Mass face-slap canon villains', payoff: 'world stable' },
      { number: 5, range: [29, 35], theme: 'Romance/affection với male lead canon', payoff: 'romance bond' },
      { number: 6, range: [36, 42], theme: 'World 1 finale — mission complete', payoff: 'world 1 complete' },
      { number: 7, range: [43, 50], theme: 'CLIMAX arc 1: world 1 perfect ending + system reward', payoff: 'sẵn sàng world 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Worlds 2-3 — cổ đại cung đình + hiện đại showbiz',
    corePayoff: 'MC complete 2 more worlds, mass tài nguyên',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'World 2 — cổ đại cung đình pháo hôi', payoff: 'world 2 complete' },
      { number: 2, range: [76, 100], theme: 'World 3 — showbiz pháo hôi', payoff: 'world 3 complete' },
      { number: 3, range: [101, 125], theme: 'System reward upgrade — Hub Space cấp 2', payoff: 'hub upgrade' },
      { number: 4, range: [126, 150], theme: 'CLIMAX arc 2 — world 4 pháo hôi tu tiên', payoff: 'world 4 complete' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Worlds 5-7 — multi-world expansion',
    corePayoff: 'MC complete 3 more worlds (mạt thế / xuyên không lich-su / dị giới)',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'World 5 — mạt thế pháo hôi', payoff: 'world 5 complete' },
      { number: 2, range: [181, 210], theme: 'World 6 — lich-su xuyên không cung đình', payoff: 'world 6 complete' },
      { number: 3, range: [211, 240], theme: 'World 7 — dị giới pháo hôi', payoff: 'world 7 complete' },
      { number: 4, range: [241, 270], theme: 'Hub Space upgrade cấp 3 — multi-canon access', payoff: 'multi-canon' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3 — world 8 hệ thống horror pháo hôi', payoff: 'world 8 complete' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Worlds 9-12 — cosmic-tier worlds',
    corePayoff: 'MC complete 4 cosmic-tier worlds, system origin lore reveal',
    subArcs: [
      { number: 1, range: [301, 340], theme: 'World 9 — cosmic war pháo hôi', payoff: 'world 9 complete' },
      { number: 2, range: [341, 380], theme: 'World 10 — quy tắc quái đàm pháo hôi', payoff: 'world 10 complete' },
      { number: 3, range: [381, 420], theme: 'World 11 — multi-canon trộn pháo hôi', payoff: 'world 11 complete' },
      { number: 4, range: [421, 460], theme: 'World 12 — anti-world (system enemy)', payoff: 'world 12 complete + system enemy reveal' },
      { number: 5, range: [461, 500], theme: 'CLIMAX arc 4: cosmic tier worlds + system enemy', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Worlds 13-15 + system origin',
    corePayoff: 'MC navigate cosmic-tier system enemy, learn origin của system',
    subArcs: [
      { number: 1, range: [501, 540], theme: 'World 13 — system origin world', payoff: 'origin lore' },
      { number: 2, range: [541, 580], theme: 'World 14 — system architect domain', payoff: 'architect lore' },
      { number: 3, range: [581, 620], theme: 'World 15 — cosmic showdown pháo hôi', payoff: 'world 15 complete' },
      { number: 4, range: [621, 660], theme: 'System administrator confrontation', payoff: 'admin first weak' },
      { number: 5, range: [661, 700], theme: 'CLIMAX arc 5: system master weakened', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'System rebellion — MC vs administrator',
    corePayoff: 'MC + multi-world allies rebel against admin, admin face-slap final',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'System rebellion start', payoff: 'rebellion forming' },
      { number: 2, range: [741, 780], theme: 'Multi-world allies recruited', payoff: 'multi-world allies' },
      { number: 3, range: [781, 820], theme: 'Mass admin face-slap', payoff: 'admin retreat' },
      { number: 4, range: [821, 860], theme: 'Reveal: admin = ancient deity in disguise', payoff: 'lore peak' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: admin major bại', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — system escape + true freedom',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, escape system, ending warm với multi-world allies',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final cosmic confrontation', payoff: 'admin protocol confront' },
      { number: 2, range: [941, 970], theme: 'Final battle admin', payoff: 'admin bại' },
      { number: 3, range: [971, 1000], theme: 'ENDING: system escape + warm closure', payoff: 'free, MC retire to chosen canon (vd với male lead favorite)' },
    ],
  },
];
