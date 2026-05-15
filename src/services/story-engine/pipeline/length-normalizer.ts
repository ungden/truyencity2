/**
 * Story Engine — Length Normalizer (Phase R+1, 2026-05-15).
 *
 * Inspired by InkOS agents/length-normalizer.ts: dedicated single-pass
 * agent that compresses overlong chapters or expands too-short ones
 * WITHOUT semantic revision. Plot, dialogue, scene structure preserved.
 *
 * Key constraints (port from InkOS):
 *   - Single LLM pass, temperature 0.2 (precision editing)
 *   - Cannot recurse, cannot add new subplots / reveals / characters
 *   - Cannot remove plot beats — only tighten/expand prose density
 *   - Output stays within ±15% of target after normalization
 *
 * When to invoke:
 *   - After Critic approves chapter (auto-revise didn't trigger)
 *   - Before chapter is saved to DB
 *   - Only if count is outside soft range (use chooseNormalizeMode)
 *
 * Why not just rely on Writer hitting target: Writer is trained to add
 * detail when prompt context is rich, often overshoots. Architect doesn't
 * have token-counting feedback. Dedicated post-write normalizer is cheaper
 * + more reliable than retry loops.
 */

import { callGemini } from '../utils/gemini';
import type { GeminiConfig } from '../types';
import {
  countChapterLength,
  chooseNormalizeMode,
  type LengthSpec,
  type LengthNormalizeMode,
} from '../utils/length-metrics';
import { stripPostWriteMetaLines } from '../quality/post-write-validator';

const NORMALIZER_SYSTEM = `Bạn là biên tập viên độ dài chương truyện Việt. Nhiệm vụ duy nhất là điều chỉnh độ dài chương theo target — single-pass, không lặp lại, không recursion.

QUY TẮC CỨNG (vi phạm = thất bại):
- KHÔNG được thêm tuyến phụ mới, hé lộ tương lai mới, hay character mới
- KHÔNG được thêm/xoá scene chính, dialogue chính, plot event chính
- KHÔNG được đổi tên character, location, vật phẩm
- KHÔNG được output gì ngoài nội dung chương — không markdown, không "Chương N", không chú thích
- KHÔNG được xuất câu summary kiểu "Tóm tắt: ..." hay "Chương này ..."

CHỈ ĐƯỢC PHÉP:
- COMPRESS: cô đặc prose (xoá inspirational monologue, paraphrase chain, mô tả thừa, sermon, hedge word, surprise marker spam). Giữ nguyên dialogue + plot beats.
- EXPAND: thêm sensory detail (sight/sound/touch/smell), character body language, environmental beats. KHÔNG thêm reasoning, KHÔNG thêm meta-narration.`;

export interface NormalizeChapterInput {
  readonly chapterNumber: number;
  readonly chapterContent: string;
  readonly lengthSpec: LengthSpec;
  /** Optional hint about chapter intent — preserved during normalization. */
  readonly chapterIntent?: string;
}

export interface NormalizeChapterOutput {
  readonly normalizedContent: string;
  readonly originalCount: number;
  readonly finalCount: number;
  readonly applied: boolean;
  readonly mode: LengthNormalizeMode;
  readonly warning?: string;
}

/**
 * Normalize a chapter's length to fit within the soft range of LengthSpec.
 *
 * - Skips entirely if count already inside soft range (returns applied=false).
 * - Single LLM pass with temperature 0.2.
 * - Validates output: not too short (>50% of original), not too long
 *   (<150% of original). On validation failure, returns original content
 *   with applied=false + warning.
 */
