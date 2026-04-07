/**
 * Story Engine v2 — Auto-Reviser
 *
 * Inspired by NousResearch/AutoNovel's revision pipeline.
 * After chapter is written and contradictions detected, performs a targeted
 * revision pass to fix critical issues without rewriting the entire chapter.
 *
 * Only activates on CRITICAL contradictions (dead character resurrection,
 * severe power regression). Minor warnings are logged but not auto-fixed.
 *
 * Non-fatal: if revision fails, the original chapter is kept.
 */

import { callGemini } from '../utils/gemini';
import type { GeminiConfig } from '../types';
import type { CharacterContradiction } from '../memory/character-tracker';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_REVISION_CONTENT = 30000; // Cap content to avoid token overflow

const REVISER_SYSTEM = `Bạn là biên tập viên chuyên sửa lỗi mâu thuẫn trong truyện dài kỳ tiếng Việt.
Khi sửa lỗi: GIỮ NGUYÊN giọng văn, phong cách, cốt truyện. CHỈ thay đổi tối thiểu để sửa mâu thuẫn.
KHÔNG thêm chú thích, comment, hay giải thích. Trả về nội dung chương thuần túy.`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface RevisionResult {
  revised: boolean;
  content: string;
  fixedIssues: string[];
}

// ── Public: Auto-Revise Chapter ─────────────────────────────────────────────

/**
 * Performs a targeted revision of chapter content to fix critical contradictions.
 * Only activates when there are CRITICAL contradictions.
 * Returns revised content or original if revision fails/unnecessary.
 */
export async function autoReviseChapter(
  chapterNumber: number,
  originalContent: string,
  contradictions: CharacterContradiction[],
  config: GeminiConfig,
  projectId?: string,
): Promise<RevisionResult> {
  const criticals = contradictions.filter(c => c.severity === 'critical');

  // Only revise for critical issues
  if (criticals.length === 0) {
    return { revised: false, content: originalContent, fixedIssues: [] };
  }

  try {
    const issueDescriptions = criticals.map(c => `- ${c.description}`).join('\n');

    // Truncate content for the revision prompt
    const content = originalContent.slice(0, MAX_REVISION_CONTENT);
    const wasTruncated = originalContent.length > MAX_REVISION_CONTENT;

    const prompt = `Bạn là biên tập viên chuyên sửa lỗi mâu thuẫn trong truyện dài kỳ.

CHƯƠNG ${chapterNumber} có các LỖI MÂU THUẪN NGHIÊM TRỌNG sau:
${issueDescriptions}

NỘI DUNG CHƯƠNG:
${content}${wasTruncated ? '\n[...nội dung bị cắt bớt...]' : ''}

NHIỆM VỤ: Sửa các đoạn mâu thuẫn trong chương sao cho:
1. Nhân vật đã chết KHÔNG ĐƯỢC xuất hiện sống (thay bằng hồi tưởng/nhớ lại, hoặc thay bằng nhân vật khác nếu cần)
2. Sức mạnh/cảnh giới KHÔNG ĐƯỢC tụt ngược (giữ nguyên hoặc tăng)
3. GIỮ NGUYÊN toàn bộ cốt truyện, hội thoại, và cấu trúc — CHỈ sửa các đoạn vi phạm
4. Giọng văn và phong cách phải GIỐNG HỆT bản gốc
5. Độ dài phải TƯƠNG ĐƯƠNG bản gốc (±5%)

Trả về TOÀN BỘ nội dung chương đã sửa (không phải chỉ đoạn thay đổi). KHÔNG thêm bất kỳ chú thích hay giải thích nào.`;

    const response = await callGemini(prompt, {
      ...config,
      systemPrompt: REVISER_SYSTEM,
      temperature: 0.3, // Low temperature for precision editing
      maxTokens: 32768,
    }, {
      tracking: projectId ? { projectId, task: 'auto_revision' } : undefined,
    });

    const revisedContent = response.content?.trim();

    if (!revisedContent || revisedContent.length < originalContent.length * 0.5) {
      // Revision too short — likely failed, keep original
      console.warn(`[AutoReviser] Ch.${chapterNumber}: Revision too short (${revisedContent?.length || 0} vs ${originalContent.length}), keeping original`);
      return { revised: false, content: originalContent, fixedIssues: [] };
    }

    // If content was truncated, append the unprocessed tail
    const finalContent = wasTruncated
      ? revisedContent + originalContent.slice(MAX_REVISION_CONTENT)
      : revisedContent;

    console.warn(`[AutoReviser] Ch.${chapterNumber}: Fixed ${criticals.length} critical contradictions`);

    return {
      revised: true,
      content: finalContent,
      fixedIssues: criticals.map(c => c.description),
    };
  } catch (err) {
    console.warn(`[AutoReviser] Ch.${chapterNumber} revision failed:`, err instanceof Error ? err.message : String(err));
    return { revised: false, content: originalContent, fixedIssues: [] };
  }
}
