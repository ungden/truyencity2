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
import { jaroWinkler, normalizeName, sharedTokenRatio } from '@/lib/utils/string-similarity';
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
  /** Quality Overhaul 2.4: set when a resolved/legacy thread was reactivated as an intentional callback. */
  revivedAtChapter?: number;
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
  revived_at_chapter?: number | null;
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
    revivedAtChapter: row.revived_at_chapter ?? undefined,
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
      if (t.revivedAtChapter) {
        lines.push(`  ↩️ CALLBACK CÓ CHỦ ĐÍCH: thread gốc từ ch.${t.startChapter}, quay lại ở ch.${t.revivedAtChapter} — viết như reader ĐÃ BIẾT thread này, reference sự kiện gốc rõ ràng.`);
      }
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
    // Phase 2026-05-16 root-cause fix: load ALL active threads (was capped at
    // 12 by importance — caused AI to re-create thread #20+ because it
    // didn't know it existed). Cluster by name similarity for compact AI
    // presentation; per-cluster representation keeps token budget similar.
    const { data: activeRows, error: activeErr } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false });

    if (activeErr) {
      console.warn(`[plot-threads] Load active threads failed for Ch.${chapterNumber}: ${activeErr.message}`);
    }

    const active = (activeRows || []).map(mapThreadRow);
    const clusters = clusterThreadsByName(active);
    const activeBrief = clusters.length > 0
      ? clusters
          .map(c => {
            if (c.threads.length === 1) {
              const t = c.threads[0];
              return `- id=${t.id}; name=${t.name}; status=${t.status}; priority=${t.priority}; last=${t.lastActiveChapter}; desc=${t.description.slice(0, 160)}`;
            }
            const head = c.threads[0];
            const others = c.threads.slice(1).map(t => `id=${t.id} (${t.status}/last ${t.lastActiveChapter})`).join(', ');
            return `- [cluster "${c.label}", ${c.threads.length} threads — KHÔNG tạo thread mới cùng cụm]\n  primary: id=${head.id}; status=${head.status}; priority=${head.priority}; last=${head.lastActiveChapter}; desc=${head.description.slice(0, 160)}\n  also: ${others}`;
          })
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

    // Quality Overhaul 2.4: dormant threads (resolved/legacy, inactive ≥60
    // chapters) — a "new" thread matching one of these is a deliberate
    // long-range CALLBACK (ch.800 referencing the ch.200 tomb), not a
    // duplicate. Reactivate the original with lineage instead of creating a
    // disconnected copy.
    const { data: dormantRows } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['resolved', 'legacy'])
      .lt('last_active_chapter', chapterNumber - 60)
      .order('importance', { ascending: false })
      .limit(100);
    const dormant = (dormantRows || []).map(mapThreadRow);

    // Insert new threads — bound to 3 per chapter so model can't spam.
    // Phase 2026-05-16: semantic dedup using Jaro-Winkler against ALL active
    // (not just exact name match) to stop "Vương Khải đòi nợ" + "Vương Khải
    // truy sát" duplicate accumulation.
    const newThreads = (parsed.newThreads || []).slice(0, 3);
    let skippedAsDup = 0;
    let revived = 0;
    for (const nt of newThreads) {
      if (!nt.name || nt.name.length < 3) continue;
      const dup = findDuplicateThread(nt.name, active);
      if (dup) {
        skippedAsDup++;
        console.log(`[plot-threads] Ch.${chapterNumber}: skipped new thread "${nt.name}" — semantic dup of existing "${dup.name}" (sim ${dup.similarity.toFixed(2)})`);
        continue;
      }

      // Callback reactivation (2.4): match against dormant threads.
      const dormantDup = findDuplicateThread(nt.name, dormant);
      if (dormantDup) {
        const original = dormant.find(t => t.name === dormantDup.name);
        if (original) {
          const callbackNote = `CALLBACK ch.${chapterNumber}: ${(nt.description || nt.name).slice(0, 200)}`;
          const { error: revErr } = await db
            .from('plot_threads')
            .update({
              status: 'open',
              last_active_chapter: chapterNumber,
              revived_at_chapter: chapterNumber,
              description: `${original.description} | ${callbackNote}`.slice(0, 1000),
              updated_at: new Date().toISOString(),
            })
            .eq('id', original.id);
          if (revErr) {
            console.warn(`[plot-threads] Reactivate thread "${original.name}" failed: ${revErr.message}`);
          } else {
            revived++;
            console.log(`[plot-threads] Ch.${chapterNumber}: REACTIVATED dormant thread "${original.name}" (last active ch.${original.lastActiveChapter}) as intentional callback`);
          }
          continue;
        }
      }
      const threadId = `${projectId.slice(0, 8)}-${chapterNumber}-${slugifyThreadName(nt.name)}`;
      const insertRow = {
        id: threadId,
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

    // Phase 2026-05-16: soft cap with stale demotion. Audit found Ngự Thú
    // Tiến Hóa accumulated 70+ active threads at ch.85; AI sees only top-N
    // and re-creates duplicates. Demote stale low-priority threads to
    // 'legacy' so context budget stays sane and dedup remains effective.
    const demoted = await demoteStaleThreads(projectId, chapterNumber);

    if (created > 0 || updated > 0 || skippedAsDup > 0 || demoted > 0) {
      console.log(`[plot-threads] Ch.${chapterNumber}: created ${created}, updated ${updated}, skipped(dup) ${skippedAsDup}, demoted(stale) ${demoted}`);
    }

    return { created, updated };
  } catch (e) {
    console.warn(`[plot-threads] extractAndUpdatePlotThreads failed for Ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
    return { created: 0, updated: 0 };
  }
}

function slugifyThreadName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'thread';
}

// ── Phase 2026-05-16: dedup + cluster + stale demotion helpers ───────────────

/**
 * Cluster active threads by name similarity. Uses Jaro-Winkler ≥0.75 OR
 * shared-token ratio ≥0.6 as the cluster predicate.
 */
export function clusterThreadsByName(threads: PlotThread[]): Array<{ label: string; threads: PlotThread[] }> {
  const clusters: Array<{ label: string; threads: PlotThread[] }> = [];
  for (const t of threads) {
    let placed = false;
    for (const c of clusters) {
      const head = c.threads[0];
      const sim = jaroWinkler(normalizeName(head.name), normalizeName(t.name));
      const tok = sharedTokenRatio(head.name, t.name);
      if (sim >= 0.75 || tok >= 0.6) {
        c.threads.push(t);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({ label: t.name, threads: [t] });
    }
  }
  for (const c of clusters) {
    c.threads.sort((a, b) => b.importance - a.importance);
  }
  clusters.sort((a, b) => b.threads[0].importance - a.threads[0].importance);
  return clusters;
}

/**
 * Find a duplicate of `candidateName` among `existing` threads using
 * Jaro-Winkler ≥0.75 OR shared-token ratio ≥0.6.
 */
export function findDuplicateThread(
  candidateName: string,
  existing: PlotThread[],
): { name: string; similarity: number } | null {
  if (!candidateName || candidateName.length < 3) return null;
  const candNorm = normalizeName(candidateName);
  for (const t of existing) {
    const sim = jaroWinkler(candNorm, normalizeName(t.name));
    const tok = sharedTokenRatio(candidateName, t.name);
    if (sim >= 0.75 || tok >= 0.6) {
      return { name: t.name, similarity: Math.max(sim, tok) };
    }
  }
  return null;
}

/**
 * Soft cap with stale demotion — when active count > 25, demote sub/background
 * threads inactive for 30+ chapters to status='legacy'. Never touches
 * critical/main priority or in-flight climaxes.
 */
export async function demoteStaleThreads(
  projectId: string,
  currentChapter: number,
): Promise<number> {
  const db = getSupabase();
  const { count } = await db
    .from('plot_threads')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .not('status', 'in', '("resolved","legacy")');
  if ((count || 0) <= 25) return 0;

  const staleBefore = currentChapter - 30;
  if (staleBefore < 1) return 0;

  const { data: candidates, error } = await db
    .from('plot_threads')
    .select('id, name')
    .eq('project_id', projectId)
    .in('priority', ['sub', 'background'])
    .lt('last_active_chapter', staleBefore)
    .not('status', 'in', '("resolved","legacy","climax")');

  if (error || !candidates || candidates.length === 0) return 0;

  const overflow = (count || 0) - 25;
  const toDemote = candidates.slice(0, overflow);
  if (toDemote.length === 0) return 0;

  const ids = toDemote.map(c => c.id as string);
  const { error: updErr } = await db
    .from('plot_threads')
    .update({ status: 'legacy', updated_at: new Date().toISOString() })
    .in('id', ids);
  if (updErr) {
    console.warn(`[plot-threads] demoteStaleThreads failed: ${updErr.message}`);
    return 0;
  }
  return toDemote.length;
}
