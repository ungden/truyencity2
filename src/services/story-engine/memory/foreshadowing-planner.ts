/**
 * Story Engine v2 — Foreshadowing Planner
 *
 * Plans long-range foreshadowing hints across arcs (50-500 chapters apart).
 * Generated alongside arc plans. Injects "plant" and "payoff" instructions
 * into Architect prompts so hints feel intentional, not accidental.
 *
 * DB table: foreshadowing_plans
 *   project_id UUID, hint_id TEXT, hint_text TEXT, hint_type TEXT,
 *   plant_chapter INT, payoff_chapter INT, status TEXT,
 *   arc_number INT, payoff_description TEXT, created_at TIMESTAMPTZ
 */

import { randomUUID } from 'crypto';
import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ForeshadowingHint {
  hintId: string;
  hintText: string;
  hintType: 'dialogue' | 'object' | 'event' | 'character_behavior' | 'environmental';
  plantChapter: number;
  payoffChapter: number;
  payoffDescription: string;
  status: 'planned' | 'planted' | 'developing' | 'paid_off' | 'abandoned';
  arcNumber: number;
}

interface ForeshadowingAgenda {
  hints: Array<{
    hintText: string;
    hintType: string;
    plantChapter: number;
    payoffChapter: number;
    payoffDescription: string;
  }>;
}

// ── Generate Foreshadowing Agenda (called with arc plan) ─────────────────────

