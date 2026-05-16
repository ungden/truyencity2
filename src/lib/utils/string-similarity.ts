/**
 * Lightweight string similarity utilities for plot-thread dedup.
 *
 * No external deps. Implements Jaro-Winkler (good for short names with shared
 * prefixes — "Vương Khải đòi nợ" vs "Vương Khải truy sát" → 0.78ish) and a
 * shared-token check for tie-breaking.
 *
 * NOTE: not for security/identity matching. Tuned for Vietnamese phrases
 * 5-60 chars. Threshold 0.75 is the proven semantic-dup cutoff for our novels.
 */

/**
 * Jaro distance — fraction of matching chars + transpositions.
 * Returns 0..1 (1 = identical, 0 = nothing in common).
 */
export function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3;
}

/**
 * Jaro-Winkler — Jaro boosted for shared prefix (up to 4 chars).
 * Standard prefix scaling factor 0.1.
 */
export function jaroWinkler(s1: string, s2: string): number {
  const j = jaro(s1, s2);
  if (j < 0.7) return j; // standard guard — no prefix bonus for low base similarity

  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return j + prefix * 0.1 * (1 - j);
}

/**
 * Normalize a name for comparison: lowercase, strip diacritics, collapse whitespace.
 */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convenience: similarity between two names with normalization.
 */
export function nameSimilarity(a: string, b: string): number {
  return jaroWinkler(normalizeName(a), normalizeName(b));
}

/**
 * Token-based shared-word ratio — how many words appear in both. Useful
 * tie-breaker when Jaro-Winkler is borderline.
 *
 * Returns 0..1 (1 = all words shared after normalize, 0 = no shared words).
 */
export function sharedTokenRatio(a: string, b: string): number {
  const tokensA = new Set(normalizeName(a).split(' ').filter(t => t.length >= 2));
  const tokensB = new Set(normalizeName(b).split(' ').filter(t => t.length >= 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let shared = 0;
  for (const t of tokensA) if (tokensB.has(t)) shared++;
  return shared / Math.min(tokensA.size, tokensB.size);
}
