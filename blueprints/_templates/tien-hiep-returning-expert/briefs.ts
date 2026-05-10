/**
 * Tien-hiep returning-expert template — programmatic brief generation.
 *
 * Generates 1000 ChapterBrief entries by walking sub-arc themes and assigning
 * 5-cluster beats. Each brief carries placeholder tokens (e.g. {{MC_NAME}})
 * that template instantiation replaces with novel-specific values.
 *
 * Pattern per sub-arc:
 *   - first chapter: setup
 *   - chapters 2..N-2: rotate through breathing/confront/big_wow
 *   - last chapter: resolution (or big_wow if sub-arc is climax)
 */

import type { ChapterBrief, BeatType, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';
import { TIEN_HIEP_RETURNING_EXPERT_ARC_SKELETON } from './arc-skeleton';

const TONE_LAO_LUC = 'TONE: mode lão lục — {{MC_NAME}} luôn giấu cảnh giới thực, public face thiếu niên may mắn.';
const BAN_REVEAL = 'CẤM reveal MC là cường giả kiếp trước cho bất kỳ ai ngoài người tâm phúc; cấm tu vi thật bị nhìn thấu.';
const BAN_GENERIC = 'CẤM tài nguyên không ledger (chìa khóa, bản đồ, đan vô danh) — mọi item phải có nguồn rõ.';
const BAN_OPPONENT_FLOOD = 'CẤM đối thủ {{ANTAGONIST_FAMILY}} thị xuất hiện liên tục — ngắt quãng ≥3 chương breathing giữa hai lần confront.';

function pickBeat(idxInSubArc: number, subArcLen: number, isClimax: boolean): BeatType {
  if (idxInSubArc === 0) return 'setup';
  if (idxInSubArc === subArcLen - 1) return isClimax ? 'big_wow' : 'resolution';
  // Middle: rotate breathing → confront → big_wow → breathing → confront ...
  const mid = idxInSubArc - 1;
  const cycle: BeatType[] = ['breathing', 'confront', 'big_wow', 'breathing', 'confront'];
  return cycle[mid % cycle.length];
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
          ? `BIG WOW: face-slap mass / milestone visible / đột phá tu vi public — ${subArc.theme} (đỉnh điểm cụm).`
          : isConfront
            ? `CONFRONT: đối thủ trực diện đẩy nhịp — ${subArc.theme} (giữa cụm).`
            : `BREATHING: tu luyện / luyện đan / đời sống tông môn — ${subArc.theme} (chậm để dồn lực).`;

    const payoff = isCloser
      ? subArc.payoff
      : isBigWow
        ? `Mass face-slap visible, danh tiếng tăng, nguyên liệu / tài nguyên cụ thể.`
        : isConfront
          ? `Manh mối mới / kẻ địch lộ ý đồ / MC thu thập thông tin.`
          : `Tài nguyên nhỏ tích lũy (linh thạch / linh thảo / công pháp), tâm cảnh ổn.`;

    const cast: string[] = ['{{MC_NAME}}'];
    if (arcNumber === 1) cast.push('{{ANTAGONIST_FAMILY}} đệ tử');
    if (arcNumber >= 2) cast.push('{{DAOIST_COMPANION}}');
    if (arcNumber >= 3) cast.push('{{SECT_NAME}} sư phụ');
    if (arcNumber >= 4) cast.push('{{ANCIENT_ENEMY}} tay sai');
    if (arcNumber >= 6) cast.push('sư phụ kiếp trước');

    const location =
      arcNumber === 1
        ? '{{SECT_NAME}} ngoại môn / {{HOMETOWN}}'
        : arcNumber === 2
          ? '{{SECT_NAME}} nội môn động phủ'
          : arcNumber === 3
            ? '{{SECT_NAME}} chân truyền + tàng kinh các'
            : arcNumber === 4
              ? '{{WORLD_NAME}} đại hội + {{HIDDEN_REALM}}'
              : arcNumber === 5
                ? '{{WORLD_NAME}} chiến trường liên minh'
                : arcNumber === 6
                  ? 'Thượng cổ ruins + đạo thống mới'
                  : 'Đại lục cuối + {{ENDING_GOAL}}';

    const scenes = [
      `Beat ${beat}: ${subArc.theme.split(/[—.,]/)[0].slice(0, 80)}`,
      `Cast: ${cast.join(', ')}`,
      `Location: ${location}`,
      isBigWow
        ? 'BIG WOW: mass witness — đệ tử / trưởng lão / đại lục công nhận'
        : isConfront
          ? 'Confront: đối thủ ngắn, MC giấu thực lực thắng nhỏ'
          : isOpener
            ? 'Opener: setup mục tiêu cụ thể + first dopamine peak ≤50% chương'
            : isCloser
              ? `Closer: ${subArc.payoff}`
              : 'Breathing: tu luyện / luyện đan / dialog tâm cảnh',
      'Mode lão lục: public cảnh giới luôn thấp hơn thực 2-3 tầng',
    ];

    const mcBenefit = isCloser
      ? `${subArc.payoff} — tài nguyên + uy tín cụ thể`
      : isBigWow
        ? 'Uy tín đại điển + tài nguyên cấp cao + manh mối'
        : isConfront
          ? 'Manh mối mới + thông tin đối thủ'
          : 'Tài nguyên tích lũy + tâm cảnh ổn';

    const threadsAdvance: string[] = [];
    if (arcNumber === 1) threadsAdvance.push('phục hưng trong tông môn', `face-slap {{ANTAGONIST_FAMILY}} thị`);
    if (arcNumber === 2) threadsAdvance.push('top nội môn', 'tìm {{SIGNATURE_TECHNIQUE}}');
    if (arcNumber === 3) threadsAdvance.push('chân truyền top 1', 'manh mối {{ANCIENT_ENEMY}}');
    if (arcNumber === 4) threadsAdvance.push('cứu sư phụ kiếp trước', `diệt tay sai {{ANCIENT_ENEMY}}`);
    if (arcNumber === 5) threadsAdvance.push(`{{ANCIENT_ENEMY}} đối đầu trực diện`);
    if (arcNumber === 6) threadsAdvance.push('chân tướng kiếp trước', 'pháp bảo bản mệnh');
    if (arcNumber === 7) threadsAdvance.push('{{ENDING_GOAL}}');

    const risks = [TONE_LAO_LUC, BAN_REVEAL, BAN_GENERIC];
    if (arcNumber <= 3) risks.push(BAN_OPPONENT_FLOOD);
    if (isCloser) risks.push(`END phù hợp beat ${beat}, payoff cụ thể: ${subArc.payoff}`);

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

export const TIEN_HIEP_BRIEFS_BY_ARC: ChapterBrief[][] = TIEN_HIEP_RETURNING_EXPERT_ARC_SKELETON.map(buildArcBriefs);
