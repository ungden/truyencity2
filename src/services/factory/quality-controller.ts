/**
 * Quality Controller Service for Story Factory
 * Handles chapter quality checks and auto-rewriting
 */

import { createClient } from '@supabase/supabase-js';
import { GeminiClient, getGeminiClient } from './gemini-client';
import { ChapterWriterService, getChapterWriterService } from './chapter-writer';
import {
  ChapterQualityCheckInput,
  ChapterQualityResult,
  AIAuthorProfile,
  ServiceResult,
  FactoryGenre,
} from './types';

// Genre-specific quality weights
const GENRE_QUALITY_WEIGHTS: Record<FactoryGenre, QualityWeights> = {
  'system-litrpg': {
    pacing: 0.2,
    engagement: 0.3,
    consistency: 0.3,
    length: 0.2,
  },
  'urban-modern': {
    pacing: 0.25,
    engagement: 0.25,
    consistency: 0.25,
    length: 0.25,
  },
  romance: {
    pacing: 0.2,
    engagement: 0.35,
    consistency: 0.25,
    length: 0.2,
  },
  'huyen-huyen': {
    pacing: 0.2,
    engagement: 0.3,
    consistency: 0.3,
    length: 0.2,
  },
  'action-adventure': {
    pacing: 0.3,
    engagement: 0.3,
    consistency: 0.2,
    length: 0.2,
  },
  historical: {
    pacing: 0.2,
    engagement: 0.2,
    consistency: 0.4,
    length: 0.2,
  },
  'tien-hiep': {
    pacing: 0.2,
    engagement: 0.3,
    consistency: 0.3,
    length: 0.2,
  },
  'sci-fi-apocalypse': {
    pacing: 0.25,
    engagement: 0.3,
    consistency: 0.25,
    length: 0.2,
  },
  'horror-mystery': {
    pacing: 0.3,
    engagement: 0.35,
    consistency: 0.2,
    length: 0.15,
  },
};

interface QualityWeights {
  pacing: number;
  engagement: number;
  consistency: number;
  length: number;
}

export class QualityControllerService {
  private gemini: GeminiClient;
  private chapterWriter: ChapterWriterService;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: {
    geminiClient?: GeminiClient;
    chapterWriter?: ChapterWriterService;
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.chapterWriter = options?.chapterWriter || getChapterWriterService();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Check chapter quality
   */
  async checkQuality(input: ChapterQualityCheckInput): Promise<ServiceResult<ChapterQualityResult>> {
    return this.chapterWriter.checkQuality(input);
  }

  /**
   * Calculate weighted quality score based on genre
   */
  calculateWeightedScore(metrics: ChapterQualityResult['metrics'], genre: FactoryGenre): number {
    const weights = GENRE_QUALITY_WEIGHTS[genre] || GENRE_QUALITY_WEIGHTS['urban-modern'];

    const score =
      metrics.pacing_score * weights.pacing +
      metrics.engagement_score * weights.engagement +
      metrics.consistency_score * weights.consistency +
      metrics.length_score * weights.length;

    return Math.round(score * 10) / 10;
  }

  /**
   * Check if chapter needs rewriting
   */
  needsRewrite(qualityResult: ChapterQualityResult, minScore: number = 0.6): boolean {
    return qualityResult.score < minScore * 10;
  }

  /**
   * Auto-rewrite a low quality chapter
   */
  async autoRewrite(
    content: string,
    qualityResult: ChapterQualityResult,
    author: AIAuthorProfile,
    maxAttempts: number = 2
  ): Promise<ServiceResult<{ content: string; attempts: number; finalScore: number }>> {
    let currentContent = content;
    let currentQuality = qualityResult;
    let attempts = 0;

    while (attempts < maxAttempts && this.needsRewrite(currentQuality)) {
      attempts++;

      const rewriteResult = await this.chapterWriter.rewriteChapter(
        currentContent,
        currentQuality.issues,
        currentQuality.suggestions,
        author.persona_prompt
      );

      if (!rewriteResult.success || !rewriteResult.data) {
        return {
          success: false,
          error: rewriteResult.error || 'Rewrite failed',
          errorCode: rewriteResult.errorCode,
        };
      }

      currentContent = rewriteResult.data;

      // Re-check quality
      // Note: We need minimal input here since we don't have full context
      const recheckResult = await this.performBasicQualityCheck(currentContent);
      if (recheckResult.success && recheckResult.data) {
        currentQuality = recheckResult.data;
      }
    }

    return {
      success: true,
      data: {
        content: currentContent,
        attempts,
        finalScore: currentQuality.score,
      },
    };
  }

  /**
   * Perform basic quality check without full blueprint context
   */
  async performBasicQualityCheck(content: string): Promise<ServiceResult<ChapterQualityResult>> {
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const dialogueRatio = this.calculateDialogueRatio(content);

    const prompt = `Đánh giá nhanh chất lượng nội dung sau:

${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

OUTPUT JSON:
{
  "score": 1-10,
  "passed": true/false (>=6 là pass),
  "issues": ["Vấn đề nếu có"],
  "suggestions": ["Gợi ý nếu có"],
  "metrics": {
    "length_score": 1-10,
    "pacing_score": 1-10,
    "dialogue_ratio": 0-1,
    "consistency_score": 1-10,
    "engagement_score": 1-10
  }
}`;

    const result = await this.gemini.generateJSON<ChapterQualityResult>(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    if (!result.success || !result.data) {
      // Return basic score based on length
      const basicScore = Math.min(10, (wordCount / 2500) * 10);
      return {
        success: true,
        data: {
          score: basicScore,
          passed: basicScore >= 6,
          issues: wordCount < 1800 ? ['Nội dung quá ngắn'] : [],
          suggestions: [],
          metrics: {
            length_score: basicScore,
            pacing_score: 7,
            dialogue_ratio: dialogueRatio,
            consistency_score: 7,
            engagement_score: 7,
          },
        },
      };
    }

    result.data.metrics.dialogue_ratio = dialogueRatio;
    return result;
  }

  /**
   * Batch check quality for multiple chapters
   */
  async batchCheckQuality(
    chapters: Array<{ id: string; content: string; genre: FactoryGenre }>
  ): Promise<
    ServiceResult<Array<{ id: string; quality: ChapterQualityResult }>>
  > {
    const results: Array<{ id: string; quality: ChapterQualityResult }> = [];

    for (const chapter of chapters) {
      const result = await this.performBasicQualityCheck(chapter.content);
      if (result.success && result.data) {
        results.push({ id: chapter.id, quality: result.data });
      }
    }

    return { success: true, data: results };
  }

  /**
   * Get quality statistics from database
   */
  async getQualityStats(days: number = 7): Promise<
    ServiceResult<{
      avgScore: number;
      totalChecked: number;
      passRate: number;
      rewriteRate: number;
      byGenre: Record<string, { avg: number; count: number }>;
    }>
  > {
    const supabase = this.getSupabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('chapter_write_queue')
      .select('quality_score, production_id')
      .gte('completed_at', startDate.toISOString())
      .not('quality_score', 'is', null);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          avgScore: 0,
          totalChecked: 0,
          passRate: 0,
          rewriteRate: 0,
          byGenre: {},
        },
      };
    }

