/**
 * Story Writing Factory - Story & Arc Planner
 *
 * Lên dàn ý cho toàn bộ truyện trước khi viết:
 * 1. StoryOutline - Cốt truyện tổng thể
 * 2. ArcOutline[] - Dàn ý tất cả các arc
 * 3. ChapterPlan[] - Kế hoạch từng chương trong arc
 */

import { AIProviderService } from '../ai-provider';
import {
  StoryOutline,
  ArcOutline,
  ArcChapterPlan,
  WorldBible,
  GenreType,
  FactoryConfig,
  DEFAULT_CONFIG,
  ArcTheme,
  DopamineType,
  PlotPoint,
} from './types';

// ============================================================================
// PLANNER PROMPTS
// ============================================================================

const STORY_PLANNER_PROMPT = `Bạn là STORY ARCHITECT - chuyên gia lên kế hoạch webnovel.

NHIỆM VỤ: Tạo dàn ý tổng thể cho toàn bộ truyện, đảm bảo:
1. Premise hấp dẫn, hook reader từ đầu
2. Character arc rõ ràng cho nhân vật chính
3. Main conflict escalate đúng tempo
4. Major plot points phân bố đều
5. Ending vision thỏa mãn

OUTPUT: JSON với story outline đầy đủ.`;

const ARC_PLANNER_PROMPT = `Bạn là ARC DESIGNER - chuyên gia thiết kế arc cho webnovel.

NHIỆM VỤ: Thiết kế chi tiết một arc, bao gồm:
1. 3-act structure: Setup → Confrontation → Resolution
2. Tension curve từ thấp đến climax
3. Protagonist growth trong arc
4. Dopamine points phân bố đều
5. Cliffhanger mạnh cuối arc (trừ khi đây là arc cuối cùng — lúc đó cần kết thúc thỏa mãn)

OUTPUT: JSON với arc outline và chapter plans.`;

const ARC_FINALE_PROMPT = `Bạn là ARC DESIGNER - chuyên gia thiết kế arc KẾT THÚC cho webnovel.

NHIỆM VỤ: Thiết kế arc CUỐI CÙNG của bộ truyện, bao gồm:
1. 3-act structure: Setup (chuẩn bị trận chiến cuối) → Confrontation (đại chiến) → Resolution (kết thúc thỏa mãn)
2. Tension curve đạt đỉnh cao nhất toàn truyện
3. Protagonist đạt đỉnh sức mạnh, hoàn thành mục tiêu
4. Giải quyết TẤT CẢ plot threads còn lại
5. KHÔNG có cliffhanger — kết thúc hoàn chỉnh, thỏa mãn người đọc
6. Có thể kết thúc mở (gợi ý phần tiếp) nhưng mạch truyện chính PHẢI kết thúc

OUTPUT: JSON với arc outline và chapter plans.`;

// ============================================================================
// STORY PLANNER CLASS
// ============================================================================

export class StoryPlanner {
  private aiService: AIProviderService;
  private config: FactoryConfig;

