/**
 * Quality Gate - Hệ thống đảm bảo chất lượng
 * Kiểm tra và đánh giá chất lượng từng chương trước khi publish
 */

import { QualityReport, QualityIssue, GenreType } from './types';
import { getGenreTemplate } from './genre-templates';

/**
 * Quality Metrics - Các chỉ số đánh giá
 */
interface QualityMetrics {
  wordCount: number;
  dialogueRatio: number;
  descriptionRatio: number;
  actionRatio: number;
  innerThoughtRatio: number;
  sentenceVariety: number;
  paragraphLength: number;
  hookStrength: number;
  cliffhangerStrength: number;
  dopaminePoints: number;
  repetitionScore: number;
  readabilityScore: number;
}

/**
 * Content Analyzer - Phân tích nội dung chương
 */
export class ContentAnalyzer {
  /**
   * Analyze chapter content and extract metrics
   */
  analyzeContent(content: string): QualityMetrics {
    const words = content.split(/\s+/).filter(w => w.trim());
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());

    // Count dialogue (text in quotes)
    const dialogueMatches = content.match(/["「『"']([^"」』"']+)["」』"']/g) || [];
    const dialogueWords = dialogueMatches.join(' ').split(/\s+/).length;

    // Estimate ratios
    const totalWords = words.length;
    const dialogueRatio = dialogueWords / totalWords;

    // Detect action words
    const actionKeywords = ['đánh', 'chém', 'đâm', 'bay', 'lao', 'xông', 'công kích', 'tấn công', 'phóng', 'bắn'];
    const actionCount = actionKeywords.reduce((sum, kw) => sum + (content.match(new RegExp(kw, 'gi')) || []).length, 0);
    const actionRatio = Math.min(actionCount / (totalWords / 100), 0.3);

    // Inner thoughts (text with 'nghĩ', 'thầm', 'trong lòng')
    const thoughtKeywords = ['nghĩ thầm', 'trong lòng', 'tự nhủ', 'thầm nghĩ', 'suy tư'];
    const thoughtCount = thoughtKeywords.reduce((sum, kw) => sum + (content.match(new RegExp(kw, 'gi')) || []).length, 0);
    const innerThoughtRatio = Math.min(thoughtCount / (totalWords / 200), 0.25);

    const descriptionRatio = 1 - dialogueRatio - actionRatio - innerThoughtRatio;

    // Sentence variety (standard deviation of sentence lengths)
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    const sentenceVariety = Math.sqrt(variance) / avgLength; // Normalized

    // Paragraph length
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;

    // Hook strength (first 100 words)
    const firstPart = words.slice(0, 100).join(' ');
    const hookKeywords = ['bỗng', 'đột nhiên', 'không ngờ', 'chấn động', 'kinh hãi', 'sửng sốt', '!'];
    const hookStrength = hookKeywords.reduce((sum, kw) => sum + (firstPart.includes(kw) ? 1 : 0), 0) / hookKeywords.length;

    // Cliffhanger strength (last 100 words)
    const lastPart = words.slice(-100).join(' ');
    const cliffKeywords = ['...', 'sẽ', 'liệu', 'chưa kịp', 'đúng lúc này', 'không ngờ', '?', '!'];
    const cliffhangerStrength = cliffKeywords.reduce((sum, kw) => sum + (lastPart.includes(kw) ? 1 : 0), 0) / cliffKeywords.length;

    // Dopamine points
    const dopamineKeywords = [
      'đột phá', 'thăng cấp', 'sảng khoái', 'thắng', 'đánh bại',
      'khuất phục', 'kinh ngạc', 'chấn động', 'sợ hãi', 'quỳ',
      'xin tha', 'bảo vật', 'thu hoạch', 'mỹ nữ', 'khâm phục'
    ];
    const dopaminePoints = dopamineKeywords.reduce((sum, kw) =>
      sum + (content.match(new RegExp(kw, 'gi')) || []).length, 0
    );

    // Repetition score (lower is better)
    const wordFreq = new Map<string, number>();
    words.forEach(w => {
      const lower = w.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    });
    const repeatedWords = Array.from(wordFreq.values()).filter(count => count > 5).length;
    const repetitionScore = 1 - (repeatedWords / 50); // Normalized, 1 = no repetition

    // Readability (simplified)
    const avgWordsPerSentence = totalWords / sentences.length;
    const readabilityScore = avgWordsPerSentence > 10 && avgWordsPerSentence < 25 ? 1 : 0.5;

    return {
      wordCount: totalWords,
      dialogueRatio,
      descriptionRatio,
      actionRatio,
      innerThoughtRatio,
      sentenceVariety,
      paragraphLength: avgParagraphLength,
      hookStrength,
      cliffhangerStrength,
      dopaminePoints,
      repetitionScore,
      readabilityScore
    };
  }
}

/**
 * Quality Gate - Main class
 */
