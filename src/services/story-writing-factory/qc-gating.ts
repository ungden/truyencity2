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
// NOTE: Using /i only (not /gi) because RegExp.test() with /g flag is stateful (lastIndex bug)
const BEAT_PATTERNS = {
  humiliation: [
    /bị sỉ nhục/i, /bị khinh thường/i, /cười nhạo/i, /khinh bỉ/i,
    /xem thường/i, /coi thường/i, /không coi .* ra gì/i
  ],
  revenge: [
    /báo thù/i, /trả thù/i, /rửa hận/i, /thanh toán/i, /đền tội/i
  ],
  tournament: [
    /thi đấu/i, /đại hội/i, /tranh đoạt/i, /võ đài/i, /so tài/i,
    /tỷ thí/i, /đấu trường/i
  ],
  auction: [
    /đấu giá/i, /phiên đấu/i, /ra giá/i, /trả giá/i, /giao dịch/i
  ],
  secret_realm: [
    /bí cảnh/i, /di tích/i, /thám hiểm/i, /hang động/i, /cổ mộ/i,
    /phế tích/i, /bảo tàng/i
  ],
  sect_conflict: [
    /tông môn/i, /môn phái/i, /tranh chấp/i, /xung đột/i, /thù địch/i
  ],
  treasure: [
    /bảo vật/i, /linh dược/i, /thần khí/i, /pháp bảo/i, /linh thạch/i,
    /đan dược/i, /thiên tài địa bảo/i
  ],
  breakthrough: [
    /đột phá/i, /thăng cấp/i, /tiến nhập/i, /lĩnh ngộ/i, /khai sáng/i
  ],
  rescue: [
    /cứu người/i, /giải cứu/i, /ra tay/i, /bảo vệ/i, /che chở/i
  ],
  hidden_identity: [
    /ẩn dấu thân phận/i, /giả dạng/i, /ngụy trang/i, /bí mật/i, /tiết lộ/i
  ],
};

