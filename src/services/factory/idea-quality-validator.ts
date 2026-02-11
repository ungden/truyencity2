/**
 * Idea Quality Validator - Validates story idea quality before production
 * 
 * Scores ideas on multiple dimensions:
 * - Golden finger presence (30%)
 * - Hook strength (30%)
 * - USP uniqueness (20%)
 * - Premise coherence (10%)
 * - Genre fit (10%)
 */

import type { StoryIdea } from './types';
import type { GeminiClient } from './gemini-client';
import { getGeminiClient } from './gemini-client';

export interface QualityScore {
  overall: number; // 0-10
  breakdown: {
    golden_finger: number; // 0-10
    hook_strength: number; // 0-10
    usp_uniqueness: number; // 0-10
    premise_coherence: number; // 0-10
    genre_fit: number; // 0-10
  };
  issues: string[];
  suggestions: string[];
  pass: boolean; // True if overall >= threshold
}

export class IdeaQualityValidator {
  private gemini: GeminiClient;
  private threshold: number;

  constructor(options?: { geminiClient?: GeminiClient; threshold?: number }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.threshold = options?.threshold || 7.0;
  }

  /**
   * Validate a story idea and return quality score
   */
  async validate(idea: StoryIdea): Promise<QualityScore> {
    // 1. Check golden finger (30% weight) - Fast, deterministic
    const gfScore = this.checkGoldenFinger(idea);

    // 2-5. AI-based checks (70% weight) - Slower but more nuanced
    const aiScores = await this.evaluateWithAI(idea);

    const breakdown = {
      golden_finger: gfScore,
      hook_strength: aiScores.hook_strength,
      usp_uniqueness: aiScores.usp_uniqueness,
      premise_coherence: aiScores.premise_coherence,
      genre_fit: aiScores.genre_fit,
    };

    // Calculate weighted overall score
    const overall =
      gfScore * 0.3 +
      aiScores.hook_strength * 0.3 +
      aiScores.usp_uniqueness * 0.2 +
      aiScores.premise_coherence * 0.1 +
      aiScores.genre_fit * 0.1;

    const issues = this.identifyIssues(breakdown, idea);
    const suggestions = this.generateSuggestions(breakdown, issues);

    return {
      overall,
      breakdown,
      issues,
      suggestions,
      pass: overall >= this.threshold,
    };
  }

  /**
   * Check for golden finger presence (deterministic)
   */
  private checkGoldenFinger(idea: StoryIdea): number {
    const goldenFingerKeywords = [
      // System keywords
      'hệ thống',
      'ký danh',
      'sign-in',
      'gacha',
      'rút thưởng',
      'nhiệm vụ',
      'quest',

      // Rebirth/Time travel
      'trọng sinh',
      'reborn',
      'xuyên không',
      'transmigrate',
      'ký ức kiếp trước',
      'kiếp sau',
      'quay về',

      // Special abilities
      'thể chất đặc biệt',
      'huyết mạch',
      'bloodline',
      'thiên phú',
      'talent',
      'năng lực đặc biệt',

      // Treasures/Legacy
      'không gian',
      'space',
      'bảo bối',
      'thần khí',
      'artifact',
      'di sản',
      'inheritance',
      'kho tàng',
      'treasure',

      // Knowledge advantage
      'tri thức',
      'knowledge',
      'tiên tri',
      'prophesy',
      'biết trước',
      'foreknowledge',

      // Special physiques
      'thể chất',
      'physique',
      'căn cốt',
      'spiritual root',
    ];

    const text = `${idea.premise || ''} ${idea.hook || ''} ${idea.power_system_type || ''}`.toLowerCase();
    const matches = goldenFingerKeywords.filter((kw) => text.includes(kw.toLowerCase()));

    if (matches.length === 0) {
      return 0; // Critical: no golden finger detected
    } else if (matches.length === 1) {
      return 7; // OK: has one golden finger
    } else if (matches.length >= 2) {
      return 10; // Great: has multiple golden fingers or clearly stated
    }

    return 5; // Fallback
  }

