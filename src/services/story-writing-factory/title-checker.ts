/**
 * Title Checker - Kiểm tra chất lượng và đa dạng tên chương
 *
 * Detects:
 * - Anti-patterns ("X Và Sự Y", "Nghịch Lý Của X", etc.)
 * - Keyword repetition across consecutive chapters
 * - Pattern monotony (same template used too often)
 * - Title length issues
 */

import { CHAPTER_TITLE_RULES, TITLE_TEMPLATES } from './templates';

// ============================================================================
// TYPES
// ============================================================================

export interface TitleCheckResult {
  isValid: boolean;
  score: number;          // 0-10
  issues: TitleIssue[];
  suggestions: string[];
}

export interface TitleOptimizeResult {
  original: string;
  optimized: string;
  originalScore: number;
  optimizedScore: number;
  changed: boolean;
}

export interface TitleIssue {
  type: 'anti_pattern' | 'repetition' | 'too_long' | 'too_short' | 'monotony';
  description: string;
  severity: 'minor' | 'moderate' | 'major';
}

// ============================================================================
// ANTI-PATTERN REGEXES
// ============================================================================

const ANTI_PATTERN_REGEXES = [
  { regex: /^.+\s+Và\s+Sự\s+.+$/i, name: 'X Và Sự Y', severity: 'major' as const },
  { regex: /^Nghịch\s+Lý\s+Của\s+.+$/i, name: 'Nghịch Lý Của X', severity: 'major' as const },
  { regex: /^Quy\s+Luật\s+Của\s+.+$/i, name: 'Quy Luật Của X', severity: 'major' as const },
  { regex: /^Định\s+Luật\s+Của\s+.+$/i, name: 'Định Luật Của X', severity: 'major' as const },
  { regex: /^Sự\s+Trỗi\s+Dậy\s+/i, name: 'Sự Trỗi Dậy...', severity: 'moderate' as const },
  { regex: /^Sự\s+Kinh\s+Ngạc\s+/i, name: 'Sự Kinh Ngạc...', severity: 'moderate' as const },
  { regex: /^Sự\s+Sỉ\s+Nhục\s+/i, name: 'Sự Sỉ Nhục...', severity: 'moderate' as const },
  { regex: /^Sự\s+\S+\s+Của\s+.+$/i, name: 'Sự X Của Y', severity: 'moderate' as const },
  { regex: /^.+\s+Và\s+.+\s+Của\s+.+$/i, name: 'X Và Y Của Z', severity: 'moderate' as const },
];

// Negative/repetitive keywords that signal lazy AI titles
const OVERUSED_KEYWORDS = [
  'phế vật', 'sỉ nhục', 'phế thải', 'phế phẩm',
  'khinh miệt', 'khinh thường',
];

// Banned title strings — most-repeated offenders from production data analysis
const BANNED_TITLES = new Set([
  'kẻ săn mồi hay con mồi?',
  'ai cho ngươi tư cách?',
  'ngươi không xứng!',
  'bóng tối sau cổng thành',
  'kẻ đứng sau tất cả',
  'sự thật đằng sau',
  'cơn bão sắp đến',
  'ai mới là kẻ thù?',
  'bí mật được hé lộ',
  'giờ phản công',
  'nước cờ cuối cùng',
  'kẻ phản bội',
  'trận chiến cuối cùng',
  'ai là kẻ phản bội?',
  'lửa cháy trong tim',
]);

// Vietnamese stop words to ignore in comparison
const STOP_WORDS = new Set([
  'của', 'và', 'là', 'một', 'với', 'cho', 'trong', 'về', 'từ',
  'đến', 'tại', 'đã', 'sẽ', 'đang', 'được', 'hay', 'hoặc',
  'các', 'những', 'này', 'đó', 'khi', 'nếu', 'thì', 'mà',
  'sự', 'quy', 'luật', 'nghịch', 'lý', 'định',
]);

// ============================================================================
// TITLE CHECKER CLASS
// ============================================================================

