/**
 * Story Engine v2 — Title Checker
 *
 * Ported from v1 title-checker.ts
 * Checks title similarity and optimizes titles.
 */

export interface TitleCheckResult {
  optimized: string;
  confidence: number;
  reason: string;
}

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

  /**
   * Optimize a title to be more engaging
   */
  optimizeTitle(
    rawTitle: string,
    previousTitles: string[],
    context?: { chapterNumber?: number; contentHint?: string }
  ): TitleCheckResult {
    let optimized = rawTitle.trim();

    // Remove common prefixes
    optimized = optimized.replace(/^(Chapter|Chương)\s*\d*\s*[:\-–—]\s*/i, '');

    // Check similarity
    const { similarity } = this.findMostSimilar(optimized, previousTitles);

    if (similarity >= 0.7) {
      return {
        optimized,
        confidence: 0.3,
        reason: `Title too similar (${Math.round(similarity * 100)}%) to previous`,
      };
    }

    return {
      optimized,
      confidence: 0.8,
      reason: 'Title optimized successfully',
    };
  },
};
