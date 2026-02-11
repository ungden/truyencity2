/**
 * Chapter Writer Service for Story Factory
 * Writes chapters using Gemini AI with author personas
 */

import { createClient } from '@supabase/supabase-js';
import { GeminiClient, getGeminiClient } from './gemini-client';
import {
  StoryBlueprint,
  ProductionQueueItem,
  ChapterWriteQueueItem,
  ChapterGenerationInput,
  ChapterQualityCheckInput,
  ChapterQualityResult,
  ServiceResult,
  ArcOutline,
  PlotPoint,
} from './types';

// Minimum chapter length (characters)
const MIN_CHAPTER_LENGTH = 1800;
// Target chapter length
const TARGET_CHAPTER_LENGTH = 2500;
// Maximum chapter length
const MAX_CHAPTER_LENGTH = 4000;

// Dopamine types for variety
const DOPAMINE_TYPES = [
  'face_slap', // Antagonist embarrassed
  'power_reveal', // MC shows hidden power
  'treasure_gain', // MC gets good loot
  'breakthrough', // MC levels up
  'revenge', // MC gets payback
  'recognition', // MC gets acknowledged
  'beauty_charm', // Romance moment
  'enemy_shock', // Enemies shocked by MC
  'underdog_victory', // MC wins against odds
  'hidden_identity', // Identity reveal
];

