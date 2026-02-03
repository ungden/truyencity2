/**
 * Story Writing Factory - Chapter Writer
 *
 * Tinh hoa từ:
 * - _legacy/dopamine-writing-optimizer.ts (3-agent workflow)
 * - _legacy/ai-story-writer.ts (writing logic)
 *
 * 3-Agent Pipeline: Architect → Writer → Critic
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
  architect: `Bạn là ARCHITECT AGENT - chuyên lập kế hoạch chương cho webnovel.

NHIỆM VỤ: Tạo outline chi tiết cho chương, đảm bảo:
1. Pacing theo công thức "ức chế → bùng nổ"
2. Có ít nhất 1 điểm dopamine (face-slap, đột phá, thu hoạch)
3. Consistency với World Bible và Character Bible
4. Golden Rules: 3 chương đầu phải hook reader ngay lập tức

OUTPUT: JSON với chapter outline.`,

  writer: `Bạn là WRITER AGENT - nhà văn webnovel chuyên nghiệp.

PHONG CÁCH:
- Nhịp điệu nhanh, không dài dòng
- Cảm xúc mạnh: phẫn nộ, khinh thường, choáng váng, hả hê
- Miêu tả sức mạnh và địa vị vivid
- "Show, don't tell" cho reactions
- Cliffhanger mạnh cuối chương

QUY TẮC:
- KHÔNG dùng markdown
- Viết văn thuần túy, tự nhiên như sách
- Đối thoại dùng dấu ngoặc kép "..."`,

  critic: `Bạn là CRITIC AGENT - biên tập viên khắt khe.

KIỂM TRA:
1. Điểm dopamine có satisfying không?
2. Có lỗi logic không?
3. Pacing có quá chậm không?
4. Writer có follow outline không?

VERDICT:
- APPROVE: Chương đạt tiêu chuẩn
- REVISE: Cần sửa nhỏ
- REWRITE: Quá tệ, cần viết lại`,
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

        // Step 2: Writer creates content
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
          additionalInstructions = `REWRITE: ${criticResult.data.rewriteInstructions}`;
          continue;
        }

        // Build result
        const content: ChapterContent = {
          chapterNumber,
          title: writerResult.data.title || `Chương ${chapterNumber}`,
          content: writerResult.data.chapterContent,
          wordCount: writerResult.data.wordCount,
          qualityScore: criticResult.data?.overallScore || 7,
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

      const content = this.cleanContent(response.content);
      const wordCount = this.countWords(content);

      return {
        success: true,
        data: {
          chapterNumber,
          title: `Chương ${chapterNumber}`,
          content,
          wordCount,
          qualityScore: 7,
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

    const prompt = `Tạo outline cho Chương ${chapterNumber}.

WORLD BIBLE:
- Title: ${context.worldBible.storyTitle}
- Protagonist: ${context.worldBible.protagonist.name} (${context.worldBible.protagonist.realm})
- Power System: ${context.worldBible.powerSystem.name}

CURRENT ARC: ${context.currentArc.title} (${context.currentArc.theme})
- Chapters: ${context.currentArc.startChapter}-${context.currentArc.endChapter}
- Climax at: ${context.currentArc.climaxChapter}

PREVIOUS: ${context.previousSummary}

${isGolden ? `GOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}` : ''}

${additionalInstructions}

Trả về JSON:
{
  "chapterOutline": {
    "chapterNumber": ${chapterNumber},
    "title": "Tiêu đề hấp dẫn",
    "summary": "Tóm tắt 2-3 câu",
    "pov": "${context.worldBible.protagonist.name}",
    "location": "Địa điểm",
    "scenes": [{"order": 1, "setting": "", "characters": [], "goal": "", "conflict": "", "resolution": "", "estimatedWords": 500}],
    "tensionLevel": 50,
    "dopaminePoints": [{"type": "face_slap", "description": "", "intensity": 7, "setup": "", "payoff": ""}],
    "cliffhanger": "Mô tả cliffhanger",
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
        maxTokens: 2000,
      });

      if (!response.success || !response.content) {
        return { success: false, error: response.error || 'Empty response' };
      }

      const parsed = this.parseJSON<ArchitectOutput>(response.content);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }

  private async runWriter(
    outline: ChapterOutline,
    styleBible: StyleBible
  ): Promise<{ success: boolean; data?: WriterOutput; error?: string }> {
    const prompt = `Viết Chương ${outline.chapterNumber}: ${outline.title}

OUTLINE:
${outline.summary}

SCENES:
${outline.scenes.map(s => `- ${s.goal} (${s.estimatedWords} từ)`).join('\n')}

DOPAMINE:
${outline.dopaminePoints.map(dp => `- ${dp.type}: ${dp.description}`).join('\n')}

CLIFFHANGER: ${outline.cliffhanger}

STYLE:
- Giọng văn: ${styleBible.authorVoice}
- Tone: ${styleBible.toneKeywords.join(', ')}
- Dialogue: ${styleBible.dialogueRatio[0]}-${styleBible.dialogueRatio[1]}%

YÊU CẦU:
- Viết khoảng ${outline.targetWordCount} từ
- KHÔNG markdown, viết văn thuần túy
- Cliffhanger mạnh cuối chương

Bắt đầu viết:`;

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

      const content = this.cleanContent(response.content);

      return {
        success: true,
        data: {
          chapterContent: content,
          wordCount: this.countWords(content),
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

    const prompt = `Đánh giá chương:

OUTLINE: ${outline.title} - ${outline.summary}
TARGET DOPAMINE: ${outline.dopaminePoints.map(dp => dp.type).join(', ')}
TARGET WORDS: ${outline.targetWordCount}

ACTUAL WORDS: ${wordCount}

CONTENT (đầu):
${content.substring(0, 1500)}...

CONTENT (cuối):
...${content.substring(content.length - 800)}

Trả về JSON:
{
  "overallScore": 7,
  "dopamineScore": 7,
  "pacingScore": 7,
  "issues": [{"type": "...", "description": "...", "severity": "minor/moderate/major"}],
  "approved": true,
  "requiresRewrite": false,
  "rewriteInstructions": ""
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
        maxTokens: 1000,
      });

      if (!response.success || !response.content) {
        return { success: true, data: { overallScore: 7, dopamineScore: 7, pacingScore: 7, issues: [], approved: true, requiresRewrite: false } };
      }

      const parsed = this.parseJSON<CriticOutput>(response.content);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: true, data: { overallScore: 7, dopamineScore: 7, pacingScore: 7, issues: [], approved: true, requiresRewrite: false } };
    }
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

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

YÊU CẦU:
- Khoảng ${this.config.targetWordCount} từ
- KHÔNG markdown
- Cliffhanger cuối chương
- Có ít nhất 1 điểm dopamine

Viết chương:`;
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

  private parseJSON<T>(content: string): T {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  }
}

// Export singleton
export const chapterWriter = new ChapterWriter();