export async function generateForeshadowingAgenda(
  projectId: string,
  arcNumber: number,
  arcStartChapter: number,
  arcEndChapter: number,
  totalPlannedChapters: number,
  synopsis: string | undefined,
  masterOutline: string | undefined,
  openThreads: string[],
  genre: GenreType,
  config: GeminiConfig,
): Promise<void> {
  // Load existing hints to avoid duplication
  const db = getSupabase();
  const { data: existing } = await db
    .from('foreshadowing_plans')
    .select('hint_text,plant_chapter,payoff_chapter')
    .eq('project_id', projectId)
    .in('status', ['planned', 'planted', 'developing']);

  const existingHints = (existing || []).map(h => h.hint_text).join('; ');

  const prompt = `Bạn là Master Planner chuyên thiết kế foreshadowing dài hạn cho webnovel.

THÔNG TIN:
- Thể loại: ${genre}
- Arc hiện tại: ${arcNumber} (chương ${arcStartChapter}-${arcEndChapter})
- Tổng dự kiến: ${totalPlannedChapters} chương
- Tuyến truyện đang mở: ${openThreads.join(', ') || 'chưa có'}
${synopsis ? `- Tóm tắt: ${synopsis.slice(0, 2000)}` : ''}
${masterOutline ? `- Đại cương: ${masterOutline.slice(0, 2000)}` : ''}
${existingHints ? `- Hints đã có (KHÔNG LẶP): ${existingHints.slice(0, 1000)}` : ''}

NHIỆM VỤ: Tạo 3-5 foreshadowing hints cần gieo trong arc ${arcNumber}.

QUY TẮC FORESHADOWING ĐẲNG CẤP:
1. Hint phải TỰ NHIÊN — người đọc KHÔNG nhận ra đây là hint khi đọc lần đầu
2. Payoff cách plant ít nhất 30 chương, tốt nhất 100-300 chương
3. Mỗi hint thuộc 1 loại:
   - dialogue: Nhân vật nói 1 câu thoáng qua, sau này mới hiểu ý nghĩa thật
   - object: Vật thể bí ẩn xuất hiện, sau mới biết công dụng/nguồn gốc
   - event: Sự kiện nhỏ tưởng vô nghĩa, sau thành manh mối quan trọng
   - character_behavior: Hành vi lạ của nhân vật, sau mới hiểu lý do
   - environmental: Chi tiết môi trường bất thường, sau mới giải thích được
4. KHÔNG gieo hint cho những gì sẽ xảy ra trong cùng arc — hint phải cross-arc
5. Payoff phải tạo cảm giác "à, đúng rồi!" — callback rõ ràng đến chi tiết gốc

Trả về JSON:
{
  "hints": [
    {
      "hintText": "Mô tả chi tiết hint cần gieo (VD: 'Một vết sẹo cổ trên cổ tay sư phụ, MC thoáng thấy khi sư phụ rót trà')",
      "hintType": "object|dialogue|event|character_behavior|environmental",
      "plantChapter": ${arcStartChapter + 3},
      "payoffChapter": ${Math.min(arcEndChapter + 100, totalPlannedChapters)},
      "payoffDescription": "Sẹo đó là dấu ấn Huyết Thệ với kẻ thù cuối — sư phụ từng là đồng minh của boss cuối"
    }
  ]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.5,
    maxTokens: 2048,
    systemPrompt: 'Bạn là Master Foreshadowing Architect cho webnovel dài kỳ.',
  }, { jsonMode: true, tracking: { projectId, task: 'foreshadowing' } });

  const parsed = parseJSON<ForeshadowingAgenda>(res.content);
  if (!parsed?.hints?.length) return;

  // Save to DB
  const rows = parsed.hints.map((h) => ({
    project_id: projectId,
    hint_id: randomUUID(),
    hint_text: h.hintText,
    hint_type: h.hintType || 'event',
    plant_chapter: h.plantChapter,
    payoff_chapter: h.payoffChapter,
    payoff_description: h.payoffDescription,
    status: 'planned',
    arc_number: arcNumber,
  }));

  const { error: upsertErr } = await db.from('foreshadowing_plans').upsert(rows, {
    onConflict: 'project_id,hint_id',
  });
  if (upsertErr) console.warn('[ForeshadowingPlanner] Failed to save foreshadowing hints: ' + upsertErr.message);
}

// ── Get Active Hints for Chapter (pre-write injection) ───────────────────────

export async function getForeshadowingContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  const db = getSupabase();

  // Get hints that need planting in this chapter
  const { data: toPlant } = await db
    .from('foreshadowing_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'planned')
    .lte('plant_chapter', chapterNumber + 2) // plant within next 2 chapters
    .gte('plant_chapter', chapterNumber - 2)
    .order('plant_chapter', { ascending: true });

  // Get hints approaching payoff deadline
  const { data: toPayoff } = await db
    .from('foreshadowing_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .lte('payoff_chapter', chapterNumber + 5)
    .gte('payoff_chapter', chapterNumber - 5)
    .order('payoff_chapter', { ascending: true });

  // Get hints that should be "developing" (remind reader subtly)
  const { data: developing } = await db
    .from('foreshadowing_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .gt('payoff_chapter', chapterNumber + 5);

  const parts: string[] = [];

  if (toPlant?.length) {
    parts.push('═══ FORESHADOWING — GIEO HINT (BẮT BUỘC) ═══');
    for (const h of toPlant) {
      parts.push(`🌱 GIEO HINT [${h.hint_type}]: ${h.hint_text}`);
      parts.push(`   → Gieo NGẦM, tự nhiên. Người đọc KHÔNG được nhận ra đây là hint.`);
      parts.push(`   → Payoff dự kiến: chương ~${h.payoff_chapter}`);
    }
  }

  if (toPayoff?.length) {
    parts.push('═══ FORESHADOWING — PAYOFF (BẮT BUỘC) ═══');
    for (const h of toPayoff) {
      parts.push(`💥 PAYOFF HINT: ${h.hint_text}`);
      parts.push(`   → Callback rõ ràng: "${h.payoff_description}"`);
      parts.push(`   → Người đọc phải "à, hóa ra hồi đó..." — tạo khoảnh khắc kết nối`);
    }
  }

  // Subtle reminders for developing hints (only 1-2 per chapter, and only every 30 chapters)
  if (developing?.length) {
    const dueForReminder = developing.filter(h => {
      const midpoint = Math.floor((h.plant_chapter + h.payoff_chapter) / 2);
      const quarterpoint = Math.floor((h.plant_chapter + midpoint) / 2);
      return chapterNumber === midpoint || chapterNumber === quarterpoint;
    }).slice(0, 2);

    if (dueForReminder.length) {
      parts.push('═══ FORESHADOWING — NHẮC LẠI NHẸ (TÙY CHỌN) ═══');
      for (const h of dueForReminder) {
        parts.push(`🔄 Nhắc lại nhẹ nhàng chi tiết: "${h.hint_text.slice(0, 100)}"`);
        parts.push(`   → Chỉ mention thoáng qua, tạo cảm giác bất an hoặc tò mò nhẹ`);
      }
    }
  }

  // Add overdue hint warnings
  try {
    const overdue = await getOverdueHints(projectId, chapterNumber);
    if (overdue.length > 0) {
      parts.push('═══ FORESHADOWING — SẮP HẾT HẠN ═══');
      parts.push(...overdue);
    }
  } catch {
    // Non-fatal
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// ── Post-Write: Mark Hints as Planted/Paid Off ───────────────────────────────

export async function updateForeshadowingStatus(
  projectId: string,
  chapterNumber: number,
): Promise<void> {
  const db = getSupabase();

  // Mark planned hints around this chapter as planted
  // (generous window: if chapter is within range, assume Architect/Writer included it)
  await db
    .from('foreshadowing_plans')
    .update({ status: 'planted' })
    .eq('project_id', projectId)
    .eq('status', 'planned')
    .lte('plant_chapter', chapterNumber)
    .gte('plant_chapter', chapterNumber - 2);

  // Mark payoff hints around this chapter as paid_off
  await db
    .from('foreshadowing_plans')
    .update({ status: 'paid_off' })
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .lte('payoff_chapter', chapterNumber)
    .gte('payoff_chapter', chapterNumber - 5);

  // Abandon stale hints: planned hints whose plant window has passed by >10 chapters
  // These were never planted (Architect/Writer ignored them)
  await db
    .from('foreshadowing_plans')
    .update({ status: 'abandoned' })
    .eq('project_id', projectId)
    .eq('status', 'planned')
    .lt('plant_chapter', chapterNumber - 10);

  // Abandon overdue payoff hints: planted hints whose payoff deadline passed by >20 chapters
  // These were planted but never paid off — mark abandoned so they don't clog context
  await db
    .from('foreshadowing_plans')
    .update({ status: 'abandoned' })
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .lt('payoff_chapter', chapterNumber - 20);
}

// ── Get Overdue Hints for Re-injection ───────────────────────────────────────

/**
 * Get hints that are planted but approaching their payoff deadline without resolution.
 * Returns context string urging the Architect to resolve them soon.
 * Called from getForeshadowingContext() to add urgency.
 */
async function getOverdueHints(
  projectId: string,
  chapterNumber: number,
): Promise<string[]> {
  const db = getSupabase();
  const { data } = await db
    .from('foreshadowing_plans')
    .select('hint_text,payoff_chapter,payoff_description')
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .lte('payoff_chapter', chapterNumber + 15)
    .gt('payoff_chapter', chapterNumber)
    .order('payoff_chapter', { ascending: true });

  if (!data?.length) return [];

  return data.map(h =>
    `⏰ OVERDUE HINT (payoff by ch.${h.payoff_chapter}): "${h.hint_text}" → "${h.payoff_description}". Cần bắt đầu setup payoff SỚM.`
  );
}
