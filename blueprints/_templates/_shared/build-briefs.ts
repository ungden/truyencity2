/**
 * Shared programmatic brief builder for all genre master templates.
 *
 * Now supports 8 narrative patterns (research-backed from 13 genre
 * sub-genre taxonomies). Each pattern has distinct beat-rotation
 * + flavor descriptors:
 *
 *   - cluster-dopamine: sảng văn classic 5-cluster (setup → breathing/
 *     confront/big_wow rotation → resolution / climax-big_wow). Default
 *     for trọng sinh / huyết mạch / hệ thống / tổng vũ archetypes.
 *
 *   - linear-grind: Phàm Nhân Lưu slow burn — mostly breathing, BIG_WOW
 *     only at climax sub-arc, no per-cluster dopamine. Used for tu tiên
 *     phàm nhân / 长生 / lich-su realistic / quan-truong thảo căn.
 *
 *   - time-skip-macro: Lão Tổ / Sáng Thế / harvest — jumps thiên niên
 *     kỷ giữa sub-arcs. Setup-heavy, harvest at close. Used for lão tổ,
 *     sáng thế, lord-builder, nho-đạo, gia tộc.
 *
 *   - villain-shadow: Hắc Ám Lưu — no warm baseline, dark deeds steady.
 *     confront-heavy. Used for phản phái, ma đạo MC.
 *
 *   - domain-shop: Lĩnh Vực Tuyệt Đối / quán cuối phố — MC tử thủ 1
 *     location, customers come. Breathing-heavy, customer = confront.
 *     Used for trồng cấy, mỹ thực, tiệm tạp hóa, urban cosy.
 *
 *   - phó-bản: Quy Tắc Quái Đàm / Vô Hạn Lưu / Khoái Xuyên — 1 sub-arc
 *     = 1 phó bản (instance / canon / mystery). Each phó bản has own
 *     setup → escalation → boss → resolution.
 *
 *   - decade-jumps: Trọng Sinh Niên Đại / business saga — sub-arc = 1
 *     decade or industry phase. Opens with opportunity, climax with
 *     milestone (IPO / startup launch / market dominance).
 *
 *   - simulator-loop: Mô Phỏng / Suy Diễn — each cluster = 1 sim cycle
 *     (setup goal → sim breathing → reveal confront → real-execute
 *     big_wow → result resolution).
 */

