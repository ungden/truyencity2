// Arc 6 detailed chapter briefs (ch.701-900, 200 briefs).
//
// Theme: "Hệ tộc thượng cổ thần thú trở lại — Vạn Thú Lĩnh"
// Core payoff: Tro Bụi → Hồng Hoang Phụng Tổ SS path activate, thần thú
// thượng cổ lập minh ước với Cố tộc, giải mã liên kết Vạn Linh Phổ với Trái Đất.
//
// COSMIC TIER ARC — ch.701+ là vùng cosmic được phép. itemLedger + cosmic
// patterns không còn ban các elements thượng cổ.

import type { ChapterBrief } from './arc-skeleton';

const TONE = 'TONE: MC Đại Sư realm — calm + decisive. Cosmic tier elements permitted (arc 6+).';
const BAN = 'BAN cliffhanger paranoia; pet evolve thần thú scale công khai khi chưa needed.';

interface ClusterMeta { n: number; theme: string; }

function buildBriefs(clusterMeta: ClusterMeta[], context: string, resolveThread?: string): ChapterBrief[] {
  const beats: Array<'setup' | 'breathing' | 'confront' | 'big_wow' | 'resolution'> = [
    'setup', 'breathing', 'confront', 'big_wow', 'resolution',
  ];
  return clusterMeta.map((meta, idx) => {
    const beat = beats[idx % 5];
    const isLast = idx === clusterMeta.length - 1 && resolveThread;
    return {
      n: meta.n,
      beat,
      brief: `${meta.theme}. (${context}.)`,
      scenes: [
        `Beat ${beat}: ${meta.theme.split(/[—.,]/)[0].slice(0, 100)}`,
        `Cast: MC, bố mẹ, em gái Tiểu Đào (Đại Sư thông giao), Vân Kiếm + Hồ Linh Nhi, Già Tâm, đại trưởng lão, thần thú thượng cổ`,
        `Pet portfolio: Vạn Lửa Thiên Phụng S (sắp Hồng Hoang Phụng Tổ SS), Mộc Thần A, 5 pet khác A-S, 1 thần thú thượng cổ acquired`,
        `MC tone Đại Sư realm — calm decisive, cosmic threat aware`,
        `Beat-specific: ${beat === 'big_wow' ? 'cosmic mass face-slap + thần thú minh ước' : beat === 'breathing' ? 'gia đình + thần thú interaction' : beat === 'setup' ? 'observe cosmic origin + intel' : beat === 'confront' ? 'Hắc Lão Tổ + cosmic antagonist face-off' : 'consolidate cosmic gain'}`,
        `Engine state extract`,
      ],
      mcBenefit: `${beat === 'big_wow' ? 'thần thú minh ước + cosmic origin reveal' : beat === 'resolution' ? 'cosmic tài nguyên + Vạn Linh Phổ V2 setup' : 'thông tin cosmic + setup'}`,
      threadsAdvance: ['Hắc Lão Tổ + cosmic origin', 'tổ phụ Cố Lập Khải xuyên hồn Trái Đất', 'Vạn Linh Phổ V2 chế tạo'],
      threadsResolve: isLast ? [resolveThread] : undefined,
      risks: [BAN, TONE, `END phù hợp beat ${beat}, KHÔNG cliffhanger paranoia.`],
    };
  });
}

const sub_arc_themes = [
  ['Vạn Thú Lĩnh thức tỉnh — thần thú thượng cổ first contact', 'Vạn Thú Lĩnh thức tỉnh'],
  ['Cố Diệp investigate Vạn Linh Phổ origin từ tài liệu thượng cổ + bố Cố Hành reveal', 'Vạn Linh Phổ origin investigate'],
  ['Hệ tộc thần thú đề nghị thử thách Cố tộc — prize = minh ước cosmic', 'thần thú thử thách'],
  ['Tro Bụi → Hồng Hoang Phụng Tổ SS giai đoạn đầu — feed sequence cosmic', 'Tro Bụi Hồng Hoang Phụng Tổ stage 1'],
  ['BIG WOW: Cố Diệp vượt thử thách thần thú — minh ước thiết lập, đại lục choáng', 'thử thách thần thú'],
  ['Reveal Vạn Linh Phổ origin = Trái Đất research network của tổ phụ + Hắc Lão Tổ là tổ phụ thất bại', 'Vạn Linh Phổ origin Trái Đất reveal'],
  ['Em gái Cố Tiểu Đào trở thành Đại Sư thông giao tâm linh — peak power, độc lập', 'Cố Tiểu Đào Đại Sư thông giao'],
  ['Liên kết Trái Đất + đại lục — choice point cho MC: ở lại hay về Trái Đất', 'MC choice Trái Đất vs đại lục'],
  ['Tro Bụi → Hồng Hoang Phụng Tổ SS path complete — pet đầu tiên cấp SS visible', 'Hồng Hoang Phụng Tổ SS'],
  ['CLIMAX arc 6 — thần thú thượng cổ confirm minh ước với Cố tộc + MC Truyền Thuyết tầng 1', 'CLIMAX arc 6'],
];

export const ARC6_BRIEFS_CH701_900: ChapterBrief[] = sub_arc_themes.flatMap(([context, resolveThread], subArcIdx) => {
  const startCh = 701 + subArcIdx * 20;
  const clusterMeta: ClusterMeta[] = Array.from({ length: 20 }, (_, i) => ({
    n: startCh + i,
    theme: `${i % 5 === 0 ? 'SETUP' : i % 5 === 1 ? 'BREATHING' : i % 5 === 2 ? 'CONFRONT' : i % 5 === 3 ? 'BIG WOW' : 'RESOLUTION'}: ${context} (cluster ${Math.floor(i / 5) + 1}/4)`,
  }));
  return buildBriefs(clusterMeta, `sub-arc ${subArcIdx + 1}, ${context}`, subArcIdx === sub_arc_themes.length - 1 ? resolveThread : undefined);
});
