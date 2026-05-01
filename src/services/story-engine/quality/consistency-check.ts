/**
 * Story Engine v2 — Consistency Check (quality layer)
 *
 * Two-tier consistency check that runs every chapter pre-save:
 *
 *   1. checkConsistencyFast — deterministic regex check for dead-character
 *      resurrections + obvious time-jump violations. Cheap, runs every chapter.
 *
 *   2. checkConsistency — additionally fires an AI logic check when business/
 *      finance content detected (do-thi/quan-truong genres). Catches "MC suddenly
 *      has $100M with no source" kind of logic errors.
 *
 * Phase 27 split: extracted from memory/plot-tracker.ts (was 4-in-1 file).
 *
 * Both functions return ConsistencyIssue[] (severity minor/moderate/major/
 * critical). Caller (orchestrator pre-save block) folds critical/major into
 * the auto-revise pipeline.
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConsistencyIssue {
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fast regex-based consistency check. Runs every chapter pre-save.
 * Catches dead-character resurrections (must have explicit flashback markers,
 * must NOT have living-action verbs in the same window).
 */
export async function checkConsistencyFast(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<ConsistencyIssue[]> {
  try {
    const issues: ConsistencyIssue[] = [];
    const db = getSupabase();

    const { data: deadChars } = await db
      .from('character_states')
      .select('character_name, chapter_number')
      .eq('project_id', projectId)
      .eq('status', 'dead');

    if (deadChars) {
      // Stricter flashback check: require explicit time-jump markers near the dead
      // char's name. Also flag living-action verbs (speak/walk/decide) — even with
      // a flashback marker, dead chars shouldn't be taking present-tense actions.
      const TIME_JUMP_PATTERNS = /(nhớ lại|hồi tưởng|ký ức|trước đây \d+|năm xưa|hồi đó|kiếp trước|trước khi (chết|qua đời|mất)|trong giấc mơ|trong mơ|tưởng tượng|hình bóng)/i;
      const LIVING_ACTION_PATTERNS = /(nói|hỏi|đáp|cười|cau mày|gật đầu|lắc đầu|đứng dậy|ngồi xuống|đi tới|bước|vung tay|ra lệnh|quyết định|nhìn thấy)/i;

      for (const { character_name, chapter_number: deathChapter } of deadChars) {
        if (!character_name || !content.includes(character_name)) continue;

        // Scan ALL mentions, flag the first violation.
        let searchFrom = 0;
        let flagged = false;
        while (!flagged) {
          const idx = content.indexOf(character_name, searchFrom);
          if (idx < 0) break;
          const windowStart = Math.max(0, idx - 200);
          const windowEnd = Math.min(content.length, idx + character_name.length + 200);
          const window = content.slice(windowStart, windowEnd);
          const hasFlashback = TIME_JUMP_PATTERNS.test(window);
          const hasLivingAction = LIVING_ACTION_PATTERNS.test(window);

          if (!hasFlashback || hasLivingAction) {
            issues.push({
              type: 'dead_character',
              severity: 'critical',
              description: `${character_name} đã chết ở chương ${deathChapter ?? '?'} nhưng xuất hiện ở chương ${chapterNumber}${hasLivingAction ? ' với hành động sống (nói/đi/quyết định)' : ' không có ngữ cảnh flashback rõ ràng'}`,
            });
            flagged = true;
            break;
          }
          searchFrom = idx + character_name.length;
        }
      }
    }

    return issues;
  } catch {
    return [];
  }
}

/**
 * Full consistency check: regex (fast) + AI logic check for business/finance.
 * Caller is the pre-save QA block in orchestrator. critical/major issues throw
 * to abort save (auto-reviser is character-focused; logic errors get retried).
 */
export async function checkConsistency(
  projectId: string,
  chapterNumber: number,
  content: string,
  _characters: string[],
): Promise<ConsistencyIssue[]> {
  void _characters;
  try {
    const issues: ConsistencyIssue[] = await checkConsistencyFast(projectId, chapterNumber, content);

    // AI logic check for business/finance content (do-thi/quan-truong).
    const BUSINESS_WORDS = /tỷ|triệu|công ty|cổ phần|doanh thu|lợi nhuận|giá|mua|bán|đầu tư|tài sản/i;
    if (BUSINESS_WORDS.test(content) && content.length < 15000) {
      const { callGemini } = await import('../utils/gemini');
      const { parseJSON } = await import('../utils/json-repair');

      const prompt = `Kiểm tra logic tài chính/thương mại trong chương truyện sau.
Chỉ trả về JSON rỗng [] nếu không có lỗi rõ ràng. Nếu có lỗi logic nực cười (ví dụ: nhân vật đang nghèo tự nhiên lấy ra tỷ đô mà không có lý do, hoặc định giá sai lệch hàng nghìn lần), hãy trả về:
[
  {
    "type": "logic_error",
    "severity": "major",
    "description": "Lý do lỗi logic"
  }
]

Nội dung:
${content.slice(0, 5000)}`;

      try {
        const res = await callGemini(prompt, { model: 'deepseek-v4-flash', temperature: 0.1, maxTokens: 1024 }, { jsonMode: true, tracking: { projectId, task: 'consistency_check', chapterNumber } });
        if (res.content && res.content.trim().length > 5) {
          const parsedIssues = parseJSON<ConsistencyIssue[]>(res.content);
          if (Array.isArray(parsedIssues)) {
            issues.push(...parsedIssues);
          }
        }
      } catch {
        // Ignore LLM failures — issues already include regex output.
      }
    }

    return issues;
  } catch {
    return [];
  }
}
