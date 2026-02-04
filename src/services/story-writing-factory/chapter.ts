/**
 * Story Writing Factory - Chapter Writer
 *
 * Tinh hoa từ:
 * - _legacy/dopamine-writing-optimizer.ts (3-agent workflow)
 * - _legacy/ai-story-writer.ts (writing logic)
 *
 * 3-Agent Pipeline: Architect → Writer → Critic
 *
 * Optimizations (v2):
 * - Enforced word count targets with continuation requests
 * - Robust JSON parsing (handles comments, trailing commas)
 * - Critic sees full content + strict scoring
 * - finishReason check for truncated outputs
 * - Vietnamese-specific writing guidance
 */

import { AIProviderService } from '../ai-provider';
import {
  ChapterOutline,
  ChapterContent,
  ChapterResult,
  ArchitectOutput,
  WriterOutput,
  CriticOutput,
  WorldBible,
  StyleBible,
  StoryArc,
  AgentConfig,
  AgentRole,
  FactoryConfig,
  DEFAULT_CONFIG,
} from './types';
import { GOLDEN_CHAPTER_REQUIREMENTS } from './templates';

// ============================================================================
// AGENT SYSTEM PROMPTS
// ============================================================================

const AGENT_PROMPTS: Record<AgentRole, string> = {
  architect: `Bạn là ARCHITECT AGENT - chuyên lập kế hoạch chương cho webnovel tiếng Việt.

NHIỆM VỤ: Tạo outline chi tiết cho chương, đảm bảo:
1. Pacing theo công thức "ức chế → bùng nổ"
2. Có ít nhất 1 điểm dopamine (face-slap, đột phá, thu hoạch)
3. Consistency với World Bible và Character Bible
4. Golden Rules: 3 chương đầu phải hook reader ngay lập tức
5. Mỗi chương phải có TỐI THIỂU 4-5 scenes để đủ độ dài

OUTPUT: JSON với chapter outline. Luôn tạo đủ scenes để đạt mục tiêu số từ.`,

  writer: `Bạn là WRITER AGENT - nhà văn webnovel tiếng Việt chuyên nghiệp.

PHONG CÁCH VIẾT:
- Nhịp điệu cuốn hút, chi tiết sống động, KHÔNG tóm tắt
- Cảm xúc mạnh: phẫn nộ, khinh thường, choáng váng, hả hê
- Miêu tả sức mạnh và địa vị vivid, chi tiết
- "Show, don't tell" cho reactions - miêu tả biểu cảm, hành động, cảm giác cơ thể
- Cliffhanger mạnh cuối chương
- Mỗi scene phải viết ĐẦY ĐỦ với miêu tả bối cảnh, cảm xúc nội tâm, đối thoại chi tiết

NGUYÊN TẮC VIẾT TIẾNG VIỆT:
- Sử dụng thành ngữ và tứ tự thành ngữ khi phù hợp
- Xưng hô đúng vai vế: tiểu tử, lão gia, sư huynh, sư muội, tại hạ, ngươi, hắn
- Dùng thuật ngữ Hán-Việt cho tu luyện: linh khí, đan dược, pháp bảo, đan điền, kinh mạch
- Miêu tả chiến đấu bằng ngôn từ mạnh mẽ, có nhịp điệu
- Đối thoại tự nhiên, phù hợp với tính cách và địa vị nhân vật

QUY TẮC:
- KHÔNG dùng markdown (không #, không **, không *)
- Viết văn thuần túy, tự nhiên như tiểu thuyết xuất bản
- Đối thoại dùng dấu ngoặc kép "..."
- PHẢI viết đủ số từ yêu cầu - đây là quy tắc CỨNG`,

  critic: `Bạn là CRITIC AGENT - biên tập viên khắt khe cho webnovel tiếng Việt.

TIÊU CHÍ ĐÁNH GIÁ (thang 1-10):
1. Số từ: Đạt ít nhất 80% target = OK, dưới 60% = REWRITE bắt buộc
2. Dopamine: Có satisfying không? Đủ setup → payoff?
3. Logic: Có mâu thuẫn, plot hole không?
4. Pacing: Có cân bằng miêu tả/hành động/đối thoại không?
5. Chi tiết: Miêu tả có sống động không? Hay chỉ tóm tắt?

NGUYÊN TẮC CHẤM ĐIỂM:
- 8-10: Xuất sắc, cuốn hút
- 6-7: Đạt yêu cầu, có thể cải thiện
- 4-5: Dưới trung bình, cần sửa
- 1-3: Quá tệ, REWRITE
- Nếu số từ dưới 60% target → requiresRewrite = true BẮT BUỘC

VERDICT:
- APPROVE: overallScore >= 6 VÀ đủ số từ
- REVISE: overallScore 4-5 hoặc thiếu nhẹ số từ
- REWRITE: overallScore <= 3 hoặc thiếu nặng số từ (dưới 60%)`,
};