    const scores = data.map((d) => d.quality_score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passCount = scores.filter((s) => s >= 6).length;
    const rewriteCount = scores.filter((s) => s < 6).length;

    return {
      success: true,
      data: {
        avgScore: Math.round(avgScore * 100) / 100,
        totalChecked: data.length,
        passRate: Math.round((passCount / data.length) * 100),
        rewriteRate: Math.round((rewriteCount / data.length) * 100),
        byGenre: {}, // Would need to join with blueprints for genre data
      },
    };
  }

  /**
   * Flag chapter for manual review
   */
  async flagForReview(
    chapterId: string,
    reason: string
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    // Add to a review queue or flag in chapter_write_queue
    await supabase.from('factory_errors').insert({
      chapter_number: null,
      error_type: 'quality_failure',
      error_message: `Manual review needed: ${reason}`,
      error_details: { chapter_id: chapterId, reason },
      severity: 'warning',
      requires_attention: true,
    });

    return { success: true };
  }

  /**
   * Check for consistency issues across chapters
   */
  async checkConsistency(
    novelId: string,
    chapterNumber: number,
    newContent: string
  ): Promise<ServiceResult<{ consistent: boolean; issues: string[] }>> {
    const supabase = this.getSupabase();

    // Get recent chapters for context
    const { data: recentChapters, error } = await supabase
      .from('chapters')
      .select('content')
      .eq('novel_id', novelId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(3);

    if (error || !recentChapters?.length) {
      // No previous chapters to check against
      return { success: true, data: { consistent: true, issues: [] } };
    }

    const previousContext = recentChapters
      .map((c) => c.content?.substring(0, 1000) || '')
      .join('\n---\n');

    const prompt = `Kiểm tra tính nhất quán giữa nội dung mới và các chương trước:

CHƯƠNG TRƯỚC (tóm tắt):
${previousContext.substring(0, 2000)}

CHƯƠNG MỚI:
${newContent.substring(0, 2000)}

Kiểm tra:
1. Tên nhân vật có nhất quán không?
2. Vị trí/địa điểm có hợp lý không?
3. Timeline có logic không?
4. Chi tiết quan trọng có bị mâu thuẫn không?

OUTPUT JSON:
{
  "consistent": true/false,
  "issues": ["Vấn đề 1", "Vấn đề 2"] hoặc []
}`;

    const result = await this.gemini.generateJSON<{ consistent: boolean; issues: string[] }>(
      prompt,
      { temperature: 0.3, maxOutputTokens: 512 }
    );

    if (!result.success || !result.data) {
      // Assume consistent if check fails
      return { success: true, data: { consistent: true, issues: [] } };
    }

    return { success: true, data: result.data };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private calculateDialogueRatio(content: string): number {
    const dialogueMarkers = (content.match(/[""「」『』]/g) || []).length;
    const totalChars = content.length;
    return Math.min(1, dialogueMarkers / (totalChars / 100));
  }
}

// Singleton instance
let qualityControllerInstance: QualityControllerService | null = null;

export function getQualityControllerService(): QualityControllerService {
  if (!qualityControllerInstance) {
    qualityControllerInstance = new QualityControllerService();
  }
  return qualityControllerInstance;
}

export function createQualityControllerService(options?: {
  geminiClient?: GeminiClient;
  chapterWriter?: ChapterWriterService;
  supabaseUrl?: string;
  supabaseKey?: string;
}): QualityControllerService {
  return new QualityControllerService(options);
}