export class TitleChecker {
  /**
   * Compute Jaccard similarity between two sets of words (0-1)
   */
  private jaccardSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Compute containment similarity — what fraction of the shorter title's
   * words appear in the longer one. Catches "Kẻ Săn Mồi" ⊂ "Kẻ Săn Mồi Trong Bóng Tối"
   */
  private containmentSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    const longerSet = new Set(longer);
    const contained = shorter.filter(w => longerSet.has(w)).length;
    return contained / shorter.length;
  }

  /**
   * Fuzzy similarity combining Jaccard + containment.
   * Returns 0-1 where 1 = identical.
   */
  private fuzzySimilarity(titleA: string, titleB: string): number {
    const wordsA = this.extractMeaningfulWords(titleA);
    const wordsB = this.extractMeaningfulWords(titleB);

    // Exact match (case-insensitive)
    if (titleA.toLowerCase().trim() === titleB.toLowerCase().trim()) return 1.0;

    const jaccard = this.jaccardSimilarity(wordsA, wordsB);
    const containment = this.containmentSimilarity(wordsA, wordsB);

    // Weighted blend: containment matters more (catches subsets)
    return jaccard * 0.4 + containment * 0.6;
  }

  /**
   * Check if title is too similar to ANY previous title.
   * Returns the highest similarity score and the matching title.
   */
  findMostSimilar(title: string, previousTitles: string[]): { similarity: number; matchedTitle: string } {
    let maxSim = 0;
    let matchedTitle = '';
    for (const prev of previousTitles) {
      const sim = this.fuzzySimilarity(title, prev);
      if (sim > maxSim) {
        maxSim = sim;
        matchedTitle = prev;
      }
    }
    return { similarity: maxSim, matchedTitle };
  }

  /**
   * Check a single title against all rules
   */
  checkTitle(title: string, previousTitles: string[] = []): TitleCheckResult {
    const issues: TitleIssue[] = [];
    const suggestions: string[] = [];
    let score = 10;

    if (!title || title.trim().length === 0) {
      return {
        isValid: false,
        score: 0,
        issues: [{ type: 'too_short', description: 'Tên chương trống', severity: 'major' }],
        suggestions: ['Cần có tên chương'],
      };
    }

    const trimmed = title.trim();

    // 0. Banned title check (exact match, case-insensitive)
    if (BANNED_TITLES.has(trimmed.toLowerCase())) {
      issues.push({
        type: 'repetition',
        description: `"${trimmed}" nằm trong danh sách tên chương bị cấm (quá phổ biến)`,
        severity: 'major',
      });
      score -= 5;
    }

    // 1. Length check
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 12) {
      issues.push({
        type: 'too_long',
        description: `Quá dài (${wordCount} từ), nên 3-10 từ`,
        severity: 'moderate',
      });
      score -= 2;
    }
    if (wordCount < 2) {
      issues.push({
        type: 'too_short',
        description: `Quá ngắn (${wordCount} từ), nên 3-10 từ`,
        severity: 'moderate',
      });
      score -= 2;
    }

    // 2. Anti-pattern check
    for (const ap of ANTI_PATTERN_REGEXES) {
      if (ap.regex.test(trimmed)) {
        issues.push({
          type: 'anti_pattern',
          description: `Dùng mẫu bị cấm: "${ap.name}"`,
          severity: ap.severity,
        });
        score -= ap.severity === 'major' ? 4 : 2;
      }
    }

    // 3. Overused negative keywords check
    const titleLower = trimmed.toLowerCase();
    for (const kw of OVERUSED_KEYWORDS) {
      if (titleLower.includes(kw)) {
        // Check how many previous titles also contain this keyword
        const prevCount = previousTitles.filter(
          t => t.toLowerCase().includes(kw)
        ).length;
        if (prevCount >= 2) {
          issues.push({
            type: 'repetition',
            description: `Keyword "${kw}" đã dùng ${prevCount} lần trong các chương trước`,
            severity: 'major',
          });
          score -= 3;
        } else if (prevCount >= 1) {
          issues.push({
            type: 'repetition',
            description: `Keyword "${kw}" đã dùng gần đây, nên đổi`,
            severity: 'minor',
          });
          score -= 1;
        }
      }
    }

    // 4. Fuzzy similarity check against ALL previous titles (not just recent 5)
    if (previousTitles.length > 0) {
      const { similarity, matchedTitle } = this.findMostSimilar(trimmed, previousTitles);

      if (similarity >= 0.9) {
        // Near-duplicate or exact duplicate
        issues.push({
          type: 'repetition',
          description: `Gần trùng lặp (${Math.round(similarity * 100)}%) với "${matchedTitle}"`,
          severity: 'major',
        });
        score -= 5;
      } else if (similarity >= 0.7) {
        // Too similar
        issues.push({
          type: 'repetition',
          description: `Quá giống (${Math.round(similarity * 100)}%) với "${matchedTitle}"`,
          severity: 'major',
        });
        score -= 3;
      } else if (similarity >= 0.5) {
        // Somewhat similar — warn
        issues.push({
          type: 'repetition',
          description: `Tương tự (${Math.round(similarity * 100)}%) với "${matchedTitle}"`,
          severity: 'moderate',
        });
        score -= 1;
      }

      // Also check keyword overlap with recent 10 titles (tighter window)
      const titleWords = this.extractMeaningfulWords(trimmed);
      const recentTitles = previousTitles.slice(-10);

      for (let i = 0; i < recentTitles.length; i++) {
        const prevWords = this.extractMeaningfulWords(recentTitles[i]);
        const overlap = titleWords.filter(w => prevWords.includes(w));

        if (overlap.length >= 2) {
          const distance = recentTitles.length - i;
          const severity = distance <= 3 ? 'major' as const : 'moderate' as const;
          issues.push({
            type: 'repetition',
            description: `Lặp keyword [${overlap.join(', ')}] với chương cách ${distance} chương`,
            severity,
          });
          score -= severity === 'major' ? 3 : 1;
          break;
        }
      }
    }

    // 5. Pattern monotony check (last 10 titles)
    if (previousTitles.length >= 3) {
      const recent10 = previousTitles.slice(-10);
      const currentPattern = this.detectPattern(trimmed);
      const samePatternCount = recent10.filter(
        t => this.detectPattern(t) === currentPattern
      ).length;

      if (samePatternCount >= CHAPTER_TITLE_RULES.diversityRules.maxSamePatternPer20 / 2) {
        issues.push({
          type: 'monotony',
          description: `Mẫu "${currentPattern}" đã dùng ${samePatternCount} lần trong 10 chương gần đây`,
          severity: 'moderate',
        });
        score -= 2;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(10, score));

    // Generate suggestions if score is low
    if (score < 7) {
      const randomTemplates = [...TITLE_TEMPLATES]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      for (const tmpl of randomTemplates) {
        suggestions.push(`Thử mẫu "${tmpl.name}": VD ${tmpl.examples[0]}`);
      }
    }

    return {
      isValid: score >= 5,
      score,
      issues,
      suggestions,
    };
  }

  /**
   * Optimize title quality with soft reranking.
   * Does not force fixed patterns; only improves when a better option exists.
   */
  optimizeTitle(
    title: string,
    previousTitles: string[] = [],
    options?: { contentHint?: string; chapterNumber?: number }
  ): TitleOptimizeResult {
    const original = (title || '').trim();
    const originalCheck = this.checkTitle(original, previousTitles);

    const candidates = new Set<string>();
    if (original) candidates.add(this.normalizeCandidate(original));

    // Candidate 1: remove weak prefixes/suffixes and tighten wording
    const tightened = this.tightenTitle(original);
    if (tightened) candidates.add(tightened);

    // Candidate 2+: build from content keywords if available
    const contentKeywords = this.extractContentKeywords(options?.contentHint || '');
    if (contentKeywords.length >= 2) {
      const [k1, k2, k3] = contentKeywords;
      candidates.add(this.normalizeCandidate(`${k1} ${k2}`));
      candidates.add(this.normalizeCandidate(`${k1}: ${k2}`));
      candidates.add(this.normalizeCandidate(`${k1} Và ${k2}`));
      if (k3) candidates.add(this.normalizeCandidate(`${k1} ${k3}`));
      candidates.add(this.normalizeCandidate(`Nước Cờ ${k1}`));
      candidates.add(this.normalizeCandidate(`Giờ Phản Công`));
      candidates.add(this.normalizeCandidate(`Ai Dám ${k1}?`));
    }

    // Candidate from template examples (softly adapted)
    const sampledTemplates = TITLE_TEMPLATES.slice(0, 6);
    for (const tmpl of sampledTemplates) {
      const ex = tmpl.examples[0];
      if (ex) candidates.add(this.normalizeCandidate(ex));
    }

    // Score all candidates using quality + novelty blend
    // ALSO hard-reject any candidate with >70% fuzzy similarity to previous titles
    let bestTitle = original || `Chương ${options?.chapterNumber || ''}`.trim();
    let bestScore = this.blendedScore(bestTitle, previousTitles);

    for (const candidate of candidates) {
      if (!candidate || candidate.length < 2) continue;

      // Hard rejection: skip candidates too similar to any previous title
      const { similarity } = this.findMostSimilar(candidate, previousTitles);
      if (similarity >= 0.7) continue;

      // Skip banned titles
      if (BANNED_TITLES.has(candidate.toLowerCase())) continue;

      const score = this.blendedScore(candidate, previousTitles);
      if (score > bestScore) {
        bestScore = score;
        bestTitle = candidate;
      }
    }

    // Final safety check: if best title is still too similar, flag it
    const { similarity: finalSim } = this.findMostSimilar(bestTitle, previousTitles);
    const optimizedCheck = this.checkTitle(bestTitle, previousTitles);
    const shouldChange =
      bestTitle !== original &&
      (optimizedCheck.score >= originalCheck.score + 1 || originalCheck.score < 6);

    // If the result is still a near-duplicate (>90%), fall back to chapter number title
    const finalTitle = finalSim >= 0.9 && previousTitles.length > 0
      ? `Chương ${options?.chapterNumber || ''}: ${this.extractContentKeywords(options?.contentHint || '').slice(0, 2).join(' ')}`.trim()
      : (shouldChange ? bestTitle : original);

    return {
      original,
      optimized: finalTitle,
      originalScore: originalCheck.score,
      optimizedScore: shouldChange ? optimizedCheck.score : originalCheck.score,
      changed: finalTitle !== original,
    };
  }

  /**
   * Batch check: analyze diversity across a list of titles
   */
  checkTitleDiversity(titles: string[]): {
    diversityScore: number;
    issues: string[];
    patternDistribution: Record<string, number>;
  } {
    const issues: string[] = [];
    const patternCounts: Record<string, number> = {};

    for (const title of titles) {
      const pattern = this.detectPattern(title);
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }

    // Check unique patterns
    const uniquePatterns = Object.keys(patternCounts).length;
    const { minUniquePatterns } = CHAPTER_TITLE_RULES.diversityRules;

    if (titles.length >= 20 && uniquePatterns < minUniquePatterns) {
      issues.push(
        `Chỉ có ${uniquePatterns} mẫu khác nhau trong ${titles.length} chương (cần ít nhất ${minUniquePatterns})`
      );
    }

    // Check dominant pattern
    const maxCount = Math.max(...Object.values(patternCounts));
    const dominantPattern = Object.entries(patternCounts).find(([, c]) => c === maxCount)?.[0];
    if (maxCount > titles.length * 0.4) {
      issues.push(
        `Mẫu "${dominantPattern}" chiếm ${Math.round((maxCount / titles.length) * 100)}% - quá lặp`
      );
    }

    // Check consecutive same-pattern
    for (let i = 1; i < titles.length; i++) {
      const prevPattern = this.detectPattern(titles[i - 1]);
      const currPattern = this.detectPattern(titles[i]);
      if (prevPattern === currPattern && prevPattern !== 'other') {
        if (i + 1 < titles.length && this.detectPattern(titles[i + 1]) === currPattern) {
          issues.push(
            `3 chương liên tiếp (${i - 1}-${i + 1}) dùng cùng mẫu "${currPattern}"`
          );
        }
      }
    }

    // Anti-pattern scan
    for (let i = 0; i < titles.length; i++) {
      for (const ap of ANTI_PATTERN_REGEXES) {
        if (ap.regex.test(titles[i])) {
          issues.push(`Chương ${i + 1} "${titles[i]}" dùng mẫu cấm "${ap.name}"`);
        }
      }
    }

    // Score: 10 = perfect diversity
    let diversityScore = 10;
    diversityScore -= Math.max(0, (minUniquePatterns - uniquePatterns) * 1.5);
    diversityScore -= issues.length * 0.5;
    diversityScore = Math.max(0, Math.min(10, diversityScore));

    return {
      diversityScore: Math.round(diversityScore * 10) / 10,
      issues,
      patternDistribution: patternCounts,
    };
  }

  /**
   * Suggest title templates based on chapter type
   */
  suggestTemplates(chapterType: string): string[] {
    const mapping = CHAPTER_TITLE_RULES.chapterTypeTitleGuide;
    const templateIds = mapping[chapterType as keyof typeof mapping] || [
      'action_location', 'declaration', 'mystery_question',
    ];
    return templateIds.map(id => {
      const tmpl = TITLE_TEMPLATES.find(t => t.id === id);
      return tmpl ? `${tmpl.name}: ${tmpl.examples.join(', ')}` : id;
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Extract meaningful words from a title (remove stop words)
   */
  private extractMeaningfulWords(title: string): string[] {
    return title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  private normalizeCandidate(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, '')
      .trim();
  }

  private tightenTitle(title: string): string {
    const cleaned = this.normalizeCandidate(title);
    if (!cleaned) return cleaned;

    let next = cleaned
      .replace(/^Chương\s*\d+\s*[:\-–—]\s*/i, '')
      .replace(/^Sự\s+/i, '')
      .replace(/^Một\s+/i, '')
      .replace(/\s+Trong\s+\w+\s+Khắc$/i, '')
      .trim();

    const words = next.split(/\s+/);
    if (words.length > 8) {
      next = words.slice(0, 8).join(' ');
    }
    return this.normalizeCandidate(next);
  }

  private extractContentKeywords(content: string): string[] {
    if (!content) return [];
    const text = content
      .replace(/\n/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .toLowerCase();

    const blacklist = new Set([
      ...STOP_WORDS,
      'chương', 'hắn', 'nàng', 'bọn', 'người', 'trong', 'ngoài', 'không', 'đây', 'kia',
      'ánh', 'không', 'khí', 'tiếng', 'đột', 'nhiên', 'lập', 'tức',
    ]);

    const freq = new Map<string, number>();
    for (const token of text.split(/\s+/)) {
      const w = token.trim();
      if (w.length < 3 || blacklist.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([w]) => this.capitalizeWord(w));
  }

  private capitalizeWord(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  private blendedScore(title: string, previousTitles: string[]): number {
    const check = this.checkTitle(title, previousTitles);
    const noveltyPenalty = this.computeNoveltyPenalty(title, previousTitles);
    return check.score - noveltyPenalty;
  }

  private computeNoveltyPenalty(title: string, previousTitles: string[]): number {
    if (!previousTitles.length) return 0;
    const words = this.extractMeaningfulWords(title);
    if (!words.length) return 0;

    // Check against ALL previous titles for fuzzy similarity
    const { similarity } = this.findMostSimilar(title, previousTitles);
    if (similarity >= 0.9) return 5; // Near duplicate — massive penalty
    if (similarity >= 0.7) return 3; // Too similar — strong penalty

    // Also check keyword overlap with recent 15 titles
    const recent = previousTitles.slice(-15);
    let maxOverlap = 0;
    for (const t of recent) {
      const prev = this.extractMeaningfulWords(t);
      const overlap = words.filter(w => prev.includes(w)).length;
      if (overlap > maxOverlap) maxOverlap = overlap;
    }

    if (maxOverlap >= 3) return 2;
    if (maxOverlap === 2) return 1;
    return 0;
  }

  /**
   * Detect which title pattern/template a title uses
   */
  private detectPattern(title: string): string {
    const t = title.trim();

    // Check anti-patterns first
    if (/^.+\s+Và\s+Sự\s+.+$/i.test(t)) return 'x_va_su_y';
    if (/^Sự\s+\S+\s+Của\s+.+$/i.test(t)) return 'su_x_cua_y';
    if (/^(Nghịch Lý|Quy Luật|Định Luật)\s+Của\s+/i.test(t)) return 'rule_of_x';

    // Check positive patterns
    if (/[?？]$/.test(t)) return 'question';
    if (/[!！]$/.test(t)) return 'exclamation';
    if (/^".*"$/.test(t) || /^[""「『]/.test(t)) return 'quote';

    // Action + location
    if (/^(Huyết Chiến|Đại Chiến|Quyết Đấu|Đại Náo|Kịch Chiến|Tử Chiến)/i.test(t)) return 'action_location';

    // Power moment
    if (/(Đột Phá|Thành Tựu|Diệt Thế|Phá Vạn|Giáng Lâm|Thiên Lôi|Kiếm Ý)/i.test(t)) return 'power_moment';

    // Character focus (contains a proper name-like pattern at start)
    if (/^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(t)) {
      // Check if it's followed by an action verb
      if (/(Trở Về|Giáng Lâm|Xuất Hiện|Ra Tay)/i.test(t)) return 'character_focus';
    }

    // Foreshadowing (atmospheric, imagery)
    if (/(Bóng Tối|Cơn Bão|Hoàng Hôn|Bình Minh|Sương Mù|Mưa Máu|Lửa Cháy)/i.test(t)) return 'foreshadowing';

    // Countdown/urgency
    if (/(Ngày|Giờ|Phút|Trước Khi|Đếm Ngược|Thời Hạn|Cuối Cùng)/i.test(t)) return 'countdown';

    // Ironic contrast
    if (/\?.*!|!.*\?/.test(t) || /[.]\s*[A-Z]/.test(t)) return 'ironic_contrast';

    return 'other';
  }
}

export const titleChecker = new TitleChecker();
