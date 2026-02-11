/**
 * Auto-Rewriter - Automatically rewrites chapters that fail QC
 *
 * When QC score < threshold:
 * 1. Generate rewrite instructions based on failures
 * 2. Rewrite with focused fixes
 * 3. Re-evaluate
 * 4. Max 3 attempts before flagging for human review
 */

import { ChapterWriter } from './chapter';
import { QCGating, GateResult, FullQCGating } from './qc-gating';
import { CanonResolver } from './canon-resolver';
import { BeatLedger } from './beat-ledger';
import { WorldBible, StyleBible, StoryArc, ChapterResult } from './types';
import { getSupabase } from './supabase-helper';
import { BattleVarietyTracker } from './battle-variety';
import { CharacterDepthTracker } from './character-depth';
import { logger } from '@/lib/security/logger';

export interface RewriteConfig {
  maxAttempts: number;           // Max rewrite attempts (default: 3)
  minScoreImprovement: number;   // Minimum score improvement to continue (default: 5)
  targetScore: number;           // Target score to achieve (default: 70)
  saveAllVersions: boolean;      // Save all versions for comparison (default: true)
}

export const DEFAULT_REWRITE_CONFIG: RewriteConfig = {
  maxAttempts: 3,
  minScoreImprovement: 5,
  targetScore: 70,
  saveAllVersions: true,
};

export interface RewriteResult {
  success: boolean;
  finalContent: string;
  finalTitle: string;
  finalScore: number;
  attempts: number;
  history: Array<{
    attempt: number;
    score: number;
    action: string;
    improvements: string[];
    failures: string[];
  }>;
  needsHumanReview: boolean;
  reviewReason?: string;
}

export class AutoRewriter {
  private projectId: string;
  private config: RewriteConfig;
  private chapterWriter: ChapterWriter;
  private qcGating: QCGating;
  private beatLedger: BeatLedger;

  constructor(
    projectId: string,
    chapterWriter: ChapterWriter,
    qcGating: QCGating,
    canonResolver: CanonResolver,
    beatLedger: BeatLedger,
    config?: Partial<RewriteConfig>
  ) {
    this.projectId = projectId;
    this.config = { ...DEFAULT_REWRITE_CONFIG, ...config };
    this.chapterWriter = chapterWriter;
    this.qcGating = qcGating;
    this.beatLedger = beatLedger;
  }

  /**
   * Attempt to rewrite a chapter until it passes QC or max attempts reached
   */
  async rewriteUntilPass(
    chapterNumber: number,
    originalContent: string,
    originalTitle: string,
    originalQCResult: GateResult,
    context: {
      worldBible: WorldBible;
      styleBible: StyleBible;
      currentArc?: StoryArc;
      previousSummary: string;
      protagonistName: string;
    }
  ): Promise<RewriteResult> {
    const history: RewriteResult['history'] = [];
    let currentContent = originalContent;
    let currentTitle = originalTitle;
    let currentScore = originalQCResult.scores.overall;
    let lastQCResult = originalQCResult;

    // Record initial state
    history.push({
      attempt: 0,
      score: currentScore,
      action: 'original',
      improvements: [],
      failures: originalQCResult.failures,
    });

    // If already passes, return immediately
    if (originalQCResult.passed) {
      return {
        success: true,
        finalContent: currentContent,
        finalTitle: currentTitle,
        finalScore: currentScore,
        attempts: 0,
        history,
        needsHumanReview: false,
      };
    }

    // Rewrite loop
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {

      // Generate rewrite instructions
      const instructions = this.generateRewriteInstructions(lastQCResult, attempt);

      // Rewrite the chapter
      const rewriteResult = await this.performRewrite(
        chapterNumber,
        currentContent,
        currentTitle,
        instructions,
        context
      );

      if (!rewriteResult.success || !rewriteResult.data) {
        // Rewrite failed, continue with current version
        history.push({
          attempt,
          score: currentScore,
          action: 'rewrite_failed',
          improvements: [],
          failures: [`Rewrite API failed: ${rewriteResult.error}`],
        });
        continue;
      }

      // Evaluate the new version
      const newQCResult = await this.qcGating.evaluate(
        chapterNumber,
        rewriteResult.data.content,
        {
          charactersInvolved: this.extractCharacters(rewriteResult.data.content, context.protagonistName),
        }
      );

      const newScore = newQCResult.scores.overall;
      const improvement = newScore - currentScore;

      // Record this attempt
      history.push({
        attempt,
        score: newScore,
        action: newQCResult.passed ? 'passed' : (improvement > 0 ? 'improved' : 'no_improvement'),
        improvements: this.identifyImprovements(lastQCResult, newQCResult),
        failures: newQCResult.failures,
      });

      // Save version if configured
      if (this.config.saveAllVersions) {
        await this.saveRewriteVersion(
          chapterNumber,
          attempt,
          rewriteResult.data.content,
          rewriteResult.data.title,
          newScore
        );
      }

      // Check if passed
      if (newQCResult.passed || newScore >= this.config.targetScore) {
        return {
          success: true,
          finalContent: rewriteResult.data.content,
          finalTitle: rewriteResult.data.title,
          finalScore: newScore,
          attempts: attempt,
          history,
          needsHumanReview: false,
        };
      }

      // Check if improving enough to continue
      if (improvement < this.config.minScoreImprovement && attempt > 1) {
        // Not improving, stop early
        return {
          success: false,
          finalContent: currentContent,
          finalTitle: currentTitle,
          finalScore: currentScore,
          attempts: attempt,
          history,
          needsHumanReview: true,
          reviewReason: `Score not improving (last improvement: ${improvement})`,
        };
      }

      // Update for next iteration - only update lastQCResult if score improved
      // to avoid generating rewrite instructions based on a worse version
      if (newScore > currentScore) {
        currentContent = rewriteResult.data.content;
        currentTitle = rewriteResult.data.title;
        currentScore = newScore;
        lastQCResult = newQCResult;
      }
    }

    // Max attempts reached
    return {
      success: false,
      finalContent: currentContent,
      finalTitle: currentTitle,
      finalScore: currentScore,
      attempts: this.config.maxAttempts,
      history,
      needsHumanReview: true,
      reviewReason: `Max attempts (${this.config.maxAttempts}) reached, best score: ${currentScore}`,
    };
  }

