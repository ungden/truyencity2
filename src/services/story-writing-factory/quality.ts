/**
 * Story Writing Factory - Quality Gate
 *
 * Tinh hoa từ: _legacy/story-factory/quality-gate.ts
 *
 * Chức năng:
 * - Phân tích composition (dialogue, description, action ratios)
 * - Đánh giá dopamine delivery
 * - Kiểm tra hook và cliffhanger
 * - Detect repetition
 * - Gating criteria (approve/revise/rewrite)
 */

import {
  QualityReport,
  QualityIssue,
  CompositionAnalysis,
  StyleBible,
  GenreType,
  DopaminePoint,
} from './types';
import { GENRE_STYLES } from './templates';
import { getQuickDialogueScore } from './dialogue-analyzer';
import { titleChecker } from './title-checker';

// ============================================================================
// QUALITY THRESHOLDS
// ============================================================================

const THRESHOLDS = {
  minWordCount: 2000,
  maxWordCount: 4000,
  minQualityScore: 7,
  minDialogueSegments: 3,
  minDopaminePoints: 1,
  maxRepetitionScore: 0.3,
};

// ============================================================================
// CONTENT ANALYZER
// ============================================================================

export class ContentAnalyzer {
  /**
   * Analyze composition ratios
   */
  analyzeComposition(content: string): CompositionAnalysis {
    const totalChars = Math.max(1, content.length);

    // Dialogue detection
    const dialogueBlocks = (content.match(/(["「『"'][\s\S]*?["」』"']|^[-–—]\s*.+$)/gm) || []).join('');
    const dialogueRatio = Math.round((dialogueBlocks.length / totalChars) * 100);

    // Inner thought detection
    const innerKeywords = ['nghĩ thầm', 'trong lòng', 'tự nhủ', 'suy nghĩ', 'cảm thấy'];
    const innerCount = innerKeywords.reduce((count, kw) =>
      count + (content.match(new RegExp(kw, 'gi')) || []).length, 0);
    const innerThoughtRatio = Math.min(25, Math.floor(innerCount * 5));

    // Action detection
    const actionKeywords = ['đánh', 'chém', 'đâm', 'bay', 'lao', 'xông', 'công kích', 'phóng', 'bắn'];
    const actionCount = actionKeywords.reduce((count, kw) =>
      count + (content.match(new RegExp(kw, 'gi')) || []).length, 0);
    const actionRatio = Math.min(30, Math.floor(actionCount * 3));

    // Description is the rest
    const descriptionRatio = Math.max(0, 100 - dialogueRatio - innerThoughtRatio - actionRatio);

    // Sentence variety
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;
    const variance = sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length
      : 0;
    const sentenceVariety = avgLength > 0 ? Math.min(1, Math.sqrt(variance) / avgLength) : 0;

    // Hook strength (first 150 words)
    const words = content.split(/\s+/).filter(w => w.trim());
    const firstPart = words.slice(0, 150).join(' ');
    const hookKeywords = ['bỗng', 'đột nhiên', 'không ngờ', 'chấn động', 'kinh hãi', '!'];
    const hookStrength = hookKeywords.reduce((sum, kw) =>
      sum + (firstPart.includes(kw) ? 1 : 0), 0) / hookKeywords.length;

    // Cliffhanger strength (last 150 words)
    const lastPart = words.slice(-150).join(' ');
    const cliffKeywords = ['...', 'sẽ', 'liệu', 'chưa kịp', 'đúng lúc này', '?', '!'];
    const cliffhangerStrength = cliffKeywords.reduce((sum, kw) =>
      sum + (lastPart.includes(kw) ? 1 : 0), 0) / cliffKeywords.length;

    return {
      dialogueRatio,
      descriptionRatio,
      innerThoughtRatio,
      actionRatio,
      sentenceVariety,
      hookStrength,
      cliffhangerStrength,
    };
  }