export class QualityGate {
  private analyzer: ContentAnalyzer;
  private minWordCount: number;
  private maxWordCount: number;
  private minQualityScore: number;

  constructor(options?: {
    minWordCount?: number;
    maxWordCount?: number;
    minQualityScore?: number;
  }) {
    this.analyzer = new ContentAnalyzer();
    this.minWordCount = options?.minWordCount || 2000;
    this.maxWordCount = options?.maxWordCount || 3500;
    this.minQualityScore = options?.minQualityScore || 7;
  }

  /**
   * Evaluate chapter quality
   */
  evaluate(
    content: string,
    genre: GenreType,
    chapterNumber: number,
    storyId: string
  ): QualityReport {
    const metrics = this.analyzer.analyzeContent(content);
    const template = getGenreTemplate(genre);
    const issues: QualityIssue[] = [];

    // Score components
    let writingQuality = 10;
    let plotConsistency = 10; // Would need context to properly evaluate
    let characterConsistency = 10; // Would need context
    let pacing = 10;
    let engagement = 10;
    let dopamineDelivery = 10;

    // Check word count
    if (metrics.wordCount < this.minWordCount) {
      const severity = metrics.wordCount < this.minWordCount * 0.7 ? 'major' : 'moderate';
      issues.push({
        type: 'pacing_issue',
        severity,
        description: `Chương quá ngắn: ${metrics.wordCount} từ (yêu cầu: ${this.minWordCount}+)`,
        suggestion: 'Cần mở rộng nội dung, thêm chi tiết và phát triển cảnh'
      });
      writingQuality -= severity === 'major' ? 3 : 1.5;
    }

    if (metrics.wordCount > this.maxWordCount) {
      issues.push({
        type: 'pacing_issue',
        severity: 'minor',
        description: `Chương hơi dài: ${metrics.wordCount} từ`,
        suggestion: 'Có thể cân nhắc chia thành 2 chương'
      });
    }

    // Check composition ratio
    const targetRatio = template.compositionRatio;
    const dialogueDiff = Math.abs(metrics.dialogueRatio * 100 - targetRatio.dialogue);
    if (dialogueDiff > 15) {
      const tooMuch = metrics.dialogueRatio * 100 > targetRatio.dialogue;
      issues.push({
        type: 'pacing_issue',
        severity: dialogueDiff > 25 ? 'moderate' : 'minor',
        description: `Tỷ lệ đối thoại ${tooMuch ? 'quá cao' : 'quá thấp'}: ${Math.round(metrics.dialogueRatio * 100)}%`,
        suggestion: tooMuch ? 'Thêm miêu tả và nội tâm' : 'Thêm đối thoại để tăng nhịp độ'
      });
      writingQuality -= dialogueDiff > 25 ? 1.5 : 0.5;
    }

    // Check hook (especially important for early chapters)
    if (chapterNumber <= 10 && metrics.hookStrength < 0.3) {
      issues.push({
        type: 'weak_hook',
        severity: chapterNumber <= 3 ? 'major' : 'moderate',
        description: 'Mở đầu chương chưa đủ hấp dẫn',
        location: 'Đầu chương',
        suggestion: 'Cần bắt đầu bằng hành động, xung đột hoặc tình huống gây tò mò'
      });
      engagement -= chapterNumber <= 3 ? 2 : 1;
    }

    // Check cliffhanger
    if (metrics.cliffhangerStrength < 0.2) {
      issues.push({
        type: 'missing_cliffhanger',
        severity: 'moderate',
        description: 'Kết thúc chương thiếu cliffhanger',
        location: 'Cuối chương',
        suggestion: 'Cần kết thúc bằng tình huống căng thẳng hoặc câu hỏi khiến người đọc muốn đọc tiếp'
      });
      engagement -= 1.5;
    }

    // Check dopamine delivery
    const expectedDopamine = chapterNumber <= 50 ? 3 : 2; // More in early chapters
    if (metrics.dopaminePoints < expectedDopamine) {
      issues.push({
        type: 'low_engagement',
        severity: metrics.dopaminePoints === 0 ? 'major' : 'moderate',
        description: `Thiếu điểm dopamine: chỉ có ${metrics.dopaminePoints} điểm`,
        suggestion: 'Thêm các yếu tố như: đột phá, thắng lợi, thu hoạch, face-slap'
      });
      dopamineDelivery -= metrics.dopaminePoints === 0 ? 3 : 1.5;
    }

    // Check repetition
    if (metrics.repetitionScore < 0.7) {
      issues.push({
        type: 'repetitive',
        severity: metrics.repetitionScore < 0.5 ? 'moderate' : 'minor',
        description: 'Nội dung có nhiều từ lặp lại',
        suggestion: 'Sử dụng từ đồng nghĩa và đa dạng hóa cách diễn đạt'
      });
      writingQuality -= metrics.repetitionScore < 0.5 ? 1.5 : 0.5;
    }

    // Check sentence variety
    if (metrics.sentenceVariety < 0.3) {
      issues.push({
        type: 'pacing_issue',
        severity: 'minor',
        description: 'Câu văn đều đều, thiếu đa dạng',
        suggestion: 'Xen kẽ câu ngắn và câu dài để tạo nhịp điệu'
      });
      writingQuality -= 0.5;
    }

    // Calculate overall score
    const overallScore = Math.max(0, Math.min(10,
      (writingQuality * 0.25 +
        plotConsistency * 0.15 +
        characterConsistency * 0.15 +
        pacing * 0.15 +
        engagement * 0.15 +
        dopamineDelivery * 0.15)
    ));

    // Determine action
    let action: 'approve' | 'revise' | 'rewrite';
    let revisionNotes: string | undefined;

    if (overallScore >= this.minQualityScore) {
      action = 'approve';
    } else if (overallScore >= this.minQualityScore - 2) {
      action = 'revise';
      revisionNotes = issues
        .filter(i => i.severity !== 'minor')
        .map(i => i.suggestion)
        .filter(Boolean)
        .join('; ');
    } else {
      action = 'rewrite';
      revisionNotes = 'Chất lượng quá thấp, cần viết lại hoàn toàn với focus vào: ' +
        issues.filter(i => i.severity === 'major').map(i => i.description).join(', ');
    }

    return {
      chapterId: `ch_${chapterNumber}`,
      storyId,
      overallScore: Math.round(overallScore * 10) / 10,
      writingQuality: Math.round(writingQuality * 10) / 10,
      plotConsistency: Math.round(plotConsistency * 10) / 10,
      characterConsistency: Math.round(characterConsistency * 10) / 10,
      pacing: Math.round(pacing * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
      dopamineDelivery: Math.round(dopamineDelivery * 10) / 10,
      issues,
      action,
      revisionNotes
    };
  }

  /**
   * Quick check - just pass/fail
   */
  quickCheck(content: string, genre: GenreType): boolean {
    const metrics = this.analyzer.analyzeContent(content);

    // Basic checks
    if (metrics.wordCount < this.minWordCount * 0.8) return false;
    if (metrics.dialogueRatio < 0.1) return false;
    if (metrics.dopaminePoints < 1) return false;
    if (metrics.cliffhangerStrength < 0.1) return false;

    return true;
  }

  /**
   * Get improvement suggestions
   */
  getSuggestions(report: QualityReport): string[] {
    const suggestions: string[] = [];

    if (report.writingQuality < 7) {
      suggestions.push('Cải thiện chất lượng văn: đa dạng câu văn, tránh lặp từ');
    }
    if (report.engagement < 7) {
      suggestions.push('Tăng độ hấp dẫn: mở đầu mạnh hơn, cliffhanger cuối chương');
    }
    if (report.dopamineDelivery < 7) {
      suggestions.push('Thêm điểm dopamine: face-slap, đột phá, thu hoạch');
    }
    if (report.pacing < 7) {
      suggestions.push('Cải thiện nhịp độ: cân bằng đối thoại/miêu tả/hành động');
    }

    return suggestions;
  }
}

/**
 * Batch Quality Checker
 */
export class BatchQualityChecker {
  private gate: QualityGate;

