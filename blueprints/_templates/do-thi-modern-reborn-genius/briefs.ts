/**
 * Do-thi reborn-genius template — programmatic brief generation.
 *
 * NON_COMBAT genre — conflict resolve qua thị trường / M&A / lawsuit /
 * PR / talent poaching. Tuyệt đối không bạo lực vật lý / huyết chiến /
 * gangster.
 */

import type { ChapterBrief, BeatType, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import { DO_THI_REBORN_GENIUS_ARC_SKELETON } from './arc-skeleton';

const TONE_REBORN = 'TONE: {{MC_NAME}} bình tĩnh + tự tin + tính toán. Public face thanh niên may mắn, không khoe khoang.';
const BAN_VIOLENCE = 'CẤM bạo lực vật lý / huyết chiến / gangster ambush — đây là NON_COMBAT genre. Conflict qua M&A / lawsuit / market / PR.';
const BAN_REVEAL_REBIRTH = 'CẤM reveal MC trọng sinh từ tương lai cho người không phải tâm phúc ({{LIFE_PARTNER}} sau arc 3).';
const BAN_GENERIC = 'CẤM tài nguyên không nguồn (tài liệu vô danh, contact bí ẩn) — mọi tài nguyên phải có ledger rõ.';
const BAN_TOURNAMENT = 'CẤM MC tham gia tournament đánh đấm / LAN gaming làm A-plot — đó là cliché tien-hiep, không phù hợp do-thi.';

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
      ? `Mở sub-arc ${subArc.number}: ${subArc.theme}. Setup business goal cụ thể trong cụm 5-chương.`
      : isCloser
        ? `Đóng sub-arc: ${subArc.payoff}.`
        : isBigWow
          ? `BIG WOW: PR mass / deal closed / IPO / face-slap qua thị trường — ${subArc.theme}.`
          : isConfront
            ? `CONFRONT: thương lượng deal / lawsuit / negotiation tense — ${subArc.theme}.`
            : `BREATHING: tuyển nhân sự / build sản phẩm / phân tích thị trường — ${subArc.theme}.`;

    const payoff = isCloser
      ? subArc.payoff
      : isBigWow
        ? 'PR mass / deal closed / market share visible up'
        : isConfront
          ? 'Manh mối deal / kẻ địch lộ chiến lược / MC nắm thông tin'
          : 'Tài nguyên (vốn / nhân sự / công nghệ) tích lũy';

    const cast: string[] = ['{{MC_NAME}}'];
    if (arcNumber === 1) cast.push('{{LIFE_PARTNER}}', 'gia đình');
    if (arcNumber >= 2) cast.push('{{ANTAGONIST_FAMILY}} đại biểu');
    if (arcNumber >= 3) cast.push('{{COMPETITION_BRAND}} CEO');
    if (arcNumber >= 4) cast.push('VC quốc tế');
    if (arcNumber >= 6) cast.push('cố vấn chính phủ');

    const location =
      arcNumber === 1
        ? '{{HOMETOWN}} — {{STARTING_BUSINESS}} + nhà'
        : arcNumber === 2
          ? '{{CITY_NAME}} — văn phòng HQ + chi nhánh'
          : arcNumber === 3
            ? '{{COUNTRY_NAME}} — văn phòng đa thành phố'
            : arcNumber === 4
              ? 'Mỹ + Singapore + Trung — văn phòng quốc tế'
              : arcNumber === 5
                ? 'Lab nghiên cứu + 30 nước operation'
                : arcNumber === 6
                  ? 'Davos + chính phủ {{COUNTRY_NAME}}'
                  : 'Endgame closure scenes';

    const scenes = [
      `Beat ${beat}: ${subArc.theme.split(/[—.,]/)[0].slice(0, 80)}`,
      `Cast: ${cast.join(', ')}`,
      `Location: ${location}`,
      isBigWow
        ? 'BIG WOW: PR mass — báo chí / truyền thông / thị trường công nhận'
        : isConfront
          ? 'Confront: thương lượng / lawsuit / negotiation — KHÔNG bạo lực'
          : isOpener
            ? 'Opener: setup business goal cụ thể + first dopamine peak ≤50% chương'
            : isCloser
              ? `Closer: ${subArc.payoff}`
              : 'Breathing: build sản phẩm / tuyển nhân sự / R&D',
      'Mode lão lục: MC dùng kiến thức tương lai một cách kín đáo',
    ];

    const mcBenefit = isCloser
      ? `${subArc.payoff} — vốn + nhân sự + market share cụ thể`
      : isBigWow
        ? 'PR mass + market share + định giá tăng'
        : isConfront
          ? 'Manh mối thị trường + thông tin đối thủ'
          : 'Vốn + nhân sự + R&D progress';

    const threadsAdvance: string[] = [];
    if (arcNumber === 1) threadsAdvance.push('venture đầu ổn định', 'gia đình thoát khó');
    if (arcNumber === 2) threadsAdvance.push('toàn {{CITY_NAME}}', 'IPO local');
    if (arcNumber === 3) threadsAdvance.push('toàn quốc', '{{COMPETITION_BRAND}} đối đầu');
    if (arcNumber === 4) threadsAdvance.push('IPO Mỹ', 'MNC global');
    if (arcNumber === 5) threadsAdvance.push('cách mạng công nghệ', 'top 3 global');
    if (arcNumber === 6) threadsAdvance.push('ảnh hưởng chính sách', 'top 1 global');
    if (arcNumber === 7) threadsAdvance.push('{{ENDING_GOAL}}');

    const risks = [TONE_REBORN, BAN_VIOLENCE, BAN_GENERIC, BAN_TOURNAMENT];
    if (arcNumber <= 3) risks.push(BAN_REVEAL_REBIRTH);
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

export const DO_THI_BRIEFS_BY_ARC: ChapterBrief[][] = DO_THI_REBORN_GENIUS_ARC_SKELETON.map(buildArcBriefs);