  /**
   * Use AI to evaluate hook, USP, premise, and genre fit
   */
  private async evaluateWithAI(idea: StoryIdea): Promise<{
    hook_strength: number;
    usp_uniqueness: number;
    premise_coherence: number;
    genre_fit: number;
  }> {
    const prompt = `Bạn là chuyên gia đánh giá chất lượng ý tưởng webnovel. Hãy đánh giá ý tưởng này trên 4 tiêu chí:

Ý TƯỞNG:
Tên: ${idea.title}
Thể loại: ${idea.genre}
Tiền đề: ${idea.premise || 'Không có'}
Hook: ${idea.hook || 'Không có'}
USP: ${idea.usp || 'Không có'}

ĐÁNH GIÁ (thang 0-10):

1. HOOK STRENGTH (0-10):
   - Có gây sốc/bất ngờ không?
   - Có tạo tò mò ngay lập tức không?
   - Có cụ thể (không chung chung)?
   - Có visual scene rõ ràng không?

2. USP UNIQUENESS (0-10):
   - Có điểm khác biệt rõ ràng không?
   - Có gì mới mẻ so với truyện khác?
   - Có lý do thuyết phục để đọc không?
   - Có nêu rõ value proposition không?

3. PREMISE COHERENCE (0-10):
   - Premise có mạch lạc không?
   - Golden finger và premise có liên kết không?
   - Có internal logic consistency không?
   - Có contradiction nào không?

4. GENRE FIT (0-10):
   - Có phù hợp với thể loại không?
   - Có đủ yếu tố thể loại cần thiết không?
   - Tropes có match với genre không?
   - Target audience có đúng không?

OUTPUT JSON (chỉ JSON, không markdown):
{
  "hook_strength": 0-10,
  "usp_uniqueness": 0-10,
  "premise_coherence": 0-10,
  "genre_fit": 0-10,
  "reasoning": {
    "hook": "Lý do điểm hook...",
    "usp": "Lý do điểm USP...",
    "premise": "Lý do điểm premise...",
    "genre": "Lý do điểm genre fit..."
  }
}`;

    try {
      const result = await this.gemini.chat(
        [{ role: 'user', parts: [{ text: prompt }] }],
        {
          temperature: 0.3, // Low temp for consistent scoring
          maxOutputTokens: 1024,
        }
      );

      if (!result.success || !result.data) {
        throw new Error(`AI evaluation failed: ${result.error}`);
      }

      // Extract JSON from response content
      const responseText = result.data.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response does not contain valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        hook_strength: Math.max(0, Math.min(10, parsed.hook_strength || 5)),
        usp_uniqueness: Math.max(0, Math.min(10, parsed.usp_uniqueness || 5)),
        premise_coherence: Math.max(0, Math.min(10, parsed.premise_coherence || 5)),
        genre_fit: Math.max(0, Math.min(10, parsed.genre_fit || 5)),
      };
    } catch (error) {
      console.error('Failed to evaluate idea with AI:', error);
      // Fallback scores if AI fails
      return {
        hook_strength: 5,
        usp_uniqueness: 5,
        premise_coherence: 5,
        genre_fit: 5,
      };
    }
  }

  /**
   * Identify specific issues based on scores
   */
  private identifyIssues(
    breakdown: QualityScore['breakdown'],
    idea: StoryIdea
  ): string[] {
    const issues: string[] = [];

    if (breakdown.golden_finger < 3) {
      issues.push('CRITICAL: Golden finger không rõ ràng hoặc không có');
    } else if (breakdown.golden_finger < 7) {
      issues.push('Golden finger chưa được nêu rõ ràng trong premise');
    }

    if (breakdown.hook_strength < 5) {
      issues.push('Hook yếu - không đủ sốc hoặc tò mò');
    } else if (breakdown.hook_strength < 7) {
      issues.push('Hook chưa đủ mạnh - cần visual scene cụ thể hơn');
    }

    if (breakdown.usp_uniqueness < 5) {
      issues.push('USP không rõ - truyện này giống hàng nghìn truyện khác');
    } else if (breakdown.usp_uniqueness < 7) {
      issues.push('USP chưa đủ độc đáo - cần điểm nhấn riêng biệt hơn');
    }

    if (breakdown.premise_coherence < 5) {
      issues.push('Premise thiếu mạch lạc - có mâu thuẫn hoặc không rõ ràng');
    }

    if (breakdown.genre_fit < 5) {
      issues.push(`Không phù hợp thể loại ${idea.genre} - thiếu yếu tố genre cần thiết`);
    }

    return issues;
  }

  /**
   * Generate actionable suggestions for improvement
   */
  private generateSuggestions(
    breakdown: QualityScore['breakdown'],
    issues: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (breakdown.golden_finger < 7) {
      suggestions.push(
        'Nêu rõ golden finger ngay trong premise: VD "nhận được hệ thống ký danh", "trọng sinh với ký ức 10 năm", "thức tỉnh huyết mạch cổ đại"'
      );
    }

    if (breakdown.hook_strength < 7) {
      suggestions.push(
        'Cải thiện hook với: (1) Visual scene cụ thể, (2) Shocking event ngay lập tức, (3) Mystery element. VD: "Mở mắt, thấy thi thể của chính mình..."'
      );
    }

    if (breakdown.usp_uniqueness < 7) {
      suggestions.push(
        'Tạo USP rõ ràng hơn: Kết hợp 2 yếu tố độc đáo (VD: hệ thống + nghề nghiệp hiếm), hoặc twist bất ngờ (VD: nhân vật yếu nhất nhưng có năng lực ẩn)'
      );
    }

    if (breakdown.premise_coherence < 7) {
      suggestions.push('Đảm bảo premise có logic: Situation → Golden Finger → Goal. Kiểm tra xem có contradiction không');
    }

    if (breakdown.genre_fit < 7) {
      suggestions.push('Thêm tropes và yếu tố điển hình của thể loại. VD: Tu tiên cần "cảnh giới", LitRPG cần "stat/level"');
    }

    return suggestions;
  }
}