  constructor(gate?: QualityGate) {
    this.gate = gate || new QualityGate();
  }

  /**
   * Check multiple chapters
   */
  checkBatch(
    chapters: Array<{ content: string; number: number }>,
    genre: GenreType,
    storyId: string
  ): {
    reports: QualityReport[];
    summary: {
      totalChapters: number;
      approved: number;
      needsRevision: number;
      needsRewrite: number;
      averageScore: number;
      commonIssues: string[];
    };
  } {
    const reports = chapters.map(ch =>
      this.gate.evaluate(ch.content, genre, ch.number, storyId)
    );

    const approved = reports.filter(r => r.action === 'approve').length;
    const needsRevision = reports.filter(r => r.action === 'revise').length;
    const needsRewrite = reports.filter(r => r.action === 'rewrite').length;
    const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;

    // Find common issues
    const issueCount = new Map<string, number>();
    reports.forEach(r => {
      r.issues.forEach(issue => {
        const key = issue.type;
        issueCount.set(key, (issueCount.get(key) || 0) + 1);
      });
    });

    const commonIssues = Array.from(issueCount.entries())
      .filter(([, count]) => count >= chapters.length * 0.3)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    return {
      reports,
      summary: {
        totalChapters: chapters.length,
        approved,
        needsRevision,
        needsRewrite,
        averageScore: Math.round(averageScore * 10) / 10,
        commonIssues
      }
    };
  }
}

// Export instances
export const qualityGate = new QualityGate();
export const contentAnalyzer = new ContentAnalyzer();