  /**
   * Generate specific rewrite instructions based on QC failures
   */
  private generateRewriteInstructions(qcResult: GateResult, attemptNumber: number): string {
    const instructions: string[] = [
      `## Rewrite Instructions (Attempt ${attemptNumber})`,
      '',
      'Vui lòng viết lại chương này để khắc phục các vấn đề sau:',
      '',
    ];

    // Prioritize by severity
    const { details, scores } = qcResult;

    // Continuity issues (highest priority)
    if (scores.continuity < 70 && details.continuityIssues.length > 0) {
      instructions.push('### 🔴 Vấn đề liên tục (QUAN TRỌNG):');
      for (const issue of details.continuityIssues) {
        instructions.push(`- ${issue}`);
      }
      instructions.push('');
    }

    // Repetition issues
    if (scores.repetition > 30 && details.repetitiveElements.length > 0) {
      instructions.push('### 🟠 Tránh lặp lại:');
      for (const elem of details.repetitiveElements.slice(0, 3)) {
        instructions.push(`- Thay đổi hoặc bỏ: ${elem}`);
      }
      instructions.push('');
    }

    // Power issues
    if (scores.powerSanity < 70 && details.powerProblems.length > 0) {
      instructions.push('### 🟠 Vấn đề sức mạnh:');
      for (const prob of details.powerProblems) {
        instructions.push(`- ${prob}`);
      }
      instructions.push('');
    }

    // Missing progression
    if (scores.newInfo < 50 && details.missingProgression.length > 0) {
      instructions.push('### 🟡 Thêm tiến triển:');
      instructions.push('Cần bổ sung ít nhất 2 trong các yếu tố sau:');
      for (const miss of details.missingProgression.slice(0, 4)) {
        instructions.push(`- ${miss}`);
      }
      instructions.push('');
    }

    // Pacing issues
    if (scores.pacing < 70 && details.pacingIssues.length > 0) {
      instructions.push('### 🟡 Điều chỉnh nhịp độ:');
      for (const issue of details.pacingIssues) {
        instructions.push(`- ${issue}`);
      }
      instructions.push('');
    }

    // Add beat recommendations if repetitive
    if (scores.repetition > 30) {
      const beatRecs = this.beatLedger.getRecommendations(0);
      if (beatRecs.suggested.length > 0) {
        instructions.push('### Gợi ý beats thay thế:');
        instructions.push(`Có thể dùng: ${beatRecs.suggested.slice(0, 3).join(', ')}`);
        instructions.push(`Tránh dùng: ${beatRecs.avoid.slice(0, 3).join(', ')}`);
        instructions.push('');
      }
    }

    // Final note
    instructions.push('---');
    instructions.push('GIỮ NGUYÊN: Cốt truyện chính, nhân vật, và các sự kiện quan trọng.');
    instructions.push('CHỈ SỬA: Các vấn đề được liệt kê ở trên.');

    return instructions.join('\n');
  }

