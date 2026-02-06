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
  GenreType,
} from './types';
import { GOLDEN_CHAPTER_REQUIREMENTS } from './templates';
import { buildStyleContext, getEnhancedStyleBible, CLIFFHANGER_TECHNIQUES, SceneType } from './style-bible';

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
          context.styleBible,
          this.config.genre,
          context.worldBible
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

CLIFFHANGER TECHNIQUES (chọn 1 cho cuối chương):
${CLIFFHANGER_TECHNIQUES.slice(0, 4).map(c => `- ${c.name}: ${c.example}`).join('\n')}

PREVIOUS: ${context.previousSummary}

${isGolden ? `GOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}` : ''}

${additionalInstructions}

CẢM XÚC ARC (bắt buộc lên kế hoạch):
- Mở đầu: cảm xúc gì cho người đọc? (tò mò, lo lắng, phẫn nộ...)
- Giữa chương: chuyển sang cảm xúc gì? (căng thẳng, hồi hộp, đau lòng...)
- Cao trào: đỉnh điểm cảm xúc? (phấn khích, sốc, hả hê...)
- Kết: để lại cảm xúc gì? (háo hức đọc tiếp, day dứt, mong chờ...)
Nguyên tắc: PHẢI có contrast cảm xúc giữa các phần (buồn→vui, sợ→phấn khích)

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
    "emotionalArc": {
      "opening": "tên cảm xúc mở đầu (vd: tò mò, lo lắng)",
      "midpoint": "tên cảm xúc giữa chương (vd: căng thẳng, hồi hộp)",
      "climax": "tên cảm xúc cao trào (vd: phấn khích, sốc)",
      "closing": "tên cảm xúc kết thúc (vd: háo hức, day dứt)"
    },
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
    styleBible: StyleBible,
    genre?: GenreType,
    worldBible?: WorldBible
  ): Promise<{ success: boolean; data?: WriterOutput; error?: string }> {
    const totalTargetWords = outline.targetWordCount || this.config.targetWordCount;

    // Determine dominant scene type for style context
    const dominantSceneType = this.getDominantSceneType(outline);
    const genreType = genre || this.config.genre || 'tien-hiep';

    // Build rich style context with exemplars, pacing rules, and vocabulary
    const richStyleContext = buildStyleContext(genreType, dominantSceneType);
    const enhancedStyle = getEnhancedStyleBible(genreType);

    // Build per-scene pacing hints
    const sceneGuidance = outline.scenes.map(s => {
      const sceneType = this.inferSceneType(s);
      const pacing = enhancedStyle.pacingRules[sceneType];
      return `- Scene ${s.order}: ${s.goal} → Conflict: ${s.conflict} → Resolution: ${s.resolution}
  Bối cảnh: ${s.setting} | Nhân vật: ${s.characters.join(', ')}
  ⚠️ Viết TỐI THIỂU ${s.estimatedWords} từ cho scene này
  📝 Nhịp điệu: câu ${pacing.sentenceLength.min}-${pacing.sentenceLength.max} từ, tốc độ ${pacing.paceSpeed === 'fast' ? 'NHANH (câu ngắn, dứt khoát)' : pacing.paceSpeed === 'slow' ? 'CHẬM (câu dài, miêu tả chi tiết)' : 'VỪA'}, đối thoại ${Math.round(pacing.dialogueRatio.min * 100)}-${Math.round(pacing.dialogueRatio.max * 100)}%`;
    }).join('\n\n');

    // Select relevant vocabulary for this chapter's content
    const vocabHints = this.buildVocabularyHints(outline, enhancedStyle.vocabulary);

    const prompt = `Viết TOÀN BỘ Chương ${outline.chapterNumber}: ${outline.title}

OUTLINE:
${outline.summary}

SCENES (viết ĐẦY ĐỦ chi tiết cho MỖI scene - KHÔNG được bỏ qua scene nào):
${sceneGuidance}

DOPAMINE (phải có trong chương):
${outline.dopaminePoints.map(dp => `- ${dp.type}: Setup: ${dp.setup} → Payoff: ${dp.payoff}`).join('\n')}

${outline.emotionalArc ? `CẢM XÚC ARC (PHẢI tuân thủ):
- Mở đầu: ${outline.emotionalArc.opening}
- Giữa chương: ${outline.emotionalArc.midpoint}
- Cao trào: ${outline.emotionalArc.climax}
- Kết thúc: ${outline.emotionalArc.closing}
→ Viết sao cho người đọc CẢM NHẬN được sự chuyển đổi cảm xúc rõ ràng qua từng phần.` : ''}

CLIFFHANGER: ${outline.cliffhanger}

STYLE:
- Giọng văn: ${styleBible.authorVoice}
- Tone: ${styleBible.toneKeywords.join(', ')}
- Tỷ lệ đối thoại: ${styleBible.dialogueRatio[0]}-${styleBible.dialogueRatio[1]}%
- Conventions: ${styleBible.genreConventions.join('; ')}

${vocabHints}

${this.buildCharacterVoiceGuide(outline, worldBible)}

${richStyleContext}

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

    // Show full content to the critic - Gemini Flash supports 1M context window
    // Only truncate for extremely long chapters (>30K chars) to save tokens
    const maxPreview = 30000;
    const contentPreview = content.length <= maxPreview
      ? content
      : `${content.substring(0, 15000)}\n\n[... phần giữa ${Math.round((content.length - 20000) / 1000)}K chars ...]\n\n${content.substring(content.length - 5000)}`;

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
    const genreType = this.config.genre || 'tien-hiep';
    const enhancedStyle = getEnhancedStyleBible(genreType);
    // Pick a random exemplar for variety
    const exemplar = enhancedStyle.exemplars[chapterNumber % enhancedStyle.exemplars.length];

    return `Viết Chương ${chapterNumber}:

WORLD: ${context.worldBible.storyTitle}
PROTAGONIST: ${context.worldBible.protagonist.name} (${context.worldBible.protagonist.realm})

PREVIOUS: ${context.previousSummary}

STYLE:
- ${context.styleBible.authorVoice}
- Tone: ${context.styleBible.toneKeywords.join(', ')}
- Conventions: ${context.styleBible.genreConventions.join('; ')}

TỪ VỰNG SỬ DỤNG (bắt buộc dùng ít nhất 3-5 biểu đạt sau):
- Cảm xúc: ${enhancedStyle.vocabulary.emotions.anger.slice(0, 3).join(', ')}; ${enhancedStyle.vocabulary.emotions.shock.slice(0, 3).join(', ')}
- Sức mạnh: ${enhancedStyle.vocabulary.powerExpressions.techniques.slice(0, 3).join(', ')}
- Bầu không khí: ${enhancedStyle.vocabulary.atmosphere.tense.slice(0, 3).join(', ')}

VÍ DỤ VĂN PHONG CHUẨN (viết theo phong cách này):
"""
${exemplar.content.substring(0, 500)}
"""
Lưu ý: ${exemplar.notes.join('; ')}

CLIFFHANGER (dùng 1 trong các kỹ thuật):
${enhancedStyle.cliffhangerTechniques.slice(0, 3).map(c => `- ${c.name}: "${c.example}"`).join('\n')}

ĐỘ DÀI YÊU CẦU (BẮT BUỘC):
- Viết TỐI THIỂU ${this.config.targetWordCount} từ
- Viết chi tiết, không tóm tắt
- KHÔNG markdown, viết văn thuần túy
- Cliffhanger mạnh cuối chương
- Có ít nhất 1 điểm dopamine (face-slap, đột phá, thu hoạch)
- Bao gồm: miêu tả bối cảnh, cảm xúc nội tâm, đối thoại phong phú, hành động chi tiết

Viết chương (nhớ: TỐI THIỂU ${this.config.targetWordCount} từ):`;
  }

  // ============================================================================
  // PRIVATE: STYLE BIBLE HELPERS
  // ============================================================================

  /**
   * Determine the dominant scene type from outline for style context selection
   */
  private getDominantSceneType(outline: ChapterOutline): SceneType {
    const sceneCounts: Record<string, number> = {};

    for (const scene of outline.scenes) {
      const type = this.inferSceneType(scene);
      sceneCounts[type] = (sceneCounts[type] || 0) + 1;
    }

    // Check dopamine points for additional hints
    for (const dp of outline.dopaminePoints || []) {
      if (['face_slap', 'power_reveal', 'revenge'].includes(dp.type)) {
        sceneCounts['action'] = (sceneCounts['action'] || 0) + 1;
      } else if (['breakthrough'].includes(dp.type)) {
        sceneCounts['cultivation'] = (sceneCounts['cultivation'] || 0) + 1;
      } else if (['beauty_encounter'].includes(dp.type)) {
        sceneCounts['romance'] = (sceneCounts['romance'] || 0) + 1;
      }
    }

    let maxType: SceneType = 'action';
    let maxCount = 0;
    for (const [type, count] of Object.entries(sceneCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type as SceneType;
      }
    }
    return maxType;
  }

  /**
   * Infer scene type from scene description
   */
  private inferSceneType(scene: { goal: string; conflict: string; resolution?: string; setting?: string }): SceneType {
    const text = `${scene.goal} ${scene.conflict} ${scene.resolution || ''} ${scene.setting || ''}`.toLowerCase();

    if (/chiến đấu|đánh|tấn công|kiếm|quyền|sát|giết|đấu|chiêu thức|pháp thuật|battle|fight/.test(text)) return 'action';
    if (/tu luyện|đột phá|đan điền|linh khí|cảnh giới|thiền|cultivation|breakthrough/.test(text)) return 'cultivation';
    if (/tiết lộ|bí mật|phát hiện|sự thật|reveal|secret|discovery/.test(text)) return 'revelation';
    if (/tình cảm|yêu|nhớ|thương|romance|love|nàng|mỹ nhân/.test(text)) return 'romance';
    if (/hội thoại|nói chuyện|bàn bạc|thương lượng|discuss|negotiate/.test(text)) return 'dialogue';
    if (/nguy hiểm|căng thẳng|bẫy|vây|danger|trap|tension/.test(text)) return 'tension';
    if (/hài|cười|buồn cười|comedy|funny|joke/.test(text)) return 'comedy';
    return 'dialogue'; // default
  }

  /**
   * Build vocabulary hints relevant to the chapter's dopamine types and scenes
   */
  private buildVocabularyHints(
    outline: ChapterOutline,
    vocabulary: import('./style-bible').VocabularyGuide
  ): string {
    const hints: string[] = ['TỪ VỰNG BẮT BUỘC SỬ DỤNG (dùng ít nhất 5-8 biểu đạt sau trong chương):'];

    const hasAction = outline.scenes.some(s => this.inferSceneType(s) === 'action');
    const hasCultivation = outline.scenes.some(s => this.inferSceneType(s) === 'cultivation');
    const dopamineTypes = (outline.dopaminePoints || []).map(d => d.type);

    // Power expressions for action/combat scenes
    if (hasAction || dopamineTypes.includes('face_slap') || dopamineTypes.includes('power_reveal')) {
      hints.push(`Chiêu thức: ${vocabulary.powerExpressions.techniques.slice(0, 4).join(', ')}`);
      hints.push(`Uy lực: ${vocabulary.powerExpressions.weakToStrong.slice(0, 4).join(', ')}`);
    }

    // Breakthrough expressions
    if (hasCultivation || dopamineTypes.includes('breakthrough')) {
      hints.push(`Đột phá: ${vocabulary.powerExpressions.breakthrough.slice(0, 4).join(', ')}`);
    }

    // Emotional expressions based on dopamine types
    if (dopamineTypes.includes('face_slap') || dopamineTypes.includes('revenge')) {
      hints.push(`Khinh bỉ: ${vocabulary.emotions.contempt.slice(0, 4).join(', ')}`);
      hints.push(`Phẫn nộ: ${vocabulary.emotions.anger.slice(0, 4).join(', ')}`);
    }

    // Always include shock (most common reaction) and determination
    hints.push(`Kinh ngạc: ${vocabulary.emotions.shock.slice(0, 4).join(', ')}`);
    hints.push(`Quyết tâm: ${vocabulary.emotions.determination.slice(0, 3).join(', ')}`);

    // Atmosphere based on tension level
    if ((outline.tensionLevel || 50) >= 70) {
      hints.push(`Bầu không khí: ${vocabulary.atmosphere.tense.slice(0, 3).join(', ')}; ${vocabulary.atmosphere.dangerous.slice(0, 3).join(', ')}`);
    } else {
      hints.push(`Bầu không khí: ${vocabulary.atmosphere.mysterious.slice(0, 3).join(', ')}`);
    }

    // Honorifics
    hints.push(`Xưng hô bề trên: ${vocabulary.honorifics.superior.slice(0, 4).join(', ')}`);
    hints.push(`Xưng hô ngang hàng: ${vocabulary.honorifics.peer.slice(0, 4).join(', ')}`);
    hints.push(`Xưng hô kẻ thù: ${vocabulary.honorifics.enemy.slice(0, 3).join(', ')}`);

    return hints.join('\n');
  }

  /**
   * Build character voice guide from outline characters and worldBible
   */
  private buildCharacterVoiceGuide(outline: ChapterOutline, worldBible?: WorldBible): string {
    if (!worldBible) return '';

    const lines: string[] = [
      'GIỌNG NÓI NHÂN VẬT (mỗi nhân vật PHẢI có giọng nói khác biệt):',
    ];

    // Protagonist voice based on traits
    const protag = worldBible.protagonist;
    const protagTraits = protag.traits.length > 0 ? protag.traits.join(', ') : 'bình tĩnh, quyết đoán';
    lines.push(`- ${protag.name} (Protagonist): giọng ${protagTraits}, xưng hô phù hợp cảnh giới ${protag.realm}`);

    // Build voice profiles from NPC relationships appearing in this chapter
    const chapterCharNames = new Set(outline.scenes.flatMap(s => s.characters));

    for (const npc of worldBible.npcRelationships) {
      // Only include NPCs that appear in this chapter's scenes
      if (!chapterCharNames.has(npc.name) && chapterCharNames.size > 0) continue;

      switch (npc.role) {
        case 'enemy':
          lines.push(`- ${npc.name} (Villain/Kẻ thù): giọng ngạo mạn, lạnh lùng, dùng từ kẻ cả, xưng hô coi thường đối phương`);
          break;
        case 'mentor':
          lines.push(`- ${npc.name} (Sư phụ/Tiền bối): giọng trầm ổn, dùng cổ ngữ, nói ít nhưng sâu sắc, xưng lão phu/ta`);
          break;
        case 'ally':
          if (npc.affinity > 50) {
            lines.push(`- ${npc.name} (Đồng minh thân): giọng thân thiết, sôi nổi, xưng hô huynh đệ/tỷ muội`);
          } else {
            lines.push(`- ${npc.name} (Đồng minh): giọng lịch sự, cẩn trọng, giữ khoảng cách vừa phải`);
          }
          break;
        case 'love_interest':
          lines.push(`- ${npc.name} (Nữ chính/Tình cảm): giọng kiên quyết nhưng ẩn chứa mềm mại, lời nói sắc bén nhưng ánh mắt dịu dàng`);
          break;
        case 'neutral':
          lines.push(`- ${npc.name} (NPC): giọng phù hợp với vai trò: ${npc.description}`);
          break;
      }
    }

    // Add young rival if there's an enemy NPC with recent appearance
    const hasRival = worldBible.npcRelationships.some(n =>
      n.role === 'enemy' && n.affinity > -80 && n.affinity < 0
    );
    if (!hasRival && worldBible.npcRelationships.some(n => n.role === 'enemy')) {
      lines.push('- Tiểu phản diện/Tình địch: giọng sôi nổi, khiêu khích, tự cao tự đại');
    }

    lines.push('NGUYÊN TẮC: Che tên nhân vật, người đọc vẫn phải nhận ra ai đang nói qua cách dùng từ.');
    lines.push('Mỗi nhân vật có cách xưng hô, ngữ điệu, từ vựng riêng biệt - TUYỆT ĐỐI không được lẫn lộn.');

    return lines.join('\n');
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
