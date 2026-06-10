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
  status: 'planned' | 'planted' | 'developing' | 'disposing' | 'paid_off' | 'abandoned';
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
  }, { jsonMode: true, tracking: { projectId, task: 'foreshadowing', chapterNumber: arcStartChapter } });

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

  // Add overdue hint warnings (approaching deadline)
  try {
    const overdue = await getOverdueHints(projectId, chapterNumber);
    if (overdue.length > 0) {
      parts.push('═══ FORESHADOWING — SẮP HẾT HẠN ═══');
      parts.push(...overdue);
    }
  } catch {
    // Non-fatal
  }

  // 2026-04-29 continuity overhaul: surface PAST-DEADLINE hints as urgent payoff demands.
  // Previous getOverdueHints only caught approaching deadlines; hints whose deadline already
  // passed (5+ chapters late) silently rotted in DB. Now they're loud and demand resolution
  // this arc — or enter 2-step disposal if extremely late.
  try {
    const overdueLate = await getPastDeadlineHints(projectId, chapterNumber);
    if (overdueLate.length > 0) {
      parts.push('═══ ⚠️ FORESHADOWING ĐÃ QUÁ HẠN — PHẢI PAYOFF NGAY TRONG ARC NÀY ═══');
      parts.push(...overdueLate);
    }
  } catch {
    // Non-fatal
  }

  // Quality Overhaul 2.2: disposing hints — one-time soft-close directive.
  // A hint that will never pay off must be CLOSED on-page (1-2 sentences),
  // not silently dropped: readers notice dangling threads.
  try {
    const disposing = await getDisposingDirectives(projectId, chapterNumber);
    if (disposing.length > 0) {
      parts.push('═══ FORESHADOWING — ĐÓNG NHẸ THREAD SẮP GÁC LẠI (BẮT BUỘC 1-2 CÂU) ═══');
      parts.push(...disposing);
    }
  } catch {
    // Non-fatal
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Quality Overhaul 2.2: hints in 'disposing' get a soft-close directive for
 * up to 3 chapters (cap 2 per chapter to bound prompt size). Hints disposing
 * ≥3 chapters flip to 'abandoned' + land an admin_review_queue row — the
 * abandonment is no longer invisible.
 */
async function getDisposingDirectives(
  projectId: string,
  chapterNumber: number,
): Promise<string[]> {
  const db = getSupabase();
  const { data } = await db
    .from('foreshadowing_plans')
    .select('id,hint_text,payoff_description,disposing_since_chapter')
    .eq('project_id', projectId)
    .eq('status', 'disposing')
    .order('disposing_since_chapter', { ascending: true })
    .limit(6);

  if (!data?.length) return [];

  // Expired disposals → abandoned + admin review (non-fatal).
  const expired = data.filter(h => (h.disposing_since_chapter ?? chapterNumber) <= chapterNumber - 3);
  if (expired.length > 0) {
    await db
      .from('foreshadowing_plans')
      .update({ status: 'abandoned' })
      .in('id', expired.map(h => h.id))
      .then(() => undefined, () => undefined);
    try {
      const { enqueueAdminReview } = await import('../quality/admin-review-queue');
      await enqueueAdminReview({
        projectId,
        chapterNumber,
        reason: 'foreshadowing_abandoned',
        detail: {
          count: expired.length,
          hints: expired.map(h => String(h.hint_text || '').slice(0, 150)),
        },
      });
    } catch {
      // Non-fatal
    }
    console.warn(`[Foreshadowing] ${expired.length} hints abandoned after disposal window (project ${projectId}, ch.${chapterNumber})`);
  }

  return data
    .filter(h => (h.disposing_since_chapter ?? chapterNumber) > chapterNumber - 3)
    .slice(0, 2)
    .map(h =>
      `🗂 Thread sẽ gác lại: "${String(h.hint_text || '').slice(0, 150)}" → Viết 1-2 câu cho nhân vật nhắc qua / đóng nhẹ thread này (vd nhân vật kết luận chuyện đó không còn quan trọng, hoặc một câu thoại khép lại). KHÔNG mở rộng thêm.`,
    );
}

/**
 * 2026-04-29: hints whose payoff_chapter < currentChapter - 5 are PAST DEADLINE.
 * Surface them as urgent demands. Auto-abandon hints that are >30 chapters past deadline
 * so the engine isn't perpetually badgering Architect about hints that'll never pay off.
 */
async function getPastDeadlineHints(
  projectId: string,
  chapterNumber: number,
): Promise<string[]> {
  const db = getSupabase();
  const { data } = await db
    .from('foreshadowing_plans')
    .select('id,hint_text,payoff_chapter,payoff_description')
    .eq('project_id', projectId)
    .eq('status', 'planted')
    .lt('payoff_chapter', chapterNumber - 5)
    .order('payoff_chapter', { ascending: true })
    .limit(8);

  if (!data?.length) return [];

  // Quality Overhaul 2.2: extremely late hints (>30 chapters past deadline)
  // no longer flip straight to 'abandoned' silently — they enter 2-step
  // disposal: the Architect gets a soft-close directive for 3 chapters, THEN
  // they're abandoned with an admin_review_queue row.
  const veryLate = data.filter(h => h.payoff_chapter < chapterNumber - 30);
  if (veryLate.length > 0) {
    await db
      .from('foreshadowing_plans')
      .update({ status: 'disposing', disposing_since_chapter: chapterNumber })
      .in('id', veryLate.map(h => h.id))
      .then(() => undefined, () => undefined);
    console.warn(`[Foreshadowing] ${veryLate.length} hints entered disposal (>30ch overdue) at ch.${chapterNumber}`);
  }

  return data
    .filter(h => h.payoff_chapter >= chapterNumber - 30)
    .map(h => {
      const overdueBy = chapterNumber - h.payoff_chapter;
      const urgency = overdueBy >= 10
        ? 'KHẨN CẤP — payoff NGAY TRONG CHƯƠNG NÀY (đã trễ quá lâu, reader sắp quên hint).'
        : 'BẮT BUỘC payoff trong vòng 5 chương tới.';
      return `⚠️ QUÁ HẠN ${overdueBy} chương (deadline ch.${h.payoff_chapter}): "${h.hint_text}" → CALLBACK: "${h.payoff_description}". ${urgency}`;
    });
}

/**
 * Phase 26 Module C: deterministic OVERDUE list for Critic hard gate.
 * Returns structured records (not formatted strings) so Critic prompt can
 * inject as a discrete block + post-process can verify each hint was paid off.
 *
 * "Overdue" = planted, status='planted', and payoff_chapter <= chapterNumber.
 * (Strict: deadline is now-or-past, not "within window of 5".)
 */
export interface OverdueForeshadowingRecord {
  hintId: string;
  hintText: string;
  payoffDescription: string;
  payoffChapter: number;
  overdueBy: number;
}

export async function getOverdueForeshadowingForCritic(
  projectId: string,
  chapterNumber: number,
): Promise<OverdueForeshadowingRecord[]> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('foreshadowing_plans')
      .select('hint_id,hint_text,payoff_chapter,payoff_description')
      .eq('project_id', projectId)
      .eq('status', 'planted')
      .lte('payoff_chapter', chapterNumber)
      .gt('payoff_chapter', chapterNumber - 30) // skip hints already auto-abandoned
      .order('payoff_chapter', { ascending: true })
      .limit(6);
    if (!data?.length) return [];
    return data.map(h => ({
      hintId: h.hint_id,
      hintText: h.hint_text,
      payoffDescription: h.payoff_description || '',
      payoffChapter: h.payoff_chapter,
      overdueBy: chapterNumber - h.payoff_chapter,
    }));
  } catch (e) {
    console.warn('[Foreshadowing] getOverdueForeshadowingForCritic failed:', e instanceof Error ? e.message : String(e));
    return [];
  }
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

  // Quality Overhaul 2.2: planted hints whose payoff deadline passed by >20
  // chapters enter 2-step DISPOSAL instead of silent abandonment. These were
  // on the page — readers remember them. The Architect gets a soft-close
  // directive for 3 chapters via getDisposingDirectives(), then they flip to
  // 'abandoned' + admin_review_queue row.
  await db
    .from('foreshadowing_plans')
    .update({ status: 'disposing', disposing_since_chapter: chapterNumber })
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
