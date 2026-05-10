/**
 * Shared programmatic brief builder for all genre master templates.
 *
 * Each template provides a TemplateConfig with arc-specific cast/location/
 * threads resolvers. Builder walks every sub-arc, assigns 5-cluster beats
 * (setup → breathing/confront/big_wow rotation → resolution / climax-big_wow),
 * and emits one ChapterBrief per chapter.
 *
 * Why shared: 13 templates × ~120 lines of brief boilerplate = 1500 lines
 * of duplication. With this helper, each template only declares ~40 lines
 * of arc-specific resolvers + tone/ban arrays.
 */

import type { ChapterBrief, BeatType, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export interface TemplateBriefConfig {
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
  config: TemplateBriefConfig,
): ChapterBrief[] {
  const [start, end] = subArc.range;
  const len = end - start + 1;
  const briefs: ChapterBrief[] = [];

  const cast = config.castForArc(arcNumber);
  const location = config.locationForArc(arcNumber);
  const threadsAdvance = config.threadsForArc(arcNumber);

  const bigWowFlavor = config.bigWowFlavor || 'milestone visible / mass face-slap / breakthrough';
  const confrontFlavor = config.confrontFlavor || 'đối thủ trực diện / negotiation tense';
  const breathingFlavor = config.breathingFlavor || 'tu luyện / build / R&D / tâm cảnh';

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
          ? `BIG WOW: ${bigWowFlavor} — ${subArc.theme}.`
          : isConfront
            ? `CONFRONT: ${confrontFlavor} — ${subArc.theme}.`
            : `BREATHING: ${breathingFlavor} — ${subArc.theme}.`;

    const payoff = isCloser
      ? subArc.payoff
      : isBigWow
        ? `Mass witness ${bigWowFlavor}, danh tiếng tăng, tài nguyên cấp cao`
        : isConfront
          ? 'Manh mối kẻ địch / chiến lợi nhỏ / thông tin'
          : 'Tài nguyên tích lũy / tâm cảnh ổn / progress visible';

    const scenes = [
      `Beat ${beat}: ${subArc.theme.split(/[—.,]/)[0].slice(0, 80)}`,
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
              : `Breathing: ${breathingFlavor}`,
      config.toneDirective,
    ];

    const mcBenefit = isCloser
      ? `${subArc.payoff} — tài nguyên + uy tín cụ thể`
      : isBigWow
        ? 'Uy tín mass + tài nguyên cấp cao + manh mối'
        : isConfront
          ? 'Manh mối kẻ địch + thông tin chiến lược'
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