import type { ChapterBrief, BeatType, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export type NarrativePattern =
  | 'cluster-dopamine'
  | 'linear-grind'
  | 'time-skip-macro'
  | 'villain-shadow'
  | 'domain-shop'
  | 'phó-bản'
  | 'decade-jumps'
  | 'simulator-loop';

export interface TemplateBriefConfig {
  /** Narrative pattern — controls beat rotation + flavor. */
  pattern?: NarrativePattern; // defaults to 'cluster-dopamine'
  /** Tone directives + bans pulled into per-chapter risks. */
  toneDirective: string;
  bansAlways: string[];
  /** Optional per-arc bans (vd opponent flood ban only arc 1-3). */
  bansForArc?: (arcNumber: number) => string[];
  /** Cast resolver returns array of cast member names for given arc. */
  castForArc: (arcNumber: number) => string[];
  /** Location resolver returns string for given arc. */
  locationForArc: (arcNumber: number) => string;
  /** Plot threads to advance for given arc. */
  threadsForArc: (arcNumber: number) => string[];
  /** Optional override for big_wow flavor descriptor. */
  bigWowFlavor?: string;
  /** Optional override for confront flavor descriptor. */
  confrontFlavor?: string;
  /** Optional override for breathing flavor descriptor. */
  breathingFlavor?: string;
}

/**
 * Pattern-specific beat selection for chapter idxInSubArc within a sub-arc
 * of length subArcLen. isClimax = true when this is the climax sub-arc
 * of the whole arc.
 */
function pickBeat(
  idxInSubArc: number,
  subArcLen: number,
  isClimaxSubArc: boolean,
  pattern: NarrativePattern,
): BeatType {
  const isFirst = idxInSubArc === 0;
  const isLast = idxInSubArc === subArcLen - 1;

  switch (pattern) {
    case 'cluster-dopamine': {
      if (isFirst) return 'setup';
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      const cycle: BeatType[] = ['breathing', 'confront', 'big_wow', 'breathing', 'confront'];
      return cycle[(idxInSubArc - 1) % cycle.length];
    }

    case 'linear-grind': {
      // Slow-burn: mostly breathing + occasional confront. BIG WOW only
      // at climax sub-arc final chapter.
      if (isFirst) return 'setup';
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      // Inside: breathing dominant, every 3rd is confront
      const interior = idxInSubArc - 1;
      return interior % 3 === 0 ? 'confront' : 'breathing';
    }

    case 'time-skip-macro': {
      // Macro time-skip: setup heavy, harvest at close. Each sub-arc =
      // 1 generation/era. Few but powerful big_wow events.
      if (isFirst) return 'setup';
      if (isLast) return 'big_wow'; // every sub-arc closes with milestone
      // Middle: alternate breathing (time-skip) + confront (event)
      return idxInSubArc % 2 === 0 ? 'confront' : 'breathing';
    }

    case 'villain-shadow': {
      // Dark, no warm baseline. Confront-heavy with dark big_wow.
      if (isFirst) return 'confront'; // start with action, no setup warmth
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      const cycle: BeatType[] = ['confront', 'breathing', 'big_wow', 'confront', 'breathing'];
      return cycle[(idxInSubArc - 1) % cycle.length];
    }

    case 'domain-shop': {
      // MC ngồi 1 chỗ, customers come. Breathing-heavy, customer = confront.
      if (isFirst) return 'setup';
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      // Middle: breathing dominant (MC working in shop), customer arrival = confront
      const interior = idxInSubArc - 1;
      if (interior % 4 === 2) return 'big_wow'; // VIP customer / event
      if (interior % 4 === 0 || interior % 4 === 1) return 'breathing';
      return 'confront';
    }

    case 'phó-bản': {
      // 1 sub-arc = 1 phó bản. Setup → escalation → boss → resolution.
      // First chapter: setup phó bản. Last chapter: clear phó bản.
      if (isFirst) return 'setup';
      if (isLast) return 'big_wow'; // phó bản boss
      // Middle: gradually escalate
      const interior = idxInSubArc - 1;
      const innerLen = subArcLen - 2;
      const ratio = interior / Math.max(1, innerLen - 1);
      if (ratio < 0.3) return 'breathing';
      if (ratio < 0.7) return 'confront';
      return 'big_wow';
    }

    case 'decade-jumps': {
      // Sub-arc = 1 decade or industry phase. Opens with opportunity,
      // milestone at close. Cluster-like middle.
      if (isFirst) return 'setup'; // opportunity recognition
      if (isLast) return 'big_wow'; // milestone (IPO / acquisition / launch)
      const cycle: BeatType[] = ['breathing', 'confront', 'breathing', 'confront', 'big_wow'];
      return cycle[(idxInSubArc - 1) % cycle.length];
    }

    case 'simulator-loop': {
      // Each cluster = 1 sim cycle: setup → sim breathing → reveal confront →
      // real-execute big_wow → result resolution.
      if (isFirst) return 'setup';
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      const cycle: BeatType[] = ['breathing', 'confront', 'big_wow', 'resolution', 'setup'];
      return cycle[(idxInSubArc - 1) % cycle.length];
    }

    default:
      // Fallback to cluster-dopamine
      if (isFirst) return 'setup';
      if (isLast) return isClimaxSubArc ? 'big_wow' : 'resolution';
      return 'breathing';
  }
}

const PATTERN_FLAVOR: Record<NarrativePattern, { bigWow: string; confront: string; breathing: string }> = {
  'cluster-dopamine': {
    bigWow: 'milestone visible / mass face-slap / breakthrough',
    confront: 'đối thủ trực diện / negotiation tense',
    breathing: 'tu luyện / build / R&D / tâm cảnh',
  },
  'linear-grind': {
    bigWow: 'realm breakthrough / decade milestone',
    confront: 'small obstacle / minor antagonist',
    breathing: 'tu luyện linear / nghiên cứu / tích lũy',
  },
  'time-skip-macro': {
    bigWow: 'thế hệ milestone / pháp bảo hoàn thành / đệ tử tiến hoá',
    confront: 'sự kiện thiên niên kỷ / disturbance lớn',
    breathing: 'time-skip / quan sát / harvest cycle',
  },
  'villain-shadow': {
    bigWow: 'cướp đoạt power / giết major rival / dark ascension',
    confront: 'thanh trừ / đoạt resource / negotiate dark',
    breathing: 'plan dark scheme / hidden study / tâm độc',
  },
  'domain-shop': {
    bigWow: 'VIP customer / cosmic visitor / location upgrade',
    confront: 'customer khó tính / kẻ đến gây sự',
    breathing: 'làm việc tại shop / talk với regulars / craft',
  },
  'phó-bản': {
    bigWow: 'phó bản boss kill / quy tắc reveal / instance clear',
    confront: 'rule violation / monster encounter / puzzle',
    breathing: 'investigate clues / build team / rest area',
  },
  'decade-jumps': {
    bigWow: 'IPO / acquisition / market dominance / decade milestone',
    confront: 'business war / lawsuit / negotiation',
    breathing: 'build product / hire team / strategic planning',
  },
  'simulator-loop': {
    bigWow: 'real-execute perfected strategy / outcome confirmed',
    confront: 'sim reveal danger / pivot strategy',
    breathing: 'simulate scenario / observe data / refine plan',
  },
};

function buildSubArcBriefs(
  subArc: SubArc,
  arcNumber: number,
  isClimaxSubArc: boolean,
  config: TemplateBriefConfig,
): ChapterBrief[] {
  const pattern = config.pattern || 'cluster-dopamine';
  const [start, end] = subArc.range;
  const len = end - start + 1;
  const briefs: ChapterBrief[] = [];

  const cast = config.castForArc(arcNumber);
  const location = config.locationForArc(arcNumber);
  const threadsAdvance = config.threadsForArc(arcNumber);

  const flavor = PATTERN_FLAVOR[pattern];
  const bigWowFlavor = config.bigWowFlavor || flavor.bigWow;
  const confrontFlavor = config.confrontFlavor || flavor.confront;
  const breathingFlavor = config.breathingFlavor || flavor.breathing;

  for (let i = 0; i < len; i++) {
    const n = start + i;
    const beat = pickBeat(i, len, isClimaxSubArc, pattern);
    const isOpener = i === 0;
    const isCloser = i === len - 1;
    const isBigWow = beat === 'big_wow';
    const isConfront = beat === 'confront';
    const isResolution = beat === 'resolution';

    const goal = isOpener
      ? `Mở sub-arc ${subArc.number}: ${subArc.theme}. Setup mục tiêu cụ thể trong cụm 5-chương.`
      : isCloser
        ? `Đóng sub-arc: ${subArc.payoff}.`
        : isBigWow
          ? `BIG WOW: ${bigWowFlavor} — ${subArc.theme}.`
          : isConfront
            ? `CONFRONT: ${confrontFlavor} — ${subArc.theme}.`
            : isResolution
              ? `RESOLUTION: ổn định và chuẩn bị cho sub-arc tiếp — ${subArc.theme}.`
              : `BREATHING: ${breathingFlavor} — ${subArc.theme}.`;

    const payoff = isCloser
      ? subArc.payoff
      : isBigWow
        ? `Mass witness ${bigWowFlavor}, danh tiếng tăng, tài nguyên cấp cao`
        : isConfront
          ? `Manh mối kẻ địch / chiến lợi nhỏ / thông tin (${confrontFlavor})`
          : isResolution
            ? 'Ổn định + setup sub-arc tiếp'
            : `Tài nguyên tích lũy / progress visible (${breathingFlavor})`;

    const scenes = [
      `Beat ${beat} (pattern: ${pattern}): ${subArc.theme.split(/[—.,]/)[0].slice(0, 80)}`,
      `Cast: ${cast.join(', ')}`,
      `Location: ${location}`,
      isBigWow
        ? `BIG WOW: ${bigWowFlavor} — mass witness`
        : isConfront
          ? `Confront: ${confrontFlavor}, MC kiểm soát nhịp`
          : isOpener
            ? 'Opener: setup goal cụ thể + first dopamine peak ≤50% chương'
            : isCloser
              ? `Closer: ${subArc.payoff}`
              : isResolution
                ? 'Resolution: ổn định, setup sub-arc tiếp'
                : `Breathing: ${breathingFlavor}`,
      config.toneDirective,
    ];

    const mcBenefit = isCloser
      ? `${subArc.payoff} — tài nguyên + uy tín cụ thể`
      : isBigWow
        ? 'Uy tín mass + tài nguyên cấp cao + manh mối'
        : isConfront
          ? 'Manh mối kẻ địch + thông tin chiến lược'
          : isResolution
            ? 'Ổn định tâm cảnh + chuẩn bị sub-arc tiếp'
            : 'Tài nguyên tích lũy + progress';

    const risks = [config.toneDirective, ...config.bansAlways];
    if (config.bansForArc) risks.push(...config.bansForArc(arcNumber));
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

export function buildTemplateBriefs(
  arcSkeleton: ArcSkeleton[],
  config: TemplateBriefConfig,
): ChapterBrief[][] {
  return arcSkeleton.map((arc) => {
    const lastSubArc = arc.subArcs[arc.subArcs.length - 1];
    const briefs: ChapterBrief[] = [];
    for (const subArc of arc.subArcs) {
      const isClimax = subArc === lastSubArc;
      briefs.push(...buildSubArcBriefs(subArc, arc.arcNumber, isClimax, config));
    }
    return briefs;
  });
}