// ============================================================================
// CHAPTER WRITER CLASS
// ============================================================================

export class ChapterWriter {
  private aiService: AIProviderService;
  private config: FactoryConfig;

  // Agent configurations
  private agents: Record<AgentRole, AgentConfig>;

  constructor(config?: Partial<FactoryConfig>, aiService?: AIProviderService) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiService = aiService || new AIProviderService();

    this.agents = {
      architect: {
        role: 'architect',
        provider: this.config.provider,
        model: this.config.model,
        temperature: 0.3,
        systemPrompt: AGENT_PROMPTS.architect,
      },
      writer: {
        role: 'writer',
        provider: this.config.provider,
        model: this.config.model,
        temperature: 0.8,
        systemPrompt: AGENT_PROMPTS.writer,
      },
      critic: {
        role: 'critic',
        provider: this.config.provider,
        model: this.config.model,
        temperature: 0.2,
        systemPrompt: AGENT_PROMPTS.critic,
      },
    };
  }

  /**
   * Configure agent
   */
  configureAgent(role: AgentRole, config: Partial<AgentConfig>) {
    this.agents[role] = { ...this.agents[role], ...config };
  }

  /**
   * Write chapter using 3-agent workflow
   */
  async writeChapter(
    chapterNumber: number,
    context: {
      worldBible: WorldBible;
      styleBible: StyleBible;
      currentArc: StoryArc;
      previousSummary: string;
      recentChapters?: string;
    }
  ): Promise<ChapterResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let additionalInstructions = '';

    while (retryCount < this.config.maxRetries) {
      try {
        // Step 1: Architect creates outline
        const architectResult = await this.runArchitect(
          chapterNumber,
          context,
          additionalInstructions
        );

        if (!architectResult.success || !architectResult.data) {
          throw new Error(architectResult.error || 'Architect failed');
        }

        // Step 2: Writer creates content (with length enforcement)
        const writerResult = await this.runWriter(
          architectResult.data.chapterOutline,
          context.styleBible
        );

        if (!writerResult.success || !writerResult.data) {
          throw new Error(writerResult.error || 'Writer failed');
        }

        // Step 3: Critic evaluates
        const criticResult = await this.runCritic(
          architectResult.data.chapterOutline,
          writerResult.data.chapterContent
        );

        if (criticResult.data?.requiresRewrite && retryCount < this.config.maxRetries - 1) {
          retryCount++;
          additionalInstructions = `REWRITE YÊU CẦU: ${criticResult.data.rewriteInstructions}\n` +
            `Lần trước chỉ viết ${writerResult.data.wordCount} từ. Lần này PHẢI viết ít nhất ${this.config.targetWordCount} từ.`;
          continue;
        }

        // Build result
        const content: ChapterContent = {
          chapterNumber,
          title: writerResult.data.title || `Chương ${chapterNumber}`,
          content: writerResult.data.chapterContent,
          wordCount: writerResult.data.wordCount,
          qualityScore: criticResult.data?.overallScore || 5,
          dopamineDelivered: architectResult.data.chapterOutline.dopaminePoints,
          status: criticResult.data?.approved ? 'approved' : 'draft',
        };

        return {
          success: true,
          data: content,
          outline: architectResult.data.chapterOutline,
          criticReport: criticResult.data,
          retryCount,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        retryCount++;
        if (retryCount >= this.config.maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount,
            duration: Date.now() - startTime,
          };
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryCount,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Write chapter with simple workflow (no 3-agent)
   */
  async writeChapterSimple(
    chapterNumber: number,
    context: {
      worldBible: WorldBible;
      styleBible: StyleBible;
      previousSummary: string;
    }
  ): Promise<ChapterResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildSimplePrompt(chapterNumber, context);

      const response = await this.aiService.chat({
        provider: this.config.provider,
        model: this.config.model,
        messages: [
          { role: 'system', content: AGENT_PROMPTS.writer },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      if (!response.success || !response.content) {
        throw new Error(response.error || 'AI response empty');
      }

      // Check for truncation
      if (response.finishReason === 'length' || response.finishReason === 'MAX_TOKENS') {
        const continuation = await this.requestContinuation(response.content);
        if (continuation) {
          response.content = response.content + '\n\n' + continuation;
        }
      }

      let content = this.cleanContent(response.content);
      let wordCount = this.countWords(content);

      // Length enforcement: request continuation if too short
      if (wordCount < this.config.targetWordCount * 0.7) {
        const continuation = await this.requestContinuation(content, this.config.targetWordCount - wordCount);
        if (continuation) {
          content = content + '\n\n' + continuation;
          wordCount = this.countWords(content);
        }
      }

      return {
        success: true,
        data: {
          chapterNumber,
          title: `Chương ${chapterNumber}`,
          content,
          wordCount,
          qualityScore: 6,
          dopamineDelivered: [],
          status: 'draft',
        },
        retryCount: 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  // ============================================================================
  // PRIVATE: AGENT RUNNERS
  // ============================================================================

  private async runArchitect(
    chapterNumber: number,
    context: {
      worldBible: WorldBible;
      styleBible: StyleBible;
      currentArc: StoryArc;
      previousSummary: string;
    },
    additionalInstructions: string
  ): Promise<{ success: boolean; data?: ArchitectOutput; error?: string }> {
    const isGolden = chapterNumber <= 3;
    const goldenReqs = isGolden
      ? GOLDEN_CHAPTER_REQUIREMENTS[`chapter${chapterNumber}` as keyof typeof GOLDEN_CHAPTER_REQUIREMENTS]
      : null;

    const minScenes = Math.max(4, Math.ceil(this.config.targetWordCount / 600));
    const wordsPerScene = Math.round(this.config.targetWordCount / minScenes);

    const prompt = `Tạo outline cho Chương ${chapterNumber}.

WORLD BIBLE:
- Title: ${context.worldBible.storyTitle}
- Protagonist: ${context.worldBible.protagonist.name} (${context.worldBible.protagonist.realm})
- Power System: ${context.worldBible.powerSystem.name}
- Traits: ${context.worldBible.protagonist.traits.join(', ')}
${context.worldBible.npcRelationships.length > 0 ? `- NPCs: ${context.worldBible.npcRelationships.slice(0, 5).map(n => `${n.name}(${n.role})`).join(', ')}` : ''}

CURRENT ARC: ${context.currentArc.title} (${context.currentArc.theme})
- Chapters: ${context.currentArc.startChapter}-${context.currentArc.endChapter}
- Climax at: ${context.currentArc.climaxChapter}

GENRE CONVENTIONS: ${context.styleBible.genreConventions.join('; ')}

PREVIOUS: ${context.previousSummary}

${isGolden ? `GOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}` : ''}

${additionalInstructions}

YÊU CẦU QUAN TRỌNG:
- Tạo TỐI THIỂU ${minScenes} scenes (mỗi scene ~${wordsPerScene} từ)
- Tổng targetWordCount: ${this.config.targetWordCount} từ
- Mỗi scene phải có conflict/tension riêng

Trả về JSON (KHÔNG có comment):
{
  "chapterOutline": {
    "chapterNumber": ${chapterNumber},
    "title": "Tiêu đề hấp dẫn bằng tiếng Việt",
    "summary": "Tóm tắt 2-3 câu",
    "pov": "${context.worldBible.protagonist.name}",
    "location": "Địa điểm",
    "scenes": [
      {"order": 1, "setting": "...", "characters": ["..."], "goal": "...", "conflict": "...", "resolution": "...", "estimatedWords": ${wordsPerScene}},
      {"order": 2, "setting": "...", "characters": ["..."], "goal": "...", "conflict": "...", "resolution": "...", "estimatedWords": ${wordsPerScene}},
      {"order": 3, "setting": "...", "characters": ["..."], "goal": "...", "conflict": "...", "resolution": "...", "estimatedWords": ${wordsPerScene}},
      {"order": 4, "setting": "...", "characters": ["..."], "goal": "...", "conflict": "...", "resolution": "...", "estimatedWords": ${wordsPerScene}}
    ],
    "tensionLevel": 50,
    "dopaminePoints": [{"type": "face_slap", "description": "...", "intensity": 7, "setup": "...", "payoff": "..."}],
    "cliffhanger": "Mô tả cliffhanger mạnh",
    "targetWordCount": ${this.config.targetWordCount}
  }
}`;

    try {
      const response = await this.aiService.chat({
        provider: this.agents.architect.provider,
        model: this.agents.architect.model,
        messages: [
          { role: 'system', content: this.agents.architect.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: this.agents.architect.temperature,
        maxTokens: 4000,
      });

      if (!response.success || !response.content) {
        return { success: false, error: response.error || 'Empty response' };
      }

      const parsed = this.parseJSON<ArchitectOutput>(response.content);

      // Validate: ensure enough scenes and correct word targets
      if (parsed.chapterOutline) {
        if (!parsed.chapterOutline.scenes || parsed.chapterOutline.scenes.length < 3) {
          // Generate minimum scenes if architect was lazy
          parsed.chapterOutline.scenes = this.generateMinimalScenes(minScenes, wordsPerScene);
        }
        // Enforce targetWordCount
        parsed.chapterOutline.targetWordCount = this.config.targetWordCount;
        // Fix scene word estimates if they're too low
        const totalSceneWords = parsed.chapterOutline.scenes.reduce((s, sc) => s + (sc.estimatedWords || 0), 0);
        if (totalSceneWords < this.config.targetWordCount * 0.8) {
          const perScene = Math.round(this.config.targetWordCount / parsed.chapterOutline.scenes.length);
          for (const scene of parsed.chapterOutline.scenes) {
            scene.estimatedWords = perScene;
          }
        }
      }

      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }

  private async runWriter(
    outline: ChapterOutline,
    styleBible: StyleBible
  ): Promise<{ success: boolean; data?: WriterOutput; error?: string }> {
    const totalTargetWords = outline.targetWordCount || this.config.targetWordCount;

    const prompt = `Viết TOÀN BỘ Chương ${outline.chapterNumber}: ${outline.title}

OUTLINE:
${outline.summary}

SCENES (viết ĐẦY ĐỦ chi tiết cho MỖI scene - KHÔNG được bỏ qua scene nào):
${outline.scenes.map(s => `- Scene ${s.order}: ${s.goal} → Conflict: ${s.conflict} → Resolution: ${s.resolution}
  Bối cảnh: ${s.setting} | Nhân vật: ${s.characters.join(', ')}
  ⚠️ Viết TỐI THIỂU ${s.estimatedWords} từ cho scene này`).join('\n\n')}

DOPAMINE (phải có trong chương):
${outline.dopaminePoints.map(dp => `- ${dp.type}: Setup: ${dp.setup} → Payoff: ${dp.payoff}`).join('\n')}

CLIFFHANGER: ${outline.cliffhanger}

STYLE:
- Giọng văn: ${styleBible.authorVoice}
- Tone: ${styleBible.toneKeywords.join(', ')}
- Tỷ lệ đối thoại: ${styleBible.dialogueRatio[0]}-${styleBible.dialogueRatio[1]}%
- Conventions: ${styleBible.genreConventions.join('; ')}

ĐỘ DÀI YÊU CẦU (BẮT BUỘC - QUY TẮC CỨNG):
- Viết TỐI THIỂU ${totalTargetWords} từ. Chương dưới ${Math.round(totalTargetWords * 0.7)} từ sẽ bị từ chối.
- Tổng cộng ${outline.scenes.length} scenes x ~${Math.round(totalTargetWords / outline.scenes.length)} từ/scene = ${totalTargetWords} từ
- Phải viết ĐẦY ĐỦ mỗi scene: miêu tả bối cảnh, cảm xúc, suy nghĩ nội tâm, đối thoại chi tiết, hành động
- KHÔNG tóm tắt, KHÔNG lược bỏ. Viết như tiểu thuyết xuất bản.
- KHÔNG dùng markdown. Viết văn thuần túy.

Bắt đầu viết (nhớ: TỐI THIỂU ${totalTargetWords} từ):`;

    try {
      const response = await this.aiService.chat({
        provider: this.agents.writer.provider,
        model: this.agents.writer.model,
        messages: [
          { role: 'system', content: this.agents.writer.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: this.agents.writer.temperature,
        maxTokens: this.config.maxTokens,
      });

      if (!response.success || !response.content) {
        return { success: false, error: response.error || 'Empty response' };
      }

      let content = this.cleanContent(response.content);
      let wordCount = this.countWords(content);

      // Check for truncation (output hit maxTokens limit)
      if (response.finishReason === 'length' || response.finishReason === 'MAX_TOKENS') {
        console.log(`[ChapterWriter] Chapter ${outline.chapterNumber}: output truncated (${wordCount} words). Requesting continuation...`);
        const continuation = await this.requestContinuation(content);
        if (continuation) {
          content = content + '\n\n' + continuation;
          wordCount = this.countWords(content);
        }
      }

      // Length enforcement: if still too short, request continuation
      if (wordCount < totalTargetWords * 0.7) {
        console.log(`[ChapterWriter] Chapter ${outline.chapterNumber}: too short (${wordCount}/${totalTargetWords}). Requesting continuation...`);
        const remaining = totalTargetWords - wordCount;
        const continuation = await this.requestContinuation(content, remaining);
        if (continuation) {
          content = content + '\n\n' + continuation;
          wordCount = this.countWords(content);
        }
      }

      return {
        success: true,
        data: {
          chapterContent: content,
          wordCount,
          title: outline.title,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }

  private async runCritic(
    outline: ChapterOutline,
    content: string
  ): Promise<{ success: boolean; data?: CriticOutput; error?: string }> {
    const wordCount = this.countWords(content);
    const targetWords = outline.targetWordCount || this.config.targetWordCount;
    const wordRatio = Math.round((wordCount / targetWords) * 100);

    // Show more content to the critic for better evaluation
    // For chapters under 5000 chars, show everything
    const maxPreview = 8000;
    const contentPreview = content.length <= maxPreview
      ? content
      : `${content.substring(0, 5000)}\n\n[... phần giữa ...]\n\n${content.substring(content.length - 2000)}`;

    const prompt = `Đánh giá chương nghiêm túc:

OUTLINE: ${outline.title} - ${outline.summary}
TARGET DOPAMINE: ${outline.dopaminePoints.map(dp => `${dp.type}: ${dp.description}`).join('; ')}
TARGET WORDS: ${targetWords}
ACTUAL WORDS: ${wordCount} (đạt ${wordRatio}% target)

${wordRatio < 60 ? '⚠️ CẢNH BÁO: Số từ DƯỚI 60% target → requiresRewrite PHẢI = true' : ''}
${wordRatio < 80 ? '⚠️ LƯU Ý: Số từ dưới 80% target → giảm điểm overallScore' : ''}

NỘI DUNG CHƯƠNG:
${contentPreview}

Đánh giá và trả về JSON (KHÔNG có comment, điểm PHẢI phản ánh thực tế):
{
  "overallScore": <1-10 điểm thực tế, KHÔNG mặc định 7>,
  "dopamineScore": <1-10 dopamine có satisfying không>,
  "pacingScore": <1-10 nhịp điệu có tốt không>,
  "issues": [{"type": "word_count|pacing|logic|detail", "description": "mô tả cụ thể", "severity": "minor|moderate|major"}],
  "approved": <true nếu overallScore >= 6 VÀ wordRatio >= 70%>,
  "requiresRewrite": <true nếu overallScore <= 3 HOẶC wordRatio < 60%>,
  "rewriteInstructions": "hướng dẫn cụ thể nếu cần rewrite"
}`;

    try {
      const response = await this.aiService.chat({
        provider: this.agents.critic.provider,
        model: this.agents.critic.model,
        messages: [
          { role: 'system', content: this.agents.critic.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: this.agents.critic.temperature,
        maxTokens: 1500,
      });

      if (!response.success || !response.content) {
        // Fail closed: don't approve on error
        return {
          success: true,
          data: {
            overallScore: 5,
            dopamineScore: 5,
            pacingScore: 5,
            issues: [{ type: 'critic_error', description: 'Critic failed to respond', severity: 'moderate' }],
            approved: false,
            requiresRewrite: wordCount < targetWords * 0.6,
          },
        };
      }

      const parsed = this.parseJSON<CriticOutput>(response.content);

      // Override: force rewrite if word count is critically low
      if (wordCount < targetWords * 0.6) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        if (!parsed.rewriteInstructions) {
          parsed.rewriteInstructions = `Chương quá ngắn (${wordCount}/${targetWords} từ). Phải viết lại đạt ít nhất ${targetWords} từ.`;
        }
      }

      return { success: true, data: parsed };
    } catch (error) {
      // Fail closed: don't approve on error
      return {
        success: true,
        data: {
          overallScore: 5,
          dopamineScore: 5,
          pacingScore: 5,
          issues: [{ type: 'parse_error', description: 'Failed to parse critic response', severity: 'moderate' }],
          approved: false,
          requiresRewrite: wordCount < this.config.targetWordCount * 0.6,
        },
      };
    }
  }

  // ============================================================================
  // PRIVATE: CONTINUATION (for short chapters)
  // ============================================================================

  /**
   * Request continuation when chapter is truncated or too short
   */
  private async requestContinuation(
    existingContent: string,
    targetRemainingWords?: number
  ): Promise<string | null> {
    const remaining = targetRemainingWords || this.config.targetWordCount;
    // Take last 1500 chars as context for continuation
    const lastPart = existingContent.substring(existingContent.length - 1500);

    try {
      const response = await this.aiService.chat({
        provider: this.agents.writer.provider,
        model: this.agents.writer.model,
        messages: [
          {
            role: 'system',
            content: 'Bạn đang viết tiếp một chương webnovel tiếng Việt. Tiếp tục viết LIỀN MẠCH từ đoạn cuối được cung cấp. KHÔNG lặp lại nội dung đã viết. KHÔNG dùng markdown.',
          },
          {
            role: 'user',
            content: `Đoạn cuối của chương (đang viết dở):
...${lastPart}

Viết tiếp ít nhất ${remaining} từ nữa. Tiếp tục CÂU CHUYỆN một cách tự nhiên, phát triển thêm chi tiết, đối thoại, miêu tả cảm xúc. Kết thúc bằng một cliffhanger mạnh.

Viết tiếp ngay:`,
          },
        ],
        temperature: this.agents.writer.temperature,
        maxTokens: Math.min(this.config.maxTokens, 4096),
      });

      if (response.success && response.content) {
        return this.cleanContent(response.content);
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private generateMinimalScenes(count: number, wordsPerScene: number) {
    return Array.from({ length: count }, (_, i) => ({
      order: i + 1,
      setting: '',
      characters: [],
      goal: `Scene ${i + 1}`,
      conflict: '',
      resolution: '',
      estimatedWords: wordsPerScene,
      dopamineType: undefined,
    }));
  }

  private buildSimplePrompt(
    chapterNumber: number,
    context: { worldBible: WorldBible; styleBible: StyleBible; previousSummary: string }
  ): string {
    return `Viết Chương ${chapterNumber}:

WORLD: ${context.worldBible.storyTitle}
PROTAGONIST: ${context.worldBible.protagonist.name} (${context.worldBible.protagonist.realm})

PREVIOUS: ${context.previousSummary}

STYLE:
- ${context.styleBible.authorVoice}
- Tone: ${context.styleBible.toneKeywords.join(', ')}
- Conventions: ${context.styleBible.genreConventions.join('; ')}

ĐỘ DÀI YÊU CẦU (BẮT BUỘC):
- Viết TỐI THIỂU ${this.config.targetWordCount} từ
- Viết chi tiết, không tóm tắt
- KHÔNG markdown, viết văn thuần túy
- Cliffhanger mạnh cuối chương
- Có ít nhất 1 điểm dopamine (face-slap, đột phá, thu hoạch)
- Bao gồm: miêu tả bối cảnh, cảm xúc nội tâm, đối thoại phong phú, hành động chi tiết

Viết chương (nhớ: TỐI THIỂU ${this.config.targetWordCount} từ):`;
  }

  private cleanContent(content: string): string {
    return content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(w => w.trim()).length;
  }

  /**
   * Robust JSON parser - handles comments, trailing commas, markdown code blocks
   */
  private parseJSON<T>(content: string): T {
    // Try to extract JSON from various formats
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/```\s*([\s\S]*?)\s*```/) ||
      content.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

    // Clean up common LLM JSON issues
    const cleaned = jsonStr
      .replace(/\/\/[^\n]*/g, '')          // Remove // comments
      .replace(/\/\*[\s\S]*?\*\//g, '')    // Remove /* */ comments
      .replace(/,\s*}/g, '}')             // Remove trailing commas before }
      .replace(/,\s*]/g, ']')             // Remove trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, (c) => // Escape control chars in strings
        c === '\n' || c === '\r' || c === '\t' ? c : ''
      );

    return JSON.parse(cleaned);
  }
}

// Export singleton
export const chapterWriter = new ChapterWriter();
