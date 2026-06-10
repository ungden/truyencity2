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
import type { CharacterContradiction } from '../state/character-state';

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
 * Default activates only on CRITICAL contradictions; pass minSeverity='warning'
 * to also fix warning-tier contradictions (callers should pre-filter to the
 * high-risk types worth an AI pass) that previously shipped unrevised.
 * Returns revised content or original if revision fails/unnecessary.
 */
export async function autoReviseChapter(
  chapterNumber: number,
  originalContent: string,
  contradictions: CharacterContradiction[],
  config: GeminiConfig,
  projectId?: string,
  minSeverity: 'critical' | 'warning' = 'critical',
): Promise<RevisionResult> {
  const criticals = contradictions.filter(c =>
    c.severity === 'critical' || (minSeverity === 'warning' && c.severity === 'warning'),
  );

  // Only revise for issues at/above the severity floor
  if (criticals.length === 0) {
    return { revised: false, content: originalContent, fixedIssues: [] };
  }

  try {
    const issueDescriptions = criticals.map(c => `- ${c.description}`).join('\n');

    // Truncate content for the revision prompt
    const content = originalContent.slice(0, MAX_REVISION_CONTENT);
    const wasTruncated = originalContent.length > MAX_REVISION_CONTENT;

    // Phase 22 Stage 2 Q7: expanded reviser prompt for 6 contradiction classes (not just 2).
    // Continuity Guardian flags: dead-char, power-regression, location-teleport, personality-flip,
    // info-leak, subplot-reopen. Reviser now has explicit handling for each.
    const prompt = `Bạn là biên tập viên cao cấp chuyên sửa lỗi mâu thuẫn trong truyện dài kỳ.

CHƯƠNG ${chapterNumber} có các LỖI MÂU THUẪN NGHIÊM TRỌNG sau:
${issueDescriptions}

NỘI DUNG CHƯƠNG:
${content}${wasTruncated ? '\n[...nội dung bị cắt bớt...]' : ''}

NHIỆM VỤ: Sửa các đoạn mâu thuẫn theo loại:

1. **DEAD CHARACTER** (resurrection): nhân vật đã chết KHÔNG được xuất hiện sống. Thay bằng:
   - Flashback rõ ràng (mở "nhớ lại...", "hồi tưởng...", hoặc đặt trong giấc mơ)
   - Hoặc thay bằng nhân vật khác (anh em, học trò, người mang tên trùng)
   - Hoặc xóa hoàn toàn scene đó nếu không thiết yếu

2. **POWER REGRESSION**: Cảnh giới/sức mạnh KHÔNG được tụt ngược không lý do. Sửa:
   - Tăng số mô tả lên đúng cấp độ trong bible (e.g. "Trúc Cơ" nếu prev là Trúc Cơ)
   - Hoặc thêm 1-2 câu narrative giải thích lý do tạm yếu (phong ấn / trúng độc / chân nguyên tổn thương)

3. **LOCATION TELEPORT**: nhân vật chuyển địa điểm xa mà không có scene di chuyển. Sửa:
   - Thêm 1 đoạn chuyển cảnh ngắn (1-2 câu mô tả phương tiện / hành trình: "đi xe", "bay qua", "bước vào")
   - Hoặc chuyển scene đầu chương về location cũ rồi mới di chuyển

4. **PERSONALITY FLIP**: nhân vật đột ngột thay đổi tính cách. Sửa:
   - Khôi phục tính cách gốc theo bible — chỉnh lại lời thoại / hành động cho khớp
   - Hoặc thêm trigger giải thích (sự kiện chấn động, áp lực, etc.) — nhưng phải có narrative setup

5. **INFO LEAK**: nhân vật biết thông tin chưa được tiết lộ. Sửa:
   - Đổi nguồn thông tin: nhân vật ĐOÁN/SUY LUẬN thay vì BIẾT
   - Hoặc xóa câu/đoạn lộ thông tin
   - Hoặc thêm scene trước đó nơi nhân vật học được (qua nghe lén / thám hỏi / đầu sư)

6. **SUBPLOT REOPEN**: tuyến đã đóng được mở lại đột ngột. Sửa:
   - Đánh dấu rõ ràng "Bất ngờ, [callback element] xuất hiện trở lại — đây không phải tình cờ" để báo hiệu CHỦ Ý
   - Hoặc xóa reference, không kích hoạt thread cũ

QUY TẮC CHUNG:
- GIỮ NGUYÊN toàn bộ cốt truyện chính, hội thoại không-mâu-thuẫn, và cấu trúc cảnh
- CHỈ sửa các đoạn cụ thể vi phạm
- Giọng văn và phong cách GIỐNG HỆT bản gốc
- Độ dài TƯƠNG ĐƯƠNG bản gốc (±5%)

Trả về TOÀN BỘ nội dung chương đã sửa. KHÔNG thêm chú thích hay giải thích.`;

    const response = await callGemini(prompt, {
      ...config,
      systemPrompt: REVISER_SYSTEM,
      temperature: 0.3, // Low temperature for precision editing
      maxTokens: 32768,
    }, {
      tracking: projectId ? { projectId, task: 'auto_revision', chapterNumber } : undefined,
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

// ── Public: Critic-Directed Revise Pass (Quality Overhaul Phase 1.1) ────────

interface CriticNoteIssue {
  type: string;
  severity: string;
  description: string;
}

export interface CriticNotesInput {
  rewriteInstructions?: string;
  issues?: CriticNoteIssue[];
}

/**
 * Quality Overhaul 1.1: the Critic's REVISE verdict (score 5-6) used to
 * promise a "downstream auto-reviser" that never existed — marginal chapters
 * shipped unrevised via the soft gate. This pass takes the Critic's own
 * rewriteInstructions + major issues (+ moderates when they pile up ≥4) and
 * performs one targeted polish, preserving voice/plot/length.
 *
 * Non-fatal: returns revised=false on any failure; caller keeps the original.
 */
export async function reviseFromCriticNotes(
  chapterNumber: number,
  originalContent: string,
  critic: CriticNotesInput,
  config: GeminiConfig,
  projectId?: string,
): Promise<RevisionResult> {
  const issues = critic.issues || [];
  const blocking = issues.filter(i => i.severity === 'critical' || i.severity === 'major');
  const moderates = issues.filter(i => i.severity === 'moderate');
  const includeModerates = moderates.length >= 4 ? moderates.slice(0, 8) : [];
  const instructions = critic.rewriteInstructions?.trim() || '';

  const noteSections = [
    instructions ? `HƯỚNG DẪN SỬA CỦA CRITIC:\n${instructions}` : '',
    blocking.length
      ? `LỖI MAJOR/CRITICAL PHẢI SỬA:\n${blocking.map(i => `- [${i.type}] ${i.description}`).join('\n')}`
      : '',
    includeModerates.length
      ? `LỖI MODERATE (sửa khi không ảnh hưởng cốt truyện):\n${includeModerates.map(i => `- [${i.type}] ${i.description}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n');

  if (!noteSections) {
    return { revised: false, content: originalContent, fixedIssues: [] };
  }

  try {
    const content = originalContent.slice(0, MAX_REVISION_CONTENT);
    const wasTruncated = originalContent.length > MAX_REVISION_CONTENT;

    const prompt = `Bạn là biên tập viên cao cấp. Critic đã chấm chương này ở mức "REVISE" — cần 1 lượt sửa có mục tiêu, KHÔNG viết lại từ đầu.

CHƯƠNG ${chapterNumber} — GHI CHÚ CỦA CRITIC:
${noteSections}

NỘI DUNG CHƯƠNG:
${content}${wasTruncated ? '\n[...nội dung bị cắt bớt...]' : ''}

QUY TẮC:
- Sửa đúng các điểm Critic nêu: pacing chậm thì nén setup / đẩy payoff sớm hơn; thiếu dopamine thì làm rõ khoảnh khắc thắng lợi sẵn có (KHÔNG bịa event mới); lặp từ thì thay bằng từ đồng nghĩa tự nhiên; câu kết/mở template thì thay bằng event/action cụ thể.
- GIỮ NGUYÊN cốt truyện, sự kiện, hội thoại quan trọng, tên nhân vật, cấu trúc cảnh.
- Giọng văn GIỐNG HỆT bản gốc. Em-dash — cho dialogue.
- Độ dài TƯƠNG ĐƯƠNG bản gốc (±5%).

Trả về TOÀN BỘ nội dung chương đã sửa. KHÔNG thêm chú thích hay giải thích.`;

    const response = await callGemini(prompt, {
      ...config,
      systemPrompt: REVISER_SYSTEM,
      temperature: 0.3,
      maxTokens: 32768,
    }, {
      tracking: projectId ? { projectId, task: 'auto_revision', chapterNumber } : undefined,
    });

    const revisedContent = response.content?.trim();
    if (!revisedContent || revisedContent.length < originalContent.length * 0.5) {
      console.warn(`[RevisePass] Ch.${chapterNumber}: revision too short (${revisedContent?.length || 0} vs ${originalContent.length}), keeping original`);
      return { revised: false, content: originalContent, fixedIssues: [] };
    }

    const finalContent = wasTruncated
      ? revisedContent + originalContent.slice(MAX_REVISION_CONTENT)
      : revisedContent;

    const fixedIssues = [
      ...(instructions ? ['rewriteInstructions'] : []),
      ...blocking.map(i => i.description),
      ...includeModerates.map(i => i.description),
    ];
    console.warn(`[RevisePass] Ch.${chapterNumber}: applied critic-directed revision (${fixedIssues.length} notes)`);
    return { revised: true, content: finalContent, fixedIssues };
  } catch (err) {
    console.warn(`[RevisePass] Ch.${chapterNumber} failed:`, err instanceof Error ? err.message : String(err));
    return { revised: false, content: originalContent, fixedIssues: [] };
  }
}