  /**
   * Perform the actual rewrite
   */
  private async performRewrite(
    chapterNumber: number,
    currentContent: string,
    currentTitle: string,
    instructions: string,
    context: {
      worldBible: WorldBible;
      styleBible: StyleBible;
      currentArc?: StoryArc;
      previousSummary: string;
    }
  ): Promise<ChapterResult> {
    // Build rewrite prompt
    const rewritePrompt = `
${instructions}

## Nội dung hiện tại cần sửa:

### Tiêu đề: ${currentTitle}

${currentContent}

---

Hãy viết lại chương này, giữ nguyên cốt truyện nhưng khắc phục các vấn đề đã nêu.
Đảm bảo giữ nguyên hoặc tăng độ dài so với bản gốc.
`;

    // Use the chapter writer with rewrite context
    if (context.currentArc) {
      return this.chapterWriter.writeChapter(chapterNumber, {
        worldBible: context.worldBible,
        styleBible: context.styleBible,
        currentArc: context.currentArc,
        previousSummary: `${context.previousSummary}\n\n${rewritePrompt}`,
      });
    } else {
      return this.chapterWriter.writeChapterSimple(chapterNumber, {
        worldBible: context.worldBible,
        styleBible: context.styleBible,
        previousSummary: `${context.previousSummary}\n\n${rewritePrompt}`,
      });
    }
  }

  /**
   * Save a rewrite version for comparison
   */
  private async saveRewriteVersion(
    chapterNumber: number,
    attemptNumber: number,
    content: string,
    title: string,
    score: number
  ): Promise<void> {
    const supabase = getSupabase();
    try {
      await supabase
        .from('qc_results')
        .upsert({
          project_id: this.projectId,
          chapter_number: chapterNumber,
          overall_score: score,
          rewrite_count: attemptNumber,
          details: {
            title,
            content_preview: content.substring(0, 500),
            saved_at: new Date().toISOString(),
          },
        }, {
          onConflict: 'project_id,chapter_number',
        });
    } catch (e) {
      logger.warn('QC result persistence failed (non-fatal)', {
        projectId: this.projectId,
        chapterNumber,
        attemptNumber,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /**
   * Identify what improved between two QC results
   */
  private identifyImprovements(before: GateResult, after: GateResult): string[] {
    const improvements: string[] = [];

    if (after.scores.continuity > before.scores.continuity) {
      improvements.push(`Continuity: ${before.scores.continuity} → ${after.scores.continuity}`);
    }
    if (after.scores.repetition < before.scores.repetition) {
      improvements.push(`Repetition: ${before.scores.repetition} → ${after.scores.repetition}`);
    }
    if (after.scores.powerSanity > before.scores.powerSanity) {
      improvements.push(`Power: ${before.scores.powerSanity} → ${after.scores.powerSanity}`);
    }
    if (after.scores.newInfo > before.scores.newInfo) {
      improvements.push(`New Info: ${before.scores.newInfo} → ${after.scores.newInfo}`);
    }
    if (after.scores.pacing > before.scores.pacing) {
      improvements.push(`Pacing: ${before.scores.pacing} → ${after.scores.pacing}`);
    }

    return improvements;
  }

  /**
   * Simple character extraction
   */
  private extractCharacters(content: string, protagonistName: string): string[] {
    const characters = new Set<string>([protagonistName]);

    // Extract names after honorifics
    const honorifics = ['lão', 'tiểu', 'đại ca', 'sư huynh', 'sư đệ'];
    for (const h of honorifics) {
      const pattern = new RegExp(`${h}\\s+([\\p{L}]+)`, 'gui');
      const matches = content.matchAll(pattern);
      for (const m of matches) {
        if (m[1] && m[1].length > 1 && m[1].length < 15) {
          characters.add(m[1]);
        }
      }
    }

    return Array.from(characters).slice(0, 10);
  }
}

export function createAutoRewriter(
  projectId: string,
  chapterWriter: ChapterWriter,
  qcGating: QCGating,
  canonResolver: CanonResolver,
  beatLedger: BeatLedger,
  config?: Partial<RewriteConfig>
): AutoRewriter {
  return new AutoRewriter(projectId, chapterWriter, qcGating, canonResolver, beatLedger, config);
}

/**
 * Create an AutoRewriter with FullQCGating (includes writing style, battle variety, character depth)
 */
export function createFullAutoRewriter(
  projectId: string,
  chapterWriter: ChapterWriter,
  canonResolver: CanonResolver,
  beatLedger: BeatLedger,
  options?: {
    battleTracker?: BattleVarietyTracker;
    characterTracker?: CharacterDepthTracker;
    config?: Partial<RewriteConfig>;
  }
): AutoRewriter {
  const fullQCGating = new FullQCGating(projectId, undefined, {
    battleTracker: options?.battleTracker,
    characterTracker: options?.characterTracker,
  });
  
  return new AutoRewriter(
    projectId,
    chapterWriter,
    fullQCGating,
    canonResolver,
    beatLedger,
    options?.config
  );
}
