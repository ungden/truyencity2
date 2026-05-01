/**
 * Story Engine v2 — Plot Threads (state layer)
 *
 * Tracks long-form plot threads (open / developing / climax / resolved / legacy).
 * Threads are the multi-chapter promises that bind a 1000+ chapter novel together:
 * MC's revenge arc, the secret of the ancient tomb, the rivalry with sect X, etc.
 *
 * Two responsibilities:
 *   1. READ — `buildPlotThreadContext` produces the [PLOT THREADS] block injected
 *      into Architect/Writer context per chapter (top 5 active by relevance score).
 *   2. WRITE — `extractAndUpdatePlotThreads` runs post-write, asks the model to
 *      identify which threads were advanced/resolved + new threads opened, then
 *      upserts plot_threads.
 *
 * Phase 27 split: extracted from memory/plot-tracker.ts (was 4-in-1 file).
 */

import { getSupabase } from '../utils/supabase';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlotThread {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'main' | 'sub' | 'background';
  status: 'open' | 'developing' | 'climax' | 'resolved' | 'legacy';
  startChapter: number;
  targetPayoffChapter?: number;
  lastActiveChapter: number;
  relatedCharacters: string[];
  foreshadowingHints: ForeshadowingHint[];
  importance: number; // 0-100
}

export interface ForeshadowingHint {
  id: string;
  chapterNumber: number;
  hint: string;
  payoffDeadline: number;
  status: 'planted' | 'developing' | 'paid_off' | 'abandoned';
  importance: 'major' | 'minor';
}

interface PlotThreadRow {
  id: string;
  name: string;
  description: string | null;
  priority: PlotThread['priority'] | string | null;
  status: PlotThread['status'] | string | null;
  start_chapter: number | null;
  target_payoff_chapter: number | null;
  last_active_chapter: number | null;
  related_characters: string[] | null;
  foreshadowing_hints: ForeshadowingHint[] | null;
  importance: number | null;
}

interface PlotThreadAIResponse {
  updates?: Array<{
    id?: string;
    name?: string;
    status?: PlotThread['status'];
    description?: string;
    targetPayoffChapter?: number;
    importance?: number;
    payoffDescription?: string;
    relatedCharacters?: string[];
  }>;
  newThreads?: Array<{
    name?: string;
    description?: string;
    priority?: PlotThread['priority'];
    status?: PlotThread['status'];
    targetPayoffChapter?: number;
    relatedCharacters?: string[];
    importance?: number;
  }>;
}

const PRIORITY_SCORES: Record<string, number> = {
  critical: 20, main: 15, sub: 10, background: 5,
};

function mapThreadRow(row: PlotThreadRow): PlotThread {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    priority: (row.priority || 'sub') as PlotThread['priority'],
    status: (row.status || 'open') as PlotThread['status'],
    startChapter: row.start_chapter || 0,
    targetPayoffChapter: row.target_payoff_chapter ?? undefined,
    lastActiveChapter: row.last_active_chapter || 0,
    relatedCharacters: row.related_characters || [],
    foreshadowingHints: Array.isArray(row.foreshadowing_hints) ? row.foreshadowing_hints : [],
    importance: row.importance || 50,
  };
}

function scoreThread(
  t: PlotThread,
  chapter: number,
  characters: string[],
  arcNumber: number,
): number {
  void arcNumber; // reserved for future arc-relevance bonus
  let score = 0;

  // Character overlap (40%)
  if (t.relatedCharacters.length > 0) {
    const overlap = t.relatedCharacters.filter(c => characters.includes(c)).length;
    score += (overlap / t.relatedCharacters.length) * 40;
  }

  // Deadline urgency (30%)
  if (t.targetPayoffChapter) {
    const remaining = t.targetPayoffChapter - chapter;
    if (remaining <= 0) score += 30; // overdue
    else if (remaining <= 20) score += (1 - remaining / 20) * 30;
  }

  // Priority (20%)
  score += PRIORITY_SCORES[t.priority] || 5;

  // Recent activity (10%)
  const gap = chapter - t.lastActiveChapter;
  if (gap <= 50) score += (1 - gap / 50) * 10;
  else score -= 5;

  // Bonuses
  if (t.status === 'climax') score += 25;

  return score;
}

// ── Reader: build context block ──────────────────────────────────────────────

/**
 * Load active plot threads for a project, score them for relevance,
 * and return a formatted context string for Architect/Writer.
 */