export class ChapterWriterService {
  private gemini: GeminiClient;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: {
    geminiClient?: GeminiClient;
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Write a single chapter
   */
  async writeChapter(input: ChapterGenerationInput): Promise<ServiceResult<WrittenChapter>> {
    const {
      blueprint,
      production,
      chapter_number,
      previous_chapters_summary,
      plot_objectives,
      tension_target,
      special_instructions,
      author_persona,
    } = input;

    try {
      // Get arc info for this chapter
      const currentArc = this.getCurrentArc(blueprint.arc_outlines, chapter_number);
      const plotPoints = this.getRelevantPlotPoints(blueprint.major_plot_points, chapter_number);
      const twist = this.getChapterTwist(blueprint.planned_twists, chapter_number);

      // Build chapter prompt
      const prompt = this.buildChapterPrompt({
        blueprint,
        production,
        chapter_number,
        previous_summary: previous_chapters_summary,
        plot_objectives,
        tension_target,
        special_instructions,
        currentArc,
        plotPoints,
        twist,
      });

      // Generate chapter content
      const startTime = Date.now();
      const result = await this.gemini.generateWithRetry(prompt, {
        temperature: 0.85, // High creativity for narrative
        maxOutputTokens: 8192,
        systemInstruction: author_persona,
        maxRetries: 3,
        retryDelay: 2000,
      });

      const generationTime = Date.now() - startTime;

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to generate chapter',
          errorCode: result.errorCode,
        };
      }

      const content = result.data.content;
      const wordCount = this.countWords(content);

      // Extract chapter title from content (first line often is title)
      const { title, body } = this.extractTitleAndBody(content, chapter_number);

      // Generate chapter summary for context
      const summaryResult = await this.generateChapterSummary(body, chapter_number);

      const chapter: WrittenChapter = {
        chapter_number,
        title,
        content: body,
        word_count: wordCount,
        summary: summaryResult.success ? summaryResult.data || '' : '',
        generation_time_ms: generationTime,
        tokens_used: result.data.usage.totalTokens,
      };

      return {
        success: true,
        data: chapter,
      };
    } catch (error) {
      console.error('[ChapterWriterService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CHAPTER_WRITE_ERROR',
      };
    }
  }

  /**
   * Rewrite a chapter with specific instructions
   */
  async rewriteChapter(
    originalContent: string,
    issues: string[],
    suggestions: string[],
    author_persona: string
  ): Promise<ServiceResult<string>> {
    const prompt = `REWRITE yêu cầu:

NỘI DUNG GỐC:
${originalContent.substring(0, 3000)}...

VẤN ĐỀ CẦN SỬA:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

GỢI Ý CẢI THIỆN:
${suggestions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

YÊU CẦU:
1. Giữ nguyên cốt truyện và nhân vật
2. Sửa các vấn đề được liệt kê
3. Áp dụng các gợi ý cải thiện
4. Độ dài tương đương hoặc dài hơn bản gốc
5. Tăng yếu tố dopamine và engagement

OUTPUT: Chỉ nội dung chương đã được viết lại, không giải thích.`;

    const result = await this.gemini.generateWithRetry(prompt, {
      temperature: 0.8,
      maxOutputTokens: 8192,
      systemInstruction: author_persona,
      maxRetries: 2,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      };
    }

    return {
      success: true,
      data: result.data.content,
    };
  }

  /**
   * Generate chapter summary for context memory
   */
  async generateChapterSummary(
    content: string,
    chapter_number: number
  ): Promise<ServiceResult<string>> {
    const prompt = `Tóm tắt chương ${chapter_number} trong 3-5 câu, bao gồm:
- Sự kiện chính
- Thay đổi của nhân vật (vị trí, trạng thái, cảm xúc)
- Các plot thread được mở/đóng
- Cliffhanger nếu có

NỘI DUNG CHƯƠNG:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

OUTPUT: Chỉ tóm tắt, không giải thích.`;

    const result = await this.gemini.generate(prompt, {
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      };
    }

    return {
      success: true,
      data: result.data.content,
    };
  }

  /**
   * Check chapter quality
   */
  async checkQuality(input: ChapterQualityCheckInput): Promise<ServiceResult<ChapterQualityResult>> {
    const { content, chapter_number, genre, blueprint, min_quality_score } = input;

    // Basic checks
    const wordCount = this.countWords(content);
    const dialogueRatio = this.calculateDialogueRatio(content);

    // AI quality check
    const prompt = `Đánh giá chất lượng chương ${chapter_number} của truyện thể loại ${genre}:

NỘI DUNG:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

BLUEPRINT INFO:
- Nhân vật chính: ${blueprint.protagonist?.name || 'N/A'}
- Arc hiện tại: ${this.getCurrentArc(blueprint.arc_outlines, chapter_number)?.title || 'N/A'}

ĐÁNH GIÁ CÁC TIÊU CHÍ (0-10):
1. length_score: Độ dài phù hợp (target: 2500 từ)
2. pacing_score: Nhịp độ câu chuyện
3. consistency_score: Nhất quán với blueprint và các chương trước
4. engagement_score: Độ hấp dẫn, dopamine

OUTPUT JSON:
{
  "score": 0-10,
  "passed": true/false,
  "issues": ["Vấn đề 1", "Vấn đề 2"],
  "suggestions": ["Gợi ý 1", "Gợi ý 2"],
  "metrics": {
    "length_score": 0-10,
    "pacing_score": 0-10,
    "dialogue_ratio": 0-1,
    "consistency_score": 0-10,
    "engagement_score": 0-10
  }
}`;

    const result = await this.gemini.generateJSON<QualityCheckResponse>(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    if (!result.success || !result.data) {
      // Fallback to basic quality check
      const basicScore = this.calculateBasicQualityScore(wordCount, dialogueRatio);
      return {
        success: true,
        data: {
          score: basicScore,
          passed: basicScore >= min_quality_score * 10,
          issues: wordCount < MIN_CHAPTER_LENGTH ? ['Chương quá ngắn'] : [],
          suggestions: [],
          metrics: {
            length_score: Math.min(10, (wordCount / TARGET_CHAPTER_LENGTH) * 10),
            pacing_score: 7,
            dialogue_ratio: dialogueRatio,
            consistency_score: 7,
            engagement_score: 7,
          },
        },
      };
    }

    const response = result.data;
    response.metrics.dialogue_ratio = dialogueRatio;
    response.passed = response.score >= min_quality_score * 10;

    return {
      success: true,
      data: response,
    };
  }

  /**
   * Save chapter to database
   */
  async saveChapter(
    novelId: string,
    chapter: WrittenChapter
  ): Promise<ServiceResult<{ chapterId: string }>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        novel_id: novelId,
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content,
        word_count: chapter.word_count,
        status: 'draft', // Will be published by scheduler
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ChapterWriterService] Save error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: { chapterId: data.id },
    };
  }

  /**
   * Update write queue item status
   */
  async updateWriteQueueStatus(
    queueItemId: string,
    status: ChapterWriteQueueItem['status'],
    result?: {
      chapter_id?: string;
      content_preview?: string;
      word_count?: number;
      quality_score?: number;
      error_message?: string;
    }
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const updateData: Partial<ChapterWriteQueueItem> = {
      status,
      ...(status === 'writing' && { started_at: new Date().toISOString() }),
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(result?.chapter_id && { result_chapter_id: result.chapter_id }),
      ...(result?.content_preview && { content_preview: result.content_preview }),
      ...(result?.word_count && { word_count: result.word_count }),
      ...(result?.quality_score && { quality_score: result.quality_score }),
      ...(result?.error_message && { error_message: result.error_message }),
    };

    const { error } = await supabase
      .from('chapter_write_queue')
      .update(updateData)
      .eq('id', queueItemId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Get pending chapters to write
   */
  async getPendingChapters(limit: number = 10): Promise<ServiceResult<ChapterWriteQueueItem[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('chapter_write_queue')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_time', { ascending: true })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as ChapterWriteQueueItem[],
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private buildChapterPrompt(params: {
    blueprint: StoryBlueprint;
    production: ProductionQueueItem;
    chapter_number: number;
    previous_summary: string;
    plot_objectives: string;
    tension_target: number;
    special_instructions?: string;
    currentArc: ArcOutline | null;
    plotPoints: PlotPoint[];
    twist: { description: string; foreshadowing: boolean } | null;
  }): string {
    const {
      blueprint,
      production,
      chapter_number,
      previous_summary,
      plot_objectives,
      tension_target,
      special_instructions,
      currentArc,
      plotPoints,
      twist,
    } = params;

    // Determine dopamine level based on tension target
    const dopamineLevel = tension_target > 70 ? 'HIGH' : tension_target > 40 ? 'MEDIUM' : 'LOW';
    const recommendedDopamine =
      dopamineLevel === 'HIGH'
        ? this.getRandomDopamineTypes(2)
        : dopamineLevel === 'MEDIUM'
          ? this.getRandomDopamineTypes(1)
          : [];

    return `VIẾT CHƯƠNG ${chapter_number} - ${blueprint.title}

=== THÔNG TIN TRUYỆN ===
Thể loại: ${blueprint.genre}
Nhân vật chính: ${blueprint.protagonist?.name} - ${blueprint.protagonist?.personality?.substring(0, 100)}
Thế giới: ${blueprint.world_name}
Hệ thống sức mạnh: ${blueprint.power_system?.name || 'N/A'}

=== CONTEXT TỪ CHƯƠNG TRƯỚC ===
${previous_summary || 'Đây là chương đầu tiên'}

=== RUNNING PLOT THREADS ===
${production.running_plot_threads?.map((t) => `- ${t.name}: ${t.status}`).join('\n') || 'Chưa có'}

=== ARC HIỆN TẠI ===
${currentArc ? `${currentArc.title} (Chương ${currentArc.start_chapter}-${currentArc.end_chapter})\n${currentArc.summary}` : 'Arc 1'}

=== MỤC TIÊU CHƯƠNG NÀY ===
${plot_objectives || 'Phát triển câu chuyện tự nhiên'}

${plotPoints.length > 0 ? `=== PLOT POINTS CẦN ĐẠT ===\n${plotPoints.map((p) => `- ${p.event}: ${p.impact}`).join('\n')}` : ''}

${twist ? `=== TWIST ===\n${twist.foreshadowing ? 'FORESHADOWING: ' : 'THỰC HIỆN: '}${twist.description}` : ''}

=== DOPAMINE LEVEL: ${dopamineLevel} ===
${recommendedDopamine.length > 0 ? `Gợi ý dopamine: ${recommendedDopamine.join(', ')}` : 'Chương build-up, tích lũy tension'}
Tension target: ${tension_target}/100

=== YÊU CẦU VIẾT ===
1. Độ dài: ${TARGET_CHAPTER_LENGTH} từ (tối thiểu ${MIN_CHAPTER_LENGTH}, tối đa ${MAX_CHAPTER_LENGTH})
2. Bắt đầu với tiêu đề chương: "Chương ${chapter_number}: [Tiêu đề hấp dẫn]"
3. Dialogue chiếm 35-50% nội dung
4. Kết thúc với cliffhanger hoặc hook cho chương tiếp
5. Show don't tell - miêu tả qua hành động, không info dump
6. Nhất quán với tính cách nhân vật và world rules
7. FORMAT ĐỐI THOẠI BẮT BUỘC: Lời thoại dùng dấu gạch ngang dài (—) đầu dòng mới. Tường thuật xen giữa dùng — để ngắt. KHÔNG dùng dấu ngoặc kép. KHÔNG viết lời thoại chìm trong đoạn miêu tả.

${special_instructions ? `=== CHỈ DẪN THÊM ===\n${special_instructions}` : ''}

=== OUTPUT ===
Viết chương ${chapter_number} đầy đủ bằng tiếng Việt. Bắt đầu với dòng tiêu đề.`;
  }

  private getCurrentArc(arcs: ArcOutline[], chapterNumber: number): ArcOutline | null {
    if (!arcs || arcs.length === 0) return null;
    return (
      arcs.find((arc) => chapterNumber >= arc.start_chapter && chapterNumber <= arc.end_chapter) ||
      arcs[0]
    );
  }

  private getRelevantPlotPoints(plotPoints: PlotPoint[], chapterNumber: number): PlotPoint[] {
    if (!plotPoints) return [];
    // Get plot points within 5 chapters of current
    return plotPoints.filter(
      (p) => p.chapter >= chapterNumber - 2 && p.chapter <= chapterNumber + 2
    );
  }

  private getChapterTwist(
    twists: StoryBlueprint['planned_twists'],
    chapterNumber: number
  ): { description: string; foreshadowing: boolean } | null {
    if (!twists) return null;

    // Check if this chapter should execute a twist
    const executeTwist = twists.find((t) => t.target_chapter === chapterNumber);
    if (executeTwist) {
      return { description: executeTwist.description, foreshadowing: false };
    }

    // Check if this chapter should foreshadow a twist
    const foreshadowTwist = twists.find(
      (t) =>
        t.foreshadowing_start <= chapterNumber &&
        t.target_chapter > chapterNumber &&
        chapterNumber - t.foreshadowing_start < 10 // Within first 10 chapters of foreshadowing
    );
    if (foreshadowTwist) {
      return {
        description: `Gợi ý nhẹ về: ${foreshadowTwist.twist_type}`,
        foreshadowing: true,
      };
    }

    return null;
  }

  private getRandomDopamineTypes(count: number): string[] {
    const shuffled = [...DOPAMINE_TYPES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private extractTitleAndBody(
    content: string,
    chapterNumber: number
  ): { title: string; body: string } {
    const lines = content.split('\n');
    let title = `Chương ${chapterNumber}`;
    let bodyStartIndex = 0;

    // Look for chapter title in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (
        line.toLowerCase().includes(`chương ${chapterNumber}`) ||
        line.toLowerCase().startsWith('chương ')
      ) {
        // Extract title after colon if present
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          title = line.substring(colonIndex + 1).trim() || title;
        } else {
          title = line;
        }
        bodyStartIndex = i + 1;
        break;
      }
    }

    const body = lines.slice(bodyStartIndex).join('\n').trim();
    return { title, body };
  }

  private countWords(text: string): number {
    // Vietnamese word counting (approximate)
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  private calculateDialogueRatio(content: string): number {
    // Count dialogue markers
    const dialogueMarkers = (content.match(/[""「」『』]/g) || []).length;
    const totalChars = content.length;
    // Rough estimate: dialogue markers indicate dialogue sections
    return Math.min(1, dialogueMarkers / (totalChars / 100));
  }

  private calculateBasicQualityScore(wordCount: number, dialogueRatio: number): number {
    let score = 7; // Base score

    // Length scoring
    if (wordCount >= TARGET_CHAPTER_LENGTH) {
      score += 1;
    } else if (wordCount < MIN_CHAPTER_LENGTH) {
      score -= 2;
    }

    // Dialogue ratio (35-50% is ideal)
    if (dialogueRatio >= 0.35 && dialogueRatio <= 0.5) {
      score += 1;
    } else if (dialogueRatio < 0.2 || dialogueRatio > 0.7) {
      score -= 1;
    }

    return Math.max(1, Math.min(10, score));
  }
}

// Types for internal use
interface WrittenChapter {
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  summary: string;
  generation_time_ms: number;
  tokens_used: number;
}

interface QualityCheckResponse {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  metrics: {
    length_score: number;
    pacing_score: number;
    dialogue_ratio: number;
    consistency_score: number;
    engagement_score: number;
  };
}

// Singleton instance
let chapterWriterInstance: ChapterWriterService | null = null;

export function getChapterWriterService(): ChapterWriterService {
  if (!chapterWriterInstance) {
    chapterWriterInstance = new ChapterWriterService();
  }
  return chapterWriterInstance;
}

export function createChapterWriterService(options?: {
  geminiClient?: GeminiClient;
  supabaseUrl?: string;
  supabaseKey?: string;
}): ChapterWriterService {
  return new ChapterWriterService(options);
}
