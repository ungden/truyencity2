/**
 * Faloo-style "综漫曝光名场面" — phó-bản pattern, cross-canon reaction.
 *
 * Archetype: MC trong multi-canon (tổng mạn) có khả năng "phơi bày
 * danh trường diện" — show canon characters các cảnh chưa từng biết
 * về họ. Mỗi reveal trigger reaction "phá phòng" của canon. DNA Faloo:
 * title + premise đẩy mạnh vào fan-interest, mỗi chapter = 1-2 reveals
 * + reactions, cliffhanger dày.
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const FALOO_TONG_MAN_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First canon — Naruto reveals + reactions',
    corePayoff: 'MC reveal 3 Naruto canon scenes, các nhân vật phá phòng',
    subArcs: [
      { number: 1, range: [1, 8], theme: 'Hệ thống active — first reveal Uchiha Itachi backstory', payoff: 'Naruto canon react' },
      { number: 2, range: [9, 16], theme: 'Reveal Pain backstory', payoff: 'Akatsuki react' },
      { number: 3, range: [17, 25], theme: 'Reveal Madara Uchiha origin', payoff: 'shinobi world react' },
      { number: 4, range: [26, 34], theme: 'Reveal Otsutsuki origin', payoff: 'cosmic-tier react' },
      { number: 5, range: [35, 42], theme: 'Naruto canon final reveal', payoff: 'Naruto canon complete' },
      { number: 6, range: [43, 50], theme: 'CLIMAX: cross-canon teleport prep', payoff: 'sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Second canon — One Piece reveals',
    corePayoff: 'MC reveal 4-5 One Piece canon scenes',
    subArcs: [
      { number: 1, range: [51, 65], theme: 'Reveal Roger backstory', payoff: 'OP canon react' },
      { number: 2, range: [66, 80], theme: 'Reveal Joy Boy + Void Century', payoff: 'cosmic shock' },
      { number: 3, range: [81, 95], theme: 'Reveal Mary Geoise secrets', payoff: 'world government react' },
      { number: 4, range: [96, 110], theme: 'Reveal Devil Fruit origin', payoff: 'lore react' },
      { number: 5, range: [111, 125], theme: 'Reveal Shanks identity', payoff: 'major character react' },
      { number: 6, range: [126, 140], theme: 'Reveal Im / cosmic king', payoff: 'world-shattering react' },
      { number: 7, range: [141, 150], theme: 'CLIMAX arc 2: OP complete + cross-canon network', payoff: 'sẵn sàng arc 3' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Multi-canon expansion — Bleach + DBZ + Demon Slayer',
    corePayoff: 'MC reveal cross-canon 6+ canons, build network',
    subArcs: [
      { number: 1, range: [151, 180], theme: 'Bleach canon reveals', payoff: 'Bleach react' },
      { number: 2, range: [181, 210], theme: 'DBZ canon reveals', payoff: 'DBZ react' },
      { number: 3, range: [211, 240], theme: 'Demon Slayer canon reveals', payoff: 'Demon Slayer react' },
      { number: 4, range: [241, 270], theme: 'Cross-canon connection lộ', payoff: 'multi-canon hub' },
      { number: 5, range: [271, 300], theme: 'CLIMAX arc 3: 6 canons complete + meta-canon reveal', payoff: 'sẵn sàng arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Meta-canon reveal — author lore',
    corePayoff: 'Reveal: tất cả canons có common author/cosmic source',
    subArcs: [
      { number: 1, range: [301, 330], theme: 'Author meta-canon investigation', payoff: 'lore plant' },
      { number: 2, range: [331, 360], theme: 'Reveal: author = cosmic creator', payoff: 'meta-canon lore' },
      { number: 3, range: [361, 390], theme: 'Cross-canon characters react meta', payoff: 'characters break 4th wall' },
      { number: 4, range: [391, 420], theme: 'Mass reaction tournament', payoff: 'all canons unite' },
      { number: 5, range: [421, 450], theme: 'Author OC antagonist xuất hiện', payoff: 'antagonist reveal' },
      { number: 6, range: [451, 480], theme: 'First confrontation author OC', payoff: 'first face-slap' },
      { number: 7, range: [481, 500], theme: 'CLIMAX arc 4: author OC weakened', payoff: 'sẵn sàng arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Author OC showdown + multi-canon allies',
    corePayoff: 'MC + all canons face-slap author OC',
    subArcs: [
      { number: 1, range: [501, 530], theme: 'Author OC invasion', payoff: 'invasion start' },
      { number: 2, range: [531, 560], theme: 'Multi-canon allies unite', payoff: 'allies peak' },
      { number: 3, range: [561, 590], theme: 'Mass author OC face-slap', payoff: 'OC weakened' },
      { number: 4, range: [591, 620], theme: 'Author OC reveal: original author rejected OC', payoff: 'lore peak' },
      { number: 5, range: [621, 650], theme: 'Cosmic mass plan', payoff: 'plan ready' },
      { number: 6, range: [651, 680], theme: 'Author OC final form', payoff: 'final form' },
      { number: 7, range: [681, 700], theme: 'CLIMAX arc 5: OC weakened, final prep', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Meta-cosmic battle — author hierarchy',
    corePayoff: 'MC vs cosmic author tier, become new author',
    subArcs: [
      { number: 1, range: [701, 740], theme: 'Author OC final battle', payoff: 'OC defeat' },
      { number: 2, range: [741, 780], theme: 'Reveal: cosmic author hierarchy', payoff: 'lore peak final' },
      { number: 3, range: [781, 820], theme: 'MC ascend author tier', payoff: 'MC author tier' },
      { number: 4, range: [821, 860], theme: 'Mass canon stability under MC', payoff: 'canons stable' },
      { number: 5, range: [861, 900], theme: 'CLIMAX arc 6: MC = cosmic author', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}} — final closure',
    corePayoff: 'MC đạt {{ENDING_GOAL}}, multi-canon peace, ending warm',
    subArcs: [
      { number: 1, range: [901, 940], theme: 'Final cosmic protocol', payoff: 'protocol active' },
      { number: 2, range: [941, 980], theme: 'Final battle', payoff: 'protocol defeated' },
      { number: 3, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'multi-canon peace, MC retire / continue protecting' },
    ],
  },
];