  constructor(config?: Partial<FactoryConfig>, aiService?: AIProviderService) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiService = aiService || new AIProviderService();
  }

  /**
   * Generate complete story outline
   */
  async planStory(input: {
    title: string;
    protagonistName: string;
    genre: GenreType;
    premise?: string;
    targetChapters?: number;
    chaptersPerArc?: number;
  }): Promise<{ success: boolean; data?: StoryOutline; error?: string }> {
    const targetChapters = input.targetChapters || 200;
    const chaptersPerArc = input.chaptersPerArc || 20;
    const targetArcs = Math.ceil(targetChapters / chaptersPerArc);

    const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${input.title}
GENRE: ${input.genre}
PROTAGONIST: ${input.protagonistName}
${input.premise ? `PREMISE: ${input.premise}` : ''}

TARGET: ${targetChapters} chương, ${targetArcs} arcs (mỗi arc ~${chaptersPerArc} chương)

Trả về JSON:
{
  "id": "story_${Date.now()}",
  "title": "${input.title}",
  "genre": "${input.genre}",
  "premise": "Mô tả premise 2-3 câu hấp dẫn",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt truyện",
  "targetChapters": ${targetChapters},
  "targetArcs": ${targetArcs},
  "protagonist": {
    "name": "${input.protagonistName}",
    "startingState": "Trạng thái ban đầu (yếu, bị khinh thường)",
    "endGoal": "Mục tiêu cuối cùng",
    "characterArc": "Hành trình phát triển nhân cách"
  },
  "majorPlotPoints": [
    {"id": "pp1", "name": "Khởi đầu", "description": "...", "targetArc": 1, "type": "inciting_incident", "importance": "critical"},
    {"id": "pp2", "name": "Rising Action 1", "description": "...", "targetArc": 2, "type": "rising_action", "importance": "major"},
    {"id": "pp3", "name": "Midpoint", "description": "...", "targetArc": ${Math.ceil(targetArcs / 2)}, "type": "midpoint", "importance": "critical"},
    {"id": "pp4", "name": "Rising Action 2", "description": "...", "targetArc": ${Math.ceil(targetArcs * 0.7)}, "type": "rising_action", "importance": "major"},
    {"id": "pp5", "name": "Climax", "description": "...", "targetArc": ${targetArcs - 1}, "type": "climax", "importance": "critical"},
    {"id": "pp6", "name": "Resolution", "description": "...", "targetArc": ${targetArcs}, "type": "resolution", "importance": "critical"}
  ],
  "endingVision": "Kết thúc như thế nào (thỏa mãn, có thể mở rộng)",
  "uniqueHooks": ["Hook 1 độc đáo", "Hook 2", "Hook 3"]
}`;

    try {
      const response = await this.aiService.chat({
        provider: this.config.provider,
        model: this.config.model,
        messages: [
          { role: 'system', content: STORY_PLANNER_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: this.config.maxTokens || 8192,
      });

      if (!response.success || !response.content) {
        return { success: false, error: response.error || 'Empty response' };
      }

      const parsed = this.parseJSON<StoryOutline>(response.content);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generate all arc outlines at once
   */
  async planAllArcs(
    storyOutline: StoryOutline,
    worldBible: WorldBible
  ): Promise<{ success: boolean; data?: ArcOutline[]; error?: string }> {
    const arcs: ArcOutline[] = [];
    const chaptersPerArc = Math.ceil(storyOutline.targetChapters / storyOutline.targetArcs);

    for (let i = 0; i < storyOutline.targetArcs; i++) {
      const arcNumber = i + 1;
      const startChapter = i * chaptersPerArc + 1;
      const endChapter = Math.min((i + 1) * chaptersPerArc, storyOutline.targetChapters);

      // Get relevant plot points for this arc
      const plotPoints = storyOutline.majorPlotPoints.filter(pp => pp.targetArc === arcNumber);
      const previousArc = arcs[i - 1];

      const result = await this.planSingleArc({
        storyOutline,
        worldBible,
        arcNumber,
        startChapter,
        endChapter,
        plotPoints,
        previousArc,
      });

      if (!result.success || !result.data) {
        return { success: false, error: `Failed to plan arc ${arcNumber}: ${result.error}` };
      }

      arcs.push(result.data);
    }

    return { success: true, data: arcs };
  }

  /**
   * Plan a single arc in detail
   */
  async planSingleArc(input: {
    storyOutline: StoryOutline;
    worldBible: WorldBible;
    arcNumber: number;
    startChapter: number;
    endChapter: number;
    plotPoints: PlotPoint[];
    previousArc?: ArcOutline;
    isFinalArc?: boolean;
  }): Promise<{ success: boolean; data?: ArcOutline; error?: string }> {
    const chapterCount = input.endChapter - input.startChapter + 1;
    const arcThemes: ArcTheme[] = [
      'foundation', 'conflict', 'growth', 'tournament', 'exploration',
      'betrayal', 'revelation', 'revenge', 'war', 'triumph',
    ];

    // Detect final arc
    const isFinalArc = input.isFinalArc || input.arcNumber === input.storyOutline.targetArcs;
    const theme = isFinalArc ? 'finale' : arcThemes[(input.arcNumber - 1) % arcThemes.length];

    // Finale-specific instructions
    const finaleInstructions = isFinalArc ? `
ĐÂY LÀ ARC CUỐI CÙNG CỦA BỘ TRUYỆN!
- PHẢI giải quyết TẤT CẢ plot threads còn lại
- PHẢI cho protagonist đạt mục tiêu cuối: ${input.storyOutline.protagonist.endGoal}
- PHẢI kết thúc hoàn chỉnh: ${input.storyOutline.endingVision}
- KHÔNG có cliffhanger ở chương cuối cùng — thay vào đó viết epilogue/kết thúc thỏa mãn
- Chương cuối nên có: trận chiến cuối → chiến thắng → epilogue (vài năm sau)
- Protagonist phải đạt cảnh giới cao nhất hoặc gần cao nhất
` : '';

    const prompt = `Thiết kế chi tiết Arc ${input.arcNumber}:

STORY: ${input.storyOutline.title}
PREMISE: ${input.storyOutline.premise}
PROTAGONIST: ${input.storyOutline.protagonist.name}

ARC ${input.arcNumber}/${input.storyOutline.targetArcs}:
- Chapters: ${input.startChapter} - ${input.endChapter} (${chapterCount} chương)
${input.plotPoints.length > 0 ? `- Major plot points in this arc: ${input.plotPoints.map(p => p.name).join(', ')}` : ''}
${input.previousArc ? `- Previous arc ended: ${input.previousArc.resolution}` : '- Đây là arc đầu tiên'}
${finaleInstructions}
POWER SYSTEM: ${input.worldBible.powerSystem.name}
CURRENT REALM: ${input.previousArc?.endingRealm || input.worldBible.powerSystem.realms[0].name}

Trả về JSON:
{
  "id": "arc_${input.arcNumber}",
  "arcNumber": ${input.arcNumber},
  "title": "Tên arc hấp dẫn",
  "theme": "${theme}",
  "premise": "Premise của arc này 1-2 câu",
  "startChapter": ${input.startChapter},
  "endChapter": ${input.endChapter},
  "chapterCount": ${chapterCount},
  "setup": "Phần giới thiệu arc (1/4 đầu)",
  "confrontation": "Phần xung đột chính (1/2 giữa)",
  "resolution": "Phần giải quyết (1/4 cuối)",
  "incitingIncident": "Sự kiện khởi đầu arc",
  "midpoint": "Điểm giữa arc (twist hoặc revelation)",
  "climax": "Cao trào của arc",
  "cliffhanger": "${isFinalArc ? 'KHÔNG CÓ — đây là arc cuối, kết thúc bằng epilogue thỏa mãn' : 'Cliffhanger cuối arc để hook arc sau'}",
  "protagonistGrowth": "Protagonist phát triển như thế nào trong arc",
  "newCharacters": ["Nhân vật mới 1", "Nhân vật mới 2"],
  "enemyOrObstacle": "Kẻ thù hoặc thử thách chính của arc",
  "startingRealm": "${input.previousArc?.endingRealm || input.worldBible.powerSystem.realms[0].name}",
  "endingRealm": "${isFinalArc ? 'Cảnh giới cao nhất hoặc gần cao nhất' : 'Cảnh giới cuối arc'}",
  "breakthroughs": ["Đột phá 1 (chương X)", "Đột phá 2 (nếu có)"],
  "chapterOutlines": [
    ${this.generateChapterPlanTemplate(input.startChapter, chapterCount)}
  ],
  "tensionCurve": [${this.generateTensionCurve(chapterCount).join(', ')}],
  "status": "planned"
}`;

    const maxRetries = this.config.maxRetries || 3;
    const baseMaxTokens = this.config.maxTokens || 8192;
    let lastError = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Escalate maxTokens on retry (1x, 1.5x, 2x)
        const currentMaxTokens = Math.round(baseMaxTokens * (1 + attempt * 0.5));

        const response = await this.aiService.chat({
          provider: this.config.provider,
          model: this.config.model,
          messages: [
            { role: 'system', content: isFinalArc ? ARC_FINALE_PROMPT : ARC_PLANNER_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          maxTokens: currentMaxTokens,
        });

        if (!response.success || !response.content) {
          lastError = response.error || 'Empty response';
          continue; // Retry
        }

        // Check for truncated response

        const parsed = this.parseJSON<ArcOutline>(response.content);

        // Validate and fix chapter outlines if needed
        if (!parsed.chapterOutlines || parsed.chapterOutlines.length !== chapterCount) {
          parsed.chapterOutlines = this.generateDefaultChapterPlans(
            input.startChapter,
            chapterCount,
            parsed
          );
        }

        return { success: true, data: parsed };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        // Continue to next attempt
      }
    }

    return { success: false, error: `All ${maxRetries} attempts failed. Last error: ${lastError}` };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private generateChapterPlanTemplate(startChapter: number, count: number): string {
    const plans: string[] = [];
    const dopamineTypes: DopamineType[] = [
      'face_slap', 'power_reveal', 'treasure_gain', 'breakthrough',
      'revenge', 'recognition', 'beauty_encounter', 'secret_identity',
    ];

    for (let i = 0; i < Math.min(count, 5); i++) {
      const chapterNum = startChapter + i;
      const localNum = i + 1;
      const tension = this.getTensionForPosition(i, count);

      plans.push(`{
      "chapterNumber": ${chapterNum},
      "localNumber": ${localNum},
      "title": "Tiêu đề chương ${chapterNum}",
      "purpose": "Mục đích của chương trong arc",
      "keyEvents": ["Event 1", "Event 2"],
      "tensionLevel": ${tension},
      "dopamineType": "${dopamineTypes[i % dopamineTypes.length]}",
      "cliffhangerHint": "Gợi ý cliffhanger"
    }`);
    }

    if (count > 5) {
      plans.push(`// ... tiếp tục cho ${count - 5} chương còn lại với format tương tự`);
    }

    return plans.join(',\n    ');
  }

  private generateDefaultChapterPlans(
    startChapter: number,
    count: number,
    arc: Partial<ArcOutline>
  ): ArcChapterPlan[] {
    const plans: ArcChapterPlan[] = [];
    const dopamineTypes: DopamineType[] = [
      'face_slap', 'power_reveal', 'treasure_gain', 'breakthrough',
    ];

    for (let i = 0; i < count; i++) {
      const localNum = i + 1;
      const position = count <= 1 ? 0 : i / (count - 1);

      let purpose = 'Phát triển tình tiết';
      if (position < 0.25) purpose = 'Setup: ' + (arc.setup || 'Giới thiệu');
      else if (position < 0.75) purpose = 'Confrontation: ' + (arc.confrontation || 'Xung đột');
      else purpose = 'Resolution: ' + (arc.resolution || 'Giải quyết');

      plans.push({
        chapterNumber: startChapter + i,
        localNumber: localNum,
        title: `Chương ${startChapter + i}`,
        purpose,
        keyEvents: [],
        tensionLevel: this.getTensionForPosition(i, count),
        dopamineType: dopamineTypes[i % dopamineTypes.length],
        cliffhangerHint: 'Cliffhanger',
      });
    }

    return plans;
  }

  private getTensionForPosition(index: number, total: number): number {
    if (total <= 1) return 50; // Default tension for single chapter

    const position = index / (total - 1);
    const climaxPosition = 0.75;

    if (position < climaxPosition) {
      // Rising tension
      return Math.round(30 + (60 * position) / climaxPosition);
    } else {
      // Falling action
      return Math.round(90 - (40 * (position - climaxPosition)) / (1 - climaxPosition));
    }
  }

  private generateTensionCurve(length: number): number[] {
    const curve: number[] = [];
    for (let i = 0; i < length; i++) {
      curve.push(this.getTensionForPosition(i, length));
    }
    return curve;
  }

  private parseJSON<T>(content: string): T {
    // Try to extract JSON from markdown code blocks or raw JSON
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/```\s*([\s\S]*?)\s*```/) ||
      content.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

    // Strip // comments only outside of string literals
    // Walk char by char to avoid destroying URLs like "https://..."
    let cleaned = '';
    let inString = false;
    let escape = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const ch = jsonStr[i];
      if (escape) {
        cleaned += ch;
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        cleaned += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        cleaned += ch;
        continue;
      }
      if (!inString && ch === '/' && jsonStr[i + 1] === '/') {
        // Skip until end of line
        while (i < jsonStr.length && jsonStr[i] !== '\n') i++;
        continue;
      }
      cleaned += ch;
    }

    // Fix trailing commas
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    // Try parsing directly first
    try {
      return JSON.parse(cleaned);
    } catch {
      // JSON parse failed — attempt to repair truncated JSON
      cleaned = this.repairTruncatedJSON(cleaned);
      return JSON.parse(cleaned);
    }
  }

  /**
   * Attempt to repair truncated JSON by closing unclosed brackets/braces.
   * Handles cases where Gemini response was cut off mid-JSON due to token limits.
   */
  private repairTruncatedJSON(input: string): string {
    let repaired = input;

    // If we're stuck inside an unclosed string, close it
    let inStr = false;
    let esc = false;
    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; }
    }
    if (inStr) {
      repaired += '"';
    }

    // Remove trailing partial key-value pairs
    // e.g., ..."title": "Tiêu đề chươ  (truncated mid-value)
    // After closing the string above, we might have: ..."title": "Tiêu đề chươ"
    // That's actually valid. But if we have a trailing comma + partial key:
    // e.g., , "chapterNum  → remove this
    repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');  // partial string value
    repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*$/, '');          // key with no value
    repaired = repaired.replace(/,\s*"[^"]*$/, '');                  // partial key only
    repaired = repaired.replace(/,\s*$/, '');                        // trailing comma

    // Fix trailing commas (again after trimming)
    repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    // Count open brackets/braces and close them
    let openBraces = 0;
    let openBrackets = 0;
    inStr = false;
    esc = false;
    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }
    }

    // Close unclosed brackets then braces (innermost first)
    while (openBrackets > 0) { repaired += ']'; openBrackets--; }
    while (openBraces > 0) { repaired += '}'; openBraces--; }

    // Final trailing comma cleanup
    repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    return repaired;
  }
}

// Export singleton
export const storyPlanner = new StoryPlanner();
