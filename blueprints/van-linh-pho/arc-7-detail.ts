// Arc 7 detailed chapter briefs (ch.901-1000, 100 briefs).
//
// Theme: "Thiên Đạo bá chủ Vạn Linh"
// Core payoff: MC Thần Thoại tầng 1, bá chủ Vạn Linh Đại Lục, Tro Bụi
// Hồng Hoang Phụng Tổ SS final, Vạn Linh Phổ V2 chế tạo, ending gia đình +
// đại lục.

import type { ChapterBrief } from './arc-skeleton';

const TONE = 'TONE: MC Truyền Thuyết → Thần Thoại realm — calm + transcendent. Final arc tone.';
const BAN = 'BAN cliffhanger paranoia; ending phải warm + resolve mọi major threads.';

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
        `Cast: MC (Truyền Thuyết → Thần Thoại), bố mẹ, em gái Tiểu Đào (Đại Sư thông giao), Vân Kiếm + Hồ Linh Nhi, thần thú thượng cổ minh ước, Hắc Lão Tổ antagonist final`,
        `Pet portfolio: Hồng Hoang Phụng Tổ SS (Tro Bụi), 6 pet S+ khác`,
        `MC tone transcendent — final arc gravitas`,
        `Beat-specific: ${beat === 'big_wow' ? 'cosmic final battle + bá chủ achieve' : beat === 'breathing' ? 'gia đình ending warm + đại lục bring peace' : beat === 'setup' ? 'final threat setup' : beat === 'confront' ? 'Hắc Lão Tổ final confrontation' : 'consolidate ending'}`,
        `Engine state: ending threads resolve`,
      ],
      mcBenefit: `${beat === 'big_wow' ? 'Hắc Lão Tổ thua + bá chủ achieve' : beat === 'resolution' ? 'ending warm + đại lục peace' : 'thông tin + setup final'}`,
      threadsAdvance: ['Hắc Lão Tổ final battle', 'MC bá chủ Vạn Linh', 'Vạn Linh Phổ V2 chế tạo'],
      threadsResolve: isLast ? [resolveThread] : undefined,
      risks: [BAN, TONE, `END phù hợp beat ${beat}, ending warm.`],
    };
  });
}

const sub_arc_themes = [
  ['Quái lực thiên đạo bias — last antagonist hidden behind Hắc Lão Tổ', 'thiên đạo bias antagonist'],
  ['Cố Diệp chế tạo Vạn Linh Phổ V2 — tool transferable cho gia tộc + đại lục', 'Vạn Linh Phổ V2 chế tạo'],
  ['Trận chiến cuối Hắc Lão Tổ + thiên đạo bias — Cố tộc + thần thú minh ước vs cosmic', 'Hắc Lão Tổ final battle'],
  ['BIG WOW: Tro Bụi Hồng Hoang Phụng Tổ SS final form + MC Thần Thoại tầng 1 — pet đại lục mạnh nhất, bá chủ achieve', 'Hồng Hoang Phụng Tổ final + bá chủ'],
  ['ENDING: bá chủ Vạn Linh, gia đình đoàn tụ, em gái độc lập — MC chọn ở lại đại lục thay vì về Trái Đất, ending warm', 'CLIMAX arc 7 ENDING'],
];

export const ARC7_BRIEFS_CH901_1000: ChapterBrief[] = sub_arc_themes.flatMap(([context, resolveThread], subArcIdx) => {
  const startCh = 901 + subArcIdx * 20;
  const clusterMeta: ClusterMeta[] = Array.from({ length: 20 }, (_, i) => ({
    n: startCh + i,
    theme: `${i % 5 === 0 ? 'SETUP' : i % 5 === 1 ? 'BREATHING' : i % 5 === 2 ? 'CONFRONT' : i % 5 === 3 ? 'BIG WOW' : 'RESOLUTION'}: ${context} (cluster ${Math.floor(i / 5) + 1}/4)`,
  }));
  return buildBriefs(clusterMeta, `sub-arc ${subArcIdx + 1}, ${context}`, subArcIdx === sub_arc_themes.length - 1 ? resolveThread : undefined);
});