// New info patterns (using /i only, not /gi — see note above)
const NEW_INFO_PATTERNS = {
  plot_advancement: [
    /phát hiện ra/i, /nhận ra rằng/i, /bí mật là/i, /hóa ra/i,
    /thì ra/i, /đã hiểu/i, /manh mối/i
  ],
  character_development: [
    /quyết định/i, /thay đổi/i, /nhận thức/i, /trưởng thành/i,
    /hiểu được/i, /học được bài học/i
  ],
  relationship_change: [
    /kết giao/i, /trở thành bạn/i, /kẻ thù mới/i, /đồng minh/i,
    /phản bội/i, /tin tưởng/i
  ],
  world_reveal: [
    /truyền thuyết/i, /lịch sử/i, /bí mật của/i, /nguồn gốc/i,
    /chân tướng/i
  ],
  power_gain: [
    /học được/i, /lĩnh ngộ/i, /đột phá/i, /có được/i, /thu hoạch/i
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

// ============================================================================
// ENHANCED QC GATING - Integration with Sprint 1 features
// ============================================================================

import { getQuickDialogueScore, DialogueAnalysisResult, dialogueAnalyzer } from './dialogue-analyzer';

export interface EnhancedGatingThresholds extends GatingThresholds {
  dialogueQualityMin: number;    // Default: 60
  clicheScoreMax: number;        // Default: 30 (lower is better)
  infoDumpMax: number;           // Default: 25 (percentage)
}

export const ENHANCED_DEFAULT_THRESHOLDS: EnhancedGatingThresholds = {
  ...DEFAULT_THRESHOLDS,
  dialogueQualityMin: 60,
  clicheScoreMax: 30,
  infoDumpMax: 25,
};

export interface EnhancedQCScores extends QCScores {
  dialogueQuality: number;  // 0-100
  clicheAvoidance: number;  // 0-100 (higher is better)
  expositionControl: number; // 0-100 (higher is better = less info dump)
}

export interface EnhancedGateResult extends GateResult {
  scores: EnhancedQCScores;
  dialogueAnalysis: {
    clicheCount: number;
    infoDumpScore: number;
    exclamationRatio: number;
    youngMasterPatterns: number;
    breakdown: ReturnType<typeof getQuickDialogueScore>['breakdown'];
  };
}

/**
 * Enhanced QC Gating with dialogue quality checks
 */
export class EnhancedQCGating extends QCGating {
  private enhancedThresholds: EnhancedGatingThresholds;

  constructor(projectId: string, thresholds?: Partial<EnhancedGatingThresholds>) {
    super(projectId, thresholds);
    this.enhancedThresholds = { ...ENHANCED_DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Enhanced evaluation including dialogue quality
   */
  async evaluateEnhanced(
    chapterNumber: number,
    content: string,
    metadata: {
      protagonistPowerLevel?: { realm: string; realmIndex: number };
      arcStartPowerLevel?: { realm: string; realmIndex: number };
      charactersInvolved?: string[];
      deadCharactersMentioned?: string[];
    }
  ): Promise<EnhancedGateResult> {
    // Get base evaluation
    const baseResult = await this.evaluate(chapterNumber, content, metadata);

    // Get dialogue analysis
    const dialogueResult = dialogueAnalyzer.analyzeDialogues(content);
    const dialogueScore = getQuickDialogueScore(content);

    // Calculate enhanced scores
    const dialogueQuality = dialogueScore.score;
    const clicheAvoidance = Math.max(0, 100 - dialogueResult.clicheUsage.totalClicheScore);
    const expositionControl = Math.max(0, 100 - dialogueResult.expositionScore);

    // Add to overall score calculation
    const enhancedOverall = Math.round(
      baseResult.scores.continuity * 0.25 +
      (100 - baseResult.scores.repetition) * 0.15 +
      baseResult.scores.powerSanity * 0.15 +
      baseResult.scores.newInfo * 0.10 +
      baseResult.scores.pacing * 0.10 +
      dialogueQuality * 0.15 +
      clicheAvoidance * 0.05 +
      expositionControl * 0.05
    );

    // Add dialogue-specific failures
    const enhancedFailures = [...baseResult.failures];
    const enhancedWarnings = [...baseResult.warnings];

    if (dialogueQuality < this.enhancedThresholds.dialogueQualityMin) {
      enhancedFailures.push(`Dialogue quality ${dialogueQuality} below minimum ${this.enhancedThresholds.dialogueQualityMin}`);
    }

    if (dialogueResult.clicheUsage.totalClicheScore > this.enhancedThresholds.clicheScoreMax) {
      enhancedWarnings.push(`Cliché score ${dialogueResult.clicheUsage.totalClicheScore} exceeds threshold`);
    }

    if (dialogueResult.expositionScore > this.enhancedThresholds.infoDumpMax) {
      enhancedWarnings.push(`Info-dump score ${dialogueResult.expositionScore}% exceeds threshold`);
    }

    if (dialogueResult.youngMasterCount > 3) {
      enhancedWarnings.push(`Too many young master patterns (${dialogueResult.youngMasterCount})`);
    }

    // Determine action
    let action: EnhancedGateResult['action'] = 'pass';
    let passed = true;

    if (enhancedOverall < this.enhancedThresholds.autoRewriteBelow || enhancedFailures.length >= 2) {
      action = 'auto_rewrite';
      passed = false;
    } else if (enhancedOverall < this.enhancedThresholds.humanReviewBelow || enhancedFailures.length > 0) {
      action = 'human_review';
      passed = false;
    }

    return {
      ...baseResult,
      passed,
      action,
      failures: enhancedFailures,
      warnings: enhancedWarnings,
      scores: {
        ...baseResult.scores,
        overall: enhancedOverall,
        dialogueQuality,
        clicheAvoidance,
        expositionControl,
      },
      dialogueAnalysis: {
        clicheCount: dialogueResult.clicheUsage.extreme.reduce((sum, c) => sum + c.count, 0),
        infoDumpScore: dialogueResult.expositionScore,
        exclamationRatio: dialogueResult.exclamationRatio,
        youngMasterPatterns: dialogueResult.youngMasterCount,
        breakdown: dialogueScore.breakdown,
      },
    };
  }

  /**
   * Generate enhanced rewrite instructions
   */
  generateEnhancedRewriteInstructions(result: EnhancedGateResult): string {
    const baseInstructions = this.generateRewriteInstructions(result);
    const additionalInstructions: string[] = [];

    // Dialogue-specific instructions
    if (result.scores.dialogueQuality < this.enhancedThresholds.dialogueQualityMin) {
      additionalInstructions.push('\n### Dialogue Quality Improvements:');
      
      if (result.dialogueAnalysis.clicheCount > 0) {
        additionalInstructions.push('- Replace cliché phrases like "Ngươi dám!", "Tìm chết!" with unique dialogue');
        additionalInstructions.push('- Give each character a distinctive voice');
      }

      if (result.dialogueAnalysis.infoDumpScore > 20) {
        additionalInstructions.push('- Reduce exposition in dialogue');
        additionalInstructions.push('- Show information through action, not "As you know" dialogue');
      }

      if (result.dialogueAnalysis.exclamationRatio > 40) {
        additionalInstructions.push('- Reduce exclamation marks (!)');
        additionalInstructions.push('- Use description to convey emotion instead');
      }

      if (result.dialogueAnalysis.youngMasterPatterns > 2) {
        additionalInstructions.push('- Diversify antagonist characterization');
        additionalInstructions.push('- Give villains unique motivations beyond "arrogant young master"');
      }
    }

    return baseInstructions + additionalInstructions.join('\n');
  }
}

export function createEnhancedQCGating(
  projectId: string,
  thresholds?: Partial<EnhancedGatingThresholds>
): EnhancedQCGating {
  return new EnhancedQCGating(projectId, thresholds);
}

// ============================================================================
// FULL QC GATING - Integration with Sprint 2/3 features
// ============================================================================

import { WritingStyleAnalyzer, writingStyleAnalyzer, StyleAnalysisResult } from './writing-style-analyzer';
import { BattleVarietyTracker, BattleType, TacticalApproach, CombatElement, BattleOutcome } from './battle-variety';
import { CharacterDepthTracker, CharacterDepthProfile } from './character-depth';

export interface FullGatingThresholds extends EnhancedGatingThresholds {
  // Writing Style
  writingStyleMin: number;        // Default: 55
  showDontTellMin: number;        // Default: 50
  
  // Battle Variety
  battleVarietyMin: number;       // Default: 60
  
  // Character Depth
  characterDepthMin: number;      // Default: 50 (for main characters appearing)
  villainDepthRequired: boolean;  // Default: true
}

export const FULL_DEFAULT_THRESHOLDS: FullGatingThresholds = {
  ...ENHANCED_DEFAULT_THRESHOLDS,
  writingStyleMin: 55,
  showDontTellMin: 50,
  battleVarietyMin: 60,
  characterDepthMin: 50,
  villainDepthRequired: true,
};

export interface FullQCScores extends EnhancedQCScores {
  writingStyle: number;     // 0-100
  showDontTell: number;     // 0-100
  battleVariety: number;    // 0-100 (if battle present)
  characterDepth: number;   // 0-100 (for main characters in chapter)
}

export interface FullGateResult extends EnhancedGateResult {
  scores: FullQCScores;
  styleAnalysis?: StyleAnalysisResult;
  battleAnalysis?: {
    battleType?: BattleType;
    varietyScore: number;
    issues: string[];
    suggestions: string[];
  };
  characterAnalysis?: {
    charactersEvaluated: string[];
    avgDepthScore: number;
    villainsLackingDepth: string[];
    charactersNeedingDevelopment: string[];
  };
}

/**
 * Full QC Gating with all Sprint 1/2/3 integrations
 */
export class FullQCGating extends EnhancedQCGating {
  private fullThresholds: FullGatingThresholds;
  private battleTracker?: BattleVarietyTracker;
  private characterTracker?: CharacterDepthTracker;

  constructor(
    projectId: string,
    thresholds?: Partial<FullGatingThresholds>,
    options?: {
      battleTracker?: BattleVarietyTracker;
      characterTracker?: CharacterDepthTracker;
    }
  ) {
    super(projectId, thresholds);
    this.fullThresholds = { ...FULL_DEFAULT_THRESHOLDS, ...thresholds };
    this.battleTracker = options?.battleTracker;
    this.characterTracker = options?.characterTracker;
  }

  /**
   * Set trackers after initialization
   */
  setTrackers(options: {
    battleTracker?: BattleVarietyTracker;
    characterTracker?: CharacterDepthTracker;
  }): void {
    if (options.battleTracker) this.battleTracker = options.battleTracker;
    if (options.characterTracker) this.characterTracker = options.characterTracker;
  }

  /**
   * Full evaluation with all quality systems
   */
  async evaluateFull(
    chapterNumber: number,
    content: string,
    metadata: {
      protagonistPowerLevel?: { realm: string; realmIndex: number };
      arcStartPowerLevel?: { realm: string; realmIndex: number };
      charactersInvolved?: string[];
      deadCharactersMentioned?: string[];
      // Battle metadata (optional)
      battleInfo?: {
        type: BattleType;
        approach: TacticalApproach;
        elements: CombatElement[];
        outcome: BattleOutcome;
        enemyPowerLevel: string;
      };
    }
  ): Promise<FullGateResult> {
    // Get enhanced evaluation (includes dialogue)
    const enhancedResult = await this.evaluateEnhanced(chapterNumber, content, metadata);

    // Initialize full scores
    const fullScores: FullQCScores = {
      ...enhancedResult.scores,
      writingStyle: 70,
      showDontTell: 70,
      battleVariety: 70,
      characterDepth: 70,
    };

    const additionalFailures: string[] = [];
    const additionalWarnings: string[] = [];

    // ========================================
    // 1. WRITING STYLE ANALYSIS
    // ========================================
    const styleAnalysis = writingStyleAnalyzer.analyzeStyle(content);
    fullScores.writingStyle = styleAnalysis.overallScore;
    fullScores.showDontTell = styleAnalysis.showDontTellScore;

    if (styleAnalysis.overallScore < this.fullThresholds.writingStyleMin) {
      additionalWarnings.push(`Writing style score ${styleAnalysis.overallScore} below threshold ${this.fullThresholds.writingStyleMin}`);
    }

    if (styleAnalysis.showDontTellScore < this.fullThresholds.showDontTellMin) {
      additionalWarnings.push(`Show-don't-tell score ${styleAnalysis.showDontTellScore} below threshold ${this.fullThresholds.showDontTellMin}`);
    }

    // Check for major style issues
    const majorStyleIssues = styleAnalysis.issues.filter(i => i.severity === 'major');
    if (majorStyleIssues.length >= 2) {
      additionalFailures.push(`Multiple major writing style issues: ${majorStyleIssues.map(i => i.type).join(', ')}`);
    }

    // ========================================
    // 2. BATTLE VARIETY ANALYSIS (if battle present)
    // ========================================
    let battleAnalysis: FullGateResult['battleAnalysis'] | undefined;
    
    if (metadata.battleInfo && this.battleTracker) {
      const battleResult = this.battleTracker.analyzeBattle(
        metadata.battleInfo.type,
        metadata.battleInfo.approach,
        metadata.battleInfo.elements,
        chapterNumber
      );

      fullScores.battleVariety = battleResult.varietyScore;
      battleAnalysis = {
        battleType: metadata.battleInfo.type,
        varietyScore: battleResult.varietyScore,
        issues: battleResult.issues,
        suggestions: battleResult.suggestions,
      };

      if (battleResult.varietyScore < this.fullThresholds.battleVarietyMin) {
        additionalWarnings.push(`Battle variety score ${battleResult.varietyScore} below threshold ${this.fullThresholds.battleVarietyMin}`);
      }

      // Check enemy scaling
      const scalingResult = this.battleTracker.validateEnemyScaling(
        metadata.protagonistPowerLevel?.realm || 'unknown',
        metadata.battleInfo.enemyPowerLevel,
        metadata.battleInfo.outcome,
        chapterNumber
      );

      if (!scalingResult.valid) {
        additionalWarnings.push(...scalingResult.issues);
      }
    } else if (this.detectBattleInContent(content)) {
      // Battle detected but no metadata provided
      additionalWarnings.push('Battle scene detected but no battle metadata provided for variety tracking');
    }

    // ========================================
    // 3. CHARACTER DEPTH ANALYSIS
    // ========================================
    let characterAnalysis: FullGateResult['characterAnalysis'] | undefined;

    if (this.characterTracker && metadata.charactersInvolved && metadata.charactersInvolved.length > 0) {
      const charactersEvaluated: string[] = [];
      const depthScores: number[] = [];
      const villainsLackingDepth: string[] = [];
      const charactersNeedingDevelopment: string[] = [];

      for (const charName of metadata.charactersInvolved) {
        const profile = this.characterTracker.getCharacter(charName);
        if (profile) {
          charactersEvaluated.push(charName);
          
          // Calculate depth score based on profile completeness
          const depthScore = this.calculateCharacterDepthScore(profile);
          depthScores.push(depthScore);

          // Check villain depth
          if (profile.role === 'antagonist' && this.fullThresholds.villainDepthRequired) {
            if (!profile.villainProfile || profile.villainProfile.sympatheticElements.length < 2) {
              villainsLackingDepth.push(charName);
            }
          }

          // Check if character needs development
          if (profile.characterArc.growthScore < 30 && profile.role !== 'minor' && profile.role !== 'extra') {
            charactersNeedingDevelopment.push(charName);
          }
        }
      }

      const avgDepthScore = depthScores.length > 0 
        ? Math.round(depthScores.reduce((a, b) => a + b, 0) / depthScores.length)
        : 70;

      fullScores.characterDepth = avgDepthScore;

      characterAnalysis = {
        charactersEvaluated,
        avgDepthScore,
        villainsLackingDepth,
        charactersNeedingDevelopment,
      };

      if (avgDepthScore < this.fullThresholds.characterDepthMin) {
        additionalWarnings.push(`Character depth score ${avgDepthScore} below threshold ${this.fullThresholds.characterDepthMin}`);
      }

      if (villainsLackingDepth.length > 0) {
        additionalWarnings.push(`Villains lacking depth: ${villainsLackingDepth.join(', ')}`);
      }
    }

    // ========================================
    // CALCULATE FINAL SCORE
    // ========================================
    const hasBattle = !!battleAnalysis;
    const hasCharacters = !!characterAnalysis;

    // Weights adjust based on what's present
    let finalOverall: number;
    if (hasBattle && hasCharacters) {
      finalOverall = Math.round(
        enhancedResult.scores.overall * 0.50 +
        fullScores.writingStyle * 0.20 +
        fullScores.battleVariety * 0.15 +
        fullScores.characterDepth * 0.15
      );
    } else if (hasBattle) {
      finalOverall = Math.round(
        enhancedResult.scores.overall * 0.60 +
        fullScores.writingStyle * 0.25 +
        fullScores.battleVariety * 0.15
      );
    } else if (hasCharacters) {
      finalOverall = Math.round(
        enhancedResult.scores.overall * 0.60 +
        fullScores.writingStyle * 0.25 +
        fullScores.characterDepth * 0.15
      );
    } else {
      finalOverall = Math.round(
        enhancedResult.scores.overall * 0.70 +
        fullScores.writingStyle * 0.30
      );
    }

    fullScores.overall = finalOverall;

    // Combine failures and warnings
    const allFailures = [...enhancedResult.failures, ...additionalFailures];
    const allWarnings = [...enhancedResult.warnings, ...additionalWarnings];

    // Determine final action
    let action: FullGateResult['action'] = 'pass';
    let passed = true;

    if (finalOverall < this.fullThresholds.autoRewriteBelow || allFailures.length >= 2) {
      action = 'auto_rewrite';
      passed = false;
    } else if (finalOverall < this.fullThresholds.humanReviewBelow || allFailures.length > 0) {
      action = 'human_review';
      passed = false;
    }

    return {
      ...enhancedResult,
      passed,
      action,
      failures: allFailures,
      warnings: allWarnings,
      scores: fullScores,
      styleAnalysis,
      battleAnalysis,
      characterAnalysis,
    };
  }

  /**
   * Calculate character depth score from profile
   */
  private calculateCharacterDepthScore(profile: CharacterDepthProfile): number {
    let score = 50; // Base score

    // Motivation (+15)
    if (profile.primaryMotivation) score += 5;
    if (profile.secondaryMotivations.length > 0) score += 5;
    if (profile.backstory && profile.backstory.length > 50) score += 5;

    // Personality (+15)
    if (profile.personalityTraits.length >= 3) score += 5;
    if (profile.speechPattern.quirks.length > 0) score += 5;
    if (profile.flaw && profile.strength) score += 5;

    // Distinctiveness (+10)
    if (profile.distinctiveFeatures.mannerisms.length > 0) score += 5;
    if (profile.distinctiveFeatures.habits.length > 0) score += 5;

    // Growth (+10)
    score += Math.min(10, profile.characterArc.growthScore / 10);

    return Math.min(100, score);
  }

  /**
   * Detect if content contains battle scene
   */
  private detectBattleInContent(content: string): boolean {
    const battlePatterns = [
      /chiến đấu/gi, /giao đấu/gi, /đánh nhau/gi, /tấn công/gi,
      /xuất thủ/gi, /công kích/gi, /phòng thủ/gi, /trận đấu/gi,
      /đấu với/gi, /chiếm ưu thế/gi, /bại trận/gi, /thắng trận/gi,
    ];

    return battlePatterns.some(p => p.test(content));
  }

  /**
   * Generate comprehensive rewrite instructions
   */
  generateFullRewriteInstructions(result: FullGateResult): string {
    const baseInstructions = this.generateEnhancedRewriteInstructions(result);
    const additionalInstructions: string[] = [];

    // Writing style instructions
    if (result.styleAnalysis && result.scores.writingStyle < this.fullThresholds.writingStyleMin) {
      additionalInstructions.push('\n### Writing Style Improvements:');
      
      for (const issue of result.styleAnalysis.issues.slice(0, 3)) {
        additionalInstructions.push(`- ${issue.description}`);
        additionalInstructions.push(`  → ${issue.suggestion}`);
      }

      if (result.styleAnalysis.weakVerbs.length > 0) {
        const topWeak = result.styleAnalysis.weakVerbs.slice(0, 3);
        additionalInstructions.push(`- Replace weak verbs: ${topWeak.map(v => `"${v.verb}"`).join(', ')}`);
      }
    }

    // Battle variety instructions
    if (result.battleAnalysis && result.battleAnalysis.issues.length > 0) {
      additionalInstructions.push('\n### Battle Variety Improvements:');
      for (const issue of result.battleAnalysis.issues) {
        additionalInstructions.push(`- ${issue}`);
      }
      if (result.battleAnalysis.suggestions.length > 0) {
        additionalInstructions.push('Suggestions:');
        for (const suggestion of result.battleAnalysis.suggestions) {
          additionalInstructions.push(`  → ${suggestion}`);
        }
      }
    }

    // Character depth instructions
    if (result.characterAnalysis) {
      if (result.characterAnalysis.villainsLackingDepth.length > 0) {
        additionalInstructions.push('\n### Villain Depth Required:');
        for (const villain of result.characterAnalysis.villainsLackingDepth) {
          additionalInstructions.push(`- ${villain}: Add sympathetic elements, backstory motivation`);
        }
      }

      if (result.characterAnalysis.charactersNeedingDevelopment.length > 0) {
        additionalInstructions.push('\n### Character Development Needed:');
        for (const char of result.characterAnalysis.charactersNeedingDevelopment) {
          additionalInstructions.push(`- ${char}: Add growth moment or milestone`);
        }
      }
    }

    return baseInstructions + additionalInstructions.join('\n');
  }
}

export function createFullQCGating(
  projectId: string,
  thresholds?: Partial<FullGatingThresholds>,
  options?: {
    battleTracker?: BattleVarietyTracker;
    characterTracker?: CharacterDepthTracker;
  }
): FullQCGating {
  return new FullQCGating(projectId, thresholds, options);
}
