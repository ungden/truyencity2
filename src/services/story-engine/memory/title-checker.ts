/**
 * Story Engine v2 — Title Checker
 *
 * Ported from v1 title-checker.ts
 * Checks title similarity against previous titles.
 */

export interface SimilarTitleResult {
  mostSimilar: string | null;
  similarity: number;
}

export const titleChecker = {
  /**
   * Find the most similar title from a list
   */
  findMostSimilar(title: string, previousTitles: string[]): SimilarTitleResult {
    let mostSimilar: string | null = null;
    let maxSimilarity = 0;

    const titleWords = new Set(title.toLowerCase().split(/\s+/));

    for (const prev of previousTitles) {
      const prevWords = new Set(prev.toLowerCase().split(/\s+/));
      const intersection = new Set([...titleWords].filter(x => prevWords.has(x)));
      const union = new Set([...titleWords, ...prevWords]);
      const similarity = intersection.size / union.size;

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilar = prev;
      }
    }

    return { mostSimilar, similarity: maxSimilarity };
  },
};
