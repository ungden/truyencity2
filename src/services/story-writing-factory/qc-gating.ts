/**
 * QC Gating Module - Quality Control with Pass/Fail Criteria
 *
 * Every chapter must pass these gates:
 * 1. Continuity Score (0-100)
 * 2. Repetition Score (vs N recent chapters)
 * 3. Power Progression Sanity Check
 * 4. "New Info Count" (progression check)
 * 5. Word Count & Pacing Check
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Gating thresholds
export interface GatingThresholds {
  // Minimum scores to pass (0-100)
  continuityMin: number;       // Default: 70
  repetitionMax: number;       // Default: 30 (lower is better)
  powerDeltaMax: number;       // Default: 2 (max realms jumped per arc)
  newInfoMin: number;          // Default: 2 (minimum new plot points)
  wordCountMin: number;        // Default: 2000
  wordCountMax: number;        // Default: 4000

  // Thresholds for actions
  autoRewriteBelow: number;    // Auto-rewrite if total score below this
  humanReviewBelow: number;    // Flag for human review if below this
}

export const DEFAULT_THRESHOLDS: GatingThresholds = {
  continuityMin: 70,
  repetitionMax: 30,
  powerDeltaMax: 2,
  newInfoMin: 2,
  wordCountMin: 2000,
  wordCountMax: 4000,
  autoRewriteBelow: 50,
  humanReviewBelow: 65,
};

// Individual score components
export interface QCScores {
  continuity: number;          // 0-100: How well it maintains consistency
  repetition: number;          // 0-100: Lower is better (less repetitive)
  powerSanity: number;         // 0-100: Power progression makes sense
  newInfo: number;             // 0-100: Contains new plot progression
  pacing: number;              // 0-100: Word count and scene pacing
  overall: number;             // Weighted average
}

// Gate result
export interface GateResult {
  passed: boolean;
  scores: QCScores;
  action: 'pass' | 'auto_rewrite' | 'human_review' | 'fail';
  failures: string[];
  warnings: string[];
  details: {
    continuityIssues: string[];
    repetitiveElements: string[];
    powerProblems: string[];
    missingProgression: string[];
    pacingIssues: string[];
  };
}

// Beat patterns for repetition detection
const BEAT_PATTERNS = {
  humiliation: [
    /bị sỉ nhục/gi, /bị khinh thường/gi, /cười nhạo/gi, /khinh bỉ/gi,
    /xem thường/gi, /coi thường/gi, /không coi .* ra gì/gi
  ],
  revenge: [
    /báo thù/gi, /trả thù/gi, /rửa hận/gi, /thanh toán/gi, /đền tội/gi
  ],
  tournament: [
    /thi đấu/gi, /đại hội/gi, /tranh đoạt/gi, /võ đài/gi, /so tài/gi,
    /tỷ thí/gi, /đấu trường/gi
  ],
  auction: [
    /đấu giá/gi, /phiên đấu/gi, /ra giá/gi, /trả giá/gi, /giao dịch/gi
  ],
  secret_realm: [
    /bí cảnh/gi, /di tích/gi, /thám hiểm/gi, /hang động/gi, /cổ mộ/gi,
    /phế tích/gi, /bảo tàng/gi
  ],
  sect_conflict: [
    /tông môn/gi, /môn phái/gi, /tranh chấp/gi, /xung đột/gi, /thù địch/gi
  ],
  treasure: [
    /bảo vật/gi, /linh dược/gi, /thần khí/gi, /pháp bảo/gi, /linh thạch/gi,
    /đan dược/gi, /thiên tài địa bảo/gi
  ],
  breakthrough: [
    /đột phá/gi, /thăng cấp/gi, /tiến nhập/gi, /lĩnh ngộ/gi, /khai sáng/gi
  ],
  rescue: [
    /cứu người/gi, /giải cứu/gi, /ra tay/gi, /bảo vệ/gi, /che chở/gi
  ],
  hidden_identity: [
    /ẩn dấu thân phận/gi, /giả dạng/gi, /ngụy trang/gi, /bí mật/gi, /tiết lộ/gi
  ],
};

// New info patterns
const NEW_INFO_PATTERNS = {
  plot_advancement: [
    /phát hiện ra/gi, /nhận ra rằng/gi, /bí mật là/gi, /hóa ra/gi,
    /thì ra/gi, /đã hiểu/gi, /manh mối/gi
  ],
  character_development: [
    /quyết định/gi, /thay đổi/gi, /nhận thức/gi, /trưởng thành/gi,
    /hiểu được/gi, /học được bài học/gi
  ],
  relationship_change: [
    /kết giao/gi, /trở thành bạn/gi, /kẻ thù mới/gi, /đồng minh/gi,
    /phản bội/gi, /tin tưởng/gi
  ],
  world_reveal: [
    /truyền thuyết/gi, /lịch sử/gi, /bí mật của/gi, /nguồn gốc/gi,
    /chân tướng/gi
  ],
  power_gain: [
    /học được/gi, /lĩnh ngộ/gi, /đột phá/gi, /có được/gi, /thu hoạch/gi
  ],
};

export class QCGating {
  private projectId: string;
  private thresholds: GatingThresholds;
  private recentChapters: Array<{ number: number; content: string; beats: string[] }> = [];
  private currentArcStartChapter: number = 1;
  private startingRealm: number = 0;

  constructor(projectId: string, thresholds?: Partial<GatingThresholds>) {
    this.projectId = projectId;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Initialize by loading recent chapters for comparison
   */
  async initialize(recentChapterCount: number = 10): Promise<void> {
    const supabase = getSupabase();
    const { data: chapters } = await supabase
      .from('chapters')
      .select('chapter_number, content')
      .eq('novel_id', this.projectId)
      .order('chapter_number', { ascending: false })
      .limit(recentChapterCount);

    if (chapters) {
      this.recentChapters = chapters.map(ch => ({
        number: ch.chapter_number,
        content: ch.content,
        beats: this.detectBeats(ch.content),
      }));
    }

    // Get arc info
    const { data: arcs } = await supabase
      .from('plot_arcs')
      .select('start_chapter, end_chapter')
      .eq('project_id', this.projectId)
      .eq('status', 'in_progress')
      .single();

    if (arcs) {
      this.currentArcStartChapter = arcs.start_chapter;
    }
  }

  /**
   * Run all QC gates on a chapter
   */
  async evaluate(
    chapterNumber: number,
    content: string,
    metadata: {
      protagonistPowerLevel?: { realm: string; realmIndex: number };
      arcStartPowerLevel?: { realm: string; realmIndex: number };
      charactersInvolved?: string[];
      deadCharactersMentioned?: string[];
    }
  ): Promise<GateResult> {
    const scores: QCScores = {
      continuity: 100,
      repetition: 0,
      powerSanity: 100,
      newInfo: 0,
      pacing: 100,
      overall: 0,
    };

    const failures: string[] = [];
    const warnings: string[] = [];
    const details = {
      continuityIssues: [] as string[],
      repetitiveElements: [] as string[],
      powerProblems: [] as string[],
      missingProgression: [] as string[],
      pacingIssues: [] as string[],
    };

    // 1. Continuity Score
    const continuityResult = this.checkContinuity(content, metadata);
    scores.continuity = continuityResult.score;
    details.continuityIssues = continuityResult.issues;
    if (scores.continuity < this.thresholds.continuityMin) {
      failures.push(`Continuity score ${scores.continuity} below minimum ${this.thresholds.continuityMin}`);
    }

    // 2. Repetition Score
    const repetitionResult = this.checkRepetition(content, chapterNumber);
    scores.repetition = repetitionResult.score;
    details.repetitiveElements = repetitionResult.elements;
    if (scores.repetition > this.thresholds.repetitionMax) {
      failures.push(`Repetition score ${scores.repetition} above maximum ${this.thresholds.repetitionMax}`);
    }

    // 3. Power Sanity Check
    const powerResult = this.checkPowerSanity(content, metadata);
    scores.powerSanity = powerResult.score;
    details.powerProblems = powerResult.problems;
    if (scores.powerSanity < 70) {
      failures.push(`Power sanity score ${scores.powerSanity} indicates progression issues`);
    }

    // 4. New Info Count
    const newInfoResult = this.checkNewInfo(content);
    scores.newInfo = newInfoResult.score;
    details.missingProgression = newInfoResult.missing;
    if (newInfoResult.count < this.thresholds.newInfoMin) {
      warnings.push(`Only ${newInfoResult.count} new info points (minimum ${this.thresholds.newInfoMin})`);
    }

    // 5. Pacing Check
    const pacingResult = this.checkPacing(content);
    scores.pacing = pacingResult.score;
    details.pacingIssues = pacingResult.issues;
    if (pacingResult.score < 70) {
      warnings.push(`Pacing issues detected`);
    }

    // Calculate overall score (weighted)
    scores.overall = Math.round(
      scores.continuity * 0.30 +          // Continuity is critical
      (100 - scores.repetition) * 0.20 +  // Invert repetition (lower is better)
      scores.powerSanity * 0.20 +
      scores.newInfo * 0.15 +
      scores.pacing * 0.15
    );

    // Determine action
    let action: GateResult['action'] = 'pass';
    let passed = true;

    if (scores.overall < this.thresholds.autoRewriteBelow || failures.length >= 2) {
      action = 'auto_rewrite';
      passed = false;
    } else if (scores.overall < this.thresholds.humanReviewBelow || failures.length > 0) {
      action = 'human_review';
      passed = false;
    }

    return {
      passed,
      scores,
      action,
      failures,
      warnings,
      details,
    };
  }

  /**
   * Check continuity with existing story
   */
  private checkContinuity(
    content: string,
    metadata: {
      deadCharactersMentioned?: string[];
      charactersInvolved?: string[];
    }
  ): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Check for dead characters appearing
    if (metadata.deadCharactersMentioned && metadata.deadCharactersMentioned.length > 0) {
      score -= 30 * metadata.deadCharactersMentioned.length;
      for (const char of metadata.deadCharactersMentioned) {
        issues.push(`Dead character "${char}" appears in chapter`);
      }
    }

    // Check for basic continuity markers
    const hasRecap = /chương trước|lần trước|hôm trước|vừa rồi/i.test(content);
    const hasTransition = /sau đó|tiếp theo|không lâu sau/i.test(content);

    if (!hasRecap && !hasTransition) {
      score -= 10;
      issues.push('No transition or recap from previous chapter');
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Detect beats in content
   */
  private detectBeats(content: string): string[] {
    const detected: string[] = [];

    for (const [beatName, patterns] of Object.entries(BEAT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          detected.push(beatName);
          break;
        }
      }
    }

    return detected;
  }

  /**
   * Check for repetition against recent chapters
   */
  private checkRepetition(
    content: string,
    chapterNumber: number
  ): { score: number; elements: string[] } {
    const currentBeats = this.detectBeats(content);
    const elements: string[] = [];
    let repetitionCount = 0;

    // Check against recent chapters (within 10 chapters)
    const recentToCheck = this.recentChapters.filter(
      ch => ch.number >= chapterNumber - 10 && ch.number < chapterNumber
    );

    for (const beat of currentBeats) {
      let occurrences = 0;
      for (const recent of recentToCheck) {
        if (recent.beats.includes(beat)) {
          occurrences++;
        }
      }

      if (occurrences >= 2) {
        repetitionCount++;
        elements.push(`"${beat}" appeared ${occurrences} times in last 10 chapters`);
      }
    }

    // Check for exact phrase repetition
    const phrases = this.extractSignificantPhrases(content);
    for (const phrase of phrases) {
      for (const recent of recentToCheck.slice(0, 3)) { // Check last 3 chapters
        if (recent.content.includes(phrase)) {
          repetitionCount++;
          elements.push(`Repeated phrase: "${phrase.substring(0, 50)}..."`);
          break;
        }
      }
    }

    // Score: 0 = no repetition, 100 = very repetitive
    const score = Math.min(100, repetitionCount * 15);

    return { score, elements };
  }

  /**
   * Extract significant phrases for repetition check
   */
  private extractSignificantPhrases(content: string): string[] {
    const phrases: string[] = [];

    // Extract dialogue lines
    const dialogueMatches = content.match(/"[^"]{20,100}"/g);
    if (dialogueMatches) {
      phrases.push(...dialogueMatches.slice(0, 5));
    }

    // Extract action descriptions (sentences with verbs)
    const sentences = content.split(/[.!?]/).filter(s => s.length > 30 && s.length < 100);
    phrases.push(...sentences.slice(0, 5));

    return phrases;
  }

  /**
   * Check power progression sanity
   */
  private checkPowerSanity(
    content: string,
    metadata: {
      protagonistPowerLevel?: { realm: string; realmIndex: number };
      arcStartPowerLevel?: { realm: string; realmIndex: number };
    }
  ): { score: number; problems: string[] } {
    let score = 100;
    const problems: string[] = [];

    // Check for breakthrough
    const hasBreakthrough = /đột phá|thăng cấp|tiến nhập cảnh giới/i.test(content);

    if (hasBreakthrough && metadata.protagonistPowerLevel && metadata.arcStartPowerLevel) {
      const delta = metadata.protagonistPowerLevel.realmIndex - metadata.arcStartPowerLevel.realmIndex;

      if (delta > this.thresholds.powerDeltaMax) {
        score -= 40;
        problems.push(`Power jumped ${delta} realms this arc (max ${this.thresholds.powerDeltaMax})`);
      }

      // Check for "instant" breakthroughs without buildup
      const hasBuildup = /tích lũy|đủ điều kiện|thời cơ chín muồi|nền tảng vững chắc/i.test(content);
      if (!hasBuildup) {
        score -= 20;
        problems.push('Breakthrough without proper buildup');
      }
    }

    // Check for power gain without effort
    const gainWithoutEffort = /đột nhiên có được|bất ngờ nhận được|trời cho/i.test(content);
    if (gainWithoutEffort) {
      score -= 15;
      problems.push('Power gain appears too easy/convenient');
    }

    return { score: Math.max(0, score), problems };
  }

  /**
   * Check for new information/progression
   */
  private checkNewInfo(content: string): { score: number; count: number; missing: string[] } {
    let count = 0;
    const found: string[] = [];
    const missing: string[] = [];

    for (const [category, patterns] of Object.entries(NEW_INFO_PATTERNS)) {
      let categoryFound = false;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          categoryFound = true;
          count++;
          found.push(category);
          break;
        }
      }
      if (!categoryFound) {
        missing.push(category);
      }
    }

    // At least 2 types of progression
    const score = Math.min(100, count * 20);

    if (count < 2) {
      missing.push('Chapter lacks meaningful plot progression');
    }

    return { score, count, missing };
  }

  /**
   * Check pacing (word count, scene balance)
   */
  private checkPacing(content: string): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Word count
    const wordCount = content.split(/\s+/).length;
    if (wordCount < this.thresholds.wordCountMin) {
      score -= 20;
      issues.push(`Word count ${wordCount} below minimum ${this.thresholds.wordCountMin}`);
    }
    if (wordCount > this.thresholds.wordCountMax) {
      score -= 10;
      issues.push(`Word count ${wordCount} above maximum ${this.thresholds.wordCountMax}`);
    }

    // Dialogue vs narration balance
    const dialogueMatches = content.match(/".+?"/g) || [];
    const dialogueLength = dialogueMatches.join('').length;
    const dialogueRatio = dialogueLength / content.length;

    if (dialogueRatio < 0.1) {
      score -= 15;
      issues.push('Too little dialogue (< 10%)');
    }
    if (dialogueRatio > 0.6) {
      score -= 15;
      issues.push('Too much dialogue (> 60%)');
    }

    // Paragraph length variety
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;

    if (avgParagraphLength > 500) {
      score -= 10;
      issues.push('Paragraphs too long on average');
    }
    if (avgParagraphLength < 50) {
      score -= 10;
      issues.push('Paragraphs too short on average');
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Generate rewrite instructions based on failures
   */
  generateRewriteInstructions(result: GateResult): string {
    const instructions: string[] = ['## Rewrite Instructions:\n'];

    if (result.details.continuityIssues.length > 0) {
      instructions.push('### Continuity Fixes:');
      for (const issue of result.details.continuityIssues) {
        instructions.push(`- ${issue}`);
      }
    }

    if (result.details.repetitiveElements.length > 0) {
      instructions.push('\n### Avoid Repetition:');
      for (const elem of result.details.repetitiveElements) {
        instructions.push(`- Replace or vary: ${elem}`);
      }
    }

    if (result.details.powerProblems.length > 0) {
      instructions.push('\n### Power Balance:');
      for (const prob of result.details.powerProblems) {
        instructions.push(`- ${prob}`);
      }
    }

    if (result.details.missingProgression.length > 0) {
      instructions.push('\n### Add Progression:');
      instructions.push('Include at least 2 of these elements:');
      for (const miss of result.details.missingProgression.slice(0, 3)) {
        instructions.push(`- ${miss}`);
      }
    }

    if (result.details.pacingIssues.length > 0) {
      instructions.push('\n### Pacing Adjustments:');
      for (const issue of result.details.pacingIssues) {
        instructions.push(`- ${issue}`);
      }
    }

    return instructions.join('\n');
  }
}

export function createQCGating(projectId: string, thresholds?: Partial<GatingThresholds>): QCGating {
  return new QCGating(projectId, thresholds);
}