export async function buildPlotThreadContext(
  projectId: string,
  chapterNumber: number,
  charactersInChapter: string[],
  arcNumber: number,
): Promise<string | null> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false });

    if (!data || data.length === 0) return null;

    const threads: PlotThread[] = data.map(mapThreadRow);

    const scored = threads.map(t => ({
      thread: t,
      score: scoreThread(t, chapterNumber, charactersInChapter, arcNumber),
    }));
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 5);
    if (top.length === 0) return null;

    const lines: string[] = ['═══ TUYẾN TRUYỆN ĐANG MỞ ═══'];
    for (const { thread: t } of top) {
      lines.push(`• [${t.priority}] ${t.name}: ${t.description.slice(0, 200)}`);
      if (t.status === 'climax') lines.push(`  → ĐANG Ở CAO TRÀO — cần giải quyết sớm`);

      const urgentHints = t.foreshadowingHints
        .filter(h => h.status === 'planted' && h.payoffDeadline <= chapterNumber + 20)
        .sort((a, b) => a.payoffDeadline - b.payoffDeadline)
        .slice(0, 2);

      for (const h of urgentHints) {
        const remaining = h.payoffDeadline - chapterNumber;
        if (remaining <= 0) {
          lines.push(`  ⚠️ QUÁ HẠN: "${h.hint}" — cần payoff NGAY`);
        } else {
          lines.push(`  ⏳ Foreshadowing: "${h.hint}" (còn ${remaining} chương)`);
        }
      }
    }

    const abandoned = threads.filter(t =>
      chapterNumber - t.lastActiveChapter > 100 && t.importance > 50,
    );
    if (abandoned.length > 0) {
      lines.push(`\n⚠️ Tuyến bị bỏ rơi: ${abandoned.map(t => t.name).join(', ')}`);
    }

    // Subplot Resurrection Guard — surface recently-resolved threads so
    // Architect/Writer don't accidentally re-open them. Explicit [CALLBACK] only.
    try {
      const { data: closed } = await db
        .from('plot_threads')
        .select('name,description,last_active_chapter')
        .eq('project_id', projectId)
        .eq('status', 'resolved')
        .order('last_active_chapter', { ascending: false })
        .limit(10);
      if (closed?.length) {
        lines.push(`\n🔒 TUYẾN ĐÃ ĐÓNG — KHÔNG ĐƯỢC MỞ LẠI TRỪ KHI CALLBACK CHỦ ĐỘNG:`);
        for (const t of closed) {
          lines.push(`• "${t.name}" (đóng ch.${t.last_active_chapter ?? '?'}): ${(t.description || '').slice(0, 150)}`);
        }
        lines.push(`→ Nếu chương này tự nhiên kéo lại nhân vật/sự kiện thuộc các tuyến trên, BẮT BUỘC viết rõ "callback có chủ đích" với lý do narrative — không phải lỗi continuity.`);
      }
    } catch {
      // Non-fatal
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

// ── Writer: post-write thread ledger update (Phase 24) ────────────────────────

/**
 * After a chapter is written, ask the model what threads were advanced/resolved
 * and what new threads opened. Upsert plot_threads accordingly. Closes the read/
 * write loop on plot threads (V2 previously had reader but no writer).
 */
export async function extractAndUpdatePlotThreads(
  projectId: string,
  chapterNumber: number,
  content: string,
  characters: string[],
  config: GeminiConfig,
): Promise<{ created: number; updated: number }> {
  try {
    const db = getSupabase();
    const { data: activeRows, error: activeErr } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false })
      .limit(12);

    if (activeErr) {
      console.warn(`[plot-threads] Load active threads failed for Ch.${chapterNumber}: ${activeErr.message}`);
    }

    const active = (activeRows || []).map(mapThreadRow);
    const activeBrief = active.length > 0
      ? active
          .map(t => `- id=${t.id}; name=${t.name}; status=${t.status}; priority=${t.priority}; last=${t.lastActiveChapter}; desc=${t.description.slice(0, 160)}`)
          .join('\n')
      : '(chưa có thread đang mở)';

    const prompt = `Bạn là plot-thread ledger cho truyện dài kỳ. Đọc chương vừa viết và cập nhật TUYẾN TRUYỆN dài hạn (KHÔNG ghi beat nhỏ một-chương).

CHARACTERS XUẤT HIỆN: ${characters.slice(0, 12).join(', ')}

ACTIVE THREADS:
${activeBrief}

CHƯƠNG ${chapterNumber}:
${content.slice(0, 9000)}

Trả về JSON. Update thread cũ nếu chương vừa rồi đẩy/đóng nó. Tạo thread mới nếu chương vừa MỞ rõ một promise dài hạn (>10 chương). KHÔNG tạo thread cho beat ngắn.

{
  "updates": [
    {
      "id": "<id thread cũ>",
      "name": "<dùng tên cũ>",
      "status": "open|developing|climax|resolved|legacy",
      "description": "<nếu thay đổi mô tả>",
      "targetPayoffChapter": <số chương>,
      "importance": <0-100>,
      "payoffDescription": "<chỉ điền nếu status=resolved>",
      "relatedCharacters": ["..."]
    }
  ],
  "newThreads": [
    {
      "name": "<tên cụ thể, không generic>",
      "description": "<thread này hứa payoff gì trong tương lai>",
      "priority": "critical|main|sub|background",
      "status": "open",
      "targetPayoffChapter": <số chương>,
      "relatedCharacters": ["..."],
      "importance": <0-100>
    }
  ]
}

QUY TẮC:
- KHÔNG bịa thread không có trong chương.
- name PHẢI cụ thể (vd "Tìm di vật của tổ phụ" KHÔNG phải "tìm kiếm").
- description ngắn gọn, mô tả PROMISE chứ không phải tóm tắt.
- Trả JSON rỗng {"updates":[],"newThreads":[]} nếu chương không thay đổi tuyến nào.`;

    const { callGemini } = await import('../utils/gemini');
    const { parseJSON } = await import('../utils/json-repair');
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.2, maxTokens: 4096 },
      { jsonMode: true, tracking: { projectId, task: 'plot_thread_ledger', chapterNumber } },
    );

    const parsed = parseJSON<PlotThreadAIResponse>(res.content);
    if (!parsed) return { created: 0, updated: 0 };

    let created = 0;
    let updated = 0;

    for (const u of parsed.updates || []) {
      const target = active.find(t => (u.id && t.id === u.id) || (u.name && t.name === u.name));
      if (!target) continue;
      const updateRow: Record<string, unknown> = {
        last_active_chapter: chapterNumber,
        updated_at: new Date().toISOString(),
      };
      if (u.status && u.status !== target.status) updateRow.status = u.status;
      if (u.description && u.description !== target.description) updateRow.description = u.description;
      if (typeof u.targetPayoffChapter === 'number') updateRow.target_payoff_chapter = u.targetPayoffChapter;
      if (typeof u.importance === 'number') updateRow.importance = Math.max(0, Math.min(100, u.importance));
      if (Array.isArray(u.relatedCharacters) && u.relatedCharacters.length > 0) {
        updateRow.related_characters = u.relatedCharacters;
      }

      const { error: upErr } = await db
        .from('plot_threads')
        .update(updateRow)
        .eq('id', target.id);
      if (upErr) {
        console.warn(`[plot-threads] Update thread ${target.id} failed: ${upErr.message}`);
      } else {
        updated++;
      }
    }

    // Insert new threads — bound to 3 per chapter so model can't spam.
    const newThreads = (parsed.newThreads || []).slice(0, 3);
    for (const nt of newThreads) {
      if (!nt.name || nt.name.length < 3) continue;
      if (active.some(t => t.name.toLowerCase() === nt.name!.toLowerCase())) continue;
      const insertRow = {
        project_id: projectId,
        name: nt.name,
        description: nt.description || '',
        priority: nt.priority || 'sub',
        status: nt.status || 'open',
        start_chapter: chapterNumber,
        target_payoff_chapter: nt.targetPayoffChapter ?? null,
        last_active_chapter: chapterNumber,
        related_characters: Array.isArray(nt.relatedCharacters) ? nt.relatedCharacters : [],
        foreshadowing_hints: [],
        importance: typeof nt.importance === 'number' ? Math.max(0, Math.min(100, nt.importance)) : 50,
      };
      const { error: insErr } = await db.from('plot_threads').insert(insertRow);
      if (insErr) {
        console.warn(`[plot-threads] Insert thread "${nt.name}" failed: ${insErr.message}`);
      } else {
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      console.log(`[plot-threads] Ch.${chapterNumber}: created ${created}, updated ${updated} threads`);
    }

    return { created, updated };
  } catch (e) {
    console.warn(`[plot-threads] extractAndUpdatePlotThreads failed for Ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
    return { created: 0, updated: 0 };
  }
}
