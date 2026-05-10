/**
 * Huyen-huyen bloodline-war template — programmatic brief generation.
 *
 * Combat genre — physical battle is core. Huyết mạch unlock through
 * battle is signature beat. Mode lão lục NOT applicable here — MC's
 * power level is allowed to be visible (huyết mạch is exterior).
 */

import type { ChapterBrief, BeatType, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import { HUYEN_HUYEN_BLOODLINE_ARC_SKELETON } from './arc-skeleton';

const TONE_BLOODLINE = 'TONE: {{MC_NAME}} kiêu hãnh nhưng kín đáo. Huyết mạch là gia bảo — luôn nói "tổ tiên truyền lại", không khoe khoang.';
const BAN_REVEAL_TIER = 'CẤM lộ tầng huyết mạch cao hơn ngoài chiến đấu — chỉ unleash khi đối thủ đáng. Public tầng luôn thấp hơn tầng thực 1.';
const BAN_GENERIC = 'CẤM tài nguyên không nguồn (đan vô danh, công pháp ngẫu nhiên) — mọi thứ phải có ledger / tổ tiên / mật cảnh / kẻ địch lưu lại.';
const BAN_OPPONENT_FLOOD = 'CẤM {{ANTAGONIST_FAMILY}} + cổ tộc đối lập + {{ANCIENT_ENEMY}} cùng xuất hiện trong chương breathing — ngắt quãng ≥3 chương.';

function pickBeat(idxInSubArc: number, subArcLen: number, isClimax: boolean): BeatType {
  if (idxInSubArc === 0) return 'setup';
  if (idxInSubArc === subArcLen - 1) return isClimax ? 'big_wow' : 'resolution';
  const cycle: BeatType[] = ['breathing', 'confront', 'big_wow', 'breathing', 'confront'];
  return cycle[(idxInSubArc - 1) % cycle.length];
}

function buildSubArcBriefs(
  subArc: SubArc,
  arcNumber: number,
  isClimaxSubArc: boolean,
): ChapterBrief[] {
  const [start, end] = subArc.range;
  const len = end - start + 1;
  const briefs: ChapterBrief[] = [];

  for (let i = 0; i < len; i++) {
    const n = start + i;
    const beat = pickBeat(i, len, isClimaxSubArc && i === len - 1);
    const isOpener = i === 0;
    const isCloser = i === len - 1;
    const isBigWow = beat === 'big_wow';
    const isConfront = beat === 'confront';

    const goal = isOpener
      ? `Mở sub-arc ${subArc.number}: ${subArc.theme}. Setup mục tiêu cụ thể trong cụm 5-chương.`
      : isCloser
        ? `Đóng sub-arc: ${subArc.payoff}.`
        : isBigWow
          ? `BIG WOW: huyết mạch unleash / battle peak / face-slap mass — ${subArc.theme}.`
          : isConfront
            ? `CONFRONT: battle trực diện / đối thủ tỷ thí — ${subArc.theme}.`
            : `BREATHING: tu luyện / luyện thân / dialog tâm cảnh — ${subArc.theme}.`;

    const payoff = isCloser
      ? subArc.payoff
      : isBigWow
        ? 'Huyết mạch tầng tiến triển / battle peak visible / mass face-slap'
        : isConfront
          ? 'Manh mối kẻ địch / chiến đấu thắng nhỏ / tài nguyên chiến lợi'
          : 'Tu luyện ổn / huyết mạch tích lũy / dược liệu';

    const cast: string[] = ['{{MC_NAME}}'];
    if (arcNumber === 1) cast.push('{{MC_FAMILY}} gia trưởng lão', '{{ANTAGONIST_FAMILY}} đệ tử');
    if (arcNumber >= 2) cast.push('{{COMPANION_NAME}}', '{{ACADEMY_NAME}} sư phụ');
    if (arcNumber >= 3) cast.push('cổ tộc đối lập đại biểu', '{{ANCESTOR_NAME}} di niệm');
    if (arcNumber >= 4) cast.push('{{ANCIENT_ENEMY}} tay sai cao cấp');
    if (arcNumber >= 6) cast.push('thượng cổ pháp bảo');

    const location =
      arcNumber === 1
        ? '{{HOMETOWN}} — {{MC_FAMILY}} gia + tỷ võ trường'
        : arcNumber === 2
          ? '{{ACADEMY_NAME}} — học viện + mật cảnh'
          : arcNumber === 3
            ? `Đế đô {{CONTINENT_NAME}} — đấu trường + cổ tộc lãnh địa`
            : arcNumber === 4
              ? 'Cổ vực + {{HIDDEN_REALM}} (tộc nhân giam)'
              : arcNumber === 5
                ? `Đại lục {{CONTINENT_NAME}} — chiến trường liên hợp`
                : arcNumber === 6
                  ? 'Thượng cổ ruins'
                  : 'Endgame battlefield';

    const scenes = [
      `Beat ${beat}: ${subArc.theme.split(/[—.,]/)[0].slice(0, 80)}`,
      `Cast: ${cast.join(', ')}`,
      `Location: ${location}`,
      isBigWow
        ? 'BIG WOW: huyết mạch unleash / battle climax / mass witness face-slap'
        : isConfront
          ? 'Confront: battle trực diện 1v1 hoặc 1vN, MC kiểm soát nhịp'
          : isOpener
            ? 'Opener: setup combat goal cụ thể + first dopamine peak ≤50% chương'
            : isCloser
              ? `Closer: ${subArc.payoff}`
              : 'Breathing: tu luyện huyết mạch / luyện công pháp / dialog',
      'Huyết mạch: public tầng luôn thấp hơn tầng thực 1, chỉ unleash khi đáng',
    ];

    const mcBenefit = isCloser
      ? `${subArc.payoff} — huyết mạch tiến triển + tài nguyên`
      : isBigWow
        ? 'Huyết mạch tầng visible + danh tiếng + chiến lợi phẩm cấp cao'
        : isConfront
          ? 'Manh mối kẻ địch + chiến lợi nhỏ'
          : 'Tu luyện + dược liệu + công pháp';

    const threadsAdvance: string[] = [];
    if (arcNumber === 1) threadsAdvance.push('phục hưng {{MC_FAMILY}} gia', `face-slap {{ANTAGONIST_FAMILY}}`);
    if (arcNumber === 2) threadsAdvance.push('top {{ACADEMY_NAME}}', 'tổ chức {{ANCIENT_ENEMY}} infiltrate');
    if (arcNumber === 3) threadsAdvance.push('cổ tộc đối lập', `{{ANCESTOR_NAME}} di niệm`);
    if (arcNumber === 4) threadsAdvance.push('cứu tộc nhân huyết mạch', `diệt cổ tộc đối lập`);
    if (arcNumber === 5) threadsAdvance.push('thống nhất đại lục', 'thượng cổ ruins');
    if (arcNumber === 6) threadsAdvance.push('chân tướng phong ấn', `pháp bảo {{ANCESTOR_NAME}}`);
    if (arcNumber === 7) threadsAdvance.push('{{ENDING_GOAL}}');

    const risks = [TONE_BLOODLINE, BAN_REVEAL_TIER, BAN_GENERIC];
    if (arcNumber <= 3) risks.push(BAN_OPPONENT_FLOOD);
    if (isCloser) risks.push(`END phù hợp beat ${beat}, payoff: ${subArc.payoff}`);

    briefs.push({
      n,
      beat,
      arcNumber,
      subArcNumber: subArc.number,
      goal,
      payoff,
      cast,
      location,
      scenes,
      mcBenefit,
      threadsAdvance,
      risks,
    });
  }

  return briefs;
}

function buildArcBriefs(arc: ArcSkeleton): ChapterBrief[] {
  const briefs: ChapterBrief[] = [];
  const lastSubArc = arc.subArcs[arc.subArcs.length - 1];
  for (const subArc of arc.subArcs) {
    const isClimax = subArc === lastSubArc;
    briefs.push(...buildSubArcBriefs(subArc, arc.arcNumber, isClimax));
  }
  return briefs;
}

export const HUYEN_HUYEN_BRIEFS_BY_ARC: ChapterBrief[][] = HUYEN_HUYEN_BLOODLINE_ARC_SKELETON.map(buildArcBriefs);
