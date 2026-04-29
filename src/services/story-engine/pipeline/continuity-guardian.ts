/**
 * Story Engine v2 — Continuity Guardian (Phase 22)
 *
 * Đại thần workflow: 4th agent that runs AFTER Writer + Critic produce a chapter.
 * Acts as a "biên tập viên" doing a final continuity pass.
 *
 * Step 1 (deterministic): Extract entity mentions from chapter content
 * Step 2 (RAG): Pull historical context for each entity
 * Step 3 (AI): Ask DeepSeek to check 6 continuity classes:
 *   - Power/realm contradictions
 *   - Dead character non-flashback appearance
 *   - Location teleportation
 *   - Personality flip
 *   - Information leakage (knowing unrevealed facts)
 *   - Closed subplot reopen without [CALLBACK]
 *
 * Critical issues → trigger auto-revise.
 * Non-fatal: errors return empty issue list.
 *
 * Cost: 1 extra DeepSeek call per chapter ~$0.005.
 * Skipped for ch.1-10 (not enough history yet).
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import type { GeminiConfig } from '../types';
import type { CharacterContradiction } from '../memory/character-tracker';

// Phase 22 Stage 2 Q7: bumped 30K → 80K content cap. Guardian must read FULL chapter
// (not head+tail) to catch mid-chapter contradictions. DeepSeek 1M context handles it.
const SKIP_BEFORE_CHAPTER = 10;
const MAX_CONTENT_CHARS = 80000;

export interface GuardianIssue {
  type: 'power_contradiction' | 'dead_character' | 'location_teleport' | 'personality_flip' | 'info_leak' | 'subplot_reopen' | 'other';
  severity: 'critical' | 'major' | 'moderate';
  description: string;
  evidence?: string;
}

export interface GuardianReport {
  issues: GuardianIssue[];
  contradictions: CharacterContradiction[];
}

export async function runContinuityGuardian(
  projectId: string,
  chapterNumber: number,
  chapterTitle: string,
  content: string,
  characters: string[],
  config: GeminiConfig,
): Promise<GuardianReport> {
  if (chapterNumber < SKIP_BEFORE_CHAPTER) {
    return { issues: [], contradictions: [] };
  }

  try {
    const db = getSupabase();

    // Step 1: pull state digest
    const [characterStatesRes, closedThreadsRes, characterBiblesRes] = await Promise.all([
      db.from('character_states')
        .select('character_name,status,power_level,power_realm_index,location,chapter_number')
        .eq('project_id', projectId)
        .lt('chapter_number', chapterNumber)
        .order('chapter_number', { ascending: false })
        .limit(80),
      db.from('plot_threads')
        .select('name,description,last_active_chapter')
        .eq('project_id', projectId)
        .eq('status', 'resolved')
        .order('last_active_chapter', { ascending: false })
        .limit(8),
      db.from('character_bibles')
        .select('character_name,bible_text,status,power_realm_index,current_location')
        .eq('project_id', projectId)
        .order('importance', { ascending: false })
        .limit(15),  // Phase 22 Q7: bumped 6 → 15 — Guardian sees more of the cast for cross-checks
    ]);

    const charStates = characterStatesRes.data || [];
    const closedThreads = closedThreadsRes.data || [];
    const bibles = characterBiblesRes.data || [];

    // Dedupe character states by name (latest only)
    const latestStateMap = new Map<string, typeof charStates[0]>();
    for (const s of charStates) {
      if (!latestStateMap.has(s.character_name)) {
        latestStateMap.set(s.character_name, s);
      }
    }

    const stateDigest = [...latestStateMap.values()]
      .slice(0, 25)
      .map(s => `• ${s.character_name}: ${s.status}${s.power_level ? ` | ${s.power_level} (idx ${s.power_realm_index ?? '?'})` : ''}${s.location ? ` @ ${s.location}` : ''} (last seen ch.${s.chapter_number})`)
      .join('\n');

    const closedDigest = closedThreads
      .map(t => `• "${t.name}" (đóng ch.${t.last_active_chapter ?? '?'}): ${(t.description || '').slice(0, 120)}`)
      .join('\n');

    const bibleDigest = bibles
      .map(b => `▶ ${b.character_name} [${b.status}, realm idx ${b.power_realm_index ?? '?'}, @${b.current_location ?? '?'}]: ${(b.bible_text || '').slice(0, 1500)}`)  // Phase 22 Q7: 600 → 1500 chars per bible
      .join('\n\n');

    const charactersInChapter = characters.slice(0, 15).join(', ');
    const contentPreview = content.length > MAX_CONTENT_CHARS
      ? content.slice(0, Math.floor(MAX_CONTENT_CHARS * 0.6)) + '\n\n[...phần giữa lược...]\n\n' + content.slice(-Math.floor(MAX_CONTENT_CHARS * 0.4))
      : content;

    const prompt = `Bạn là biên tập viên kiểm tra TÍNH LIÊN TỤC trong truyện dài. Đọc CHƯƠNG MỚI và so sánh với LỊCH SỬ để tìm mâu thuẫn.

═══ LỊCH SỬ ═══

NHÂN VẬT BIBLE (consolidated):
${bibleDigest || '(chưa có)'}

TRẠNG THÁI NHÂN VẬT (snapshot mới nhất):
${stateDigest}

TUYẾN TRUYỆN ĐÃ ĐÓNG (KHÔNG ĐƯỢC MỞ LẠI TRỪ KHI [CALLBACK] CHỦ ĐỘNG):
${closedDigest || '(chưa có)'}

═══ CHƯƠNG MỚI ${chapterNumber}: "${chapterTitle}" ═══

NHÂN VẬT TRONG CHƯƠNG: ${charactersInChapter}

NỘI DUNG:
${contentPreview}

═══ NHIỆM VỤ ═══

Tìm tối đa 5 ISSUE NGHIÊM TRỌNG NHẤT trong các loại sau:
1. power_contradiction: Sức mạnh/cảnh giới mâu thuẫn lịch sử (vd: Bible nói realm idx 7, chương này thể hiện idx 4 không lý do)
2. dead_character: Nhân vật đã chết xuất hiện sống mà không phải flashback rõ ràng
3. location_teleport: Nhân vật chuyển địa điểm xa mà không có scene di chuyển
4. personality_flip: Nhân vật thay đổi tính cách 180° không có narrative arc
5. info_leak: Nhân vật biết thông tin chưa được tiết lộ trong cốt truyện
6. subplot_reopen: Tuyến đã đóng được mở lại mà KHÔNG có signal "callback có chủ đích"

NGUYÊN TẮC:
- Bỏ qua issue NHỎ. CHỈ flag những thứ ĐỌC GIẢ SẼ NHẬN RA và phá hỏng coherence.
- severity 'critical' = phải sửa (auto-revise sẽ rewrite); 'major' = nên sửa; 'moderate' = noted.
- Nếu chương 100% nhất quán, trả về { "issues": [] }.
- KHÔNG bịa issue. KHÔNG suy diễn. CHỈ flag khi có evidence cụ thể trong text.

Trả về JSON:
{
  "issues": [
    {"type": "power_contradiction|dead_character|location_teleport|personality_flip|info_leak|subplot_reopen|other",
     "severity": "critical|major|moderate",
     "description": "<câu mô tả ngắn>",
     "evidence": "<đoạn text trong chương vi phạm, max 200 chars>"}
  ]
}`;

    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.15,
      maxTokens: 2048,
    }, {
      jsonMode: true,
      tracking: { projectId, task: 'continuity_guardian', chapterNumber },
    });

    const parsed = parseJSON<{ issues?: GuardianIssue[] }>(res.content);
    const issues = (parsed?.issues || []).slice(0, 5);

    // Extract a likely Vietnamese character name from the description's leading words.
    // Stops at common Vietnamese verbs/markers ("đã", "bị", "đang", "xuất hiện", "vẫn",
    // "thể hiện", "biết", "có"). Returns the leading capitalized name span, max 4 words.
    const extractCharName = (desc: string): string => {
      const stopWord = /\b(đã|bị|đang|xuất hiện|vẫn|thể hiện|biết|có|không|tự|lại|nói|nghĩ|cảm|bỗng|lúc|khi|từ|trong|tại|với|và|của|cho)\b/i;
      const m = desc.match(/^([^\s]+(?:\s+[^\s]+){0,3})/);
      if (!m) return 'unknown';
      const span = m[1];
      const stopMatch = span.match(stopWord);
      if (stopMatch && stopMatch.index !== undefined && stopMatch.index > 0) {
        return span.slice(0, stopMatch.index).trim() || 'unknown';
      }
      return span.trim() || 'unknown';
    };

    // Phase 22 Stage 2 Q7: route ALL 6 issue types through auto-revise (was only 2).
    // The expanded reviser prompt handles location_teleport, personality_flip, info_leak,
    // subplot_reopen with explicit instructions per class.
    const typeMap: Record<string, CharacterContradiction['type']> = {
      'dead_character': 'resurrection',
      'power_contradiction': 'power_regression',
      'location_teleport': 'location_teleport',
      'personality_flip': 'personality_flip',
      'info_leak': 'info_leak',
      'subplot_reopen': 'subplot_reopen',
    };

    const contradictions: CharacterContradiction[] = [];
    for (const issue of issues) {
      if (issue.severity !== 'critical') continue;
      const mappedType = typeMap[issue.type];
      if (!mappedType) continue; // 'other' is not auto-revisable
      contradictions.push({
        characterName: extractCharName(issue.description),
        type: mappedType,
        severity: 'critical',
        description: issue.description,
        previousChapter: 0,
        currentChapter: chapterNumber,
      });
    }

    if (issues.length > 0) {
      console.warn(`[ContinuityGuardian] Ch.${chapterNumber}: ${issues.length} issues found`,
        issues.map(i => `${i.severity}/${i.type}: ${i.description}`));
    }

    return { issues, contradictions };
  } catch (e) {
    console.warn(`[ContinuityGuardian] Ch.${chapterNumber} failed:`, e instanceof Error ? e.message : String(e));
    return { issues: [], contradictions: [] };
  }
}
