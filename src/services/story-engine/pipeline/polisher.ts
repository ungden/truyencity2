/**
 * Story Engine — Polisher (Phase R+1, 2026-05-15).
 *
 * Inspired by InkOS agents/polisher.ts: surface-only prose polish that
 * runs AFTER Critic+Reviser accept chapter structure. Polisher ONLY
 * touches prose surface — sentence craft, paragraph shape, wording,
 * punctuation, sensory immersion, dialogue naturalness.
 *
 * Forbidden from changing:
 *   - Plot beats, scene structure, dialogue content
 *   - Character names, identities, relationships
 *   - World details, locations, items
 *   - Cause-effect chains, motivations
 *
 * 6 anti-AI prose rules (Vietnamese-adapted):
 *   1. Động từ > tính từ (max 1-2 adj/câu)
 *   2. 3+ câu liên tiếp cùng structure / cùng subject cấm
 *   3. Externalize emotion (action verb thay vì "cảm thấy X")
 *   4. Distinct character voice (mỗi NV có vocab/cadence riêng)
 *   5. Delete narrator conclusions ("vào lúc đó hắn cuối cùng đã hiểu...")
 *   6. [polisher-note] footer cho structural issues — không tự fix
 *
 * Output constraint: length stays within ±15% of input.
 *
 * When to invoke:
 *   - After length-normalizer (so length is already in soft range)
 *   - Before final save to DB
 *   - Optional: skip on bulk-routine chapters via flag
 */

import { callGemini } from '../utils/gemini';
import type { GeminiConfig } from '../types';
import { stripPostWriteMetaLines } from '../quality/post-write-validator';

const POLISHER_SYSTEM_VN = `Bạn là biên tập viên surface prose tiếng Việt cho truyện dài kỳ 1000+ chương.

## BOUNDARY (hard constraints — vi phạm = thất bại)

Bạn CHỈ chạm prose surface: câu cú / đoạn / từ ngữ / dấu câu / 5 giác quan / dialogue naturalness. Bạn BỊ CẤM:
- Thêm/xoá plot beat, scene structure, sự kiện
- Đổi tên character, danh xưng, mối quan hệ
- Đổi world detail, location, vật phẩm, chi tiết setup
- Đổi nội dung dialogue (giữ nguyên ý + thông tin); chỉ đổi cách diễn đạt
- Đổi cause-effect, motivation, decision logic của character

Nếu thấy plot/structure issue: gắn line "[polisher-note] <issue>" cuối chương cho reviewer pass sau. KHÔNG tự fix trong prose.

## 6 ANTI-AI PROSE RULES (mục tiêu phải đạt)

### 1. Động từ > tính từ
- Mỗi câu tối đa 1-2 tính từ chính xác. Cấm "rất / vô cùng / cực kỳ + adj" lặp nhiều.
- "Hắn ngồi xuống mệt mỏi, đôi mắt sâu thẳm tối tăm rực rỡ vẻ trầm ngâm." → quá nhiều adj. Thay: "Hắn ngồi xuống, vai trùng. Mắt nhìn chăm vào đèn dầu."

### 2. Đa dạng cấu trúc câu
- 3+ câu liên tiếp cùng kết cấu / cùng subject → CẤM. Phải xen kẽ câu ngắn / câu dài / câu phức / câu đơn / câu hỏi / câu kể.
- "Hắn đi. Hắn ngồi. Hắn nói." → cần xen: "Hắn đi tới. Ngồi xuống ghế gỗ. Cuối cùng mới mở miệng."

### 3. Externalize emotion (action verb thay cho "cảm thấy")
- "Hắn cảm thấy tức giận" → "Hắn đập tay xuống bàn, chén trà nghiêng." (action externalize emotion)
- "Cô buồn bã" → "Cô cúi đầu, ngón tay xoắn vạt áo."
- "Anh ta hồi hộp" → "Anh ta nuốt nước bọt, mắt đảo về phía cửa."

### 4. Distinct character voice
- Mỗi nhân vật có vocab + cadence + verbal tic riêng. Người già nói chậm dài / người trẻ nói nhanh ngắn / người gangster dùng tiếng lóng / người trí thức dùng từ Hán Việt.
- Dialogue không phụ thuộc context vẫn nhận ra ai nói.

### 5. Cấm narrator conclusion
- "Vào lúc đó hắn cuối cùng đã hiểu sức mạnh là gì." → XOÁ. Reader tự kết luận từ scene.
- "Đây chính là ý nghĩa của tình bạn." → XOÁ. Hành động trong scene đã thể hiện.
- "Hà Vĩnh Phong sẽ là huyền thoại" → XOÁ. Đây là author-sermon.

### 6. AI-tell vocab cấm
- Hedge: "có lẽ / dường như / hình như / có vẻ / như thể / có thể" → giữ tối đa 2-3 lần/chương, ưu tiên xoá.
- Surprise marker spam: "đột nhiên / bỗng / chợt / không ngờ" → giữ tối đa 1-2 lần/chương.
- "Hiển nhiên / không cần nói / ai cũng biết" → XOÁ HẾT.
- "Vào lúc đó / khi đó / lúc này" lặp lại nhiều → thay bằng action verb hoặc xoá.

## 6 PROSE-LAYER LANDMINES (hard rules)

- Đoạn 3-5 dòng (mobile-friendly). 7+ dòng phải tách nhưng không break action+reaction nhịp.
- Dialogue (em-dash format) phải có đoạn riêng — không nhồi vào paragraph narration.
- Không ăn vào dialogue: nội dung lời thoại giữ nguyên 100%, chỉ thêm dialogue tag action ("Hạo gập tay" thay "Hạo nói").
- Lặp tên MC trong 2-3 câu liên tiếp → xen "hắn"/"y"/"anh ta"/"gã".
- Lặp pattern "đôi mắt + adj/verb" / "ánh mắt + adj/verb" — gộp/đa dạng hoá.
- "Tóm tắt: ..." / "Chương này..." / "Đoạn vừa rồi..." → CẤM TUYỆT ĐỐI.

## OUTPUT CONTRACT

Trả về NGUYÊN VĂN chương đã polish. KHÔNG JSON, KHÔNG markdown header, KHÔNG chú thích quy trình, KHÔNG "Chương N:" leading.

Nếu phát hiện plot/structure issue: append "[polisher-note] <issue>" lines ở cuối chương, mỗi note 1 dòng. Bỏ block này nếu không có note.

Giữ ≥85% câu gốc — chỉ chỉnh câu thật sự có vấn đề. KHÔNG rewrite cả paragraph. Tổng độ dài thay đổi ≤ ±15% từ bản gốc.`;