  /**
   * Detect dopamine points in content
   */
  detectDopaminePoints(content: string, chapterNumber: number): DopaminePoint[] {
    const points: DopaminePoint[] = [];
    const lowerContent = content.toLowerCase();

    // Face slap
    const faceSlap = ['đánh bại', 'tát', 'khinh thường', 'kinh ngạc', 'sốc', 'sửng sốt'];
    if (faceSlap.filter(kw => lowerContent.includes(kw)).length >= 2) {
      points.push({ type: 'face_slap', description: 'Face slap detected', intensity: 7, setup: '', payoff: '' });
    }

    // Breakthrough
    if (['đột phá', 'thăng cấp', 'lên cảnh giới'].some(kw => lowerContent.includes(kw))) {
      points.push({ type: 'breakthrough', description: 'Breakthrough detected', intensity: 8, setup: '', payoff: '' });
    }

    // Treasure
    if (['nhận được', 'thu hoạch', 'bảo vật', 'pháp bảo'].some(kw => lowerContent.includes(kw))) {
      points.push({ type: 'treasure_gain', description: 'Treasure gain detected', intensity: 6, setup: '', payoff: '' });
    }

    // Power reveal
    if (['lộ thực lực', 'kinh ngạc', 'chấn động'].some(kw => lowerContent.includes(kw))) {
      points.push({ type: 'power_reveal', description: 'Power reveal detected', intensity: 7, setup: '', payoff: '' });
    }

    return points;
  }

  /**
   * Calculate repetition score (lower = better)
   */
  calculateRepetition(content: string): number {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    const repeatedWords = Array.from(freq.values()).filter(c => c > 5).length;
    return Math.min(1, repeatedWords / 50);
  }

  /**
   * Count words
   */
  countWords(content: string): number {
    return content.trim().split(/\s+/).filter(w => w.trim()).length;
  }