export async function normalizeChapterLength(
  input: NormalizeChapterInput,
  config: GeminiConfig,
  projectId?: string,
): Promise<NormalizeChapterOutput> {
  const originalCount = countChapterLength(input.chapterContent, input.lengthSpec.countingMode);

  const mode = input.lengthSpec.normalizeMode === 'none' || input.lengthSpec.normalizeMode === undefined
    ? chooseNormalizeMode(originalCount, input.lengthSpec)
    : input.lengthSpec.normalizeMode;

  if (mode === 'none') {
    return {
      normalizedContent: input.chapterContent,
      originalCount,
      finalCount: originalCount,
      applied: false,
      mode: 'none',
    };
  }

  const userPrompt = buildUserPrompt(input, originalCount, mode);

  try {
    const response = await callGemini(
      userPrompt,
      {
        ...config,
        systemPrompt: NORMALIZER_SYSTEM,
        temperature: 0.2,
        maxTokens: 32768,
      },
      {
        tracking: projectId
          ? { projectId, task: 'length_normalizer', chapterNumber: input.chapterNumber }
          : undefined,
      },
    );

    let normalized = response.content?.trim() || '';
    normalized = stripPostWriteMetaLines(normalized);
    // Strip leading "Chương N:" if model adds it defensively.
    normalized = normalized
      .replace(/^```[\w]*\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .replace(/^Chương\s+\d+\s*[:\-–—]\s*[^\n]*\n+/i, '')
      .replace(/^#{1,6}\s+[^\n]*\n+/m, '')
      .trim();

    // Validate: not too short, not too long.
    if (!normalized || normalized.length < input.chapterContent.length * 0.4) {
      return {
        normalizedContent: input.chapterContent,
        originalCount,
        finalCount: originalCount,
        applied: false,
        mode,
        warning: `Length-normalizer returned too-short content (${normalized.length}/${input.chapterContent.length}). Keeping original.`,
      };
    }
    if (normalized.length > input.chapterContent.length * 1.6) {
      return {
        normalizedContent: input.chapterContent,
        originalCount,
        finalCount: originalCount,
        applied: false,
        mode,
        warning: `Length-normalizer returned too-long content (${normalized.length}/${input.chapterContent.length}). Keeping original.`,
      };
    }

    const finalCount = countChapterLength(normalized, input.lengthSpec.countingMode);
    const ratio = finalCount / input.lengthSpec.target;
    let warning: string | undefined;
    if (mode === 'compress' && ratio > 1.3) {
      warning = `Compress mode under-shot: final ${finalCount} still > 1.3× target ${input.lengthSpec.target}.`;
    } else if (mode === 'expand' && ratio < 0.7) {
      warning = `Expand mode under-shot: final ${finalCount} still < 0.7× target ${input.lengthSpec.target}.`;
    }

    return {
      normalizedContent: normalized,
      originalCount,
      finalCount,
      applied: true,
      mode,
      warning,
    };
  } catch (e) {
    return {
      normalizedContent: input.chapterContent,
      originalCount,
      finalCount: originalCount,
      applied: false,
      mode,
      warning: `Length-normalizer threw: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function buildUserPrompt(
  input: NormalizeChapterInput,
  originalCount: number,
  mode: LengthNormalizeMode,
): string {
  const spec = input.lengthSpec;
  const action = mode === 'compress' ? 'cô đặc / cắt' : 'mở rộng / thêm chi tiết';
  const direction = mode === 'compress'
    ? `cắt từ ${originalCount} từ xuống ${spec.softMin}-${spec.softMax} từ`
    : `mở rộng từ ${originalCount} từ lên ${spec.softMin}-${spec.softMax} từ`;

  const intentBlock = input.chapterIntent
    ? `\n## Ý đồ chương\n${input.chapterIntent}\n`
    : '';

  const compressGuidance = mode === 'compress'
    ? `\n## Compress focus (cắt theo thứ tự ưu tiên)
1. Inspirational monologue / "MC là huyền thoại" closer — XOÁ TOÀN BỘ
2. Paraphrase chain ("vận mệnh bước sang chương mới" + "rẽ sang chương mới") — giữ 1 câu
3. Mô tả thừa lặp công thức: "đôi mắt + adj/verb", "ánh mắt + adj/verb" — gộp lại
4. Hedge / surprise marker spam (có lẽ / dường như / đột nhiên / bỗng) — xoá khi không cần
5. Mô tả nội tâm dài (>2 câu liền nhau analyze cảm xúc) — gộp thành 1 câu action/dialogue
6. Lặp họ+tên MC trong 2-3 câu liên tiếp — xen đại từ ("hắn"/"y"/"anh ta")

CẤM cắt: dialogue (em-dash format), plot event quan trọng, scene transition, character introduction first-time.`
    : '';

  const expandGuidance = mode === 'expand'
    ? `\n## Expand focus (thêm theo thứ tự ưu tiên)
1. Sensory detail thiếu (thị / thính / xúc / khứu / vị) — thêm 1-2 chi tiết/scene
2. Body language character (cử động tay / mắt / cơ mặt) thay cho "cảm thấy X"
3. Environmental beats (gió, ánh sáng, âm thanh background)
4. Dialogue tag với action ngắn ("Hạo gập tay, đáp:" thay cho "Hạo đáp:")
5. Dialogue có thể thêm 1 câu phản hồi tự nhiên (không thay đổi nội dung trao đổi)

CẤM thêm: tuyến phụ, reveal mới, character mới, reasoning analytical, meta-narration.`
    : '';

  return `Nhiệm vụ: ${action} chương ${input.chapterNumber} (${direction}).

## Length spec
- Target: ${spec.target} từ
- Soft range: ${spec.softMin}-${spec.softMax} từ
- Hard range: ${spec.hardMin}-${spec.hardMax} từ
- Đang ở: ${originalCount} từ → cần ${mode === 'compress' ? 'giảm' : 'tăng'} ~${Math.abs(originalCount - spec.target)} từ
${intentBlock}${compressGuidance}${expandGuidance}

## Nội dung chương (cần ${action})
"""
${input.chapterContent}
"""

Trả về: NỘI DUNG CHƯƠNG ĐÃ ${mode === 'compress' ? 'CÔ ĐẶC' : 'MỞ RỘNG'}. Thuần văn Việt, em-dash dialogue, đoạn cách bằng newline đôi. KHÔNG markdown, KHÔNG chú thích.`;
}
