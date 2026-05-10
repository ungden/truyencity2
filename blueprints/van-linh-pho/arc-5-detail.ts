// Arc 5 detailed chapter briefs (ch.501-700, 200 briefs).
//
// Theme: "Liên hợp đại lục clan — Cố tộc thành mục tiêu"
// Core payoff: Cố tộc thành bá tộc đại lục, MC tiến vào Đại Sư cảnh, Tro Bụi
// Vạn Lửa Thiên Phụng S, phát hiện thân phận xuyên hồn của tổ phụ.
//
// Cumulative state entering arc 5 (post ch.500):
//   MC: Đại Sư tầng 1 → tiến Đại Sư tầng 5+ peak cuối arc
//   Pets: Vạn Lửa Thiên Phụng S (Tro Bụi), Mộc Thần A (Mộc Linh), pet portfolio 7 con
//   Gia tộc: Cố tộc Đại Đại Tộc đại lục, 30 đại tộc đồng minh
//   Open threads: Hắc Lão Tổ + cosmic origin Vạn Linh Phổ + tổ phụ xuyên hồn

import type { ChapterBrief } from './arc-skeleton';

const TONE = 'TONE: MC lạnh đạm + tự tin. KHÔNG paranoid. KHÔNG tự khoe.';
const BAN = 'BAN cliffhanger paranoia; pet evolve công khai; cosmic-tier elements full reveal (defer arc 6+ ch.701+).';
const TIER = 'PET TIER PUBLIC: Vạn Lửa Thiên Phụng kìm chế S− public, Mộc Thần A−, các pet khác kìm chế tier-1 below thật.';

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
        `Cast: MC, bố mẹ, em gái Tiểu Đào, Vân Kiếm + Hồ Linh Nhi, Già Tâm, Cố Trường Hành đại trưởng lão, 30 đại tộc đồng minh`,
        `Pet portfolio public: Vạn Lửa Thiên Phụng S−, Mộc Thần A−, 5 pet khác kìm chế`,
        `MC tone Đại Sư realm — internal calm, public face điều khiển đại lục`,
        `Beat-specific: ${beat === 'big_wow' ? 'mass face-slap đại lục + cosmic threat foreshadow' : beat === 'breathing' ? 'family/đoàn đại lục warm scene' : beat === 'setup' ? 'observe + intel about Hắc Lão Tổ' : beat === 'confront' ? 'liên hợp clan tấn công direct' : 'consolidate đại lục position'}`,
        `Engine state extract`,
      ],
      mcBenefit: `${beat === 'big_wow' ? 'face-slap đại lục clan + Cố tộc bá tộc' : beat === 'resolution' ? 'tài nguyên + manh mối cosmic origin' : 'thông tin + setup'}`,
      threadsAdvance: ['phục hưng gia tộc', 'Hắc Lão Tổ + cosmic origin', 'tổ phụ Cố Lập Khải xuyên hồn Trái Đất'],
      threadsResolve: isLast ? [resolveThread] : undefined,
      risks: [BAN, TONE, TIER, `END phù hợp beat ${beat}, KHÔNG cliffhanger paranoia.`],
    };
  });
}

const sub_arc_themes = [
  // Sub-arc 1 (ch.501-520): Liên hợp đại lục clan tập trung tấn công Cố tộc
  ['Liên hợp 5 đại tộc đại lục đối thủ tổ chức tấn công Cố tộc — Hắc Lão Tổ ngầm chỉ đạo', 'liên hợp đại lục first attack'],
  // Sub-arc 2 (ch.521-540): Bố Cố Hành dạy MC kỹ năng Cao Cấp/Đại Sư
  ['Bố Cố Hành huấn luyện MC kỹ năng Đại Sư realm + bí mật gia phả tổ phụ', 'bố Cố Hành huấn luyện'],
  // Sub-arc 3 (ch.541-560): Liên hợp clan dùng pet S khủng
  ['Liên hợp clan tổ chức tấn công đợt 2 với pet S+ scale + cosmic-tier foreshadow', 'pet S clan war'],
  // Sub-arc 4 (ch.561-580): Tro Bụi → Vạn Lửa Thiên Phụng S path activate
  ['Tro Bụi tiến hóa Vạn Lửa Thiên Phụng S sequence + bí mật trong phòng kín', 'Tro Bụi Vạn Lửa Thiên Phụng S path'],
  // Sub-arc 5 (ch.581-600): BIG WOW Cố tộc thắng đại tộc Hoàng Châu
  ['Cố tộc đè bẹp Hoàng Châu (đại tộc thượng lưu Bắc) — face-slap đại lục', 'Hoàng Châu thua'],
  // Sub-arc 6 (ch.601-620): Tổ phụ Cố Lập Khải secret reveal start
  ['Tổ phụ Cố Lập Khải secret reveal — bố Cố Hành chia sẻ phần 1', 'tổ phụ secret part 1'],
  // Sub-arc 7 (ch.621-640): Liên minh clan tuyến phía nam tấn công
  ['Liên minh clan phía nam đại lục tấn công Cố tộc — quy mô lớn nhất arc 5', 'liên minh clan phía nam'],
  // Sub-arc 8 (ch.641-660): Tro Bụi → Vạn Lửa Thiên Phụng S complete + reveal
  ['Tro Bụi evolve Vạn Lửa Thiên Phụng S complete + public reveal kìm chế A peak — đại lục choáng', 'Vạn Lửa Thiên Phụng public'],
  // Sub-arc 9 (ch.661-680): Trận chiến trung tâm đại lục
  ['Trận chiến đại lục cuối arc 5 — Cố tộc + 30 đại tộc đồng minh vs liên minh phía nam', 'trận chiến đại lục arc 5'],
  // Sub-arc 10 (ch.681-700): CLIMAX arc 5 — MC Đại Sư peak + Cố tộc bá tộc đại lục
  ['CLIMAX arc 5 — MC Đại Sư tầng 5 peak + Cố tộc bá tộc đại lục + reveal tổ phụ xuyên hồn', 'CLIMAX arc 5'],
];

export const ARC5_BRIEFS_CH501_700: ChapterBrief[] = sub_arc_themes.flatMap(([context, resolveThread], subArcIdx) => {
  const startCh = 501 + subArcIdx * 20;
  const clusterMeta: ClusterMeta[] = Array.from({ length: 20 }, (_, i) => ({
    n: startCh + i,
    theme: `${i % 5 === 0 ? 'SETUP' : i % 5 === 1 ? 'BREATHING' : i % 5 === 2 ? 'CONFRONT' : i % 5 === 3 ? 'BIG WOW' : 'RESOLUTION'}: ${context} (cluster ${Math.floor(i / 5) + 1}/4)`,
  }));
  return buildBriefs(clusterMeta, `sub-arc ${subArcIdx + 1}, ${context}`, subArcIdx === sub_arc_themes.length - 1 ? resolveThread : undefined);
});
