/**
 * Story Engine — Length Metrics utility (Phase R+1, 2026-05-15).
 *
 * Pure functions to measure chapter length and decide whether to normalize.
 * Inspired by InkOS utils/length-metrics.ts (concept only — re-implemented
 * for Vietnamese whitespace-segmented words).
 *
 * Vietnamese counts words (whitespace-tokenized), not characters as in
 * Chinese InkOS. Word count is what the user perceives as chapter length.
 */

export type LengthCountingMode = 'words' | 'chars';

export type LengthNormalizeMode = 'compress' | 'expand' | 'none';

export interface LengthSpec {
  /** Target chapter length in `countingMode` units. */
  readonly target: number;
  /** Soft range — no normalization fires inside this band. */
  readonly softMin: number;
  readonly softMax: number;
  /** Hard range — normalization MUST fire outside this band. */
  readonly hardMin: number;
  readonly hardMax: number;
  readonly countingMode: LengthCountingMode;
  /** Explicit override; if 'none', chooseNormalizeMode() decides. */
  readonly normalizeMode?: LengthNormalizeMode;
}

/**
 * Build a default LengthSpec from a target word count.
 * Soft range ±15%, hard range ±40%.
 *
 * Examples:
 *   target=2800 → soft 2380-3220, hard 1680-3920
 */
export function defaultLengthSpec(targetWords: number): LengthSpec {
  return {
    target: targetWords,
    softMin: Math.floor(targetWords * 0.85),
    softMax: Math.ceil(targetWords * 1.15),
    hardMin: Math.floor(targetWords * 0.6),
    hardMax: Math.ceil(targetWords * 1.4),
    countingMode: 'words',
    normalizeMode: 'none',
  };
}

export function countChapterLength(
  content: string,
  mode: LengthCountingMode = 'words',
): number {
  if (!content) return 0;
  if (mode === 'chars') return content.length;
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function isOutsideSoftRange(count: number, spec: LengthSpec): boolean {
  return count < spec.softMin || count > spec.softMax;
}

export function isOutsideHardRange(count: number, spec: LengthSpec): boolean {
  return count < spec.hardMin || count > spec.hardMax;
}

/**
 * Decide which normalize mode to apply given current count + spec.
 * - count < softMin → expand
 * - count > softMax → compress
 * - inside soft band → none
 *
 * Returns 'none' to skip — orchestrator should not invoke the
 * length-normalizer agent at all in this case.
 */
export function chooseNormalizeMode(count: number, spec: LengthSpec): LengthNormalizeMode {
  if (count < spec.softMin) return 'expand';
  if (count > spec.softMax) return 'compress';
  return 'none';
}
