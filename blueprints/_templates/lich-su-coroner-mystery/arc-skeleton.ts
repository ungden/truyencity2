/**
 * Lich-su "coroner mystery" — 大奉打更人 archetype.
 *
 * Phá án + triều đình + huyền năng. MC cảnh sát hiện đại xuyên về cổ đại,
 * gia nhập Đả Canh Tự (cơ quan điều tra). Mỗi sub-arc = 1 case + 1 power
 * tier ascension. Phó-bản pattern.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const LICH_SU_CORONER_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'Xuyên cổ đại + gia nhập Đả Canh Tự',
    corePayoff: 'MC tier Đồng tỳ → Ngân tỳ, solve 2 cases, gặp {{COMPANION_NAME}}',
    subArcs: [
      { number: 1, range: [1, 10], theme: 'Xuyên không + identity setup + first case (hồ sơ vụ giết người)', payoff: 'first case solved, Đồng tỳ tier' },
      { number: 2, range: [11, 22], theme: 'Case 2 — vụ án phố thị', payoff: 'case 2 solved + skill upgrade' },
      { number: 3, range: [23, 35], theme: 'Power tier ritual — Ngân tỳ ascension', payoff: 'Ngân tỳ tier' },
      { number: 4, range: [36, 50], theme: 'CLIMAX case 3 — vụ án triều đình nhỏ', payoff: 'case 3 + first triều đình recognition' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Đả Canh Tự cấp châu — 4 cases',
    corePayoff: 'Hoàng kim tỳ tier, 4 cases major solved, gặp triều đình quan',
    subArcs: [
      { number: 1, range: [51, 75], theme: 'Case 4 — vụ án Nho phái', payoff: 'Nho phái case solved' },
      { number: 2, range: [76, 100], theme: 'Case 5 — vụ án Đạo môn', payoff: 'Đạo môn case' },
      { number: 3, range: [101, 125], theme: 'Case 6 — vụ án yêu quái', payoff: 'yêu quái case + huyền năng tier' },
      { number: 4, range: [126, 150], theme: 'CLIMAX case 7 — Hoàng kim tỳ ritual', payoff: 'Hoàng kim tỳ + 4 cases complete' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Triều đường engagement + 5 cases',
    corePayoff: 'Đồng đẳng phẩm tỳ, 5 major cases, triều đình ranks',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Case 8 — quan đại biểu corrupt', payoff: 'corruption case' },
      { number: 2, range: [181, 210], theme: 'Case 9 — Phật môn cử ác', payoff: 'Phật môn case' },
      { number: 3, range: [211, 240], theme: 'Case 10 — vụ ám sát triều đình', payoff: 'assassination case' },
      { number: 4, range: [241, 270], theme: 'Case 11 — yêu quái big', payoff: 'yêu quái big case' },
      { number: 5, range: [271, 300], theme: 'CLIMAX case 12 — Đồng đẳng phẩm tỳ ritual + thread plant cosmic', payoff: 'Đồng đẳng + cosmic hint' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Cấp quốc gia + cosmic-tier cases',
    corePayoff: 'Nhị phẩm tỳ → Nhất phẩm tỳ, cosmic-tier cases',
    subArcs: [
      { number: 1, range: [301, 335], theme: 'Case 13 — quốc gia event', payoff: 'quốc gia case' },
      { number: 2, range: [336, 370], theme: 'Case 14 — yêu quái quốc', payoff: 'big yêu quái case' },
      { number: 3, range: [371, 405], theme: 'Power Nhị phẩm tỳ ritual', payoff: 'Nhị phẩm tier' },
      { number: 4, range: [406, 440], theme: 'Case 15 — cosmic-tier first', payoff: 'first cosmic case' },
      { number: 5, range: [441, 475], theme: 'Case 16 — cosmic-tier deeper', payoff: 'cosmic deeper' },
      { number: 6, range: [476, 500], theme: 'CLIMAX case 17 — Nhất phẩm tỳ ritual + ancient god first', payoff: 'Nhất phẩm + god hint' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Siêu phẩm + ancient gods engagement',
    corePayoff: 'Siêu phẩm tỳ, multiple gods neutralized',
    subArcs: [
      { number: 1, range: [501, 540], theme: 'Cosmic case investigations', payoff: 'multiple cosmic cases' },
      { number: 2, range: [541, 580], theme: 'Ancient god #1 cult dismantled', payoff: 'god #1 cult neutralized' },
      { number: 3, range: [581, 620], theme: 'Ancient god #2 cult engagement', payoff: 'god #2 cult' },
      { number: 4, range: [621, 660], theme: 'Siêu phẩm tỳ ritual', payoff: 'Siêu phẩm tier' },
      { number: 5, range: [661, 700], theme: 'CLIMAX ancient gods #1-2 neutralized', payoff: 'cosmic war prep' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Cosmic war prep + Tổ tỳ tier',
    corePayoff: 'Tổ tỳ tier, original god confrontation',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Tổ tỳ ritual + multi-realm prep', payoff: 'Tổ tỳ tier' },
      { number: 2, range: [741, 780], theme: 'Original god confrontation start', payoff: 'first contact' },
      { number: 3, range: [781, 820], theme: 'Multi-realm allies', payoff: 'allies peak' },
      { number: 4, range: [821, 860], theme: 'Original god weakened', payoff: 'god weakened' },
      { number: 5, range: [861, 900], theme: 'CLIMAX god prep final + plan ready', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final battle + closure',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, original god defeated, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Original god final battle', payoff: 'god defeated' },
      { number: 2, range: [941, 970], theme: '{{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 3, range: [971, 1000], theme: 'ENDING: warm closure', payoff: 'triều đình peace, MC retire or serve' },
    ],
  },
];