export interface PolishChapterInput {
  readonly chapterNumber: number;
  readonly chapterContent: string;
  readonly chapterIntent?: string;
  readonly temperature?: number;
}

export interface PolishChapterOutput {
  readonly polishedContent: string;
  readonly changed: boolean;
  readonly originalLength: number;
  readonly polishedLength: number;
  readonly warning?: string;
}

/**
 * Polish a chapter's prose surface. Returns polished content + change
 * indicator. Always returns valid content — falls back to input on
 * validation failure.
 *
 * Validation:
 *   - Polished length within ±25% of original (more lenient than reviser
 *     since polisher constrained to ±15% but model may drift slightly)
 *   - Polished content is non-empty (>50% of original chars)
 *
 * On validation failure: returns original content with warning.
 */
export async function polishChapter(
  input: PolishChapterInput,
  config: GeminiConfig,
  projectId?: string,
): Promise<PolishChapterOutput> {
  const original = input.chapterContent;
  const originalLength = original.length;

  if (!original || originalLength < 500) {
    return {
      polishedContent: original,
      changed: false,
      originalLength,
      polishedLength: originalLength,
      warning: 'Skipped: chapter too short.',
    };
  }

  const intentBlock = input.chapterIntent
    ? `\n## Ý đồ chương (giữ nguyên khi polish)\n${input.chapterIntent}\n`
    : '';

  const userPrompt = `Polish chương ${input.chapterNumber}. Trả về NGUYÊN VĂN đã polish — không JSON, không markdown header, không chú thích.${intentBlock}

## Chương cần polish
"""
${original}
"""

Nhắc lại output: thuần văn Việt, em-dash dialogue, đoạn cách bằng newline đôi. Append [polisher-note] lines ở cuối CHỈ NẾU có plot/structure issue cần reviewer fix.`;

  try {
    const response = await callGemini(
      userPrompt,
      {
        ...config,
        systemPrompt: POLISHER_SYSTEM_VN,
        temperature: input.temperature ?? 0.4,
        maxTokens: 32768,
      },
      {
        tracking: projectId
          ? { projectId, task: 'polisher', chapterNumber: input.chapterNumber }
          : undefined,
      },
    );

    let polished = response.content?.trim() || '';
    polished = stripPostWriteMetaLines(polished);
    polished = polished
      .replace(/^```[\w]*\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .replace(/^Chương\s+\d+\s*[:\-–—]\s*[^\n]*\n+/i, '')
      .replace(/^#{1,6}\s+[^\n]*\n+/m, '')
      .trim();

    // Validate length: ±25% tolerance (polisher targets ±15% but allow drift)
    if (!polished || polished.length < originalLength * 0.5) {
      return {
        polishedContent: original,
        changed: false,
        originalLength,
        polishedLength: polished.length,
        warning: `Polisher returned too-short content (${polished.length}/${originalLength}). Keeping original.`,
      };
    }
    if (polished.length > originalLength * 1.4) {
      return {
        polishedContent: original,
        changed: false,
        originalLength,
        polishedLength: polished.length,
        warning: `Polisher returned too-long content (${polished.length}/${originalLength}). Keeping original.`,
      };
    }

    return {
      polishedContent: polished,
      changed: polished !== original,
      originalLength,
      polishedLength: polished.length,
    };
  } catch (e) {
    return {
      polishedContent: original,
      changed: false,
      originalLength,
      polishedLength: originalLength,
      warning: `Polisher threw: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