  /**
   * Count dialogue segments
   */
  countDialogueSegments(content: string): number {
    const matches = content.match(/["「『"']|^[-–—]\s/gm);
    return matches ? Math.ceil(matches.length / 2) : 0;
  }
}

// ============================================================================
// QUALITY GATE
// ============================================================================

export class QualityGate {
  private analyzer: ContentAnalyzer;

  constructor() {
    this.analyzer = new ContentAnalyzer();
  }

  /**
   * Evaluate chapter quality
   */
  evaluate(
    content: string,
    chapterNumber: number,
    genre: GenreType,
    storyId: string,
    styleBible?: StyleBible,
    titleContext?: { title: string; previousTitles?: string[] }
  ): QualityReport {
    const issues: QualityIssue[] = [];
    const composition = this.analyzer.analyzeComposition(content);
    const wordCount = this.analyzer.countWords(content);
    const dopaminePoints = this.analyzer.detectDopaminePoints(content, chapterNumber);
    const repetition = this.analyzer.calculateRepetition(content);

    // Get targets
    const style = styleBible || GENRE_STYLES[genre];
    const targets = {
      dialogue: style.dialogueRatio,
      description: style.descriptionRatio,
      innerThought: style.innerThoughtRatio,
      action: style.actionRatio,
    };

    // Initialize scores
    let writingQuality = 10;
    let pacing = 10;
    let engagement = 10;
    let dopamineDelivery = 10;

    // Check word count
    if (wordCount < THRESHOLDS.minWordCount) {
      const severity = wordCount < THRESHOLDS.minWordCount * 0.7 ? 'major' : 'moderate';
      issues.push({
        type: 'word_count',
        severity,
        description: `Chương quá ngắn: ${wordCount} từ (cần ${THRESHOLDS.minWordCount}+)`,
        suggestion: 'Thêm chi tiết và phát triển cảnh',
      });
      writingQuality -= severity === 'major' ? 3 : 1.5;
    }

    // Check composition
    if (composition.dialogueRatio < targets.dialogue[0] || composition.dialogueRatio > targets.dialogue[1]) {
      const tooMuch = composition.dialogueRatio > targets.dialogue[1];
      issues.push({
        type: 'pacing',
        severity: 'moderate',
        description: `Dialogue ${tooMuch ? 'quá cao' : 'quá thấp'}: ${composition.dialogueRatio}%`,
        suggestion: tooMuch ? 'Thêm miêu tả' : 'Thêm đối thoại',
      });
      pacing -= 1;
    }

    // Check hook (early chapters)
    if (chapterNumber <= 10 && composition.hookStrength < 0.3) {
      issues.push({
        type: 'weak_hook',
        severity: chapterNumber <= 3 ? 'major' : 'moderate',
        description: 'Mở đầu chưa hấp dẫn',
        suggestion: 'Bắt đầu bằng action hoặc xung đột',
      });
      engagement -= chapterNumber <= 3 ? 2 : 1;
    }

    // Check cliffhanger
    if (composition.cliffhangerStrength < 0.2) {
      issues.push({
        type: 'missing_cliffhanger',
        severity: 'moderate',
        description: 'Thiếu cliffhanger cuối chương',
        suggestion: 'Kết thúc bằng tình huống căng thẳng',
      });
      engagement -= 1.5;
    }

    // Check dopamine
    const minDopamine = chapterNumber <= 50 ? 2 : 1;
    if (dopaminePoints.length < minDopamine) {
      issues.push({
        type: 'low_dopamine',
        severity: dopaminePoints.length === 0 ? 'major' : 'moderate',
        description: `Thiếu dopamine: ${dopaminePoints.length}/${minDopamine}`,
        suggestion: 'Thêm face-slap, đột phá, hoặc thu hoạch',
      });
      dopamineDelivery -= dopaminePoints.length === 0 ? 3 : 1.5;
    }

    // Check repetition
    if (repetition > THRESHOLDS.maxRepetitionScore) {
      issues.push({
        type: 'repetitive',
        severity: repetition > 0.5 ? 'moderate' : 'minor',
        description: 'Nội dung lặp từ nhiều',
        suggestion: 'Dùng từ đồng nghĩa',
      });
      writingQuality -= repetition > 0.5 ? 1.5 : 0.5;
    }

    // Check title quality
    if (titleContext?.title) {
      const titleResult = titleChecker.checkTitle(
        titleContext.title,
        titleContext.previousTitles || []
      );
      if (!titleResult.isValid) {
        issues.push({
          type: 'repetitive',
          severity: 'moderate',
          description: `Tên chương kém: ${titleResult.issues.map(i => i.description).join('; ')}`,
          suggestion: titleResult.suggestions.length > 0
            ? titleResult.suggestions[0]
            : 'Đổi tên chương theo TITLE_TEMPLATES',
        });
        engagement -= 1;
      } else if (titleResult.score < 7) {
        issues.push({
          type: 'repetitive',
          severity: 'minor',
          description: `Tên chương có thể cải thiện (${titleResult.score}/10)`,
          suggestion: titleResult.suggestions.length > 0
            ? titleResult.suggestions[0]
            : 'Thử mẫu tên khác cho đa dạng',
        });
        engagement -= 0.5;
      }
    }

    // Calculate overall
    const overallScore = Math.max(0, Math.min(10,
      writingQuality * 0.3 + pacing * 0.2 + engagement * 0.25 + dopamineDelivery * 0.25
    ));

    // Determine action
    let action: 'approve' | 'revise' | 'rewrite';
    let revisionNotes: string | undefined;

    if (overallScore >= THRESHOLDS.minQualityScore) {
      action = 'approve';
    } else if (overallScore >= THRESHOLDS.minQualityScore - 2) {
      action = 'revise';
      revisionNotes = issues.filter(i => i.severity !== 'minor').map(i => i.suggestion).filter(Boolean).join('; ');
    } else {
      action = 'rewrite';
      revisionNotes = 'Chất lượng thấp. Focus: ' + issues.filter(i => i.severity === 'major').map(i => i.description).join(', ');
    }

    return {
      chapterId: `ch_${chapterNumber}`,
      overallScore: Math.round(overallScore * 10) / 10,
      writingQuality: Math.round(writingQuality * 10) / 10,
      pacing: Math.round(pacing * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
      dopamineDelivery: Math.round(dopamineDelivery * 10) / 10,
      issues,
      action,
      revisionNotes,
    };
  }

  /**
   * Quick pass/fail check
   */
  quickCheck(content: string, genre: GenreType): boolean {
    const wordCount = this.analyzer.countWords(content);
    const composition = this.analyzer.analyzeComposition(content);
    const dopamine = this.analyzer.detectDopaminePoints(content, 0);

    if (wordCount < THRESHOLDS.minWordCount * 0.8) return false;
    if (composition.dialogueRatio < 10) return false;
    if (dopamine.length < 1) return false;
    if (composition.cliffhangerStrength < 0.1) return false;

    return true;
  }

  /**
   * Get suggestions from report
   */
  getSuggestions(report: QualityReport): string[] {
    const suggestions: string[] = [];

    if (report.writingQuality < 7) {
      suggestions.push('Cải thiện văn phong: đa dạng câu, tránh lặp từ');
    }
    if (report.engagement < 7) {
      suggestions.push('Tăng hấp dẫn: hook mạnh, cliffhanger cuối');
    }
    if (report.dopamineDelivery < 7) {
      suggestions.push('Thêm dopamine: face-slap, đột phá, thu hoạch');
    }
    if (report.pacing < 7) {
      suggestions.push('Cải thiện pacing: cân bằng dialogue/miêu tả/action');
    }

    return suggestions;
  }
}

// Export singletons
export const contentAnalyzer = new ContentAnalyzer();
export const qualityGate = new QualityGate();

// ============================================================================
// ENHANCED QUALITY CHECK - Integrating Sprint 1 Features
// ============================================================================

export interface EnhancedQualityReport extends QualityReport {
  dialogueQuality: number;
  clicheScore: number;
  itemConsistency?: number;
  summaryQuality?: number;
  detailedBreakdown: {
    writingQuality: number;
    pacing: number;
    engagement: number;
    dopamineDelivery: number;
    dialogueQuality: number;
    clicheAvoidance: number;
  };
}

/**
 * Enhanced quality evaluation including dialogue analysis
 */
export function evaluateChapterEnhanced(
  content: string,
  chapterNumber: number,
  genre: GenreType,
  storyId: string,
  options?: {
    styleBible?: StyleBible;
    charactersInvolved?: string[];
  }
): EnhancedQualityReport {
  // Get base quality report
  const baseReport = qualityGate.evaluate(
    content,
    chapterNumber,
    genre,
    storyId,
    options?.styleBible
  );

  // Get dialogue quality score
  const dialogueScore = getQuickDialogueScore(content);
  const dialogueQuality = dialogueScore.score / 10; // Convert to 0-10 scale

  // Calculate cliche avoidance score (inverse of cliche penalty)
  const clicheScore = Math.max(0, 10 - dialogueScore.breakdown.clichePenalty / 3);

  // Adjust overall score with dialogue quality
  const enhancedOverallScore = (
    baseReport.overallScore * 0.7 +
    dialogueQuality * 0.2 +
    clicheScore * 0.1
  );

  // Add dialogue-related issues
  const enhancedIssues = [...baseReport.issues];

  if (dialogueQuality < 6) {
    enhancedIssues.push({
      type: 'repetitive' as const,
      severity: dialogueQuality < 4 ? 'major' : 'moderate',
      description: `Dialogue quality thấp (${Math.round(dialogueQuality * 10)}/100)`,
      suggestion: 'Giảm cliche, đa dạng hóa dialogue patterns',
    });
  }

  if (dialogueScore.breakdown.clichePenalty > 15) {
    enhancedIssues.push({
      type: 'repetitive' as const,
      severity: dialogueScore.breakdown.clichePenalty > 25 ? 'major' : 'moderate',
      description: `Quá nhiều cliché phrases`,
      suggestion: 'Thay thế các câu như "Ngươi dám!", "Tìm chết!" bằng dialogue cụ thể hơn',
    });
  }

  if (dialogueScore.breakdown.exclamationPenalty > 10) {
    enhancedIssues.push({
      type: 'pacing' as const,
      severity: 'minor',
      description: `Lạm dụng dấu chấm than (!)`,
      suggestion: 'Sử dụng miêu tả cảm xúc thay vì dấu chấm than',
    });
  }

  if (dialogueScore.breakdown.expositionPenalty > 15) {
    enhancedIssues.push({
      type: 'pacing' as const,
      severity: 'moderate',
      description: `Info-dump trong dialogue`,
      suggestion: 'Show information through action, not dialogue exposition',
    });
  }

  // Determine action
  let action: 'approve' | 'revise' | 'rewrite' = baseReport.action;
  if (enhancedOverallScore < THRESHOLDS.minQualityScore - 2) {
    action = 'rewrite';
  } else if (enhancedOverallScore < THRESHOLDS.minQualityScore) {
    action = 'revise';
  }

  return {
    ...baseReport,
    overallScore: Math.round(enhancedOverallScore * 10) / 10,
    dialogueQuality: Math.round(dialogueQuality * 10) / 10,
    clicheScore: Math.round(clicheScore * 10) / 10,
    issues: enhancedIssues,
    action,
    detailedBreakdown: {
      writingQuality: baseReport.writingQuality,
      pacing: baseReport.pacing,
      engagement: baseReport.engagement,
      dopamineDelivery: baseReport.dopamineDelivery,
      dialogueQuality: Math.round(dialogueQuality * 10) / 10,
      clicheAvoidance: Math.round(clicheScore * 10) / 10,
    },
  };
}

/**
 * Quick comprehensive quality check
 */
export function quickQualityCheck(content: string, genre: GenreType): {
  passed: boolean;
  score: number;
  majorIssues: string[];
} {
  const majorIssues: string[] = [];

  // Basic checks
  const wordCount = contentAnalyzer.countWords(content);
  if (wordCount < THRESHOLDS.minWordCount * 0.7) {
    majorIssues.push(`Too short: ${wordCount} words`);
  }

  // Dialogue checks
  const dialogueScore = getQuickDialogueScore(content);
  if (dialogueScore.breakdown.clichePenalty > 25) {
    majorIssues.push('Too many clichés');
  }
  if (dialogueScore.breakdown.expositionPenalty > 20) {
    majorIssues.push('Excessive info-dump');
  }

  // Composition checks
  const composition = contentAnalyzer.analyzeComposition(content);
  if (composition.hookStrength < 0.2) {
    majorIssues.push('Weak opening hook');
  }
  if (composition.cliffhangerStrength < 0.15) {
    majorIssues.push('Missing cliffhanger');
  }

  // Dopamine check
  const dopamine = contentAnalyzer.detectDopaminePoints(content, 0);
  if (dopamine.length === 0) {
    majorIssues.push('No dopamine points');
  }

  // Calculate combined score
  const baseScore = qualityGate.quickCheck(content, genre) ? 70 : 40;
  const dialogueBonus = (dialogueScore.score - 50) / 5;
  const score = Math.max(0, Math.min(100, baseScore + dialogueBonus));

  return {
    passed: majorIssues.length === 0 && score >= 60,
    score: Math.round(score),
    majorIssues,
  };
}

/**
 * Get detailed quality breakdown for debugging/analysis
 */
export function getQualityBreakdown(content: string, genre: GenreType): {
  composition: CompositionAnalysis;
  dialogue: ReturnType<typeof getQuickDialogueScore>;
  dopaminePoints: DopaminePoint[];
  wordCount: number;
  repetitionScore: number;
} {
  return {
    composition: contentAnalyzer.analyzeComposition(content),
    dialogue: getQuickDialogueScore(content),
    dopaminePoints: contentAnalyzer.detectDopaminePoints(content, 0),
    wordCount: contentAnalyzer.countWords(content),
    repetitionScore: contentAnalyzer.calculateRepetition(content),
  };
}
